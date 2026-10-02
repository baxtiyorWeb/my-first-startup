import { eq, and, desc, lt, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  notifications,
  notificationSettings,
  users,
  follows,
} from "@/server/db/schema";
import { AppError } from "@/server/common/errors";

export interface NotificationItem {
  id: string;
  type: "like" | "comment" | "reply" | "follow" | "new_post";
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
  actor?: {
    id: string;
    name: string;
    handle: string;
    avatarUrl?: string | null;
  };
}

/**
 * Send Web Push notification via OneSignal REST API (Non-blocking)
 */
/**
 * Send Web Push notification via OneSignal REST API (Non-blocking)
 */
export async function sendOneSignalPush(
  recipientUserIds: string[],
  title: string,
  message: string,
  link: string
): Promise<{ success: boolean; error?: string }> {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !apiKey) {
    // OneSignal credentials not configured yet, skip Push
    return { success: false, error: "OneSignal API kalitlari .env da belgilanmagan" };
  }

  if (recipientUserIds.length === 0) return { success: true };

  const cleanApiKey = apiKey.trim().replace(/^Basic\s+/i, "").replace(/^Key\s+/i, "");
  const authHeader = `Key ${cleanApiKey}`;

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const fullLink = link.startsWith("http") ? link : `${appUrl}${link.startsWith("/") ? "" : "/"}${link}`;
  const iconUrl = `${appUrl}/logo.png`;

  try {
    const payload = {
      app_id: appId,
      include_aliases: {
        external_id: recipientUserIds,
      },
      target_channel: "push",
      headings: { en: title, uz: title, ru: title },
      contents: { en: message, uz: message, ru: message },
      url: fullLink,
      chrome_web_icon: iconUrl,
      firefox_icon: iconUrl,
      large_icon: iconUrl,
    };

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.warn(`[ONESIGNAL PUSH WARNING] HTTP ${response.status}:`, errText);
      return { success: false, error: `OneSignal HTTP ${response.status}: ${errText}` };
    }

    const data = await response.json();
    if (data.errors && data.errors.length > 0) {
      console.warn(`[ONESIGNAL PUSH DISPATCH WARNING]:`, data.errors);
      return { success: false, error: data.errors.join(", "), ...data };
    }
    return { success: true, ...data };
  } catch (err: any) {
    console.error("[ONESIGNAL PUSH ERROR]:", err);
    return { success: false, error: err?.message || "Push yuborishda xatolik" };
  }
}

/**
 * Smart Trigger Notification Helper with Aggregation & Anti-Spam Throttling
 */
export async function triggerNotification(input: {
  recipientId: string;
  actorId?: string;
  type: "like" | "comment" | "reply" | "follow" | "new_post" | "message";
  targetId?: string;
  targetType?: "post" | "comment" | "user";
  title: string;
  message: string;
  link: string;
}): Promise<void> {
  const { recipientId, actorId, type, targetId, targetType, title, message, link } = input;

  // 1. Never notify user of their own actions
  if (actorId && actorId === recipientId) return;

  try {
    // 2. Check user notification settings
    const [settings] = await db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, recipientId))
      .limit(1);

    if (settings) {
      if (type === "like" && !settings.notifyLikes) return;
      if ((type === "comment" || type === "reply") && !settings.notifyComments) return;
      if (type === "follow" && !settings.notifyFollows) return;
      if (type === "new_post" && !settings.notifyNewPosts) return;
      if (type === "share" as any && !settings.notifyShares) return;
    }

    // 3. Smart Anti-Spam Aggregation for "like" & Throttling for "comment"/"reply"
    if (type === "like" && targetId) {
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
      const [existingLikeNotif] = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.recipientId, recipientId),
            eq(notifications.type, "like"),
            eq(notifications.targetId, targetId),
            sql`${notifications.createdAt} >= ${fifteenMinsAgo}`
          )
        )
        .limit(1);

      if (existingLikeNotif) {
        // Aggregate: update existing notification timestamp & message to avoid spamming recipient
        await db
          .update(notifications)
          .set({
            message: `${message}`,
            isRead: false,
            createdAt: new Date(),
          })
          .where(eq(notifications.id, existingLikeNotif.id));
        return; // Skip duplicate Web Push for rapid repeated likes
      }
    }

    // 3.1 Comment/Reply push throttling: Max 1 push notification per post per 5 minutes
    let skipPushForComment = false;
    if ((type === "comment" || type === "reply") && targetId) {
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
      const [recentCommentNotif] = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.recipientId, recipientId),
            sql`(${notifications.type} = 'comment' OR ${notifications.type} = 'reply')`,
            eq(notifications.targetId, targetId),
            sql`${notifications.createdAt} >= ${fiveMinsAgo}`
          )
        )
        .limit(1);

      if (recentCommentNotif) {
        skipPushForComment = true; // In-app notification will still be inserted, but push is suppressed to avoid spam
      }
    }

    // 4. Insert In-App Notification
    await db.insert(notifications).values({
      recipientId,
      actorId: actorId || null,
      type,
      targetId: targetId || null,
      targetType: targetType || null,
      title,
      message,
      link,
      isRead: false,
    });

    // 5. Send Web Push via OneSignal (if pushEnabled and not throttled)
    if (!skipPushForComment && (!settings || settings.pushEnabled)) {
      sendOneSignalPush([recipientId], title, message, link).catch(() => null);
    }
  } catch (err) {
    console.error("[NOTIFICATIONS] Error triggering notification:", err);
  }
}

/**
 * Trigger new post notifications to all followers of an author
 */
export async function notifyFollowersNewPost(
  authorId: string,
  postId: string,
  postTitleOrSnippet: string
): Promise<void> {
  try {
    const [author] = await db.select().from(users).where(eq(users.id, authorId)).limit(1);
    if (!author) return;

    const followerRows = await db
      .select({ followerId: follows.followerId })
      .from(follows)
      .where(eq(follows.followingId, authorId));

    if (followerRows.length === 0) return;

    const title = `${author.name} yangi post ulashdi`;
    const message = postTitleOrSnippet.slice(0, 100);
    const link = `/dashboard/posts/${postId}`;

    for (const f of followerRows) {
      triggerNotification({
        recipientId: f.followerId,
        actorId: authorId,
        type: "new_post",
        targetId: postId,
        targetType: "post",
        title,
        message,
        link,
      }).catch(() => null);
    }
  } catch (err) {
    console.error("[NOTIFICATIONS] Error notifying followers:", err);
  }
}

/**
 * Get paginated notifications for logged-in user
 */
export async function getUserNotifications(
  userId: string,
  limit = 20,
  cursor?: string
): Promise<{ items: NotificationItem[]; nextCursor: string | null; unreadCount: number }> {
  try {
    const queryLimit = Math.min(Math.max(limit, 1), 50);
    const conditions = [eq(notifications.recipientId, userId)];

    if (cursor) {
      conditions.push(lt(notifications.createdAt, new Date(cursor)));
    }

    const rows = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        link: notifications.link,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
        actorId: users.id,
        actorName: users.name,
        actorHandle: users.handle,
        actorAvatarUrl: users.avatarUrl,
      })
      .from(notifications)
      .leftJoin(users, eq(notifications.actorId, users.id))
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(queryLimit + 1);

    const hasMore = rows.length > queryLimit;
    const items = hasMore ? rows.slice(0, queryLimit) : rows;
    const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

    // Get unread count
    const [unreadRes] = await db
      .select({ val: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.recipientId, userId), eq(notifications.isRead, false)));

    const formatted: NotificationItem[] = items.map((r) => ({
      id: r.id,
      type: r.type as NotificationItem["type"],
      title: r.title,
      message: r.message,
      link: r.link,
      isRead: r.isRead,
      createdAt: r.createdAt.toISOString(),
      actor: r.actorId
        ? {
            id: r.actorId,
            name: r.actorName!,
            handle: r.actorHandle!,
            avatarUrl: r.actorAvatarUrl,
          }
        : undefined,
    }));

    return {
      items: formatted,
      nextCursor,
      unreadCount: unreadRes?.val ?? 0,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[NOTIFICATIONS] Error getting user notifications:", err);
    throw AppError.internal("Bildirishnomalarni yuklashda xatolik yuz berdi");
  }
}

/**
 * Get unread notification count for header badge
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const [res] = await db
      .select({ val: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.recipientId, userId), eq(notifications.isRead, false)));

    return res?.val ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Mark single or all notifications as read
 */
export async function markAsRead(userId: string, notificationId?: string): Promise<void> {
  try {
    if (notificationId) {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.id, notificationId), eq(notifications.recipientId, userId)));
    } else {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.recipientId, userId));
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[NOTIFICATIONS] Error marking notification as read:", err);
    throw AppError.internal("Bildirishnomani o‘qilgan deb belgilashda xatolik yuz berdi");
  }
}
