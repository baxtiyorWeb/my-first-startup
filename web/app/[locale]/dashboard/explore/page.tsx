"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  ArrowRight,
  Sparkles,
  MessageSquare,
  Search,
  Check,
  UserPlus,
  UserCheck,
  Heart,
  Eye,
  Rocket,
  Filter,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Post } from "@/types/social";
import { useI18n } from "@/lib/i18n/context";
import { useAuth } from "@/components/auth/auth-context";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ContentPreview } from "@/components/format";
import { toast } from "@/components/ui/toast";
import { DashboardRightSidebar } from "@/components/feed/right-sidebar";

type ExploreCategory = "all" | "project" | "cofounder" | "discussions";

export default function ExplorePage() {
  const { t, localePath, formatRelativeTime } = useI18n();
  const { session } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<ExploreCategory>("all");
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    api.posts
      .getFeed({ limit: 20 })
      .then((data) => {
        if (isMounted) {
          setPosts(data.posts);
          // Initialize following map from post authors
          const initialMap: Record<string, boolean> = {};
          for (const post of data.posts) {
            if (post.author?.handle) {
              initialMap[post.author.handle] = Boolean(post.author.isFollowing);
            }
          }
          setFollowingMap(initialMap);
        }
      })
      .catch(() => {
        if (isMounted) {
          setPosts([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Extract unique authors from posts
  const authors = useMemo(() => {
    const authorMap = new Map<string, Post["author"]>();
    for (const post of posts) {
      if (post.author && !authorMap.has(post.author.handle)) {
        authorMap.set(post.author.handle, post.author);
      }
    }
    return Array.from(authorMap.values());
  }, [posts]);

  // Handle follow / unfollow toggle
  const handleToggleFollow = useCallback(
    async (handle: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!session?.user) {
        toast.error(t("auth.loginRequired") || "Iltimos, avval tizimga kiring");
        return;
      }

      const prev = Boolean(followingMap[handle]);
      const next = !prev;

      // Optimistic update
      setFollowingMap((m) => ({ ...m, [handle]: next }));

      try {
        await api.users.toggleFollow(handle);
        toast.success(
          next
            ? `@${handle.replace(/^@/, "")} kuzatuvchilaringizga qo'shildi`
            : `@${handle.replace(/^@/, "")} kuzatuvdan olindi`
        );
      } catch {
        // Revert on error
        setFollowingMap((m) => ({ ...m, [handle]: prev }));
        toast.error("Amalni bajarishda xatolik yuz berdi");
      }
    },
    [session, followingMap, t]
  );

  // Filtered posts based on search query and category
  const filteredPosts = useMemo(() => {
    let list = posts;

    // Filter by Category
    if (activeCategory === "project") {
      list = list.filter((p) => p.postType === "project");
    } else if (activeCategory === "cofounder") {
      list = list.filter(
        (p) =>
          p.author.intent === "looking_for_cofounder" ||
          p.lookingFor === "cofounder"
      );
    } else if (activeCategory === "discussions") {
      list = list.filter((p) => (p.commentsCount || 0) > 0);
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.author.name.toLowerCase().includes(q) ||
          p.author.handle.toLowerCase().includes(q) ||
          (p.title && p.title.toLowerCase().includes(q)) ||
          p.content.toLowerCase().includes(q)
      );
    }

    return list;
  }, [posts, activeCategory, searchQuery]);

  // Filtered authors based on search query
  const filteredAuthors = useMemo(() => {
    if (!searchQuery.trim()) return authors.slice(0, 6);
    const q = searchQuery.toLowerCase().trim();
    return authors.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.handle.toLowerCase().includes(q) ||
        (a.role && a.role.toLowerCase().includes(q))
    );
  }, [authors, searchQuery]);

  return (
    <div className="w-full flex items-start justify-start gap-6 lg:gap-7">
      {/* 1. Asosiy Kashf etish ustuni (Main Explore Column) */}
      <div className="flex-1 min-w-0 max-w-[860px] 2xl:max-w-[900px] space-y-6 pb-12">
        {/* Header Hero Banner */}
        <div className="p-5 sm:p-6 rounded-[16px] bg-white dark:bg-[#000000] border border-slate-200/90 dark:border-[#2f3336] shadow-xs space-y-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-[#1d9bf0]">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>{t("explore.badge") || "Kashf qilish & Hamjamiyat"}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-950 dark:text-white tracking-tight">
              {t("explore.title") || "The Go-getters intellektual maydonini kashf qiling"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              {t("explore.subtitle") ||
                "Tajribali mutaxassislar profillarini ko‘ring, chuqur tahlillarni o‘qing va mazmunli munozaralarda qatnashing."}
            </p>
          </div>

          {/* Search bar & filter pills */}
          <div className="pt-2 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Mualliflar, loyihalar yoki tahlillardan qidirish..."
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-50 dark:bg-[#16181c] border border-slate-200 dark:border-[#2f3336] text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1d9bf0] focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category filter pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeCategory === "all"
                    ? "bg-[#1d9bf0] text-white shadow-xs"
                    : "bg-slate-100 dark:bg-[#16181c] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-[#2f3336] hover:bg-slate-200/70 dark:hover:bg-[#202327]"
                }`}
              >
                {t("exploreFilters.all") || "Barchasi"}
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory("project")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === "project"
                    ? "bg-[#1d9bf0] text-white shadow-xs"
                    : "bg-slate-100 dark:bg-[#16181c] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-[#2f3336] hover:bg-slate-200/70 dark:hover:bg-[#202327]"
                }`}
              >
                <Rocket className="w-3.5 h-3.5 text-amber-500" />
                <span>{t("exploreFilters.projects") || "Loyihalar & Startaplar"}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory("cofounder")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === "cofounder"
                    ? "bg-[#1d9bf0] text-white shadow-xs"
                    : "bg-slate-100 dark:bg-[#16181c] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-[#2f3336] hover:bg-slate-200/70 dark:hover:bg-[#202327]"
                }`}
              >
                <span>🤝</span>
                <span>{t("exploreFilters.cofounders") || "Hammuassis qidirayotganlar"}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory("discussions")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === "discussions"
                    ? "bg-[#1d9bf0] text-white shadow-xs"
                    : "bg-slate-100 dark:bg-[#16181c] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-[#2f3336] hover:bg-slate-200/70 dark:hover:bg-[#202327]"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                <span>Qizg‘in munozaralar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 1: Featured Authors */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600 dark:text-[#1d9bf0]" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t("explore.activeAuthors") || "Faol mualliflar & ekspertlar"}
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              {filteredAuthors.length} muallif
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-24 rounded-[16px] bg-white dark:bg-[#000000] border border-slate-200/80 dark:border-[#2f3336]"
                />
              ))}
            </div>
          ) : filteredAuthors.length === 0 ? (
            <div className="py-8 text-center bg-white dark:bg-[#000000] border border-slate-200/80 dark:border-[#2f3336] rounded-[16px] p-4 text-xs text-slate-500">
              {t("explore.authorsBuilding") || "Hozircha mualliflar topilmadi."}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredAuthors.map((author) => {
                const isFollowing = Boolean(followingMap[author.handle]);
                const isMe =
                  session?.user &&
                  (session.user.handle === author.handle ||
                    session.user.id === author.id);

                return (
                  <Link
                    key={author.handle}
                    href={localePath(
                      `/dashboard/profile?handle=${encodeURIComponent(author.handle.replace(/^@/, ""))}`
                    )}
                    className="p-4 rounded-[16px] bg-white dark:bg-[#000000] border border-slate-200/90 dark:border-[#2f3336] hover:border-[#1d9bf0]/50 dark:hover:border-[#1d9bf0]/40 shadow-xs transition-all flex flex-col justify-between gap-3 group cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar
                          name={author.name}
                          avatarUrl={author.avatarUrl}
                          size="lg"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-[#1d9bf0] transition-colors">
                              {author.name}
                            </span>
                            {author.verified && (
                              <span
                                className="size-3.5 rounded-full bg-[#1d9bf0] text-white flex items-center justify-center shrink-0"
                                title="Tasdiqlangan mutaxassis"
                              >
                                <Check size={8} strokeWidth={3} />
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 truncate block">
                            @{author.handle.replace(/^@/, "")}
                          </span>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {author.role || "Jamiyat a'zosi"}
                          </p>
                        </div>
                      </div>

                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-[#1d9bf0] shrink-0 transition-transform group-hover:translate-x-0.5 mt-1" />
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-[#202327]">
                      {author.intent && author.intent !== "none" ? (
                        <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#16181c] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-[#2f3336] truncate max-w-[170px]">
                          {author.intent === "looking_for_cofounder" &&
                            (t("intents.badge_cofounder") || "🤝 Hammuassis")}
                          {author.intent === "open_to_work" &&
                            (t("intents.badge_open_to_work") || "💼 Open to work")}
                          {author.intent === "raising_funds" &&
                            (t("intents.badge_raising") || "📈 Investitsiya")}
                          {author.intent === "open_to_advisory" &&
                            (t("intents.badge_advisory") || "💡 Ekspert maslahati")}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          Hamjamiyat a'zosi
                        </span>
                      )}

                      {!isMe && (
                        <button
                          type="button"
                          onClick={(e) => handleToggleFollow(author.handle, e)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                            isFollowing
                              ? "bg-slate-100 dark:bg-[#16181c] border border-slate-200 dark:border-[#2f3336] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#202327]"
                              : "bg-[#1d9bf0] hover:bg-blue-600 text-white shadow-2xs"
                          }`}
                        >
                          {isFollowing ? (
                            <>
                              <UserCheck className="w-3 h-3 text-[#1d9bf0]" />
                              <span>Kuzatilmoqda</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-3 h-3" />
                              <span>Obuna</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 2: Featured Perspectives & Discussions */}
        <div className="space-y-3.5 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600 dark:text-[#1d9bf0]" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t("explore.featuredPerspectives") || "E’tiborga molik tahlillar & munozaralar"}
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              {filteredPosts.length} post
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-3.5 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-32 rounded-[16px] bg-white dark:bg-[#000000] border border-slate-200/80 dark:border-[#2f3336]"
                />
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="py-12 text-center bg-white dark:bg-[#000000] border border-slate-200/80 dark:border-[#2f3336] rounded-[16px] p-6 text-sm text-slate-500">
              {t("explore.perspectivesEmpty") || "Tanlangan parametrlar bo‘yicha tahliliy postlar topilmadi."}
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredPosts.map((item) => (
                <div
                  key={item.id}
                  className="p-5 sm:p-6 rounded-[16px] bg-white dark:bg-[#000000] border border-slate-200/90 dark:border-[#2f3336] hover:border-slate-300 dark:hover:border-[#3e4144] shadow-xs transition-all space-y-3 group"
                >
                  {/* Author Header */}
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      href={localePath(
                        `/dashboard/profile?handle=${encodeURIComponent(item.author.handle.replace(/^@/, ""))}`
                      )}
                      className="flex items-center gap-2.5 min-w-0 group/auth"
                    >
                      <UserAvatar
                        name={item.author.name}
                        avatarUrl={item.author.avatarUrl}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 group-hover/auth:underline truncate">
                            {item.author.name}
                          </span>
                          {item.author.verified && (
                            <span
                              className="size-3 rounded-full bg-[#1d9bf0] text-white flex items-center justify-center shrink-0"
                              title="Tasdiqlangan"
                            >
                              <Check size={7} strokeWidth={3} />
                            </span>
                          )}
                          <span className="text-xs text-slate-400 truncate hidden sm:inline">
                            @{item.author.handle.replace(/^@/, "")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span>{item.author.role || "Mutaxassis"}</span>
                          <span>•</span>
                          <span>{formatRelativeTime(item.createdAt)}</span>
                        </div>
                      </div>
                    </Link>

                    {item.postType === "project" && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                        <Rocket size={11} />
                        <span>{t("project.badge") || "Loyiha"}</span>
                      </span>
                    )}
                  </div>

                  {/* Title & Content Preview */}
                  <div className="space-y-1.5">
                    {item.title && (
                      <Link
                        href={localePath(`/dashboard/posts/${item.id}`)}
                        className="block font-bold text-base text-slate-950 dark:text-white hover:text-blue-600 dark:hover:text-[#1d9bf0] transition-colors leading-snug"
                      >
                        {item.title}
                      </Link>
                    )}

                    <Link
                      href={localePath(`/dashboard/posts/${item.id}`)}
                      className="block group-hover:opacity-95 transition-opacity"
                    >
                      <ContentPreview
                        content={item.content}
                        lineClamp={3}
                        searchQuery={searchQuery}
                        className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed"
                      />
                    </Link>
                  </div>

                  {/* Media Grid Preview */}
                  {Array.isArray(item.mediaUrls) && item.mediaUrls.length > 0 && (
                    <div className="pt-1">
                      <div
                        className={`grid gap-2 rounded-xl overflow-hidden ${
                          item.mediaUrls.length === 1
                            ? "grid-cols-1 max-h-[300px]"
                            : item.mediaUrls.length === 2
                            ? "grid-cols-2 max-h-[220px]"
                            : "grid-cols-3 max-h-[180px]"
                        }`}
                      >
                        {item.mediaUrls.slice(0, 3).map((url, idx) => (
                          <Link
                            key={url + idx}
                            href={localePath(`/dashboard/posts/${item.id}`)}
                            className="relative block h-full w-full bg-slate-100 dark:bg-[#16181c] overflow-hidden"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt="Post media"
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer Metrics & Action Link */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#202327] text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5 hover:text-rose-500 transition-colors">
                        <Heart className="w-3.5 h-3.5" />
                        <span>{item.likesCount || 0}</span>
                      </span>
                      <span className="flex items-center gap-1.5 hover:text-blue-500 transition-colors">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>
                          {item.commentsCount || 0}{" "}
                          <span className="hidden sm:inline">
                            {t("explore.perspectivesComments") || "ta munosabat"}
                          </span>
                        </span>
                      </span>
                      {typeof (item as any).viewsCount === "number" && (
                        <span className="flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5" />
                          <span>{(item as any).viewsCount}</span>
                        </span>
                      )}
                    </div>

                    <Link
                      href={localePath(`/dashboard/posts/${item.id}`)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-[#1d9bf0] hover:underline"
                    >
                      <span>Munozaraga o‘tish</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. O'ng yon panel (Desktop Right Sidebar Widgets — Figma node 11:8 & 11:9) */}
      <div className="hidden xl:block w-[320px] 2xl:w-[330px] shrink-0 sticky top-20">
        <DashboardRightSidebar />
      </div>
    </div>
  );
}
