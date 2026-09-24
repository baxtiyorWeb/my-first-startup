"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { BookmarkIcon } from "@/components/icons";
import { PostCard } from "@/components/feed/post-card";
import type { Post } from "@/types/social";
import { api, ApiError } from "@/lib/api";
import { RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/toast";

export default function BookmarksPage() {
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookmarks = useCallback(async () => {
    try {
      const posts = await api.bookmarks.getBookmarks();
      setSavedPosts(posts);
      setError(null);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Saqlangan fikrlarni yuklashda xatolik yuz berdi";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    api.bookmarks
      .getBookmarks()
      .then((posts) => {
        if (isMounted) {
          setSavedPosts(posts);
          setError(null);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          const message =
            err instanceof ApiError
              ? err.message
              : "Saqlangan fikrlarni yuklashda xatolik yuz berdi";
          setError(message);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveChange = async (postId: string, isSaved: boolean) => {
    if (!isSaved) {
      setSavedPosts((prev) => prev.filter((p) => p.id !== postId));
    }
    try {
      await api.posts.toggleBookmark(postId);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Xatcho‘p holatini o‘zgartirib bo‘lmadi";
      toast.error(msg);
      fetchBookmarks();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3 w-full animate-pulse">
        {[1, 2].map((i) => (
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
            fetchBookmarks();
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
      {/* Bookmarked Posts List */}
      {savedPosts.length === 0 ? (
        <div className="text-center py-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
          <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <BookmarkIcon size={20} />
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
            Saqlangan fikrlar mavjud emas
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Lentadagi foydali va intellektual fikrlarni xatcho‘p (bookmark) tugmasi orqali saqlab qo‘yishingiz mumkin.
          </p>
          <div className="mt-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
            >
              <span>Fikrlar oqimiga o‘tish</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {savedPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onSaveChange={handleSaveChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
