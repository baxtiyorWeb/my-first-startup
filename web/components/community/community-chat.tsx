"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Users,
  Bell,
  BellOff,
  MoreVertical,
  ArrowDown,
  Reply,
  Pencil,
  Trash2,
  Check,
  Loader2,
  RotateCcw,
  AlertCircle,
  X,
  Link2,
  CheckCheck,
  FileText,
  Plus,
  ArrowUp,
  Menu,
  Pin,
  ChevronRight,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { UserAvatar } from "@/components/ui/user-avatar";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { useShell } from "@/components/layout/shell-context";
import { CommunityComposer } from "./community-composer";
import { CommunityInfo } from "./community-info";
import { useCommunity } from "./use-community";
import {
  COMMUNITY_REACTION_OPTIONS,
  type CommunityMessage,
  type CommunityViewer,
} from "./types";

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dateLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / (24 * 60 * 60 * 1000)
  );
  if (dayDiff === 0) return "Bugun";
  if (dayDiff === 1) return "Kecha";
  return date.toLocaleDateString("uz-UZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function CommunityChat({ viewer }: { viewer: CommunityViewer }) {
  const community = useCommunity(viewer);
  const { toggleSidebar, toggleMobileNav } = useShell();
  const [replyTo, setReplyTo] = useState<CommunityMessage | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [reactionFor, setReactionFor] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [newCount, setNewCount] = useState(0);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const previousCount = useRef(0);
  const initialScrolled = useRef(false);

  // Ctrl+K / Cmd+K focuses the inline community search bar
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (window.innerWidth < 768) {
          setSearchOpen(true);
        }
        requestAnimationFrame(() => searchInputRef.current?.focus());
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const visibleMessages = community.searchResults ?? community.messages;

  const groups = useMemo(() => {
    const result: Array<{ label: string; items: CommunityMessage[] }> = [];
    for (const message of visibleMessages) {
      const label = dateLabel(message.createdAt);
      const last = result[result.length - 1];
      if (last && last.label === label) {
        last.items.push(message);
      } else {
        result.push({ label, items: [message] });
      }
    }
    return result;
  }, [visibleMessages]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
  };

  // Initial scroll after first load
  useEffect(() => {
    if (initialScrolled.current || community.isLoading || visibleMessages.length === 0) {
      return;
    }
    initialScrolled.current = true;
    requestAnimationFrame(() => scrollToBottom("auto"));
  }, [community.isLoading, visibleMessages.length]);

  // Auto-scroll for new messages, or count them when scrolled up
  useEffect(() => {
    if (community.messages.length === 0) {
      previousCount.current = 0;
      return;
    }
    const added = community.messages.length - previousCount.current;
    previousCount.current = community.messages.length;

    if (added <= 0) return;
    if (isNearBottomRef.current) {
      scrollToBottom("smooth");
      setNewCount(0);
    } else if (community.searchResults === null) {
      setNewCount((prev) => prev + added);
    }
  }, [community.messages.length, community.searchResults]);

  // Read receipts for the newest visible message
  const lastMessage = community.messages[community.messages.length - 1];
  const markRead = community.markRead;
  const activeSearch = community.searchResults !== null;
  useEffect(() => {
    if (!lastMessage || activeSearch) return;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    markRead(lastMessage.id);
  }, [lastMessage, activeSearch, markRead]);

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element) return;
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    isNearBottomRef.current = distance < 160;
    if (isNearBottomRef.current && newCount > 0) setNewCount(0);

    if (element.scrollTop < 80 && community.hasMore && !community.isLoadingMore) {
      const previousHeight = element.scrollHeight;
      const previousTop = element.scrollTop;
      community.loadMore().then(() => {
        requestAnimationFrame(() => {
          if (!scrollRef.current) return;
          scrollRef.current.scrollTop =
            scrollRef.current.scrollHeight - previousHeight + previousTop;
        });
      });
    }
  };

  const jumpToMessage = (messageId: string) => {
    const element = document.getElementById(`msg-${messageId}`);
    if (!element) {
      toast.info("Xabar hozirgi sahifada topilmadi. Oldingi xabarlarni yuklang.");
      return;
    }
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(messageId);
    setTimeout(() => setHighlightId((prev) => (prev === messageId ? null : prev)), 2200);
  };

  const handleSend = async ({
    content,
    attachments,
  }: {
    content: string;
    attachments: CommunityMessage["attachments"];
  }) => {
    try {
      await community.sendMessage({
        content,
        attachments,
        replyToId: replyTo?.id || null,
      });
      setReplyTo(null);
      isNearBottomRef.current = true;
      setNewCount(0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Xabar yuborilmadi");
      throw error;
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    setReactionFor(null);
    try {
      await community.toggleReaction(messageId, emoji);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reaksiya qo'yilmadi");
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!window.confirm("Bu xabarni o'chirmoqchimisiz?")) return;
    try {
      await community.deleteMessage(messageId);
      toast.success("Xabar o'chirildi");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Xabar o'chirilmadi");
    }
  };

  const submitEdit = async () => {
    if (!editing) return;
    const text = editing.text.trim();
    if (!text) {
      toast.error("Xabar matni bo'sh bo'lishi mumkin emas");
      return;
    }
    try {
      await community.editMessage(editing.id, text);
      setEditing(null);
      toast.success("Xabar tahrirlandi");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Xabar tahrirlanmadi");
    }
  };

  const copyLink = async () => {
    setMenuOpen(false);
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Guruh havolasi nusxalandi");
    } catch {
      toast.error("Havolani nusxalab bo'lmadi");
    }
  };

  const markAllRead = async () => {
    setMenuOpen(false);
    try {
      await community.markRead();
      toast.success("Barcha xabarlar o'qilgan deb belgilandi");
    } catch {
      toast.error("Belgilab bo'lmadi");
    }
  };

  const overview = community.overview;

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-white dark:bg-[#070a0f] text-[#0f1419] dark:text-zinc-100">
      <section className="flex min-w-0 flex-1 flex-col">
        {/* Top Community Header */}
        <header className="flex h-[64px] shrink-0 items-center justify-between gap-3 border-b border-[#cfd9de] dark:border-white/[0.06] bg-white dark:bg-[#070a0f] px-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined" && window.innerWidth < 768) {
                  toggleMobileNav();
                } else {
                  toggleSidebar();
                }
              }}
              aria-label="Menyuni almashtirish"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#536471] dark:text-zinc-400 transition-colors hover:bg-[#eff3f4] dark:hover:bg-white/[0.06] hover:text-[#0f1419] dark:hover:text-white cursor-pointer"
            >
              <Menu size={18} />
            </button>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#cfd9de] dark:border-[#2dd4bf]/25 bg-[#0b0e14]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Geters Community" className="h-6 w-6 object-contain" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-[14.5px] font-bold text-[#0f1419] dark:text-white leading-tight">
                  {overview?.community.name || "Geters Community"}
                </h1>
                {overview?.community.verified && <VerifiedBadge size={15} />}
              </div>
              <p className="truncate text-[11px] text-[#536471] dark:text-zinc-400 flex items-center gap-1.5">
                <span>
                  {overview
                    ? `${overview.memberCount.toLocaleString("uz-UZ")} a'zo · Ommaviy guruh`
                    : "Yuklanmoqda..."}
                </span>
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${community.isConnected ? "bg-[#0d9488] dark:bg-[#2dd4bf]" : "bg-amber-400"
                    }`}
                  title={community.isConnected ? "Jonli ulangan" : "Ulanmoqda"}
                />
              </p>
            </div>
          </div>

          {/* Center Inline Search Pill (Desktop) */}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              community.runSearch(searchInput);
            }}
            className="hidden md:flex flex-1 max-w-[360px] items-center gap-2 rounded-full border border-[#cfd9de] dark:border-white/[0.08] bg-[#f7f9f9] dark:bg-[#0f141b] px-3.5 h-9 focus-within:border-[#0d9488] dark:focus-within:border-[#2dd4bf]/45 transition-colors"
          >
            <Search size={14} className="shrink-0 text-[#8b98a5] dark:text-zinc-500" />
            <input
              ref={searchInputRef}
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
                if (!event.target.value.trim() && community.searchResults !== null) {
                  community.clearSearch();
                }
              }}
              placeholder="Guruh ichida qidirish..."
              aria-label="Guruh ichida qidirish"
              className="w-full bg-transparent text-[12.5px] text-[#0f1419] dark:text-zinc-100 placeholder:text-[#8b98a5] dark:placeholder:text-zinc-500 focus:outline-none"
            />
            {searchInput ? (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  community.clearSearch();
                }}
                aria-label="Qidiruvni tozalash"
                className="text-[#536471] dark:text-zinc-400 hover:text-[#0f1419] dark:hover:text-white cursor-pointer"
              >
                <X size={13} />
              </button>
            ) : (
              <kbd className="shrink-0 rounded-md border border-[#cfd9de] dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-[#536471] dark:text-zinc-400">
                Ctrl + K
              </kbd>
            )}
          </form>

          {/* Right Header Actions */}
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setSearchOpen((prev) => !prev);
                if (searchOpen) {
                  community.clearSearch();
                  setSearchInput("");
                }
              }}
              aria-label="Xabarlarni qidirish"
              title="Qidirish"
              className="md:hidden rounded-xl p-2 text-[#536471] dark:text-zinc-400 transition-colors hover:bg-[#eff3f4] dark:hover:bg-white/[0.06] hover:text-[#0f1419] dark:hover:text-white cursor-pointer"
            >
              <Search size={17} />
            </button>
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              aria-label="A'zolar va guruh ma'lumoti"
              title="A'zolar"
              className="rounded-xl p-2 text-[#536471] dark:text-zinc-400 transition-colors hover:bg-[#eff3f4] dark:hover:bg-white/[0.06] hover:text-[#0f1419] dark:hover:text-white cursor-pointer"
            >
              <Users size={17} />
            </button>
            <button
              type="button"
              onClick={() => community.toggleMute()}
              aria-label={overview?.isMuted ? "Bildirishnomalarni yoqish" : "Bildirishnomalarni o'chirish"}
              title={overview?.isMuted ? "Bildirishnomalar o'chirilgan" : "Bildirishnomalar yoqilgan"}
              className={`rounded-xl p-2 transition-colors hover:bg-[#eff3f4] dark:hover:bg-white/[0.06] cursor-pointer ${overview?.isMuted ? "text-amber-500 dark:text-amber-400" : "text-[#536471] dark:text-zinc-400 hover:text-[#0f1419] dark:hover:text-white"
                }`}
            >
              {overview?.isMuted ? <BellOff size={17} /> : <Bell size={17} />}
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label="Qo'shimcha amallar"
                title="Boshqa"
                className="rounded-xl p-2 text-[#536471] dark:text-zinc-400 transition-colors hover:bg-[#eff3f4] dark:hover:bg-white/[0.06] hover:text-[#0f1419] dark:hover:text-white cursor-pointer"
              >
                <MoreVertical size={17} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-10 z-40 w-56 overflow-hidden rounded-xl border border-[#cfd9de] dark:border-white/10 bg-white dark:bg-[#12161f] py-1 shadow-2xl">
                    <button
                      type="button"
                      onClick={copyLink}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-[#0f1419] dark:text-zinc-200 hover:bg-[#f7f9f9] dark:hover:bg-white/[0.06] cursor-pointer"
                    >
                      <Link2 size={14} /> Havolani nusxalash
                    </button>
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-[#0f1419] dark:text-zinc-200 hover:bg-[#f7f9f9] dark:hover:bg-white/[0.06] cursor-pointer"
                    >
                      <CheckCheck size={14} /> Barchasini o&apos;qilgan qilish
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        community.refresh();
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-[#0f1419] dark:text-zinc-200 hover:bg-[#f7f9f9] dark:hover:bg-white/[0.06] cursor-pointer"
                    >
                      <RotateCcw size={14} /> Xabarlarni yangilash
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setInfoOpen(true);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-[#0f1419] dark:text-zinc-200 hover:bg-[#f7f9f9] dark:hover:bg-white/[0.06] xl:hidden cursor-pointer"
                    >
                      <Users size={14} /> Guruh haqida
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Search bar */}
        {searchOpen && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              community.runSearch(searchInput);
            }}
            className="flex shrink-0 items-center gap-2 border-b border-white/[0.06] px-3 py-2 sm:px-5"
          >
            <Search size={15} className="text-zinc-500" />
            <input
              autoFocus
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Xabarlar ichidan qidirish..."
              aria-label="Xabarlar ichidan qidirish"
              className="h-8 flex-1 bg-transparent text-[12.5px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-teal-400/15 px-3 py-1.5 text-[11.5px] font-semibold text-teal-300 hover:bg-teal-400/25"
            >
              Qidirish
            </button>
            {community.searchResults !== null && (
              <button
                type="button"
                onClick={() => {
                  community.clearSearch();
                  setSearchInput("");
                }}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"
                aria-label="Qidiruvni tozalash"
              >
                <X size={14} />
              </button>
            )}
          </form>
        )}

        {(community.searchQuery || community.isSearching) && (
          <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] bg-teal-400/[0.04] px-4 py-1.5 text-[11px] text-zinc-400">
            <span>
              {community.isSearching
                ? "Qidirilmoqda..."
                : `"${community.searchQuery}" bo'yicha ${community.searchResults?.length ?? 0} natija`}
            </span>
          </div>
        )}

        {community.searchError && (
          <div className="shrink-0 bg-rose-500/10 px-4 py-2 text-[11.5px] text-rose-300">
            {community.searchError}
          </div>
        )}

        {/* Messages */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 [scrollbar-width:thin] sm:px-6"
        >
          {community.isLoading ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-[12px] text-zinc-500">
              <Loader2 size={20} className="animate-spin text-teal-400" />
              Xabarlar yuklanmoqda...
            </div>
          ) : community.error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <AlertCircle size={24} className="text-rose-400" />
              <p className="max-w-sm text-[12.5px] text-zinc-300">{community.error}</p>
              <button
                type="button"
                onClick={() => community.refresh()}
                className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-white/[0.1]"
              >
                Qayta urinish
              </button>
            </div>
          ) : visibleMessages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.05] text-zinc-500">
                <Users size={20} />
              </div>
              <p className="text-[13px] font-semibold text-zinc-200">
                {community.searchResults !== null
                  ? "Natija topilmadi"
                  : "Hozircha xabarlar yo'q"}
              </p>
              <p className="max-w-xs text-[11.5px] text-zinc-500">
                {community.searchResults !== null
                  ? "Boshqa so'z bilan qidirib ko'ring."
                  : "Birinchi bo'lib guruhga xabar yozing."}
              </p>
            </div>
          ) : (
            <>
              {community.hasMore && community.searchResults === null && (
                <div className="mb-3 flex justify-center">
                  <button
                    type="button"
                    onClick={() => community.loadMore()}
                    disabled={community.isLoadingMore}
                    className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-white/[0.07] hover:text-white disabled:opacity-50"
                  >
                    {community.isLoadingMore ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <ArrowUp size={12} />
                    )}
                    Oldingi xabarlar
                  </button>
                </div>
              )}

              {groups.map((group) => (
                <div key={`${group.label}_${group.items[0].id}`}>
                  <div className="my-4 flex justify-center">
                    <span className="rounded-full border border-[#cfd9de] dark:border-white/[0.08] bg-[#f7f9f9] dark:bg-[#11161d] px-3.5 py-1 text-[11px] font-semibold text-[#536471] dark:text-zinc-300">
                      {group.label}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {group.items.map((message) => {
                      const isHighlighted = highlightId === message.id;
                      const isEditing = editing?.id === message.id;

                      return (
                        <div
                          key={message.id}
                          id={`msg-${message.id}`}
                          className={`group flex items-start gap-3 rounded-2xl transition-colors ${isHighlighted ? "bg-[#0d9488]/10 dark:bg-[#2dd4bf]/10 p-1.5 ring-1 ring-[#0d9488]/35 dark:ring-[#2dd4bf]/35" : ""
                            }`}
                        >
                          <UserAvatar
                            name={message.sender.name}
                            avatarUrl={message.sender.avatarUrl}
                            size="md"
                          />

                          <div className="min-w-0 flex-1 max-w-[680px]">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[13px] font-bold text-[#0f1419] dark:text-white">
                                {message.sender.name}
                              </span>
                              {message.sender.verified && <VerifiedBadge size={14} />}
                              <span className="text-[11px] text-[#536471] dark:text-zinc-500">
                                {formatTime(message.createdAt)}
                              </span>
                              {message.editedAt && (
                                <span className="text-[10px] text-[#536471] dark:text-zinc-500">· tahrirlangan</span>
                              )}
                              {message.pending && (
                                <Loader2 size={11} className="animate-spin text-[#536471] dark:text-zinc-400" />
                              )}
                              {message.failed && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await community.retryMessage(message);
                                    } catch (error) {
                                      toast.error(
                                        error instanceof Error ? error.message : "Yuborilmadi"
                                      );
                                    }
                                  }}
                                  className="flex items-center gap-1 text-[10.5px] font-semibold text-rose-500 dark:text-rose-400 hover:underline cursor-pointer"
                                >
                                  <AlertCircle size={11} /> Qayta yuborish
                                </button>
                              )}
                            </div>

                            <div
                              className={`mt-1.5 rounded-2xl rounded-tl-md border px-3.5 py-2.5 ${message.isMine
                                  ? "border-[#14b8a6]/40 dark:border-[#14b8a6]/35 bg-[#e6faf7] dark:bg-[#0b2326]"
                                  : "border-[#cfd9de] dark:border-white/[0.08] bg-[#f7f9f9] dark:bg-[#151a22]"
                                }`}
                            >
                              {message.replyTo && (
                                <button
                                  type="button"
                                  onClick={() => jumpToMessage(message.replyTo!.id)}
                                  className="mb-2.5 flex w-full items-center gap-2.5 rounded-xl border border-[#cfd9de] dark:border-white/[0.06] border-l-2 border-l-[#0d9488] dark:border-l-[#2dd4bf] bg-white/80 dark:bg-[#101c20] px-2.5 py-2 text-left transition-colors hover:bg-white dark:hover:bg-[#142429] cursor-pointer"
                                >
                                  <UserAvatar
                                    name={message.replyTo.senderName || "F"}
                                    size="xs"
                                  />
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-[11px] font-bold text-[#0f1419] dark:text-white truncate">
                                      {message.replyTo.senderName || "Foydalanuvchi"}
                                    </span>
                                    <span className="line-clamp-1 block text-[11.5px] text-[#536471] dark:text-zinc-400">
                                      {message.replyTo.isDeleted
                                        ? "Xabar o'chirilgan"
                                        : message.replyTo.content ||
                                        (message.replyTo.attachmentKind === "image"
                                          ? "📷 Rasm"
                                          : message.replyTo.attachmentKind === "video"
                                            ? "🎬 Video"
                                            : "📎 Fayl")}
                                    </span>
                                  </span>
                                </button>
                              )}

                              {isEditing ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={editing.text}
                                    onChange={(event) =>
                                      setEditing({ id: message.id, text: event.target.value })
                                    }
                                    rows={2}
                                    aria-label="Xabarni tahrirlash"
                                    className="w-full resize-none rounded-lg bg-black/30 px-2 py-1.5 text-[12.5px] text-zinc-100 focus:outline-none focus:ring-1 focus:ring-teal-400/50"
                                  />
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditing(null)}
                                      className="rounded-md px-2 py-1 text-[11px] text-zinc-400 hover:text-white"
                                    >
                                      Bekor qilish
                                    </button>
                                    <button
                                      type="button"
                                      onClick={submitEdit}
                                      className="flex items-center gap-1 rounded-md bg-teal-400 px-2 py-1 text-[11px] font-semibold text-slate-950 hover:bg-teal-300"
                                    >
                                      <Check size={11} /> Saqlash
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                message.content && (
                                  <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[#0f1419] dark:text-zinc-100">
                                    {message.content}
                                  </p>
                                )
                              )}

                              {message.attachments.length > 0 && (
                                <div className="mt-2 space-y-2">
                                  {message.attachments.some((item) => item.kind === "image") && (
                                    <div
                                      className={`grid gap-1.5 ${message.attachments.filter((item) => item.kind === "image")
                                          .length > 1
                                          ? "grid-cols-2"
                                          : "grid-cols-1"
                                        }`}
                                    >
                                      {message.attachments
                                        .filter((item) => item.kind === "image")
                                        .map((item) => (
                                          <a
                                            key={item.url}
                                            href={item.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="block overflow-hidden rounded-xl border border-white/[0.06]"
                                          >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                              src={item.url}
                                              alt={item.name}
                                              loading="lazy"
                                              className="max-h-72 w-full object-cover"
                                            />
                                          </a>
                                        ))}
                                    </div>
                                  )}

                                  {message.attachments
                                    .filter((item) => item.kind === "video")
                                    .map((item) => (
                                      <video
                                        key={item.url}
                                        src={item.url}
                                        controls
                                        preload="metadata"
                                        className="max-h-72 w-full rounded-xl border border-white/[0.06] bg-black"
                                      />
                                    ))}

                                  {message.attachments
                                    .filter((item) => item.kind === "file")
                                    .map((item) => (
                                      <a
                                        key={item.url}
                                        href={item.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        download={item.name}
                                        className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-black/20 px-2.5 py-2 transition-colors hover:border-teal-400/30"
                                      >
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-400/10 text-teal-300">
                                          <FileText size={14} />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                          <span className="block truncate text-[11.5px] font-semibold text-zinc-200">
                                            {item.name}
                                          </span>
                                          <span className="block text-[10px] text-zinc-500">
                                            {formatBytes(item.sizeBytes)} ·{" "}
                                            {item.mimeType || "fayl"}
                                          </span>
                                        </span>
                                      </a>
                                    ))}
                                </div>
                              )}
                            </div>

                            {/* Reactions + actions */}
                            <div className="mt-1 flex flex-wrap items-center gap-1">
                              {message.reactions.map((reaction) => (
                                <button
                                  key={reaction.emoji}
                                  type="button"
                                  onClick={() => handleReaction(message.id, reaction.emoji)}
                                  aria-label={`${reaction.emoji} reaksiyasi (${reaction.count})`}
                                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors cursor-pointer ${reaction.reacted
                                      ? "border-[#0d9488]/45 dark:border-[#2dd4bf]/45 bg-[#e6faf7] dark:bg-[#0c272c] text-[#0d9488] dark:text-[#2dd4bf]"
                                      : "border-[#cfd9de] dark:border-white/[0.08] bg-[#f7f9f9] dark:bg-white/[0.04] text-[#0f1419] dark:text-zinc-300 hover:border-[#8b98a5] dark:hover:border-white/20"
                                    }`}
                                >
                                  <span>{reaction.emoji}</span>
                                  <span>{reaction.count}</span>
                                </button>
                              ))}

                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setReactionFor((prev) =>
                                      prev === message.id ? null : message.id
                                    )
                                  }
                                  aria-label="Reaksiya qo'shish"
                                  className="flex h-5 w-5 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-zinc-400 transition-colors hover:border-teal-400/40 hover:text-teal-300"
                                >
                                  <Plus size={11} />
                                </button>
                                {reactionFor === message.id && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-30"
                                      onClick={() => setReactionFor(null)}
                                    />
                                    <div className="absolute bottom-7 left-0 z-40 flex gap-0.5 rounded-xl border border-white/10 bg-[#12161f] p-1 shadow-2xl">
                                      {COMMUNITY_REACTION_OPTIONS.map((emoji) => (
                                        <button
                                          key={emoji}
                                          type="button"
                                          onClick={() => handleReaction(message.id, emoji)}
                                          className="rounded-lg px-1 py-0.5 text-base hover:bg-white/10"
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>

                              <div className="ml-1 flex items-center gap-0.5 opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:focus-within:opacity-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyTo(message);
                                    setEditing(null);
                                  }}
                                  aria-label="Javob berish"
                                  title="Javob berish"
                                  className="rounded-md p-1 text-zinc-500 hover:bg-white/[0.06] hover:text-teal-300"
                                >
                                  <Reply size={13} />
                                </button>
                                {message.canEdit && message.messageType === "text" && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditing({ id: message.id, text: message.content })
                                    }
                                    aria-label="Tahrirlash"
                                    title="Tahrirlash"
                                    className="rounded-md p-1 text-zinc-500 hover:bg-white/[0.06] hover:text-white"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                )}
                                {message.canDelete && (
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(message.id)}
                                    aria-label="O'chirish"
                                    title="O'chirish"
                                    className="rounded-md p-1 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {/* New messages pill */}
        {newCount > 0 && (
          <div className="pointer-events-none relative flex justify-center">
            <button
              type="button"
              onClick={() => {
                isNearBottomRef.current = true;
                setNewCount(0);
                scrollToBottom("smooth");
              }}
              className="pointer-events-auto absolute -top-12 flex items-center gap-1.5 rounded-full border border-teal-400/30 bg-[#12161f] px-3 py-1.5 text-[11px] font-semibold text-teal-200 shadow-lg hover:bg-[#182030]"
            >
              <ArrowDown size={12} />
              {newCount} ta yangi xabar
            </button>
          </div>
        )}

        {community.typingLabel && (
          <div className="flex shrink-0 items-center gap-2 px-4 pb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#151a22] px-3 py-1 text-[11px] text-zinc-400">
              <span className="flex gap-0.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#2dd4bf]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#2dd4bf] [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#2dd4bf] [animation-delay:240ms]" />
              </span>
              <span>{community.typingLabel}</span>
            </span>
          </div>
        )}

        <CommunityComposer
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          onSend={handleSend}
          onTyping={community.sendTyping}
        />
      </section>

      {overview && (
        <div className="hidden w-[330px] shrink-0 border-l border-[#cfd9de] dark:border-white/[0.06] xl:flex">
          <CommunityInfo overview={overview} />
        </div>
      )}

      {/* Mobile info sheet */}
      {infoOpen && overview && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60 xl:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Guruh ma'lumoti"
          onClick={() => setInfoOpen(false)}
        >
          <div
            className="h-full w-full max-w-sm border-l border-[#cfd9de] dark:border-white/10 bg-[#f7f9f9] dark:bg-[#0b0e14]"
            onClick={(event) => event.stopPropagation()}
          >
            <CommunityInfo overview={overview} onClose={() => setInfoOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
