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
import { MoreHorizontal, Flag, Trash2, UserPlus, UserCheck, Link as LinkIcon, Eye, ExternalLink, Rocket, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "@/components/ui/toast";
import type { Post } from "@/types/social";
import { DiscussionDrawer } from "@/components/discussion/discussion-drawer";
import { ReportModal } from "@/components/ui/report-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/components/auth/auth-context";
import { api } from "@/lib/api";
import { RichContent } from "./rich-content";
import { HighlightText } from "@/lib/highlight";
import { useI18n } from "@/lib/i18n/context";

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
  const { t, localePath, formatRelativeTime } = useI18n();

  const [isLiked, setIsLiked] = useState(post.isLiked ?? false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [isSaved, setIsSaved] = useState(post.isSaved ?? false);
  const [isShareActive, setIsShareActive] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const mediaList: string[] = Array.isArray(post.mediaUrls)
    ? post.mediaUrls
    : typeof (post as any).mediaUrls === "string"
    ? JSON.parse((post as any).mediaUrls || "[]")
    : Array.isArray((post as any).media_urls)
    ? (post as any).media_urls
    : typeof (post as any).media_urls === "string"
    ? JSON.parse((post as any).media_urls || "[]")
    : [];

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
      toast.success(t("common.saved"));
    }
    onSaveChange?.(post.id, nextState);
  };

  const handleShare = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsShareActive(true);
    setTimeout(() => setIsShareActive(false), 300);

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      const shareUrl = `${window.location.origin}${localePath(`/dashboard/posts/${post.id}`)}`;
      navigator.clipboard.writeText(shareUrl);
      toast.info(t("post.copiedPostLink"));
    } else {
      toast.info(t("common.linkCopied"));
    }
    setIsMenuOpen(false);
  };

  const handleToggleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFollowingAuthor((prev) => !prev);
    if (!isFollowingAuthor) {
      toast.success(`${post.author.name} (${t("common.following")})`);
    } else {
      toast.info(`${post.author.name} (${t("common.unfollow")})`);
    }
    setIsMenuOpen(false);
  };

  const handleDeleteConfirm = () => {
    setIsConfirmDeleteOpen(false);
    toast.success(t("feed.deleteSuccess"));
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

  const authorProfileHref = localePath(`/dashboard/profile?user=${encodeURIComponent(post.author.handle)}`);
  const isOwnPost = session.user.handle === post.author.handle || post.author.id === "me";

  return (
    <>
      <article
        aria-label={`${post.author.name} posti`}
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
                  <span title={t("common.verifiedAuthor")}>
                    <VerifiedBadgeIcon size={14} className="text-slate-900 dark:text-slate-100 shrink-0" />
                  </span>
                )}
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                  {post.author.handle}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {post.author.role}
                </p>
                {post.author.intent && post.author.intent !== "none" && (
                  <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                    {post.author.intent === "looking_for_cofounder" && t("intents.badge_cofounder")}
                    {post.author.intent === "open_to_work" && t("intents.badge_open_to_work")}
                    {post.author.intent === "raising_funds" && t("intents.badge_raising")}
                    {post.author.intent === "open_to_advisory" && t("intents.badge_advisory")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Time & Options Menu */}
          <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 shrink-0 select-none">
            <span className="text-[11px] font-medium">
              {formatRelativeTime(post.createdAt)}
            </span>

            {/* Options Dropdown Trigger */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen((prev) => !prev);
                }}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                aria-label={t("post.options")}
              >
                <MoreHorizontal size={15} />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-lg py-1 z-20 text-xs animate-in fade-in zoom-in-95">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>{t("common.share")}</span>
                  </button>

                  {!isOwnPost && (
                    <button
                      type="button"
                      onClick={handleToggleFollow}
                      className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                    >
                      {isFollowingAuthor ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{t("common.unfollow")}</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>{t("common.follow")}</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
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
                    <span>{t("post.report")}</span>
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
                      <span>{t("post.deleteConfirm")}</span>
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
            <Link href={localePath(`/dashboard/posts/${post.id}`)}>
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 tracking-tight leading-snug hover:underline cursor-pointer">
                <HighlightText text={post.title} query={searchQuery} />
              </h2>
            </Link>
          )}
          <Link href={localePath(`/dashboard/posts/${post.id}`)} className="block group">
            <RichContent
              content={post.content}
              searchQuery={searchQuery}
              className="text-xs sm:text-[13.5px] group-hover:text-slate-950 dark:group-hover:text-slate-100 transition-colors"
            />
          </Link>

          {/* Post Media Attachments (up to 3 images) */}
          {mediaList.length > 0 && (
            <div
              className={`mt-3 w-full grid gap-2 overflow-hidden rounded-xl ${
                mediaList.length === 1
                  ? "grid-cols-1"
                  : mediaList.length === 2
                  ? "grid-cols-2"
                  : "grid-cols-3"
              }`}
            >
              {mediaList.map((url, idx) => (
                <div
                  key={idx}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setLightboxIndex(idx);
                  }}
                  className={`group/media relative w-full overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-950/5 dark:bg-slate-950/40 cursor-zoom-in ${
                    mediaList.length === 1
                      ? "aspect-video max-h-80 sm:max-h-96"
                      : mediaList.length === 2
                      ? "aspect-[4/3] sm:aspect-video"
                      : "aspect-square sm:aspect-[4/3]"
                  }`}
                >
                  {/* Layer 1: Ambient blurred background cover */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover blur-md scale-110 opacity-35 dark:opacity-25 pointer-events-none transform-gpu"
                  />

                  {/* Layer 2: Sharp foreground image contain */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={post.title || `Attachment ${idx + 1}`}
                    loading="lazy"
                    className="relative z-10 w-full h-full object-contain transition-transform duration-300 transform-gpu group-hover/media:scale-105 will-change-transform"
                  />

                  {/* Hover interaction overlay */}
                  <div className="absolute inset-0 z-20 bg-black/0 group-hover/media:bg-black/10 transition-colors pointer-events-none" />
                </div>
              ))}
            </div>
          )}

          {/* Project Showcase Meta Box */}
          {post.postType === "project" && (
            <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Rocket className="w-3 h-3" />
                  {t("project.badge")}
                </span>

                {post.projectStage && (
                  <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {post.projectStage === "idea" && t("project.stage_idea")}
                    {post.projectStage === "mvp" && t("project.stage_mvp")}
                    {post.projectStage === "launched" && t("project.stage_launched")}
                    {post.projectStage === "scaling" && t("project.stage_scaling")}
                  </span>
                )}

                {post.lookingFor && (
                  <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                    {post.lookingFor === "cofounder" && `🤝 ${t("project.looking_cofounder")}`}
                    {post.lookingFor === "feedback" && `💬 ${t("project.looking_feedback")}`}
                    {post.lookingFor === "investment" && `🚀 ${t("project.looking_investment")}`}
                    {post.lookingFor === "team" && `👥 ${t("project.looking_team")}`}
                  </span>
                )}
              </div>

              {post.projectUrl && (
                <a
                  href={post.projectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors shadow-2xs"
                >
                  <span>{t("project.visitProject")}</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* 3. Action Bar */}
        <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Like Action */}
            <button
              type="button"
              onClick={handleLike}
              aria-pressed={isLiked}
              aria-label={t("post.like")}
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
              aria-label={`${t("post.comment")} (${commentsCount})`}
              className="flex items-center gap-1.5 text-xs font-medium cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 rounded px-1"
            >
              <MessageIcon size={15} />
              <span className="tabular-nums">{commentsCount}</span>
              <span className="hidden sm:inline-block text-[11px] text-slate-400">{t("post.comment")}</span>
            </button>

            {/* Views Count */}
            <div
              title={`${viewsCount} ${t("common.views")}`}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 px-1 select-none"
            >
              <Eye size={15} className="stroke-[1.75]" />
              <span className="tabular-nums">{viewsCount}</span>
            </div>

            {/* Share/Copy Link Action */}
            <button
              type="button"
              onClick={handleShare}
              aria-label={t("common.share")}
              className={`flex items-center gap-1.5 text-xs font-medium cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 rounded px-1 ${
                isShareActive ? "scale-95 text-slate-900 dark:text-slate-100" : ""
              }`}
            >
              <ShareIcon size={15} />
              <span className="hidden sm:inline-block text-[11px]">{t("common.share")}</span>
            </button>
          </div>

          {/* Save / Bookmark Action */}
          <button
            type="button"
            onClick={handleSave}
            aria-pressed={isSaved}
            aria-label={isSaved ? t("post.saved") : t("post.save")}
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
        title={t("post.deleteTitle")}
        description={t("post.deleteDescription")}
        confirmText={t("post.deleteConfirm")}
        cancelText={t("post.deleteCancel")}
        variant="danger"
      />

      {/* Lightbox Modal */}
      {lightboxIndex !== null && mediaList[lightboxIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close preview"
          >
            <X className="w-6 h-6" />
          </button>

          {mediaList.length > 1 && (
            <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-medium">
              {lightboxIndex + 1} / {mediaList.length}
            </div>
          )}

          <div
            className="relative max-w-5xl max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={mediaList[lightboxIndex]}
              alt={post.title || "Preview"}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-150 transform-gpu"
            />
          </div>

          {mediaList.length > 1 && (
            <div
              className="absolute inset-y-0 inset-x-4 flex items-center justify-between pointer-events-none"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                disabled={lightboxIndex === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
                }}
                className="pointer-events-auto p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white disabled:opacity-30 disabled:pointer-events-none transition-opacity cursor-pointer"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                disabled={lightboxIndex === mediaList.length - 1}
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) =>
                    prev !== null && prev < mediaList.length - 1 ? prev + 1 : prev
                  );
                }}
                className="pointer-events-auto p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white disabled:opacity-30 disabled:pointer-events-none transition-opacity cursor-pointer"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
