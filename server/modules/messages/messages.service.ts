import { eq, ne, and, or, desc, lt, gt, sql, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import {
  conversations,
  conversationParticipants,
  messages,
  users,
  userBlocks,
  follows,
} from "@/server/db/schema";
import { AppError } from "@/server/common/errors";
import { realtimeHub } from "./realtime-hub";
import { triggerNotification } from "@/server/modules/notifications/notifications.service";

export interface MessageDTO {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: "text" | "image" | "system";
  mediaUrls: string[];
  clientMessageId?: string | null;
  replyToId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationDTO {
  id: string;
  type: "direct" | "group";
  peerUser: {
    id: string;
    name: string;
    handle: string;
    role: string;
    avatarUrl?: string | null;
    verified: boolean;
    isOnline: boolean;
    lastSeenAt?: string | null;
  };
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
    isFromMe: boolean;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

export class MessagesService {
  /**
   * Helper to generate deterministic pair key for 1-to-1 DMs
   */
  private static getPairKey(userA: string, userB: string): string {
    return [userA, userB].sort().join(":");
  }

  /**
   * Get or create a 1-to-1 direct conversation with another user
   */
  public static async getOrCreateDirectConversation(
    currentUserId: string,
    targetIdentifier: string
  ): Promise<ConversationDTO> {
    // 1. Resolve target user by ID or by handle
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      targetIdentifier
    );
    const cleanHandle = targetIdentifier.replace(/^@/, "");

    const [targetUser] = await db
      .select({
        id: users.id,
        name: users.name,
        handle: users.handle,
        role: users.role,
        avatarUrl: users.avatarUrl,
        verified: users.verified,
        dmPermission: users.dmPermission,
        showOnlineStatus: users.showOnlineStatus,
        isDeactivated: users.isDeactivated,
      })
      .from(users)
      .where(
        isUuid
          ? eq(users.id, targetIdentifier)
          : or(eq(users.handle, cleanHandle), eq(users.handle, `@${cleanHandle}`))
      )
      .limit(1);

    if (!targetUser || targetUser.isDeactivated) {
      throw AppError.notFound("Foydalanuvchi topilmadi");
    }

    if (targetUser.id === currentUserId) {
      throw AppError.badRequest("O'zingizga xabar yubora olmaysiz");
    }

    // 2. Check blocking (bidirectional)
    const [block] = await db
      .select()
      .from(userBlocks)
      .where(
        or(
          and(
            eq(userBlocks.blockerId, currentUserId),
            eq(userBlocks.blockedId, targetUser.id)
          ),
          and(
            eq(userBlocks.blockerId, targetUser.id),
            eq(userBlocks.blockedId, currentUserId)
          )
        )
      )
      .limit(1);

    if (block) {
      throw AppError.forbidden("Ushbu foydalanuvchi bilan xabar almashish imkoni yo'q");
    }

    const pairKey = this.getPairKey(currentUserId, targetUser.id);

    // 3. Check if conversation already exists
    const [existingConv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.directPairKey, pairKey))
      .limit(1);

    if (existingConv) {
      // Calculate unread count
      const [participant] = await db
        .select()
        .from(conversationParticipants)
        .where(
          and(
            eq(conversationParticipants.conversationId, existingConv.id),
            eq(conversationParticipants.userId, currentUserId)
          )
        )
        .limit(1);

      const unreadCount = await this.getUnreadCount(
        existingConv.id,
        currentUserId,
        participant?.lastReadAt
      );

      const isOnline = targetUser.showOnlineStatus
        ? realtimeHub.isUserOnline(targetUser.id)
        : false;
      const lastSeen = targetUser.showOnlineStatus
        ? realtimeHub.getLastSeen(targetUser.id)?.toISOString() || null
        : null;

      return {
        id: existingConv.id,
        type: "direct",
        peerUser: {
          id: targetUser.id,
          name: targetUser.name,
          handle: targetUser.handle,
          role: targetUser.role,
          avatarUrl: targetUser.avatarUrl,
          verified: targetUser.verified,
          isOnline,
          lastSeenAt: lastSeen,
        },
        lastMessage: existingConv.lastMessageText
          ? {
              id: existingConv.lastMessageId || "",
              content: existingConv.lastMessageText,
              senderId: existingConv.lastMessageSenderId || "",
              createdAt: existingConv.lastMessageAt.toISOString(),
              isFromMe: existingConv.lastMessageSenderId === currentUserId,
            }
          : null,
        unreadCount,
        updatedAt: existingConv.updatedAt.toISOString(),
      };
    }

    // 4. Verify DM permissions before initiating a NEW conversation
    if (targetUser.dmPermission === "nobody") {
      throw AppError.forbidden("Foydalanuvchi shaxsiy xabarlarni qabul qilmaydi");
    }

    if (targetUser.dmPermission === "followed") {
      // Check if targetUser follows currentUserId
      const [isFollowing] = await db
        .select()
        .from(follows)
        .where(
          and(
            eq(follows.followerId, targetUser.id),
            eq(follows.followingId, currentUserId)
          )
        )
        .limit(1);

      if (!isFollowing) {
        throw AppError.forbidden(
          "Foydalanuvchi faqat o'zi kuzatgan hisoblardan xabarlarni qabul qiladi"
        );
      }
    }

    // 5. Create new conversation in transaction
    const newConv = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(conversations)
        .values({
          type: "direct",
          directPairKey: pairKey,
        })
        .onConflictDoNothing()
        .returning();

      // If race condition occurred and another request created it simultaneously
      const conv =
        created ||
        (
          await tx
            .select()
            .from(conversations)
            .where(eq(conversations.directPairKey, pairKey))
            .limit(1)
        )[0];

      if (!conv) {
        throw AppError.internal("Suhbat yaratishda xatolik yuz berdi");
      }

      // Insert participants
      await tx
        .insert(conversationParticipants)
        .values([
          { conversationId: conv.id, userId: currentUserId },
          { conversationId: conv.id, userId: targetUser.id },
        ])
        .onConflictDoNothing();

      return conv;
    });

    const isOnline = targetUser.showOnlineStatus
      ? realtimeHub.isUserOnline(targetUser.id)
      : false;

    return {
      id: newConv.id,
      type: "direct",
      peerUser: {
        id: targetUser.id,
        name: targetUser.name,
        handle: targetUser.handle,
        role: targetUser.role,
        avatarUrl: targetUser.avatarUrl,
        verified: targetUser.verified,
        isOnline,
        lastSeenAt: null,
      },
      lastMessage: null,
      unreadCount: 0,
      updatedAt: newConv.updatedAt.toISOString(),
    };
  }

  /**
   * Get all active conversations for current user
   */
  public static async getUserConversations(currentUserId: string): Promise<ConversationDTO[]> {
    // 1. Fetch user's active conversation memberships
    const userMemberships = await db
      .select({
        conversationId: conversationParticipants.conversationId,
        lastReadAt: conversationParticipants.lastReadAt,
        isMuted: conversationParticipants.isMuted,
        isArchived: conversationParticipants.isArchived,
      })
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.userId, currentUserId),
          eq(conversationParticipants.isArchived, false)
        )
      );

    if (userMemberships.length === 0) return [];

    const convIds = userMemberships.map((m) => m.conversationId);

    // 2. Fetch conversations data
    const convRows = await db
      .select()
      .from(conversations)
      .where(inArray(conversations.id, convIds))
      .orderBy(desc(conversations.lastMessageAt));

    // 3. Fetch peer participants for these conversations
    const peerParticipants = await db
      .select({
        conversationId: conversationParticipants.conversationId,
        user: {
          id: users.id,
          name: users.name,
          handle: users.handle,
          role: users.role,
          avatarUrl: users.avatarUrl,
          verified: users.verified,
          showOnlineStatus: users.showOnlineStatus,
        },
      })
      .from(conversationParticipants)
      .innerJoin(users, eq(conversationParticipants.userId, users.id))
      .where(
        and(
          inArray(conversationParticipants.conversationId, convIds),
          ne(conversationParticipants.userId, currentUserId)
        )
      );

    const peerMap = new Map<string, (typeof peerParticipants)[0]["user"]>();
    for (const p of peerParticipants) {
      peerMap.set(p.conversationId, p.user);
    }

    const membershipMap = new Map<string, (typeof userMemberships)[0]>();
    for (const m of userMemberships) {
      membershipMap.set(m.conversationId, m);
    }

    // 4. Build ConversationDTO list with unread counts
    const result: ConversationDTO[] = [];

    for (const conv of convRows) {
      const peer = peerMap.get(conv.id);
      if (!peer) continue;

      const mem = membershipMap.get(conv.id);
      const unreadCount = await this.getUnreadCount(conv.id, currentUserId, mem?.lastReadAt);

      const isOnline = peer.showOnlineStatus ? realtimeHub.isUserOnline(peer.id) : false;
      const lastSeen = peer.showOnlineStatus
        ? realtimeHub.getLastSeen(peer.id)?.toISOString() || null
        : null;

      result.push({
        id: conv.id,
        type: conv.type as "direct" | "group",
        peerUser: {
          id: peer.id,
          name: peer.name,
          handle: peer.handle,
          role: peer.role,
          avatarUrl: peer.avatarUrl,
          verified: peer.verified,
          isOnline,
          lastSeenAt: lastSeen,
        },
        lastMessage: conv.lastMessageText
          ? {
              id: conv.lastMessageId || "",
              content: conv.lastMessageText,
              senderId: conv.lastMessageSenderId || "",
              createdAt: conv.lastMessageAt.toISOString(),
              isFromMe: conv.lastMessageSenderId === currentUserId,
            }
          : null,
        unreadCount,
        updatedAt: conv.lastMessageAt.toISOString(),
      });
    }

    return result;
  }

  /**
   * Get paginated messages in a conversation
   */
  public static async getConversationMessages(
    currentUserId: string,
    conversationId: string,
    cursor?: string,
    limit: number = 30
  ): Promise<{
    messages: MessageDTO[];
    peerLastReadAt: string | null;
    peerLastReadMessageId: string | null;
    hasMore: boolean;
  }> {
    // 1. Authorize: user must belong to conversation
    const [membership] = await db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, currentUserId)
        )
      )
      .limit(1);

    if (!membership) {
      throw AppError.forbidden("Suhbatga kirish huquqingiz yo'q");
    }

    // 2. Fetch peer read state
    const [peerMembership] = await db
      .select({
        lastReadAt: conversationParticipants.lastReadAt,
        lastReadMessageId: conversationParticipants.lastReadMessageId,
      })
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          ne(conversationParticipants.userId, currentUserId)
        )
      )
      .limit(1);

    // 3. Query messages backward from cursor
    const queryConditions = [
      eq(messages.conversationId, conversationId),
      sql`${messages.deletedAt} IS NULL`,
    ];

    if (cursor) {
      queryConditions.push(lt(messages.createdAt, new Date(cursor)));
    }

    const rows = await db
      .select()
      .from(messages)
      .where(and(...queryConditions))
      .orderBy(desc(messages.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    // Reverse to chronological order (oldest to newest)
    items.reverse();

    return {
      messages: items.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        content: m.content,
        messageType: m.messageType as "text" | "image" | "system",
        mediaUrls: m.mediaUrls,
        clientMessageId: m.clientMessageId,
        replyToId: m.replyToId,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      })),
      peerLastReadAt: peerMembership?.lastReadAt?.toISOString() || null,
      peerLastReadMessageId: peerMembership?.lastReadMessageId || null,
      hasMore,
    };
  }

  /**
   * Send a new message with idempotency, validation, and real-time delivery
   */
  public static async sendMessage(
    currentUserId: string,
    input: {
      conversationId: string;
      content: string;
      clientMessageId?: string;
      replyToId?: string;
      messageType?: "text" | "image" | "system";
      mediaUrls?: string[];
    }
  ): Promise<MessageDTO> {
    const { conversationId, clientMessageId, replyToId, messageType = "text", mediaUrls = [] } =
      input;
    const content = (input.content || "").trim();

    if (!content && mediaUrls.length === 0) {
      throw AppError.badRequest("Xabar bo'sh bo'lishi mumkin emas");
    }

    if (content.length > 4000) {
      throw AppError.badRequest("Xabar uzunligi 4000 belgidan oshmasligi kerak");
    }

    // 1. Authorize: verify participation
    const participants = await db
      .select({
        userId: conversationParticipants.userId,
      })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, conversationId));

    const participantIds = participants.map((p) => p.userId);
    if (!participantIds.includes(currentUserId)) {
      throw AppError.forbidden("Suhbat a'zosi emassiz");
    }

    const peerIds = participantIds.filter((id) => id !== currentUserId);

    // 2. Check blocking status with peers
    if (peerIds.length > 0) {
      const [block] = await db
        .select()
        .from(userBlocks)
        .where(
          or(
            and(
              eq(userBlocks.blockerId, currentUserId),
              inArray(userBlocks.blockedId, peerIds)
            ),
            and(
              inArray(userBlocks.blockerId, peerIds),
              eq(userBlocks.blockedId, currentUserId)
            )
          )
        )
        .limit(1);

      if (block) {
        throw AppError.forbidden("Foydalanuvchi bloklangan, xabar yuborib bo'lmaydi");
      }
    }

    // 3. Idempotency Check: prevent duplicate messages from network retries
    if (clientMessageId) {
      const [existing] = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conversationId),
            eq(messages.senderId, currentUserId),
            eq(messages.clientMessageId, clientMessageId)
          )
        )
        .limit(1);

      if (existing) {
        return {
          id: existing.id,
          conversationId: existing.conversationId,
          senderId: existing.senderId,
          content: existing.content,
          messageType: existing.messageType as any,
          mediaUrls: existing.mediaUrls,
          clientMessageId: existing.clientMessageId,
          replyToId: existing.replyToId,
          createdAt: existing.createdAt.toISOString(),
          updatedAt: existing.updatedAt.toISOString(),
        };
      }
    }

    // 4. Persist in transaction
    const savedMessage = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(messages)
        .values({
          conversationId,
          senderId: currentUserId,
          content,
          messageType,
          mediaUrls,
          clientMessageId,
          replyToId: replyToId || null,
        })
        .returning();

      // Update conversation last message metadata
      await tx
        .update(conversations)
        .set({
          lastMessageId: inserted.id,
          lastMessageText: content.slice(0, 100),
          lastMessageSenderId: currentUserId,
          lastMessageAt: inserted.createdAt,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversationId));

      // Update sender's read marker
      await tx
        .update(conversationParticipants)
        .set({
          lastReadMessageId: inserted.id,
          lastReadAt: inserted.createdAt,
        })
        .where(
          and(
            eq(conversationParticipants.conversationId, conversationId),
            eq(conversationParticipants.userId, currentUserId)
          )
        );

      return inserted;
    });

    const messageDTO: MessageDTO = {
      id: savedMessage.id,
      conversationId: savedMessage.conversationId,
      senderId: savedMessage.senderId,
      content: savedMessage.content,
      messageType: savedMessage.messageType as any,
      mediaUrls: savedMessage.mediaUrls,
      clientMessageId: savedMessage.clientMessageId,
      replyToId: savedMessage.replyToId,
      createdAt: savedMessage.createdAt.toISOString(),
      updatedAt: savedMessage.updatedAt.toISOString(),
    };

    // 5. Broadcast real-time event to all participants with sender info
    const [senderUser] = await db
      .select({
        id: users.id,
        name: users.name,
        handle: users.handle,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, currentUserId))
      .limit(1);

    realtimeHub.emitToUsers(participantIds, {
      type: "message:new",
      data: {
        conversationId,
        message: messageDTO,
        sender: senderUser || { id: currentUserId, name: "Foydalanuvchi", handle: "" },
      },
    });

    // 6. Push & In-App Notification for message recipients
    const messagePreview =
      content.length > 80 ? `${content.slice(0, 80)}...` : content || "Rasm yuborildi 📷";
    const senderTitle = senderUser?.name || "Yangi xabar";
    const chatLink = `/dashboard/messages?conv=${conversationId}`;

    for (const peerId of peerIds) {
      triggerNotification({
        recipientId: peerId,
        actorId: currentUserId,
        type: "message",
        targetId: conversationId,
        targetType: "user",
        title: senderTitle,
        message: messagePreview,
        link: chatLink,
      }).catch((err) => {
        console.warn("[MESSAGE NOTIFICATION WARN]:", err);
      });
    }

    return messageDTO;
  }

  /**
   * Mark a conversation as read by the current user
   */
  public static async markConversationAsRead(
    currentUserId: string,
    conversationId: string,
    lastMessageId?: string
  ): Promise<void> {
    const now = new Date();

    let resolvedLastMessageId = lastMessageId;
    if (!resolvedLastMessageId) {
      const [latest] = await db
        .select({ id: messages.id })
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(desc(messages.createdAt))
        .limit(1);
      resolvedLastMessageId = latest?.id;
    }

    await db
      .update(conversationParticipants)
      .set({
        lastReadMessageId: resolvedLastMessageId || null,
        lastReadAt: now,
      })
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, currentUserId)
        )
      );

    // Find peer participants to broadcast read receipt
    const participants = await db
      .select({ userId: conversationParticipants.userId })
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          ne(conversationParticipants.userId, currentUserId)
        )
      );

    const peerIds = participants.map((p) => p.userId);

    realtimeHub.emitToUsers(peerIds, {
      type: "message:read",
      data: {
        conversationId,
        readerId: currentUserId,
        lastReadMessageId: resolvedLastMessageId || null,
        lastReadAt: now.toISOString(),
      },
    });
  }

  /**
   * Set typing state
   */
  public static async setTyping(
    currentUserId: string,
    conversationId: string,
    isTyping: boolean
  ): Promise<void> {
    const participants = await db
      .select({ userId: conversationParticipants.userId })
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          sql`${conversationParticipants.userId} != ${currentUserId}`
        )
      );

    const peerIds = participants.map((p) => p.userId);
    realtimeHub.setTyping(conversationId, currentUserId, peerIds, isTyping);
  }

  /**
   * Sync missed messages since a specific timestamp across all user conversations
   */
  public static async syncMissedMessages(
    currentUserId: string,
    sinceIsoDate: string
  ): Promise<MessageDTO[]> {
    const since = new Date(sinceIsoDate);
    if (isNaN(since.getTime())) return [];

    // Find all conversations of user
    const memberships = await db
      .select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, currentUserId));

    if (memberships.length === 0) return [];
    const convIds = memberships.map((m) => m.conversationId);

    const missed = await db
      .select()
      .from(messages)
      .where(
        and(
          inArray(messages.conversationId, convIds),
          gt(messages.createdAt, since),
          sql`${messages.deletedAt} IS NULL`
        )
      )
      .orderBy(messages.createdAt);

    return missed.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      content: m.content,
      messageType: m.messageType as any,
      mediaUrls: m.mediaUrls,
      clientMessageId: m.clientMessageId,
      replyToId: m.replyToId,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }));
  }

  /**
   * Get unread count helper
   */
  private static async getUnreadCount(
    conversationId: string,
    userId: string,
    lastReadAt?: Date | null
  ): Promise<number> {
    const conditions = [
      eq(messages.conversationId, conversationId),
      sql`${messages.senderId} != ${userId}`,
      sql`${messages.deletedAt} IS NULL`,
    ];

    if (lastReadAt) {
      conditions.push(gt(messages.createdAt, lastReadAt));
    }

    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .where(and(...conditions));

    return row?.count || 0;
  }
}
