"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { PostCard } from "./post-card";
import { api, ApiError } from "@/lib/api";
import type { Post } from "@/types/social";
import { toast } from "@/components/ui/toast";
import { RefreshCw } from "lucide-react";

export function FeedContainer() {
  const searchParams = useSearchParams();
  const targetPostId = searchParams.get("post");
  const hlQuery = searchParams.get("hl") || "";

  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    try {
      const data = await api.posts.getFeed({ limit: 10 });
      setPosts(data.posts);
      setCursor(data.cursor);
      setHasMore(data.hasMore);
      setError(null);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Fikrlar lentasini yuklashda xatolik yuz berdi";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    api.posts
      .getFeed({ limit: 10 })
      .then((data) => {
        if (isMounted) {
          setPosts(data.posts);
          setCursor(data.cursor);
          setHasMore(data.hasMore);
          setError(null);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          const message =
            err instanceof ApiError
              ? err.message
              : "Fikrlar lentasini yuklashda xatolik yuz berdi";
          setError(message);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLoadMore = async () => {
    if (!cursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const data = await api.posts.getFeed({ cursor, limit: 10 });
      setPosts((prev) => [...prev, ...data.posts]);
      setCursor(data.cursor);
      setHasMore(data.hasMore);
    } catch {
      toast.error("Qo‘shimcha fikrlarni yuklab bo‘lmadi");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleLikeChange = async (postId: string, isLiked: boolean, count: number) => {
    // Optimistic update
    const prevPosts = [...posts];
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, isLiked, likesCount: count } : p
      )
    );

    try {
      await api.posts.toggleLike(postId);
    } catch (err) {
      // Rollback on failure
      setPosts(prevPosts);
      const msg =
        err instanceof ApiError ? err.message : "Layk holatini saqlab bo‘lmadi";
      toast.error(msg);
    }
  };

  const handleSaveChange = async (postId: string, isSaved: boolean) => {
    // Optimistic update
    const prevPosts = [...posts];
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, isSaved } : p))
    );

    try {
      await api.posts.toggleBookmark(postId);
    } catch (err) {
      // Rollback on failure
      setPosts(prevPosts);
      const msg =
        err instanceof ApiError
          ? err.message
          : "Saqlanganlar holatini yangilab bo‘lmadi";
      toast.error(msg);
    }
  };

  const handleDelete = async (postId: string) => {
    // Optimistic removal
    const prevPosts = [...posts];
    setPosts((prev) => prev.filter((p) => p.id !== postId));

    try {
      await api.posts.deletePost(postId);
      toast.success("Fikr muvaffaqiyatli o‘chirildi");
    } catch (err) {
      // Rollback on failure
      setPosts(prevPosts);
      const msg =
        err instanceof ApiError ? err.message : "Fikrni o‘chirib bo‘lmadi";
      toast.error(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3 w-full animate-pulse">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-36 bg-slate-100 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-3">
        <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
          {error}
        </p>
        <button
          type="button"
          onClick={() => {
            setIsLoading(true);
            fetchFeed();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-200 cursor-pointer transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Qayta urinish</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 w-full">
      {/* Feed Stream */}
      {posts.length === 0 ? (
        <div className="py-14 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Hozircha yangi fikrlar yo‘q
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Yuqoridagi “+ Fikr bildirish” tugmasi orqali o‘z mulohazangizni ulashing.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
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
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isLoadingMore ? "Yuklanmoqda..." : "Ko‘proq fikrlarni ko‘rish"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
