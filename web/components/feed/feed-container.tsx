"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { PostCard } from "./post-card";
import { CreatePostComposer } from "./create-post-composer";
import {
  FeedFilterToolbar,
  type FeedTab,
  type SortOption,
  type ViewMode,
} from "./feed-filter-toolbar";
import { api, ApiError } from "@/lib/api";
import type { Post } from "@/types/social";
import { toast } from "@/components/ui/toast";
import { RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

export function FeedContainer() {
  const searchParams = useSearchParams();
  const targetPostId = searchParams.get("post");
  const hlQuery = searchParams.get("hl") || "";
  const { t } = useI18n();

  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<FeedTab>("all");
  const [sortBy, setSortBy] = useState<SortOption>("latest");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    try {
      const data = await api.posts.getFeed({
        limit: 15,
      });
      setPosts(data.posts);
      setCursor(data.cursor);
      setHasMore(data.hasMore);
      setError(null);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t("feed.loadError");
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (targetPostId || hlQuery) {
      const timer = setTimeout(() => {
        if (typeof window !== "undefined") {
          const currentUrl = new URL(window.location.href);
          if (
            currentUrl.searchParams.has("post") ||
            currentUrl.searchParams.has("hl")
          ) {
            currentUrl.searchParams.delete("post");
            currentUrl.searchParams.delete("hl");
            const cleanUrl =
              currentUrl.pathname +
              (currentUrl.search ? currentUrl.search : "");
            window.history.replaceState(null, "", cleanUrl);
          }
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [targetPostId, hlQuery]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const handleLoadMore = async () => {
    if (!cursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const data = await api.posts.getFeed({
        cursor,
        limit: 10,
      });
      setPosts((prev) => [...prev, ...data.posts]);
      setCursor(data.cursor);
      setHasMore(data.hasMore);
    } catch {
      toast.error(t("feed.loadError"));
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleLikeChange = async (
    postId: string,
    isLiked: boolean,
    count: number,
  ) => {
    const prevPosts = [...posts];
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, isLiked, likesCount: count } : p,
      ),
    );

    try {
      await api.posts.toggleLike(postId);
    } catch (err) {
      setPosts(prevPosts);
      const msg = err instanceof ApiError ? err.message : t("feed.likeError");
      toast.error(msg);
    }
  };

  const handleSaveChange = async (postId: string, isSaved: boolean) => {
    const prevPosts = [...posts];
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, isSaved } : p)),
    );

    try {
      await api.posts.toggleBookmark(postId);
    } catch (err) {
      setPosts(prevPosts);
      const msg = err instanceof ApiError ? err.message : t("feed.saveError");
      toast.error(msg);
    }
  };

  const handleDelete = async (postId: string) => {
    const prevPosts = [...posts];
    setPosts((prev) => prev.filter((p) => p.id !== postId));

    try {
      await api.posts.deletePost(postId);
      toast.success(t("feed.deleteSuccess"));
    } catch (err) {
      setPosts(prevPosts);
      const msg = err instanceof ApiError ? err.message : t("feed.deleteError");
      toast.error(msg);
    }
  };

  const handlePostCreated = (newPost: Post) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  // Filter and sort the posts based on active toolbar settings
  const displayedPosts = useMemo(() => {
    let result = [...posts];

    // Category Tab Filtering
    if (activeTab === "posts") {
      result = result.filter(
        (p) => p.contentKind === "thought" || (!p.contentKind && !p.title),
      );
    } else if (activeTab === "articles") {
      result = result.filter(
        (p) =>
          p.contentKind === "article" ||
          (!p.contentKind && (Boolean(p.title) || p.postType === "project")),
      );
    } else if (activeTab === "videos") {
      result = result.filter(
        (p) =>
          p.contentKind === "video" ||
          Boolean(p.videoUrl) ||
          p.content.toLowerCase().includes("#video"),
      );
    } else if (activeTab === "news") {
      result = result.filter((p) => p.contentKind === "news");
    }

    // Sorting
    if (sortBy === "popular") {
      result.sort(
        (a, b) =>
          b.likesCount +
          b.commentsCount -
          (a.likesCount + a.commentsCount),
      );
    } else if (sortBy === "views") {
      result.sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));
    } else {
      // Default: "latest" (by createdAt descending)
      result.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }

    return result;
  }, [posts, activeTab, sortBy]);

  return (
    <div className="w-full space-y-4">
      {/* 1. Post yaratish bloki (Figma node 11:5) */}
      <CreatePostComposer onPostCreated={handlePostCreated} />

      {/* 2. Tasma filtrlari bloki (Figma node 11:6) */}
      <FeedFilterToolbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        sortBy={sortBy}
        onSortChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* 3. Yangiliklar tasmasi (Figma node 11:7) */}
      {isLoading ? (
        <div className="space-y-4 w-full animate-pulse">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 bg-white dark:bg-[#101117] rounded-[17px] border border-slate-200/90 dark:border-[#24252f]"
            />
          ))}
        </div>
      ) : error ? (
        <div className="py-12 text-center bg-white dark:bg-[#101117] border border-slate-200/90 dark:border-[#24252f] rounded-[17px] p-6 space-y-3">
          <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
            {error}
          </p>
          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              fetchFeed();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#3995ff] text-white text-xs font-semibold hover:bg-[#2a84ee] cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t("common.retry")}</span>
          </button>
        </div>
      ) : displayedPosts.length === 0 ? (
        <div className="py-14 text-center bg-white dark:bg-[#101117] border border-slate-200/90 dark:border-[#24252f] rounded-[17px] p-6">
          <p className="text-sm font-semibold text-slate-800 dark:text-[#f6f6fa]">
            {t("feed.emptyTitle") || "Hozircha postlar yo'q"}
          </p>
          <p className="text-xs text-slate-500 dark:text-[#a0a5b8] mt-1">
            {activeTab !== "all"
              ? "Ushbu bo'limda hozircha postlar mavjud emas"
              : t("feed.emptySubtitle") ||
                "Birinchi bo'lib o'z fikrlaringiz yoki loyihangizni ulashing!"}
          </p>
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 gap-4"
              : "space-y-4"
          }
        >
          {displayedPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLikeChange={handleLikeChange}
              onSaveChange={handleSaveChange}
              onDelete={handleDelete}
              searchQuery={hlQuery}
              isHighlighted={post.id === targetPostId}
            />
          ))}

          {hasMore && (
            <div className="pt-2 text-center col-span-full">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="px-5 py-2.5 text-xs font-semibold rounded-[12px] bg-white dark:bg-[#101117] border border-slate-200/90 dark:border-[#24252f] text-slate-700 dark:text-[#f6f6fa] hover:bg-slate-50 dark:hover:bg-[#181920] transition-colors cursor-pointer disabled:opacity-50"
              >
                {isLoadingMore
                  ? t("feed.loadingMore") || "Yuklanmoqda..."
                  : t("feed.loadMore") || "Yana yuklash"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
