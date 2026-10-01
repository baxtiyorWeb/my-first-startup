"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useAuth } from "@/components/auth/auth-context";
import { apiClient } from "@/lib/api/client";
import { toast } from "@/components/ui/toast";

export interface ClientMessage {
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
  status?: "pending" | "sent" | "delivered" | "failed";
}

export interface ConversationItem {
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

interface MessagesContextType {
  conversations: ConversationItem[];
  loadingConversations: boolean;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  messages: ClientMessage[];
  loadingMessages: boolean;
  hasMoreMessages: boolean;
  isPeerTyping: boolean;
  peerLastReadAt: string | null;
  peerLastReadMessageId: string | null;
  totalUnreadCount: number;
  isConnected: boolean;
  loadMoreMessages: () => Promise<void>;
  sendMessage: (content: string, replyToId?: string) => Promise<boolean>;
  retryMessage: (clientMessageId: string) => Promise<void>;
  markAsRead: (conversationId: string, messageId?: string) => Promise<void>;
  sendTyping: (isTyping: boolean) => void;
  startDirectConversation: (targetIdentifier: string) => Promise<string | null>;
  refreshConversations: () => Promise<void>;
}

const MessagesContext = createContext<MessagesContextType | null>(null);

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const currentUserId = session.user?.id;

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const [messagesMap, setMessagesMap] = useState<Record<string, ClientMessage[]>>({});
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMoreMap, setHasMoreMap] = useState<Record<string, boolean>>({});

  const [peerReadState, setPeerReadState] = useState<
    Record<string, { lastReadAt: string | null; lastReadMessageId: string | null }>
  >({});

  const [typingMap, setTypingMap] = useState<Record<string, boolean>>({});
  const [isConnected, setIsConnected] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const lastSyncTimestampRef = useRef<string>(new Date().toISOString());
  const typingDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingActiveRef = useRef(false);

  // Keep a ref to activeConversationId to prevent SSE reconnection on conversation change
  const activeConversationIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  // Audio notification chime using Web Audio API
  const playNotificationChime = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch {
      // AudioContext blocked by browser policy
    }
  }, []);

  // Total unread count across all conversations
  const totalUnreadCount = useMemo(() => {
    return conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }, [conversations]);

  // Current active conversation messages
  const activeMessages = useMemo(() => {
    return activeConversationId ? messagesMap[activeConversationId] || [] : [];
  }, [activeConversationId, messagesMap]);

  const activeHasMore = useMemo(() => {
    return activeConversationId ? Boolean(hasMoreMap[activeConversationId]) : false;
  }, [activeConversationId, hasMoreMap]);

  const isPeerTyping = useMemo(() => {
    return activeConversationId ? Boolean(typingMap[activeConversationId]) : false;
  }, [activeConversationId, typingMap]);

  const activePeerRead = useMemo(() => {
    return activeConversationId
      ? peerReadState[activeConversationId] || { lastReadAt: null, lastReadMessageId: null }
      : { lastReadAt: null, lastReadMessageId: null };
  }, [activeConversationId, peerReadState]);

  // Load conversations list
  const refreshConversations = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const res = await apiClient<{ conversations: ConversationItem[] }>(
        "/api/messages/conversations"
      );
      if (res.data?.conversations) {
        setConversations(res.data.conversations);
      }
    } catch {
      // Ignore background refresh errors
    }
  }, [currentUserId]);

  // Connect to SSE Stream
  const connectSSE = useCallback(() => {
    if (!currentUserId || typeof window === "undefined") return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      const es = new EventSource("/api/messages/stream");
      eventSourceRef.current = es;

      es.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // Perform missed message sync if we were disconnected
        if (lastSyncTimestampRef.current) {
          apiClient<{ messages: ClientMessage[] }>(
            `/api/messages/sync?since=${encodeURIComponent(lastSyncTimestampRef.current)}`
          )
            .then((res) => {
              if (res.data?.messages && res.data.messages.length > 0) {
                setMessagesMap((prev) => {
                  const updated = { ...prev };
                  for (const msg of res.data.messages) {
                    const convMsgs = updated[msg.conversationId] || [];
                    if (!convMsgs.some((m) => m.id === msg.id)) {
                      updated[msg.conversationId] = [...convMsgs, { ...msg, status: "sent" }];
                    }
                  }
                  return updated;
                });
                refreshConversations();
              }
            })
            .catch(() => {});
        }
      };

      // 1. Connection ACK
      es.addEventListener("connection:ack", (e: MessageEvent) => {
        lastSyncTimestampRef.current = new Date().toISOString();
        try {
          const payload = JSON.parse(e.data);
          if (Array.isArray(payload?.onlineUserIds)) {
            const onlineSet = new Set<string>(payload.onlineUserIds);
            setConversations((prev) =>
              prev.map((c) => ({
                ...c,
                peerUser: {
                  ...c.peerUser,
                  isOnline: onlineSet.has(c.peerUser.id),
                },
              }))
            );
          }
        } catch {}
      });

      // 2. Incoming new message
      es.addEventListener("message:new", (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          const { conversationId, message, sender } = payload;
          lastSyncTimestampRef.current = message.createdAt || new Date().toISOString();

          const isFromMe = message.senderId === currentUserId;
          const isCurrentActive = activeConversationIdRef.current === conversationId;
          const isPageVisible =
            typeof document !== "undefined" && document.visibilityState === "visible";

          // 1. Update message map
          setMessagesMap((prev) => {
            const list = prev[conversationId] || [];
            const existsIndex = list.findIndex(
              (m) =>
                m.id === message.id ||
                (message.clientMessageId && m.clientMessageId === message.clientMessageId)
            );

            if (existsIndex >= 0) {
              const copy = [...list];
              copy[existsIndex] = { ...message, status: "sent" };
              return { ...prev, [conversationId]: copy };
            } else {
              return { ...prev, [conversationId]: [...list, { ...message, status: "sent" }] };
            }
          });

          // 2. Update and reorder conversations list (move to top)
          setConversations((prev) => {
            const existsIndex = prev.findIndex((c) => c.id === conversationId);
            if (existsIndex >= 0) {
              const existing = prev[existsIndex];
              const updated: ConversationItem = {
                ...existing,
                lastMessage: {
                  id: message.id,
                  content: message.content,
                  senderId: message.senderId,
                  createdAt: message.createdAt,
                  isFromMe,
                },
                unreadCount:
                  isFromMe || (isCurrentActive && isPageVisible)
                    ? 0
                    : (existing.unreadCount || 0) + 1,
                updatedAt: message.createdAt,
              };
              const others = [...prev.slice(0, existsIndex), ...prev.slice(existsIndex + 1)];
              return [updated, ...others];
            } else {
              // Newly created conversation from peer, reload list
              refreshConversations();
              return prev;
            }
          });

          // 3. Handle read receipts and notifications for peer messages
          if (!isFromMe) {
            if (isCurrentActive && isPageVisible) {
              // Active chat: immediately mark as read so the sender sees the double checkmark!
              apiClient(`/api/messages/conversations/${conversationId}/read`, {
                method: "POST",
                body: JSON.stringify({ messageId: message.id }),
              }).catch(() => {});
            } else {
              // Inactive or background: play sound chime and notify with toast
              playNotificationChime();
              const senderName = sender?.name || "Yangi xabar";
              const snippet =
                message.content.length > 60
                  ? message.content.slice(0, 60) + "..."
                  : message.content;
              toast.info(`${senderName}: ${snippet}`);
            }
          }
        } catch {}
      });

      // 3. Message read receipt
      es.addEventListener("message:read", (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          const { conversationId, lastReadAt, lastReadMessageId } = payload;
          setPeerReadState((prev) => ({
            ...prev,
            [conversationId]: { lastReadAt, lastReadMessageId },
          }));
        } catch {}
      });

      // 4. Typing update
      es.addEventListener("typing:update", (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          const { conversationId, isTyping } = payload;
          setTypingMap((prev) => ({
            ...prev,
            [conversationId]: Boolean(isTyping),
          }));
        } catch {}
      });

      // 5. Presence update
      es.addEventListener("presence:update", (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          const { userId, status, lastSeenAt } = payload;
          const isOnline = status === "online";

          setConversations((prev) =>
            prev.map((c) => {
              if (c.peerUser.id === userId) {
                return {
                  ...c,
                  peerUser: {
                    ...c.peerUser,
                    isOnline,
                    lastSeenAt: isOnline ? null : lastSeenAt || c.peerUser.lastSeenAt,
                  },
                };
              }
              return c;
            })
          );
        } catch {}
      });

      es.onerror = () => {
        setIsConnected(false);
        es.close();
        eventSourceRef.current = null;

        // Exponential backoff reconnect: 1s, 2s, 4s, 8s, max 15s
        const attempts = reconnectAttemptsRef.current;
        const delay = Math.min(1000 * Math.pow(2, attempts), 15000);
        reconnectAttemptsRef.current += 1;

        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connectSSE();
        }, delay);
      };
    } catch {
      setIsConnected(false);
    }
  }, [currentUserId, playNotificationChime, refreshConversations]);

  // Initial load and SSE setup
  useEffect(() => {
    if (!currentUserId) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    setLoadingConversations(true);
    refreshConversations().finally(() => setLoadingConversations(false));
    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [currentUserId, connectSSE, refreshConversations]);

  // Window focus / visibility change: mark active conversation as read immediately
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleFocusOrVisible = () => {
      if (document.visibilityState === "visible" && activeConversationIdRef.current) {
        const convId = activeConversationIdRef.current;
        apiClient(`/api/messages/conversations/${convId}/read`, {
          method: "POST",
        }).catch(() => {});
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
        );
      }
    };

    window.addEventListener("focus", handleFocusOrVisible);
    document.addEventListener("visibilitychange", handleFocusOrVisible);

    return () => {
      window.removeEventListener("focus", handleFocusOrVisible);
      document.removeEventListener("visibilitychange", handleFocusOrVisible);
    };
  }, []);

  // Load messages when active conversation changes
  const loadMessages = useCallback(
    async (conversationId: string, cursor?: string) => {
      if (!conversationId) return;
      if (!cursor) setLoadingMessages(true);

      try {
        const url = `/api/messages/conversations/${conversationId}/messages${
          cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""
        }`;
        const res = await apiClient<{
          messages: ClientMessage[];
          peerLastReadAt: string | null;
          peerLastReadMessageId: string | null;
          hasMore: boolean;
        }>(url);

        if (res.data) {
          const {
            messages: fetched,
            peerLastReadAt,
            peerLastReadMessageId,
            hasMore,
          } = res.data;

          setPeerReadState((prev) => ({
            ...prev,
            [conversationId]: { lastReadAt: peerLastReadAt, lastReadMessageId: peerLastReadMessageId },
          }));

          setHasMoreMap((prev) => ({
            ...prev,
            [conversationId]: hasMore,
          }));

          setMessagesMap((prev) => {
            const existing = prev[conversationId] || [];
            if (!cursor) {
              return {
                ...prev,
                [conversationId]: fetched.map((m) => ({ ...m, status: "sent" })),
              };
            } else {
              // Prepend older messages
              const existingIds = new Set(existing.map((m) => m.id));
              const newOlder = fetched.filter((m) => !existingIds.has(m.id));
              return {
                ...prev,
                [conversationId]: [...newOlder, ...existing],
              };
            }
          });
        }
      } catch (err: any) {
        toast.error(err.message || "Xabarlarni yuklashda xatolik");
      } finally {
        if (!cursor) setLoadingMessages(false);
      }
    },
    []
  );

  // When activeConversationId changes, load initial page & mark as read
  useEffect(() => {
    if (!activeConversationId) return;

    loadMessages(activeConversationId);

    // Mark as read immediately on open
    apiClient(`/api/messages/conversations/${activeConversationId}/read`, {
      method: "POST",
    }).catch(() => {});

    // Clear local unread count
    setConversations((prev) =>
      prev.map((c) => (c.id === activeConversationId ? { ...c, unreadCount: 0 } : c))
    );
  }, [activeConversationId, loadMessages]);

  // Load older messages for pagination
  const loadMoreMessages = useCallback(async () => {
    if (!activeConversationId || loadingMessages || !hasMoreMap[activeConversationId]) return;
    const currentList = messagesMap[activeConversationId] || [];
    if (currentList.length === 0) return;

    const oldest = currentList[0];
    await loadMessages(activeConversationId, oldest.createdAt);
  }, [activeConversationId, loadingMessages, hasMoreMap, messagesMap, loadMessages]);

  // Send message with optimistic UI
  const sendMessage = useCallback(
    async (content: string, replyToId?: string): Promise<boolean> => {
      if (!activeConversationId || !currentUserId || !content.trim()) return false;

      const trimmed = content.trim();
      const clientMessageId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `client_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      const optimisticMessage: ClientMessage = {
        id: clientMessageId,
        conversationId: activeConversationId,
        senderId: currentUserId,
        content: trimmed,
        messageType: "text",
        mediaUrls: [],
        clientMessageId,
        replyToId: replyToId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "pending",
      };

      // 1. Optimistic append
      setMessagesMap((prev) => ({
        ...prev,
        [activeConversationId]: [...(prev[activeConversationId] || []), optimisticMessage],
      }));

      // Update conversation preview and move to top of conversations list
      setConversations((prev) => {
        const existsIndex = prev.findIndex((c) => c.id === activeConversationId);
        if (existsIndex >= 0) {
          const existing = prev[existsIndex];
          const updated = {
            ...existing,
            lastMessage: {
              id: clientMessageId,
              content: trimmed,
              senderId: currentUserId,
              createdAt: optimisticMessage.createdAt,
              isFromMe: true,
            },
            updatedAt: optimisticMessage.createdAt,
          };
          const others = [...prev.slice(0, existsIndex), ...prev.slice(existsIndex + 1)];
          return [updated, ...others];
        }
        return prev;
      });

      // Stop typing
      if (isTypingActiveRef.current) {
        isTypingActiveRef.current = false;
        apiClient(`/api/messages/conversations/${activeConversationId}/typing`, {
          method: "POST",
          body: JSON.stringify({ isTyping: false }),
        }).catch(() => {});
      }

      // 2. Network persist
      try {
        const res = await apiClient<{ message: ClientMessage }>(
          `/api/messages/conversations/${activeConversationId}/messages`,
          {
            method: "POST",
            body: JSON.stringify({
              content: trimmed,
              clientMessageId,
              replyToId,
            }),
          }
        );

        if (res.data?.message) {
          const serverMessage = res.data.message;
          setMessagesMap((prev) => {
            const list = prev[activeConversationId] || [];
            return {
              ...prev,
              [activeConversationId]: list.map((m) =>
                m.clientMessageId === clientMessageId
                  ? { ...serverMessage, status: "sent" }
                  : m
              ),
            };
          });
          return true;
        }
        return false;
      } catch (err: any) {
        // Mark failed
        setMessagesMap((prev) => {
          const list = prev[activeConversationId] || [];
          return {
            ...prev,
            [activeConversationId]: list.map((m) =>
              m.clientMessageId === clientMessageId ? { ...m, status: "failed" } : m
            ),
          };
        });
        toast.error(err.message || "Xabar yuborilmadi. Qayta urinib ko'ring.");
        return false;
      }
    },
    [activeConversationId, currentUserId]
  );

  // Retry failed message
  const retryMessage = useCallback(
    async (clientMessageId: string) => {
      if (!activeConversationId) return;
      const list = messagesMap[activeConversationId] || [];
      const failed = list.find((m) => m.clientMessageId === clientMessageId);
      if (!failed) return;

      // Reset to pending
      setMessagesMap((prev) => ({
        ...prev,
        [activeConversationId]: (prev[activeConversationId] || []).map((m) =>
          m.clientMessageId === clientMessageId ? { ...m, status: "pending" } : m
        ),
      }));

      try {
        const res = await apiClient<{ message: ClientMessage }>(
          `/api/messages/conversations/${activeConversationId}/messages`,
          {
            method: "POST",
            body: JSON.stringify({
              content: failed.content,
              clientMessageId: failed.clientMessageId,
              replyToId: failed.replyToId,
            }),
          }
        );

        if (res.data?.message) {
          const serverMsg = res.data.message;
          setMessagesMap((prev) => ({
            ...prev,
            [activeConversationId]: (prev[activeConversationId] || []).map((m) =>
              m.clientMessageId === clientMessageId ? { ...serverMsg, status: "sent" } : m
            ),
          }));
        }
      } catch (err: any) {
        setMessagesMap((prev) => ({
          ...prev,
          [activeConversationId]: (prev[activeConversationId] || []).map((m) =>
            m.clientMessageId === clientMessageId ? { ...m, status: "failed" } : m
          ),
        }));
        toast.error(err.message || "Qayta yuborib bo'lmadi");
      }
    },
    [activeConversationId, messagesMap]
  );

  // Mark as read explicitly
  const markAsRead = useCallback(async (conversationId: string, messageId?: string) => {
    try {
      await apiClient(`/api/messages/conversations/${conversationId}/read`, {
        method: "POST",
        body: JSON.stringify({ messageId }),
      });
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
      );
    } catch {}
  }, []);

  // Send throttled typing indicator
  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!activeConversationId) return;

      if (isTyping) {
        if (!isTypingActiveRef.current) {
          isTypingActiveRef.current = true;
          apiClient(`/api/messages/conversations/${activeConversationId}/typing`, {
            method: "POST",
            body: JSON.stringify({ isTyping: true }),
          }).catch(() => {});
        }

        // Reset debounce timer
        if (typingDebounceTimerRef.current) clearTimeout(typingDebounceTimerRef.current);
        typingDebounceTimerRef.current = setTimeout(() => {
          isTypingActiveRef.current = false;
          apiClient(`/api/messages/conversations/${activeConversationId}/typing`, {
            method: "POST",
            body: JSON.stringify({ isTyping: false }),
          }).catch(() => {});
        }, 2500);
      } else {
        if (typingDebounceTimerRef.current) clearTimeout(typingDebounceTimerRef.current);
        if (isTypingActiveRef.current) {
          isTypingActiveRef.current = false;
          apiClient(`/api/messages/conversations/${activeConversationId}/typing`, {
            method: "POST",
            body: JSON.stringify({ isTyping: false }),
          }).catch(() => {});
        }
      }
    },
    [activeConversationId]
  );

  // Start or open a direct conversation
  const startDirectConversation = useCallback(
    async (targetIdentifier: string): Promise<string | null> => {
      try {
        const res = await apiClient<{ conversation: ConversationItem }>(
          "/api/messages/conversations",
          {
            method: "POST",
            body: JSON.stringify({ recipientHandle: targetIdentifier }),
          }
        );

        if (res.data?.conversation) {
          const conv = res.data.conversation;
          setConversations((prev) => {
            const exists = prev.some((c) => c.id === conv.id);
            return exists ? prev : [conv, ...prev];
          });
          setActiveConversationId(conv.id);
          return conv.id;
        }
        return null;
      } catch (err: any) {
        toast.error(err.message || "Suhbatni boshlashda xatolik");
        return null;
      }
    },
    []
  );

  const value: MessagesContextType = {
    conversations,
    loadingConversations,
    activeConversationId,
    setActiveConversationId,
    messages: activeMessages,
    loadingMessages,
    hasMoreMessages: activeHasMore,
    isPeerTyping,
    peerLastReadAt: activePeerRead.lastReadAt,
    peerLastReadMessageId: activePeerRead.lastReadMessageId,
    totalUnreadCount,
    isConnected,
    loadMoreMessages,
    sendMessage,
    retryMessage,
    markAsRead,
    sendTyping,
    startDirectConversation,
    refreshConversations,
  };

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

export function useMessages(): MessagesContextType {
  const ctx = useContext(MessagesContext);
  if (!ctx) {
    throw new Error("useMessages must be used within a MessagesProvider");
  }
  return ctx;
}
