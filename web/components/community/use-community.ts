"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CommunityMember,
  CommunityMediaItem,
  CommunityMessage,
  CommunityOverview,
  CommunityReaction,
  CommunityViewer,
  CommunityAttachment,
} from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload?.error?.message || payload?.error || "So'rovni bajarib bo'lmadi";
    throw new Error(typeof message === "string" ? message : "So'rovni bajarib bo'lmadi");
  }
  return payload?.data as T;
}

function sortMessages(list: CommunityMessage[]): CommunityMessage[] {
  return [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function mergeMessage(list: CommunityMessage[], incoming: CommunityMessage): CommunityMessage[] {
  const filtered = list.filter((item) => {
    if (item.id === incoming.id) return false;
    if (
      incoming.clientMessageId &&
      item.clientMessageId === incoming.clientMessageId
    ) {
      return false;
    }
    return true;
  });
  return sortMessages([...filtered, incoming]);
}

export interface SendMessageInput {
  content: string;
  attachments: CommunityAttachment[];
  replyToId?: string | null;
}

export function useCommunity(viewer: CommunityViewer | null) {
  const [overview, setOverview] = useState<CommunityOverview | null>(null);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Array<{ id: string; name: string }>>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CommunityMessage[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const typingTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const lastTypingSent = useRef(0);
  const readTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      const data = await request<CommunityOverview>("/api/community");
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Guruh ma'lumotlari yuklanmadi");
    }
  }, []);

  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [data] = await Promise.all([
        request<{
          messages: CommunityMessage[];
          hasMore: boolean;
          nextCursor: string | null;
        }>("/api/community/messages?limit=30"),
        loadOverview(),
      ]);
      setMessages(data.messages);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xabarlar yuklanmadi");
    } finally {
      setIsLoading(false);
    }
  }, [loadOverview]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !nextCursor) return;
    setIsLoadingMore(true);
    try {
      const data = await request<{
        messages: CommunityMessage[];
        hasMore: boolean;
        nextCursor: string | null;
      }>(`/api/community/messages?limit=30&cursor=${encodeURIComponent(nextCursor)}`);
      setMessages((prev) => sortMessages([...data.messages, ...prev]));
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eski xabarlar yuklanmadi");
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, nextCursor]);

  const markRead = useCallback((messageId?: string) => {
    if (readTimer.current) clearTimeout(readTimer.current);
    readTimer.current = setTimeout(() => {
      request("/api/community/read", {
        method: "POST",
        body: JSON.stringify({ messageId: messageId || null }),
      }).catch(() => null);
    }, 800);
  }, []);

  const sendMessage = useCallback(
    async ({ content, attachments, replyToId }: SendMessageInput) => {
      if (!viewer) throw new Error("Xabar yuborish uchun tizimga kiring");
      const trimmed = content.trim();
      if (!trimmed && attachments.length === 0) {
        throw new Error("Xabar bo'sh bo'lishi mumkin emas");
      }

      const clientMessageId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const optimistic: CommunityMessage = {
        id: `pending_${clientMessageId}`,
        content: trimmed,
        messageType: attachments.some((item) => item.kind === "video")
          ? "video"
          : attachments.length > 0 && attachments.every((item) => item.kind === "image")
            ? "image"
            : attachments.length > 0
              ? "file"
              : "text",
        attachments,
        clientMessageId,
        replyTo: replyToId
          ? (() => {
              const target = messages.find((item) => item.id === replyToId);
              if (!target) return null;
              return {
                id: target.id,
                content: target.content,
                messageType: target.messageType,
                senderName: target.sender.name,
                senderHandle: target.sender.handle,
                attachmentKind: target.attachments[0]?.kind ?? null,
                isDeleted: false,
              };
            })()
          : null,
        reactions: [],
        sender: {
          id: viewer.id,
          name: viewer.name,
          handle: viewer.handle,
          avatarUrl: viewer.avatarUrl ?? null,
          verified: Boolean(viewer.verified),
          role: viewer.role || "Go-getter",
        },
        isMine: true,
        canEdit: true,
        canDelete: true,
        editedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pending: true,
      };

      setMessages((prev) => sortMessages([...prev, optimistic]));

      try {
        const data = await request<{ message: CommunityMessage }>(
          "/api/community/messages",
          {
            method: "POST",
            body: JSON.stringify({
              content: trimmed,
              attachments,
              replyToId: replyToId || null,
              clientMessageId,
            }),
          }
        );
        setMessages((prev) => mergeMessage(prev, data.message));
        markRead(data.message.id);
        return data.message;
      } catch (err) {
        setMessages((prev) =>
          prev.map((item) =>
            item.clientMessageId === clientMessageId && item.pending
              ? { ...item, pending: false, failed: true }
              : item
          )
        );
        throw err;
      }
    },
    [viewer, messages, markRead]
  );

  const retryMessage = useCallback(
    async (failed: CommunityMessage) => {
      setMessages((prev) => prev.filter((item) => item.id !== failed.id));
      await sendMessage({
        content: failed.content,
        attachments: failed.attachments,
        replyToId: failed.replyTo?.id || null,
      });
    },
    [sendMessage]
  );

  const editMessage = useCallback(async (messageId: string, content: string) => {
    const data = await request<{ message: CommunityMessage }>(
      `/api/community/messages/${messageId}`,
      { method: "PATCH", body: JSON.stringify({ content }) }
    );
    setMessages((prev) => mergeMessage(prev, data.message));
    setSearchResults((prev) =>
      prev ? mergeMessage(prev, data.message) : prev
    );
    return data.message;
  }, []);

  const deleteMessage = useCallback(async (messageId: string) => {
    await request(`/api/community/messages/${messageId}`, { method: "DELETE" });
    setMessages((prev) => prev.filter((item) => item.id !== messageId));
    setSearchResults((prev) =>
      prev ? prev.filter((item) => item.id !== messageId) : prev
    );
  }, []);

  const applyReactions = useCallback(
    (messageId: string, reactions: CommunityReaction[]) => {
      setMessages((prev) =>
        prev.map((item) => (item.id === messageId ? { ...item, reactions } : item))
      );
      setSearchResults((prev) =>
        prev
          ? prev.map((item) => (item.id === messageId ? { ...item, reactions } : item))
          : prev
      );
    },
    []
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      const data = await request<{ reactions: CommunityReaction[] }>(
        `/api/community/messages/${messageId}/reactions`,
        { method: "POST", body: JSON.stringify({ emoji }) }
      );
      applyReactions(messageId, data.reactions);
    },
    [applyReactions]
  );

  const sendTyping = useCallback((isTyping: boolean) => {
    const now = Date.now();
    if (isTyping && now - lastTypingSent.current < 2500) return;
    lastTypingSent.current = now;
    request("/api/community/typing", {
      method: "POST",
      body: JSON.stringify({ isTyping }),
    }).catch(() => null);
  }, []);

  const toggleMute = useCallback(async () => {
    if (!overview) return;
    const next = !overview.isMuted;
    setOverview((prev) => (prev ? { ...prev, isMuted: next } : prev));
    try {
      await request<{ isMuted: boolean }>("/api/community/settings", {
        method: "POST",
        body: JSON.stringify({ muted: next }),
      });
    } catch {
      setOverview((prev) => (prev ? { ...prev, isMuted: !next } : prev));
    }
  }, [overview]);

  const runSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults(null);
      setSearchQuery("");
      setSearchError(null);
      return;
    }
    setSearchQuery(trimmed);
    setIsSearching(true);
    setSearchError(null);
    try {
      const data = await request<{ messages: CommunityMessage[] }>(
        `/api/community/messages?q=${encodeURIComponent(trimmed)}&limit=30`
      );
      setSearchResults(data.messages);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Qidiruv bajarilmadi");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults(null);
    setSearchError(null);
  }, []);

  // Realtime channel (authenticated via session cookie)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const source = new EventSource("/api/community/stream");

    source.onopen = () => setIsConnected(true);
    source.onerror = () => setIsConnected(false);

    const handleNew = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as { message: CommunityMessage };
        if (payload?.message) {
          setMessages((prev) => mergeMessage(prev, payload.message));
          setSearchResults((prev) =>
            prev ? mergeMessage(prev, payload.message) : prev
          );
        }
      } catch {
        // ignore malformed frames
      }
    };

    const handleUpdated = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as { message: CommunityMessage };
        if (payload?.message) {
          setMessages((prev) => mergeMessage(prev, payload.message));
          setSearchResults((prev) =>
            prev ? mergeMessage(prev, payload.message) : prev
          );
        }
      } catch {
        // ignore
      }
    };

    const handleDeleted = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as { messageId: string };
        if (payload?.messageId) {
          setMessages((prev) => prev.filter((item) => item.id !== payload.messageId));
          setSearchResults((prev) =>
            prev ? prev.filter((item) => item.id !== payload.messageId) : prev
          );
        }
      } catch {
        // ignore
      }
    };

    const handleReaction = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as {
          messageId: string;
          emoji: string;
          userId: string;
          added: boolean;
          reactions: Array<{ emoji: string; count: number }>;
        };
        if (!payload?.messageId) return;
        const isMyReaction = payload.userId === viewer?.id;
        const apply = (item: CommunityMessage): CommunityMessage => {
          if (item.id !== payload.messageId) return item;
          const reactions: CommunityReaction[] = payload.reactions.map((reaction) => {
            const existing = item.reactions.find((entry) => entry.emoji === reaction.emoji);
            return {
              emoji: reaction.emoji,
              count: reaction.count,
              reacted:
                isMyReaction && reaction.emoji === payload.emoji
                  ? payload.added
                  : Boolean(existing?.reacted),
            };
          });
          return { ...item, reactions };
        };
        setMessages((prev) => prev.map(apply));
        setSearchResults((prev) => (prev ? prev.map(apply) : prev));
      } catch {
        // ignore
      }
    };

    const handleTypingStart = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as {
          userId: string;
          name: string;
        };
        if (!payload?.userId || payload.userId === viewer?.id) return;
        setTypingUsers((prev) =>
          prev.some((user) => user.id === payload.userId)
            ? prev
            : [...prev, { id: payload.userId, name: payload.name }]
        );
        const existing = typingTimers.current.get(payload.userId);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((user) => user.id !== payload.userId));
          typingTimers.current.delete(payload.userId);
        }, 6000);
        typingTimers.current.set(payload.userId, timer);
      } catch {
        // ignore
      }
    };

    const handleTypingStop = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as { userId: string };
        if (!payload?.userId) return;
        setTypingUsers((prev) => prev.filter((user) => user.id !== payload.userId));
        const existing = typingTimers.current.get(payload.userId);
        if (existing) {
          clearTimeout(existing);
          typingTimers.current.delete(payload.userId);
        }
      } catch {
        // ignore
      }
    };

    source.addEventListener("message:new", handleNew as EventListener);
    source.addEventListener("message:updated", handleUpdated as EventListener);
    source.addEventListener("message:deleted", handleDeleted as EventListener);
    source.addEventListener("message:reaction", handleReaction as EventListener);
    source.addEventListener("typing:start", handleTypingStart as EventListener);
    source.addEventListener("typing:stop", handleTypingStop as EventListener);

    const timers = typingTimers.current;
    return () => {
      source.close();
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, [viewer?.id]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    return () => {
      if (readTimer.current) clearTimeout(readTimer.current);
    };
  }, []);

  const typingLabel = useMemo(() => {
    if (typingUsers.length === 0) return null;
    if (typingUsers.length === 1) return `${typingUsers[0].name} yozmoqda`;
    if (typingUsers.length === 2)
      return `${typingUsers[0].name} va ${typingUsers[1].name} yozmoqda`;
    return `${typingUsers.length} kishi yozmoqda`;
  }, [typingUsers]);

  return {
    overview,
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    isConnected,
    typingLabel,
    searchQuery,
    searchResults,
    isSearching,
    searchError,
    loadMore,
    refresh: loadInitial,
    sendMessage,
    retryMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    sendTyping,
    toggleMute,
    markRead,
    runSearch,
    clearSearch,
  };
}

export async function loadCommunityMembers(
  cursor?: string | null,
  limit = 20
): Promise<{ items: CommunityMember[]; hasMore: boolean; nextCursor: string | null }> {
  return request(
    `/api/community/members?limit=${limit}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`
  );
}

export async function loadCommunityMedia(
  kind: "image" | "video" | "file",
  cursor?: string | null,
  limit = 18
): Promise<{ items: CommunityMediaItem[]; hasMore: boolean; nextCursor: string | null }> {
  return request(
    `/api/community/media?kind=${kind}&limit=${limit}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`
  );
}
