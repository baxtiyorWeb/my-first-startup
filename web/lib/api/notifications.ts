import { apiClient } from "./client";

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

export interface GetNotificationsParams {
  cursor?: string;
  limit?: number;
}

export interface GetNotificationsResult {
  items: NotificationItem[];
  nextCursor: string | null;
  unreadCount: number;
}

export async function getNotifications(params: GetNotificationsParams = {}): Promise<{
  items: NotificationItem[];
  nextCursor: string | null;
  unreadCount: number;
}> {
  const query = new URLSearchParams();
  if (params.cursor) query.set("cursor", params.cursor);
  if (params.limit) query.set("limit", String(params.limit));

  const qs = query.toString() ? `?${query.toString()}` : "";
  const res = await apiClient<GetNotificationsResult | NotificationItem[]>(`/api/notifications${qs}`);

  const rawData = res.data;
  if (rawData && typeof rawData === "object" && "items" in rawData && Array.isArray((rawData as any).items)) {
    return {
      items: (rawData as any).items as NotificationItem[],
      nextCursor: (rawData as any).nextCursor || null,
      unreadCount: (rawData as any).unreadCount ?? 0,
    };
  }

  if (Array.isArray(rawData)) {
    return {
      items: rawData,
      nextCursor: res.meta?.nextCursor || null,
      unreadCount: (res.meta?.unreadCount as number) ?? 0,
    };
  }

  return { items: [], nextCursor: null, unreadCount: 0 };
}

export async function getUnreadCount() {
  const res = await apiClient<{ unreadCount: number }>("/api/notifications/unread-count");
  return res.data?.unreadCount ?? 0;
}

export async function markAsRead(notificationId?: string) {
  const res = await apiClient<{ success: boolean }>("/api/notifications/read", {
    method: "PATCH",
    body: JSON.stringify({ notificationId }),
  });
  return res.data;
}
