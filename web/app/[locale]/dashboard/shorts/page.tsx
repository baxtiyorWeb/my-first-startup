"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  ChevronUp,
  ChevronDown,
  Film,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { api } from "@/lib/api";
import { type ShortsFilter } from "@/lib/api/shorts";
import type { Post } from "@/types/social";
import { useI18n } from "@/lib/i18n/context";
import { UserAvatar } from "@/components/ui/user-avatar";
import { toast } from "@/components/ui/toast";

const FILTERS: Array<{ id: ShortsFilter; label: string }> = [
  { id: "for_you", label: "Siz uchun" },
  { id: "trending", label: "Trend" },
  { id: "tech", label: "Texnologiya" },
  { id: "dev", label: "Dasturlash" },
];

export default function ShortsPage() {
  const { localePath } = useI18n();
  const [filter, setFilter] = useState<ShortsFilter>("for_you");
  const [items, setItems] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const viewedIdsRef = useRef<Set<string>>(new Set());

  const loadShorts = useCallback(async (selectedFilter: ShortsFilter, cursor?: string) => {
    try {
      if (cursor) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setError(null);
      }

      const res = await api.shorts.getShorts({
        filter: selectedFilter,
        limit: 15,
        cursor,
      });

      setItems((prev) => (cursor ? [...prev, ...res.posts] : res.posts));
      setNextCursor(res.nextCursor);
      if (!cursor) setActiveIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Shorts yuklanmadi");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadShorts(filter);
  }, [filter, loadShorts]);

  const currentPost = items[activeIndex] || null;

  useEffect(() => {
    if (!currentPost) return;
    if (!viewedIdsRef.current.has(currentPost.id)) {
      viewedIdsRef.current.add(currentPost.id);
      api.posts.recordView(currentPost.id).catch(() => {});
    }
    if (activeIndex >= items.length - 3 && nextCursor && !isLoadingMore) {
      loadShorts(filter, nextCursor);
    }
  }, [activeIndex, currentPost, items.length, nextCursor, isLoadingMore, filter, loadShorts]);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
      setIsPaused(false);
    } else {
      el.pause();
      setIsPaused(true);
    }
  };

  const handleToggleLike = async (post: Post) => {
    try {
      const res = await api.posts.toggleLike(post.id);
      setItems((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? {
                ...p,
                isLiked: res.liked,
                likesCount: res.likesCount ?? p.likesCount + (res.liked ? 1 : -1),
              }
            : p
        )
      );
    } catch {
      toast.error("Like bosish uchun tizimga kiring");
    }
  };

  const handleToggleBookmark = async (post: Post) => {
    try {
      const res = await api.posts.toggleBookmark(post.id);
      setItems((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, isSaved: res.saved } : p))
      );
      toast.success(res.saved ? "Saqlandi" : "Saqlanganlardan olib tashlandi");
    } catch {
      toast.error("Saqlash uchun tizimga kiring");
    }
  };

  const handleShare = async (post: Post) => {
    const url = `${window.location.origin}${localePath(`/dashboard/posts/${post.id}`)}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    toast.success("Havola nusxalandi");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            Shorts
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            60 soniyagacha bo&apos;lgan qisqa texnologik videolar
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((item) => {
            const active = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-slate-950 text-white dark:bg-white dark:text-black"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-[540px] items-center justify-center rounded-2xl bg-slate-100 dark:bg-zinc-950">
          <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-red-50 p-8 text-center text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
          <p className="mb-3">{error}</p>
          <button
            type="button"
            onClick={() => loadShorts(filter)}
            className="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white dark:bg-white dark:text-black"
          >
            Qayta urinish
          </button>
        </div>
      ) : !currentPost ? (
        <div className="flex h-[460px] flex-col items-center justify-center rounded-2xl bg-slate-50 p-8 text-center dark:bg-zinc-950">
          <Film className="mb-3 h-10 w-10 text-slate-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Hozircha Shorts videolar yo&apos;q
          </h2>
          <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-zinc-400">
            60 soniyadan oshmagan video yuklang — u avtomatik ravishda ham lentada, ham Shorts bo&apos;limida chiqadi.
          </p>
          <Link
            href={localePath("/dashboard/create")}
            className="mt-4 rounded-full bg-slate-950 px-5 py-2 text-xs font-semibold text-white dark:bg-white dark:text-black"
          >
            Short yuklash
          </Link>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-6 md:flex-row">
          {/* Vertical Video Player Frame */}
          <div className="relative aspect-[9/16] w-full max-w-[380px] overflow-hidden rounded-2xl bg-black">
            {currentPost.videoUrl ? (
              currentPost.youtubeVideoId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${currentPost.youtubeVideoId}?autoplay=1&mute=${isMuted ? 1 : 0}`}
                  title={currentPost.title || "Geters Short"}
                  className="h-full w-full"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              ) : (
                <video
                  ref={videoRef}
                  key={currentPost.id}
                  src={currentPost.videoUrl}
                  autoPlay
                  loop
                  playsInline
                  muted={isMuted}
                  onClick={togglePlay}
                  onPlay={() => setIsPaused(false)}
                  onPause={() => setIsPaused(true)}
                  className="h-full w-full cursor-pointer object-cover"
                />
              )
            ) : null}

            {/* Top Controls */}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-3.5">
              <span className="rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-semibold text-white">
                {activeIndex + 1} / {items.length}
                {currentPost.videoDurationSeconds ? ` · ${currentPost.videoDurationSeconds}s` : ""}
              </span>
              <div className="pointer-events-auto flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label={isPaused ? "Ijro etish" : "To'xtatish"}
                  className="rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                >
                  {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsMuted((m) => !m)}
                  aria-label={isMuted ? "Ovozni yoqish" : "Ovozni o'chirish"}
                  className="rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Bottom Author & Caption Overlay */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-4 pt-12 text-white">
              <div className="pointer-events-auto flex items-center gap-2.5">
                <UserAvatar
                  avatarUrl={currentPost.author.avatarUrl}
                  name={currentPost.author.name}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{currentPost.author.name}</p>
                  <p className="truncate text-xs text-white/75">{currentPost.author.handle}</p>
                </div>
              </div>
              {currentPost.title && (
                <p className="mt-2 line-clamp-2 text-sm font-semibold">{currentPost.title}</p>
              )}
              {currentPost.tags && currentPost.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {currentPost.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Action & Navigation Rail */}
          <div className="flex flex-row items-center gap-4 md:flex-col">
            <button
              type="button"
              disabled={activeIndex <= 0}
              onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
              aria-label="Oldingi short"
              className="rounded-full bg-slate-100 p-2.5 text-slate-800 disabled:opacity-35 dark:bg-zinc-900 dark:text-white"
            >
              <ChevronUp className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => handleToggleLike(currentPost)}
              className="flex flex-col items-center gap-1 text-xs font-semibold text-slate-700 dark:text-zinc-200"
            >
              <span
                className={`rounded-full p-2.5 ${
                  currentPost.isLiked
                    ? "bg-red-50 text-red-600 dark:bg-red-950/40"
                    : "bg-slate-100 dark:bg-zinc-900"
                }`}
              >
                <Heart className={`h-5 w-5 ${currentPost.isLiked ? "fill-current" : ""}`} />
              </span>
              {currentPost.likesCount}
            </button>

            <Link
              href={localePath(`/dashboard/posts/${currentPost.id}`)}
              className="flex flex-col items-center gap-1 text-xs font-semibold text-slate-700 dark:text-zinc-200"
            >
              <span className="rounded-full bg-slate-100 p-2.5 dark:bg-zinc-900">
                <MessageCircle className="h-5 w-5" />
              </span>
              {currentPost.commentsCount}
            </Link>

            <button
              type="button"
              onClick={() => handleToggleBookmark(currentPost)}
              className="flex flex-col items-center gap-1 text-xs font-semibold text-slate-700 dark:text-zinc-200"
            >
              <span
                className={`rounded-full p-2.5 ${
                  currentPost.isSaved
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40"
                    : "bg-slate-100 dark:bg-zinc-900"
                }`}
              >
                <Bookmark className={`h-5 w-5 ${currentPost.isSaved ? "fill-current" : ""}`} />
              </span>
              Saqlash
            </button>

            <button
              type="button"
              onClick={() => handleShare(currentPost)}
              className="flex flex-col items-center gap-1 text-xs font-semibold text-slate-700 dark:text-zinc-200"
            >
              <span className="rounded-full bg-slate-100 p-2.5 dark:bg-zinc-900">
                <Share2 className="h-5 w-5" />
              </span>
              Ulashish
            </button>

            <Link
              href={localePath(`/dashboard/posts/${currentPost.id}`)}
              aria-label="To'liq postni ochish"
              className="rounded-full bg-slate-100 p-2.5 text-slate-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>

            <button
              type="button"
              disabled={activeIndex >= items.length - 1}
              onClick={() => setActiveIndex((i) => Math.min(items.length - 1, i + 1))}
              aria-label="Keyingi short"
              className="rounded-full bg-slate-100 p-2.5 text-slate-800 disabled:opacity-35 dark:bg-zinc-900 dark:text-white"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
