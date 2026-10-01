"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Send,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  ArrowLeft,
  MessageSquare,
  ChevronDown,
  Loader2,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import { useI18n } from "@/lib/i18n/context";
import { useMessages, type ClientMessage, type ConversationItem } from "@/components/messages/messages-context";
import { UserAvatar } from "@/components/ui/user-avatar";
import { apiClient } from "@/lib/api/client";

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { session } = useAuth();
  const { t, localePath, formatRelativeTime } = useI18n();

  const {
    conversations,
    loadingConversations,
    activeConversationId,
    setActiveConversationId,
    messages,
    loadingMessages,
    hasMoreMessages,
    isPeerTyping,
    peerLastReadAt,
    isConnected,
    loadMoreMessages,
    sendMessage,
    retryMessage,
    sendTyping,
    startDirectConversation,
    refreshConversations,
  } = useMessages();

  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<
    Array<{ id: string; name: string; handle: string; avatarUrl?: string; role: string }>
  >([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Composer states
  const [inputContent, setInputContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastScrollHeightRef = useRef<number>(0);

  const targetTo = searchParams.get("to");
  const targetConv = searchParams.get("conv");

  // Handle URL deep links: ?to=handle or ?conv=id
  useEffect(() => {
    if (targetConv && targetConv !== activeConversationId) {
      setActiveConversationId(targetConv);
    } else if (targetTo && !activeConversationId) {
      startDirectConversation(targetTo).then((convId) => {
        if (convId) {
          setActiveConversationId(convId);
        }
      });
    }
  }, [targetTo, targetConv, activeConversationId, setActiveConversationId, startDirectConversation]);

  // Active conversation object
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConversationId) || null;
  }, [conversations, activeConversationId]);

  // User search when typing in search input
  useEffect(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed || trimmed.length < 2) {
      setUserSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const res = await apiClient<{
          results: { users: Array<{ id: string; name: string; handle: string; avatarUrl?: string; role: string }> };
        }>(`/api/search?q=${encodeURIComponent(trimmed)}&type=users`);
        if (res.data?.results?.users) {
          // Exclude self
          setUserSearchResults(
            res.data.results.users.filter((u) => u.id !== session.user?.id)
          );
        }
      } catch {
        setUserSearchResults([]);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, session.user?.id]);

  // Filtered conversation list
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase().trim();
    return conversations.filter(
      (c) =>
        c.peerUser.name.toLowerCase().includes(q) ||
        c.peerUser.handle.toLowerCase().includes(q) ||
        (c.lastMessage?.content && c.lastMessage.content.toLowerCase().includes(q))
    );
  }, [conversations, searchQuery]);

  // Scroll to bottom helper
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Scroll behavior: auto-scroll when new messages arrive if near bottom
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;

    if (isNearBottom || messages.length <= 1) {
      scrollToBottom(messages.length <= 1 ? "auto" : "smooth");
      setShowScrollBottom(false);
    } else {
      setShowScrollBottom(true);
    }
  }, [messages.length]);

  // Scroll listener for "Scroll to bottom" button & pagination
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    setShowScrollBottom(!isNearBottom);

    // If scrolled to top and has more, load older messages
    if (scrollTop < 30 && hasMoreMessages && !loadingMessages) {
      lastScrollHeightRef.current = scrollHeight;
      loadMoreMessages().then(() => {
        // Maintain visual scroll position
        if (scrollContainerRef.current) {
          const newHeight = scrollContainerRef.current.scrollHeight;
          scrollContainerRef.current.scrollTop = newHeight - lastScrollHeightRef.current;
        }
      });
    }
  };

  // Handle composer submission
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputContent.trim() || isSubmitting) return;

    const content = inputContent;
    setInputContent("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    setIsSubmitting(true);
    try {
      await sendMessage(content);
      scrollToBottom("smooth");
    } finally {
      setIsSubmitting(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  // Handle Enter to send, Shift+Enter for new line
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputContent(e.target.value);
    sendTyping(e.target.value.length > 0);

    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  // Format message timestamp
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: Array<{ dateLabel: string; items: ClientMessage[] }> = [];
    let currentDate = "";
    let currentGroup: ClientMessage[] = [];

    for (const msg of messages) {
      const msgDate = new Date(msg.createdAt).toLocaleDateString([], {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      if (msgDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ dateLabel: currentDate, items: currentGroup });
        }
        currentDate = msgDate;
        currentGroup = [msg];
      } else {
        currentGroup.push(msg);
      }
    }

    if (currentGroup.length > 0) {
      groups.push({ dateLabel: currentDate, items: currentGroup });
    }

    return groups;
  }, [messages]);

  return (
    <div className="h-full w-full flex bg-white dark:bg-slate-950 overflow-hidden select-none">
      {/* ─────────────────────────────────────────────────────────────
          LEFT PANE: Conversation List & User Search
         ───────────────────────────────────────────────────────────── */}
      <aside
        className={`${
          activeConversationId ? "hidden md:flex" : "flex"
        } w-full md:w-80 lg:w-96 flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 shrink-0 h-full overflow-hidden`}
      >
        {/* Header & Status Indicator */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MessageSquare size={18} />
              <span>{t("nav.messages") || "Xabarlar"}</span>
            </h1>
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                isConnected ? "bg-emerald-500 shadow-xs shadow-emerald-500/50" : "bg-amber-500"
              }`}
              title={isConnected ? "Haqiqiy vaqtda ulangan" : "Qayta ulanmoqda..."}
            />
          </div>

          <button
            type="button"
            onClick={() => refreshConversations()}
            title="Yangilash"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={loadingConversations ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Suhbat yoki foydalanuvchini qidiring..."
              className="w-full h-8.5 pl-8.5 pr-3 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-100 placeholder:text-slate-400 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Conversation List / Search Results Scroll Area */}
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 [scrollbar-width:thin]">
          {/* User Search Results Dropdown when typing query */}
          {searchQuery.trim().length >= 2 && userSearchResults.length > 0 && (
            <div className="p-2 bg-slate-100/60 dark:bg-slate-800/40">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 py-1 block">
                Yangi suhbat boshlash:
              </span>
              {userSearchResults.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={async () => {
                    const convId = await startDirectConversation(u.handle);
                    if (convId) {
                      setActiveConversationId(convId);
                      setSearchQuery("");
                    }
                  }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
                >
                  <UserAvatar name={u.name} avatarUrl={u.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {u.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">@{u.handle}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {loadingConversations && conversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin text-slate-500" />
              <span>Suhbatlar yuklanmoqda...</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-200/50 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <MessageSquare size={18} />
              </div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {searchQuery ? "Hech qanday suhbat topilmadi" : "Hozircha suhbatlar yo'q"}
              </p>
              <p className="text-[11px] text-slate-400">
                Istalgan foydalanuvchi profilidan "Xabarlar" tugmasini bosing yoki yuqoridagi qidiruvdan foydalaning.
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv.id === activeConversationId;
              const hasUnread = conv.unreadCount > 0;

              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => {
                    setActiveConversationId(conv.id);
                    const params = new URLSearchParams(window.location.search);
                    params.set("conv", conv.id);
                    params.delete("to");
                    router.replace(`${window.location.pathname}?${params.toString()}`);
                  }}
                  className={`w-full p-3 flex items-center gap-3 transition-colors text-left cursor-pointer ${
                    isSelected
                      ? "bg-slate-200/80 dark:bg-slate-800/80 font-medium"
                      : "hover:bg-slate-100/70 dark:hover:bg-slate-800/40"
                  }`}
                >
                  {/* Peer Avatar with Presence dot */}
                  <div className="relative shrink-0">
                    <UserAvatar
                      name={conv.peerUser.name}
                      avatarUrl={conv.peerUser.avatarUrl}
                      size="md"
                    />
                    {conv.peerUser.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                    )}
                  </div>

                  {/* Body */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {conv.peerUser.name}
                      </span>
                      {conv.lastMessage && (
                        <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                          {formatTime(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`text-[11px] truncate ${
                          hasUnread
                            ? "font-semibold text-slate-950 dark:text-white"
                            : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {conv.lastMessage ? (
                          <>
                            {conv.lastMessage.isFromMe && (
                              <span className="text-slate-400 font-normal">Siz: </span>
                            )}
                            {conv.lastMessage.content}
                          </>
                        ) : (
                          <span className="italic text-slate-400">Yangi suhbat</span>
                        )}
                      </p>

                      {hasUnread && (
                        <span className="shrink-0 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                          {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          RIGHT PANE: Active Chat & Message History
         ───────────────────────────────────────────────────────────── */}
      <main
        className={`${
          activeConversationId ? "flex" : "hidden md:flex"
        } flex-1 flex-col h-full min-h-0 bg-white dark:bg-slate-950 relative overflow-hidden`}
      >
        {activeConversation ? (
          <>
            {/* Chat Top Header */}
            <div className="h-14 shrink-0 px-3 sm:px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm z-10">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Mobile Back Button */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveConversationId(null);
                    const params = new URLSearchParams(window.location.search);
                    params.delete("conv");
                    params.delete("to");
                    router.replace(`${window.location.pathname}?${params.toString()}`);
                  }}
                  className="md:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Orqaga"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="relative shrink-0">
                  <UserAvatar
                    name={activeConversation.peerUser.name}
                    avatarUrl={activeConversation.peerUser.avatarUrl}
                    size="sm"
                  />
                  {activeConversation.peerUser.isOnline && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white dark:border-slate-900" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {activeConversation.peerUser.name}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate">
                      @{activeConversation.peerUser.handle}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    {activeConversation.peerUser.isOnline ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        Onlayn
                      </span>
                    ) : activeConversation.peerUser.lastSeenAt ? (
                      <span>
                        Oxirgi marta {formatRelativeTime(activeConversation.peerUser.lastSeenAt)}
                      </span>
                    ) : (
                      <span>Oflayn</span>
                    )}
                  </div>
                </div>
              </div>

              {/* View Profile Action */}
              <Link
                href={localePath(`/dashboard/profile?user=${activeConversation.peerUser.handle}`)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Profilni ko'rish"
              >
                <span className="hidden sm:inline">Profil</span>
                <ExternalLink size={13} />
              </Link>
            </div>

            {/* Chat Messages Scroll Container */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-slate-50/30 dark:bg-slate-950 overscroll-contain [scrollbar-width:thin]"
            >
              {/* Load older messages indicator */}
              {loadingMessages && (
                <div className="text-center py-2">
                  <Loader2 size={16} className="animate-spin text-slate-400 mx-auto" />
                </div>
              )}

              {hasMoreMessages && !loadingMessages && (
                <div className="text-center py-1">
                  <button
                    type="button"
                    onClick={() => loadMoreMessages()}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
                  >
                    Oldingi xabarlarni yuklash
                  </button>
                </div>
              )}

              {/* Empty state for brand new conversation */}
              {messages.length === 0 && !loadingMessages && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <UserIcon size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {activeConversation.peerUser.name} bilan suhbat
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Birinchi xabaringizni yuborib suhbatni boshlang!
                    </p>
                  </div>
                </div>
              )}

              {/* Grouped Messages By Date */}
              {groupedMessages.map((group) => (
                <div key={group.dateLabel} className="space-y-2">
                  {/* Date Divider */}
                  <div className="flex items-center justify-center my-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                      {group.dateLabel}
                    </span>
                  </div>

                  {group.items.map((msg) => {
                    const isFromMe = msg.senderId === session.user?.id;
                    const isReadByPeer =
                      isFromMe &&
                      peerLastReadAt &&
                      new Date(msg.createdAt).getTime() <= new Date(peerLastReadAt).getTime();

                    return (
                      <div
                        key={msg.clientMessageId || msg.id}
                        className={`flex flex-col ${isFromMe ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed break-words shadow-2xs ${
                            isFromMe
                              ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 rounded-tr-xs"
                              : "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-xs"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>

                          {/* Time & Read Receipts */}
                          <div
                            className={`flex items-center justify-end gap-1 mt-1 text-[9px] select-none ${
                              isFromMe
                                ? "text-slate-300 dark:text-slate-600"
                                : "text-slate-400 dark:text-slate-500"
                            }`}
                          >
                            <span>{formatTime(msg.createdAt)}</span>

                            {isFromMe && (
                              <span className="inline-flex items-center ml-0.5">
                                {msg.status === "pending" ? (
                                  <Clock size={11} className="animate-pulse" />
                                ) : msg.status === "failed" ? (
                                  <button
                                    type="button"
                                    onClick={() => msg.clientMessageId && retryMessage(msg.clientMessageId)}
                                    title="Qayta urinish"
                                    className="text-rose-400 hover:underline flex items-center gap-0.5"
                                  >
                                    <AlertCircle size={11} />
                                    <span>Qayta urinish</span>
                                  </button>
                                ) : isReadByPeer ? (
                                  <CheckCheck size={13} className="text-emerald-400 dark:text-emerald-600" />
                                ) : (
                                  <Check size={13} />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Peer Typing Indicator Bubble */}
              {isPeerTyping && (
                <div className="flex items-center gap-2 pt-1 animate-in fade-in duration-200">
                  <div className="px-3 py-1.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs flex items-center gap-1.5 shadow-2xs">
                    <span className="text-[11px] font-medium">
                      {activeConversation.peerUser.name} yozmoqda
                    </span>
                    <span className="flex items-center gap-0.5">
                      <span className="w-1 h-1 rounded-full bg-slate-500 animate-bounce" />
                      <span className="w-1 h-1 rounded-full bg-slate-500 animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1 h-1 rounded-full bg-slate-500 animate-bounce [animation-delay:0.4s]" />
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Scroll to bottom button */}
            {showScrollBottom && (
              <button
                type="button"
                onClick={() => scrollToBottom("smooth")}
                className="absolute bottom-20 right-6 p-2 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-lg hover:scale-105 active:scale-95 transition-all z-20 cursor-pointer flex items-center gap-1 text-xs font-semibold px-3"
              >
                <span>Yangi xabarlar</span>
                <ChevronDown size={14} />
              </button>
            )}

            {/* Message Composer */}
            <form
              onSubmit={handleSend}
              className="shrink-0 p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-end gap-2"
            >
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={inputContent}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  maxLength={4000}
                  placeholder="Xabar yozing (Enter — yuborish, Shift+Enter — yangi qator)..."
                  className="w-full max-h-32 px-3.5 py-2.5 text-xs bg-slate-100/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-100 resize-none transition-all placeholder:text-slate-400"
                />
              </div>

              <button
                type="submit"
                disabled={!inputContent.trim() || isSubmitting}
                className="h-9 w-9 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors cursor-pointer"
                title="Yuborish"
              >
                {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </form>
          </>
        ) : (
          /* Empty Chat Area on Desktop when no conversation selected */
          <div className="h-full hidden md:flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400">
              <MessageSquare size={28} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Suhbatni tanlang
              </h2>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Chap tomondagi ro'yxatdan suhbatni tanlang yoki yangi xabar yozish uchun qidiring.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
