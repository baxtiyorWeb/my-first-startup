"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  HeartIcon,
  MessageIcon,
  BookmarkIcon,
  ShareIcon,
  VerifiedBadgeIcon,
} from "@/components/icons";
import { MoreHorizontal, Flag, Trash2, UserPlus, UserCheck, Link as LinkIcon, Eye } from "lucide-react";
import { toast } from "@/components/ui/toast";
import type { Post } from "@/types/social";
import { DiscussionDrawer } from "@/components/discussion/discussion-drawer";
import { ReportModal } from "@/components/ui/report-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/components/auth/auth-context";
import { api } from "@/lib/api";
import { RichContent } from "./rich-content";
import { formatRelativeTime } from "@/lib/format-date";
import { HighlightText } from "@/lib/highlight";

interface PostCardProps {
  post: Post;
  onLikeChange?: (postId: string, isLiked: boolean, count: number) => void;
  onSaveChange?: (postId: string, isSaved: boolean) => void;
  onDelete?: (postId: string) => void;
  searchQuery?: string;
  isHighlighted?: boolean;
}

export function PostCard({
  post,
  onLikeChange,
  onSaveChange,
  onDelete,
  searchQuery,
  isHighlighted,
}: PostCardProps) {
  const { session } = useAuth();

  const [isLiked, setIsLiked] = useState(post.isLiked ?? false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [isSaved, setIsSaved] = useState(post.isSaved ?? false);
  const [isShareActive, setIsShareActive] = useState(false);

  // Search highlight & 1.5-second scale pulse state
  const [prevHighlighted, setPrevHighlighted] = useState(isHighlighted ?? false);
  const [highlightActive, setHighlightActive] = useState(isHighlighted ?? false);

  if (prevHighlighted !== (isHighlighted ?? false)) {
    setPrevHighlighted(isHighlighted ?? false);
    setHighlightActive(isHighlighted ?? false);
  }

  useEffect(() => {
    if (highlightActive) {
      const timer = setTimeout(() => {
        setHighlightActive(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [highlightActive]);

  // Views Count State
  const [viewsCount, setViewsCount] = useState(post.viewsCount ?? 0);

  // Discussion Drawer State
  const [isDiscussionOpen, setIsDiscussionOpen] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);

  // Options Menu & Dialog States
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false);

  // Specific report context if triggered from inside discussion
  const [reportTarget, setReportTarget] = useState<{
    id: string;
    type: "post" | "comment";
    author: string;
    snippet: string;
  }>({
    id: post.id,
    type: "post",
    author: post.author.name,
    snippet: post.content.slice(0, 100),
  });

  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !isLiked;
    const nextCount = nextState ? likesCount + 1 : Math.max(0, likesCount - 1);
    setIsLiked(nextState);
    setLikesCount(nextCount);
    onLikeChange?.(post.id, nextState, nextCount);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !isSaved;
    setIsSaved(nextState);
    if (nextState) {
      toast.success("Saqlanganlarga qo‘shildi");
    } else {
      toast.info("Saqlanganlardan olib tashlandi");
    }
    onSaveChange?.(post.id, nextState);
  };

  const handleShare = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsShareActive(true);
    setTimeout(() => setIsShareActive(false), 300);

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(
        `${window.location.origin}/dashboard?post=${post.id}`
      );
      toast.info("Fikr havolasi nusxalandi");
    } else {
      toast.info("Havola nusxalandi");
    }
    setIsMenuOpen(false);
  };

  const handleToggleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFollowingAuthor((prev) => !prev);
    if (!isFollowingAuthor) {
      toast.success(`${post.author.name} kuzatuvga olindi`);
    } else {
      toast.info(`${post.author.name} kuzatuvdan olindi`);
    }
    setIsMenuOpen(false);
  };

  const handleDeleteConfirm = () => {
    setIsConfirmDeleteOpen(false);
    toast.success("Fikr muvaffaqiyatli o‘chirildi");
    onDelete?.(post.id);
  };

  const handleOpenDiscussion = async () => {
    setIsDiscussionOpen(true);
    try {
      const res = await api.posts.recordPostView(post.id);
      if (res.incremented) {
        setViewsCount(res.viewsCount);
      }
    } catch {
      // Non-blocking view tracking
    }
  };

  const authorProfileHref = `/dashboard/profile?user=${encodeURIComponent(post.author.handle)}`;
  const isOwnPost = session.user.handle === post.author.handle || post.author.id === "me";

  return (
    <>
      <article
        aria-label={`${post.author.name} fikri`}
        className={`bg-white dark:bg-slate-900 border rounded-lg p-4 sm:p-4.5 transition-all duration-300 ${
          highlightActive
            ? "animate-highlight-pulse border-amber-400/80 dark:border-amber-400/60 ring-2 ring-amber-400/50"
            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
        }`}
      >
        {/* 1. Header: Author Identity & Metadata */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <Link
              href={authorProfileHref}
              className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0 select-none cursor-pointer hover:ring-2 hover:ring-slate-300 dark:hover:ring-slate-700 transition-all"
              title={`${post.author.name} profili`}
            >
              {post.author.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.author.avatarUrl}
                  alt={post.author.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                post.author.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
              )}
            </Link>

            {/* Author Details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link
                  href={authorProfileHref}
                  className="text-xs sm:text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate cursor-pointer hover:underline"
                >
                  {post.author.name}
                </Link>
                {post.author.verified && (
                  <VerifiedBadgeIcon
                    size={13}
                    className="text-slate-900 dark:text-slate-100 shrink-0"
                  />
                )}
                <Link
                  href={authorProfileHref}
                  className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  {post.author.handle}
                </Link>
                <span className="text-[10px] text-slate-300 dark:text-slate-600 select-none">
                  •
                </span>
                <time
                  dateTime={post.createdAt}
                  className="text-[11px] text-slate-400 dark:text-slate-500"
                >
                  {formatRelativeTime(post.createdAt)}
                </time>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {post.author.role}
              </p>
            </div>
          </div>

          {/* More Menu Dropdown */}
          <div className="flex items-center shrink-0">

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                aria-label="Qo‘shimcha amallar"
                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-100 text-xs">
                  <button
                    type="button"
                    onClick={() => handleShare()}
                    className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>Havolani nusxalash</span>
                  </button>

                  {!isOwnPost && (
                    <button
                      type="button"
                      onClick={handleToggleFollow}
                      className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                    >
                      {isFollowingAuthor ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Kuzatuvni to‘xtatish</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Muallifni kuzatish</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setReportTarget({
                        id: post.id,
                        type: "post",
                        author: post.author.name,
                        snippet: post.content.slice(0, 100),
                      });
                      setIsReportOpen(true);
                    }}
                    className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                  >
                    <Flag className="w-3.5 h-3.5 text-amber-500" />
                    <span>Shikoyat qilish</span>
                  </button>

                  {isOwnPost && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsConfirmDeleteOpen(true);
                      }}
                      className="w-full px-3 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 cursor-pointer border-t border-slate-100 dark:border-slate-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Fikrni o‘chirish</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Content: Title (optional) + Body */}
        <div className="mt-3 space-y-1.5">
          {post.title && (
            <Link href={`/dashboard/posts/${post.id}`}>
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 tracking-tight leading-snug hover:underline cursor-pointer">
                <HighlightText text={post.title} query={searchQuery} />
              </h2>
            </Link>
          )}
          <Link href={`/dashboard/posts/${post.id}`} className="block group">
            <RichContent
              content={post.content}
              searchQuery={searchQuery}
              className="text-xs sm:text-[13.5px] group-hover:text-slate-950 dark:group-hover:text-slate-100 transition-colors"
            />
          </Link>
        </div>

        {/* 3. Action Bar: Calm, Subtle, Highly Functional */}
        <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Like Action */}
            <button
              type="button"
              onClick={handleLike}
              aria-pressed={isLiked}
              aria-label={isLiked ? "Yoqishdan chiqarish" : "Fikrni yoqtirish"}
              className={`flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 rounded px-1 -ml-1 ${
                isLiked
                  ? "text-slate-950 dark:text-slate-50 font-semibold"
                  : "hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <HeartIcon
                size={15}
                className={`transition-transform duration-150 ${
                  isLiked
                    ? "fill-slate-900 dark:fill-slate-100 stroke-slate-900 dark:stroke-slate-100 scale-110"
                    : "hover:scale-105"
                }`}
              />
              <span className="tabular-nums">{likesCount}</span>
            </button>

            {/* Comment/Discussion Action: Opens Slide-over Drawer */}
            <button
              type="button"
              onClick={handleOpenDiscussion}
              aria-label={`Muhokamada qatnashish (${commentsCount} ta fikr)`}
              className="flex items-center gap-1.5 text-xs font-medium cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 rounded px-1"
            >
              <MessageIcon size={15} />
              <span className="tabular-nums">{commentsCount}</span>
              <span className="hidden sm:inline-block text-[11px] text-slate-400">munozara</span>
            </button>

            {/* Views Count */}
            <div
              title="Ko‘rishlar soni (1 soatlik deduplikatsiya)"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 px-1 select-none"
            >
              <Eye size={15} className="stroke-[1.75]" />
              <span className="tabular-nums">{viewsCount}</span>
            </div>

            {/* Share/Copy Link Action */}
            <button
              type="button"
              onClick={handleShare}
              aria-label="Fikr havolasini nusxalash"
              className={`flex items-center gap-1.5 text-xs font-medium cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 rounded px-1 ${
                isShareActive ? "scale-95 text-slate-900 dark:text-slate-100" : ""
              }`}
            >
              <ShareIcon size={15} />
              <span className="hidden sm:inline-block text-[11px]">Ulashish</span>
            </button>
          </div>

          {/* Save / Bookmark Action */}
          <button
            type="button"
            onClick={handleSave}
            aria-pressed={isSaved}
            aria-label={isSaved ? "Saqlanganlardan olib tashlash" : "Fikrni saqlab qo‘yish"}
            className={`p-1.5 rounded cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 ${
              isSaved
                ? "text-slate-950 dark:text-slate-50"
                : "text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <BookmarkIcon
              size={16}
              className={isSaved ? "fill-current" : ""}
            />
          </button>
        </div>
      </article>

      {/* Discussion Drawer */}
      <DiscussionDrawer
        isOpen={isDiscussionOpen}
        onClose={() => setIsDiscussionOpen(false)}
        post={post}
        onCommentAdded={() => setCommentsCount((prev) => prev + 1)}
        onReportClick={(commentId, commentAuthor, commentSnippet) => {
          setReportTarget({
            id: commentId,
            type: "comment",
            author: commentAuthor,
            snippet: commentSnippet,
          });
          setIsReportOpen(true);
        }}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetType={reportTarget.type}
        targetId={reportTarget.id}
        authorName={reportTarget.author}
        snippet={reportTarget.snippet}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Fikrni o‘chirmoqchimisiz?"
        description="Ushbu fikr va unga tegishli barcha mulohazalar butunlay o‘chiriladi. Ushbu amalni ortga qaytarib bo‘lmaydi."
        confirmText="O‘chirish"
        cancelText="Bekor qilish"
        variant="danger"
      />
    </>
  );
}
