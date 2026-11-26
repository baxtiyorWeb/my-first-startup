"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  PlaySquare,
  ArrowRight,
  Check,
  Play,
  Eye,
  UserPlus,
  UserCheck,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { useAuth } from "@/components/auth/auth-context";
import { UserAvatar } from "@/components/ui/user-avatar";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api";

// 1. Trend mavzular vidjeti (Figma node 11:632)
export function TrendingTopicsWidget() {
  const { localePath } = useI18n();

  const [trends, setTrends] = useState([
    { rank: 1, tag: "AI", count: "12.4K post", rankColor: "text-[#1d9bf0]" },
    { rank: 2, tag: "Nextjs", count: "8.9K post", rankColor: "text-[#8ecdf8]" },
    { rank: 3, tag: "Dasturlash", count: "7.1K post", rankColor: "text-[#ffd400]" },
    { rank: 4, tag: "EdTech", count: "5.6K post", rankColor: "text-[#1d9bf0]" },
    { rank: 5, tag: "Startap", count: "4.2K post", rankColor: "text-[#00ba7c]" },
  ]);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/trends")
      .then((res) => res.json())
      .then((res) => {
        if (isMounted && res.success && Array.isArray(res.data) && res.data.length > 0) {
          setTrends(res.data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div
      data-node-id="11:632"
      data-name="Trend mavzular"
      className="bg-white dark:bg-[#000000] border border-slate-200/90 dark:border-[#2f3336] rounded-[16px] p-4 shadow-xs"
    >
      <div className="flex items-center gap-2 mb-3.5">
        <span className="text-[18px] select-none">🔥</span>
        <h3 className="font-bold text-[16px] text-slate-900 dark:text-[#e7e9ea]">
          Trend mavzular
        </h3>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-[#2f3336]">
        {trends.map((item) => (
          <Link
            key={item.tag}
            href={localePath(`/dashboard?hl=${item.tag}`)}
            className="flex items-center justify-between py-2.5 hover:bg-slate-50 dark:hover:bg-[#16181c] -mx-2 px-2 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`size-[20px] rounded-[8px] bg-slate-100 dark:bg-[#16181c] border border-slate-200/60 dark:border-[#2f3336] flex items-center justify-center font-bold text-[11px] ${item.rankColor} shrink-0`}
              >
                {item.rank}
              </span>
              <span className="font-semibold text-[13.5px] text-slate-800 dark:text-[#e7e9ea] group-hover:text-blue-600 dark:group-hover:text-[#1d9bf0] transition-colors truncate">
                #{item.tag}
              </span>
            </div>
            <span className="text-[12px] text-slate-400 dark:text-[#cfd9de] shrink-0 font-normal">
              {item.count}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// 2. Tavsiya etilgan mualliflar vidjeti (Figma node 11:657)
export function SuggestedAuthorsWidget() {
  const { session } = useAuth();
  const { localePath } = useI18n();

  const [authors, setAuthors] = useState<
    {
      id: string;
      name: string;
      handle: string;
      role: string;
      avatarUrl?: string;
      verified: boolean;
      isFollowing: boolean;
    }[]
  >([]);
  const [isLoadingAuthors, setIsLoadingAuthors] = useState(true);
  const [pendingHandles, setPendingHandles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    fetch("/api/users/recommended", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data?.data?.thinkers)
          ? data.data.thinkers
          : Array.isArray(data?.data)
          ? data.data
          : [];
        if (isMounted) {
          setAuthors(
            list.slice(0, 3).map((u: {
              id: string;
              name: string;
              handle: string;
              role?: string;
              avatarUrl?: string;
              verified?: boolean;
              isFollowing?: boolean;
            }) => ({
              id: u.id,
              name: u.name,
              handle: u.handle.replace(/^@/, ""),
              role: u.role || "Creator",
              avatarUrl: u.avatarUrl,
              verified: Boolean(u.verified),
              isFollowing: Boolean(u.isFollowing),
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingAuthors(false);
      });
    return () => {
      isMounted = false;
    };
  }, [session.isAuthenticated]);

  const handleToggleFollow = async (idx: number, handle: string, name: string) => {
    if (!session.isAuthenticated) {
      toast.info("Muallifga obuna bo'lish uchun tizimga kiring");
      return;
    }
    if (pendingHandles[handle]) return;

    const currentFollowing = authors[idx].isFollowing;
    setPendingHandles((prev) => ({ ...prev, [handle]: true }));
    setAuthors((prev) =>
      prev.map((a, i) => (i === idx ? { ...a, isFollowing: !currentFollowing } : a))
    );

    try {
      const res = await api.users.toggleFollow(handle);
      const isNowFollowing = res.isFollowing ?? res.following;
      setAuthors((prev) =>
        prev.map((a, i) => (i === idx ? { ...a, isFollowing: isNowFollowing } : a))
      );
      if (isNowFollowing) {
        toast.success(`${name} ga obuna bo'ldingiz`);
      } else {
        toast.info(`${name} obunadan chiqarildi`);
      }
    } catch (err) {
      setAuthors((prev) =>
        prev.map((a, i) => (i === idx ? { ...a, isFollowing: currentFollowing } : a))
      );
      toast.error(err instanceof Error ? err.message : "Amalni bajarishda xatolik yuz berdi");
    } finally {
      setPendingHandles((prev) => ({ ...prev, [handle]: false }));
    }
  };

  if (!isLoadingAuthors && authors.length === 0) {
    return null;
  }

  return (
    <div
      data-node-id="11:657"
      data-name="Tavsiya etilgan mualliflar"
      className="bg-white dark:bg-[#000000] border border-slate-200/90 dark:border-[#2f3336] rounded-[16px] p-4 shadow-xs"
    >
      <div className="flex items-center gap-2 mb-3.5">
        <Users size={18} className="text-slate-700 dark:text-[#8b98a5]" />
        <h3 className="font-bold text-[16px] text-slate-900 dark:text-[#e7e9ea]">
          Tavsiya etilgan mualliflar
        </h3>
      </div>

      <div className="space-y-3">
        {isLoadingAuthors ? (
          <div className="space-y-2.5 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-11 rounded-lg bg-slate-100 dark:bg-[#16181c]" />
            ))}
          </div>
        ) : (
          authors.map((author, idx) => (
          <div
            key={author.id}
            className="flex items-center justify-between gap-2.5 p-1 -mx-1 rounded-lg hover:bg-slate-50 dark:hover:bg-[#16181c] transition-colors"
          >
            {/* Author info */}
            <div className="flex items-center gap-2.5 min-w-0">
              <Link
                href={localePath(`/dashboard/profile?handle=${author.handle}`)}
                className="shrink-0 hover:opacity-90 transition-opacity"
              >
                <UserAvatar
                  name={author.name}
                  avatarUrl={author.avatarUrl}
                  size="md"
                  className="size-[38px] rounded-full border border-slate-200 dark:border-[#2f3336]"
                />
              </Link>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Link
                    href={localePath(`/dashboard/profile?handle=${author.handle}`)}
                    className="font-semibold text-[12.5px] text-slate-900 dark:text-[#e7e9ea] hover:underline truncate"
                  >
                    {author.name}
                  </Link>
                  {author.verified && (
                    <span
                      title="Tasdiqlangan muallif"
                      className="bg-[#1d9bf0] rounded-[4px] size-[13px] flex items-center justify-center shrink-0"
                    >
                      <Check size={9} className="text-white stroke-[2.5]" />
                    </span>
                  )}
                </div>
                <p className="text-[11.5px] text-slate-500 dark:text-[#cfd9de] truncate">
                  {author.role}
                </p>
              </div>
            </div>

            {/* Follow Button */}
            <button
              type="button"
              disabled={Boolean(pendingHandles[author.handle])}
              onClick={() => handleToggleFollow(idx, author.handle, author.name)}
              className={`h-[30px] px-3 rounded-[9px] text-[12px] font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1 disabled:opacity-60 ${
                author.isFollowing
                  ? "bg-slate-100 dark:bg-[#202327] text-slate-700 dark:text-[#cfd9de] hover:bg-slate-200 dark:hover:bg-[#2f3336]"
                  : "bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white shadow-xs"
              }`}
            >
              {author.isFollowing ? (
                <>
                  <UserCheck size={12} />
                  <span>Obunadasiz</span>
                </>
              ) : (
                <>
                  <UserPlus size={12} />
                  <span>Obuna</span>
                </>
              )}
            </button>
          </div>
          ))
        )}
      </div>
    </div>
  );
}

// 3. Video Darsliklar vidjeti (Real DB videos, zero fake stock placeholders)
export function ShortsPreviewWidget() {
  const { localePath } = useI18n();
  const [videos, setVideos] = useState<
    Array<{ id: string; slug?: string | null; title?: string | null; coverImageUrl?: string | null; viewsCount?: number }>
  >([]);

  useEffect(() => {
    let mounted = true;
    fetch("/api/posts?kind=video&limit=3")
      .then((res) => res.json())
      .then((json) => {
        if (mounted && json.success && Array.isArray(json.data)) {
          setVideos(json.data);
        }
      })
      .catch(() => null);
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div
      data-node-id="11:8"
      data-name="Video darsliklar"
      className="bg-white dark:bg-[#000000] border border-slate-200/90 dark:border-[#2f3336] rounded-[16px] p-4 shadow-xs space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PlaySquare size={18} className="text-emerald-500" />
          <h3 className="font-bold text-[15px] text-slate-900 dark:text-[#e7e9ea]">
            Video darsliklar
          </h3>
        </div>

        <Link
          href={localePath("/videos")}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-300 hover:text-[#1d9bf0] transition-colors"
        >
          <span>Barchasi</span>
          <ArrowRight size={11} />
        </Link>
      </div>

      {videos.length > 0 ? (
        <div className="space-y-2.5">
          {videos.map((vid) => (
            <Link
              key={vid.id}
              href={localePath(`/videos/${vid.slug || vid.id}`)}
              className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-[#16181c] border border-slate-200/70 dark:border-[#2f3336] hover:border-[#1d9bf0]/50 transition-colors group"
            >
              <div className="size-10 rounded-lg bg-[#000000] flex items-center justify-center shrink-0 overflow-hidden">
                {vid.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={vid.coverImageUrl}
                    alt={vid.title || "Video darslik"}
                    className="size-full object-cover"
                  />
                ) : (
                  <Play size={15} className="text-[#1d9bf0] fill-current" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-[#1d9bf0] line-clamp-2 leading-snug">
                  {vid.title || "Amaliy video darslik"}
                </p>
                <span className="text-[10px] text-slate-400">
                  {vid.viewsCount ?? 0} ko‘rish
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#16181c] border border-slate-200/70 dark:border-[#2f3336] space-y-2.5">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            ilk video darslikni SEO Studio‘da joylang.
          </p>
          <Link
            href={localePath("/dashboard/create?kind=video")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1d9bf0] hover:bg-blue-600 text-white text-[11px] font-bold transition-colors"
          >
            <Play size={12} className="fill-current" />
            <span>Video joylash</span>
          </Link>
        </div>
      )}
    </div>
  );
}

// 4. Bilimlar Bazasi & SEO Studio vidjeti (Clean Navy/Blue)
export function CreatorMonetizationWidget() {
  const { localePath } = useI18n();

  return (
    <div
      data-node-id="11:688"
      data-name="Bilimlar Bazasi"
      className="rounded-[16px] p-4.5 text-white relative overflow-hidden shadow-md bg-gradient-to-br from-[#000000] via-[#16181c] to-[#202327] border border-[#1b4a63]"
    >
      <div className="absolute -right-8 -bottom-8 size-32 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

      <div className="flex items-center gap-2 mb-2">
        <span className="text-[18px] select-none">📚</span>
        <h3 className="font-bold text-[16px] text-white tracking-tight">
          Bilimlar Bazasi &amp; Hub
        </h3>
      </div>

      <p className="text-[12px] leading-[18px] text-slate-300 mb-3.5">
        Texnologiya qo‘llanmalari, IT lug‘at, cheat sheetlar va intervyu savollari.
      </p>

      <div className="flex flex-wrap gap-2">
        <Link
          href={localePath("/hub")}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[9px] bg-[#1d9bf0] hover:bg-blue-600 text-white font-semibold text-[11.5px] transition-colors shadow-xs"
        >
          <span>Hub‘ga o‘tish</span>
          <ArrowRight size={12} />
        </Link>
        <Link
          href={localePath("/dashboard/create")}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[9px] bg-white/10 hover:bg-white/20 text-white font-semibold text-[11.5px] transition-colors"
        >
          <span>SEO Studio</span>
        </Link>
      </div>
    </div>
  );
}

// Full Composite Right Sidebar
export function DashboardRightSidebar() {
  return (
    <aside className="w-full space-y-4">
      <TrendingTopicsWidget />
      <SuggestedAuthorsWidget />
      <ShortsPreviewWidget />
      <CreatorMonetizationWidget />
    </aside>
  );
}
