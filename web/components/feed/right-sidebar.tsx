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
    { rank: 1, tag: "AI", count: "12.4K post", rankColor: "text-[#3995ff]" },
    { rank: 2, tag: "Nextjs", count: "8.9K post", rankColor: "text-[#76d5f5]" },
    { rank: 3, tag: "Dasturlash", count: "7.1K post", rankColor: "text-[#ff9a26]" },
    { rank: 4, tag: "EdTech", count: "5.6K post", rankColor: "text-[#3995ff]" },
    { rank: 5, tag: "Startap", count: "4.2K post", rankColor: "text-[#10b981]" },
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
      className="bg-white dark:bg-[#101117] border border-slate-200/90 dark:border-[#24252f] rounded-[16px] p-4 shadow-xs"
    >
      <div className="flex items-center gap-2 mb-3.5">
        <span className="text-[18px] select-none">🔥</span>
        <h3 className="font-bold text-[16px] text-slate-900 dark:text-[#f6f6fa]">
          Trend mavzular
        </h3>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-[#252730]">
        {trends.map((item) => (
          <Link
            key={item.tag}
            href={localePath(`/dashboard?hl=${item.tag}`)}
            className="flex items-center justify-between py-2.5 hover:bg-slate-50 dark:hover:bg-[#151722] -mx-2 px-2 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`size-[20px] rounded-[8px] bg-slate-100 dark:bg-[#181920] border border-slate-200/60 dark:border-[#262836] flex items-center justify-center font-bold text-[11px] ${item.rankColor} shrink-0`}
              >
                {item.rank}
              </span>
              <span className="font-semibold text-[13.5px] text-slate-800 dark:text-[#f4f4fa] group-hover:text-blue-600 dark:group-hover:text-[#3995ff] transition-colors truncate">
                #{item.tag}
              </span>
            </div>
            <span className="text-[12px] text-slate-400 dark:text-[#c5c9de] shrink-0 font-normal">
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
  >([
    {
      id: "a-madina",
      name: "Madina Karimova",
      handle: "madina_karimova",
      role: "EdTech mutaxassisi",
      verified: true,
      isFollowing: false,
    },
    {
      id: "a-feruz",
      name: "Feruz Xolmurodov",
      handle: "feruz_dev",
      role: "Full-Stack Dasturchi",
      verified: false,
      isFollowing: false,
    },
    {
      id: "a-frontend",
      name: "Frontend Developer",
      handle: "frontend_dev",
      role: "Web dasturlash",
      verified: true,
      isFollowing: false,
    },
  ]);

  useEffect(() => {
    // Attempt to load dynamic recommendations if available
    let isMounted = true;
    fetch("/api/users/recommended")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data?.data?.thinkers)
          ? data.data.thinkers
          : Array.isArray(data?.data)
          ? data.data
          : [];
        if (isMounted && list.length > 0) {
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
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleFollow = async (idx: number, handle: string, name: string) => {
    if (!session.isAuthenticated) {
      toast.info("Muallifga obuna bo'lish uchun tizimga kiring");
      return;
    }

    const currentFollowing = authors[idx].isFollowing;
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
    } catch {
      setAuthors((prev) =>
        prev.map((a, i) => (i === idx ? { ...a, isFollowing: currentFollowing } : a))
      );
      toast.error("Amalni bajarishda xatolik yuz berdi");
    }
  };

  return (
    <div
      data-node-id="11:657"
      data-name="Tavsiya etilgan mualliflar"
      className="bg-white dark:bg-[#101117] border border-slate-200/90 dark:border-[#24252f] rounded-[16px] p-4 shadow-xs"
    >
      <div className="flex items-center gap-2 mb-3.5">
        <Users size={18} className="text-slate-700 dark:text-[#a0a5b8]" />
        <h3 className="font-bold text-[16px] text-slate-900 dark:text-[#f6f6fa]">
          Tavsiya etilgan mualliflar
        </h3>
      </div>

      <div className="space-y-3">
        {authors.map((author, idx) => (
          <div
            key={author.id}
            className="flex items-center justify-between gap-2.5 p-1 -mx-1 rounded-lg hover:bg-slate-50 dark:hover:bg-[#151722] transition-colors"
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
                  className="size-[38px] rounded-full border border-slate-200 dark:border-[#24252f]"
                />
              </Link>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Link
                    href={localePath(`/dashboard/profile?handle=${author.handle}`)}
                    className="font-semibold text-[12.5px] text-slate-900 dark:text-[#f6f6fa] hover:underline truncate"
                  >
                    {author.name}
                  </Link>
                  {author.verified && (
                    <span
                      title="Tasdiqlangan muallif"
                      className="bg-[#3995ff] rounded-[4px] size-[13px] flex items-center justify-center shrink-0"
                    >
                      <Check size={9} className="text-white stroke-[2.5]" />
                    </span>
                  )}
                </div>
                <p className="text-[11.5px] text-slate-500 dark:text-[#c2c6da] truncate">
                  {author.role}
                </p>
              </div>
            </div>

            {/* Follow Button */}
            <button
              type="button"
              onClick={() => handleToggleFollow(idx, author.handle, author.name)}
              className={`h-[30px] px-3 rounded-[9px] text-[12px] font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                author.isFollowing
                  ? "bg-slate-100 dark:bg-[#1e202c] text-slate-700 dark:text-[#c2c6da] hover:bg-slate-200 dark:hover:bg-[#252838]"
                  : "bg-[#3995ff] hover:bg-[#2884ee] text-white shadow-xs"
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
        ))}
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
      className="bg-white dark:bg-[#101117] border border-slate-200/90 dark:border-[#24252f] rounded-[16px] p-4 shadow-xs space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PlaySquare size={18} className="text-emerald-500" />
          <h3 className="font-bold text-[15px] text-slate-900 dark:text-[#fafaff]">
            Video darsliklar
          </h3>
        </div>

        <Link
          href={localePath("/videos")}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-300 hover:text-[#3995ff] transition-colors"
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
              className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-[#14151d] border border-slate-200/70 dark:border-[#24252f] hover:border-[#3995ff]/50 transition-colors group"
            >
              <div className="size-10 rounded-lg bg-[#0b0c13] flex items-center justify-center shrink-0 overflow-hidden">
                {vid.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={vid.coverImageUrl}
                    alt={vid.title || "Video darslik"}
                    className="size-full object-cover"
                  />
                ) : (
                  <Play size={15} className="text-[#3995ff] fill-current" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-[#3995ff] line-clamp-2 leading-snug">
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
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#14151d] border border-slate-200/70 dark:border-[#24252f] space-y-2.5">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            YouTube yoki Bunny Stream orqali ilk video darslikni SEO Studio‘da joylang.
          </p>
          <Link
            href={localePath("/dashboard/create?kind=video")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3995ff] hover:bg-blue-600 text-white text-[11px] font-bold transition-colors"
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
      className="rounded-[16px] p-4.5 text-white relative overflow-hidden shadow-md bg-gradient-to-br from-[#0e1322] via-[#141a2e] to-[#1a233d] border border-[#232f50]"
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
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[9px] bg-[#3995ff] hover:bg-blue-600 text-white font-semibold text-[11.5px] transition-colors shadow-xs"
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
