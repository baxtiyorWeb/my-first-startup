"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  HeartIcon,
  MessageIcon,
  BookmarkIcon,
  ShareIcon,
  VerifiedBadgeIcon,
} from "@/components/icons";
import {
  MoreHorizontal,
  Flag,
  Trash2,
  Edit2,
  UserPlus,
  UserCheck,
  Link as LinkIcon,
  Eye,
  ExternalLink,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import type { Post } from "@/types/social";
import { DiscussionDrawer } from "@/components/discussion/discussion-drawer";
import { ReportModal } from "@/components/ui/report-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EditPostModal } from "./edit-post-modal";
import { useAuth } from "@/components/auth/auth-context";
import { api, ApiError } from "@/lib/api";
import { RichContent } from "./rich-content";
import { HighlightText } from "@/lib/highlight";
import { useI18n } from "@/lib/i18n/context";
import { UserAvatar } from "@/components/ui/user-avatar";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { isSameUser } from "@/lib/user-utils";
import { useContentFormat } from "@/components/format";

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
  const { stripHtml, getExcerpt, formatCompactNumber } = useContentFormat();

  const [isLiked, setIsLiked] = useState(post.isLiked ?? false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [isSaved, setIsSaved] = useState(post.isSaved ?? false);
  const [isShareActive, setIsShareActive] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    setIsLiked(post.isLiked ?? false);
    setLikesCount(post.likesCount);
    setIsSaved(post.isSaved ?? false);
  }, [post.id, post.isLiked, post.likesCount, post.isSaved]);

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
  const [prevHighlighted, setPrevHighlighted] = useState(
    isHighlighted ?? false,
  );
  const [highlightActive, setHighlightActive] = useState(
    isHighlighted ?? false,
  );
  const [activeSearchQuery, setActiveSearchQuery] = useState(searchQuery || "");

  if (prevHighlighted !== (isHighlighted ?? false)) {
    setPrevHighlighted(isHighlighted ?? false);
    setHighlightActive(isHighlighted ?? false);
  }

  useEffect(() => {
    if (highlightActive || activeSearchQuery) {
      const timer = setTimeout(() => {
        setHighlightActive(false);
        setActiveSearchQuery("");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [highlightActive, activeSearchQuery]);

  // Views Count State
  const [viewsCount, setViewsCount] = useState(post.viewsCount ?? 0);

  // Discussion Drawer State
  const [isDiscussionOpen, setIsDiscussionOpen] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);

  // Editable Post Content States
  const [currentTitle, setCurrentTitle] = useState(post.title);
  const [currentContent, setCurrentContent] = useState(post.content);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isContentExpanded, setIsContentExpanded] = useState(false);

  useEffect(() => {
    setCurrentTitle(post.title);
    setCurrentContent(post.content);
  }, [post.title, post.content]);

  // Options Menu & Dialog States
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(
    Boolean(post.author.isFollowing),
  );

  useEffect(() => {
    setIsFollowingAuthor(Boolean(post.author.isFollowing));
  }, [post.author.isFollowing]);

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
    snippet: getExcerpt(post.content, 100),
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

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session.isAuthenticated) {
      toast.info(t("auth.loginRequired") || "Yoqtirish uchun tizimga kiring");
      return;
    }
    const prevLiked = isLiked;
    const prevCount = likesCount;
    const nextState = !prevLiked;
    const nextCount = nextState ? prevCount + 1 : Math.max(0, prevCount - 1);
    setIsLiked(nextState);
    setLikesCount(nextCount);
    if (onLikeChange) {
      onLikeChange(post.id, nextState, nextCount);
      return;
    }
    try {
      const res = await api.posts.toggleLike(post.id);
      setIsLiked(res.liked);
      setLikesCount(res.likesCount);
    } catch (err) {
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
      toast.error(err instanceof ApiError ? err.message : t("feed.likeError"));
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session.isAuthenticated) {
      toast.info(t("auth.loginRequired") || "Saqlash uchun tizimga kiring");
      return;
    }
    const prevSaved = isSaved;
    const nextState = !prevSaved;
    setIsSaved(nextState);
    if (onSaveChange) {
      onSaveChange(post.id, nextState);
      return;
    }
    try {
      const res = await api.posts.toggleBookmark(post.id);
      setIsSaved(res.saved);
      if (res.saved) {
        toast.success(t("common.saved"));
      }
    } catch (err) {
      setIsSaved(prevSaved);
      toast.error(err instanceof ApiError ? err.message : t("feed.saveError"));
    }
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

  const postDetailHref =
    post.isIndexable && post.slug && post.contentKind && post.contentKind !== "thought"
      ? `/${post.locale || "uz"}/${
          post.contentKind === "video"
            ? "videos"
            : post.contentKind === "news"
            ? "news"
            : "articles"
        }/${post.slug}`
      : localePath(`/dashboard/posts/${post.id}`);

  const authorProfileHref = localePath(
    `/dashboard/profile?user=${encodeURIComponent(post.author.handle)}`,
  );
  const isOwnPost = isSameUser(session.user, post.author);

  const handleToggleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session.isAuthenticated) {
      toast.info(t("auth.loginRequired") || "Kuzatish uchun tizimga kiring");
      return;
    }

    if (isOwnPost) {
      toast.error("O‘zingizni kuzata olmaysiz");
      return;
    }

    const nextState = !isFollowingAuthor;
    setIsFollowingAuthor(nextState);
    setIsMenuOpen(false);

    try {
      const res = await api.users.toggleFollow(post.author.handle);
      const following = res.isFollowing ?? res.following;
      setIsFollowingAuthor(following);
      if (following) {
        toast.success(
          `${post.author.name} obunalaringiz ro‘yxatiga qo‘shildi`,
        );
      } else {
        toast.info(`${post.author.name} obunadan chiqarildi`);
      }
    } catch (err: unknown) {
      setIsFollowingAuthor(!nextState);
      const msg =
        err instanceof Error
          ? err.message
          : "Kuzatish amalida xatolik yuz berdi";
      toast.error(msg);
    }
  };

  const handleDeleteConfirm = async () => {
    setIsConfirmDeleteOpen(false);
    try {
      await api.posts.deletePost(post.id);
      toast.success(t("feed.deleteSuccess"));
      onDelete?.(post.id);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : t("feed.deleteError");
      toast.error(msg);
    }
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

  const authorInitials = useMemo(() => {
    const parts = (post.author.name || "").trim().split(/\s+/);
    if (parts.length >= 2 && parts[0][0] && parts[1][0]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return (post.author.name || "U").slice(0, 2).toUpperCase();
  }, [post.author.name]);

  const authorHandle = useMemo(() => {
    const h = post.author.handle || "";
    return h.startsWith("@") ? h : `@${h}`;
  }, [post.author.handle]);

  const formattedViews = useMemo(() => {
    if (viewsCount >= 1_000_000) {
      return `${(viewsCount / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    }
    if (viewsCount >= 1_000) {
      return `${(viewsCount / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
    }
    return viewsCount.toString();
  }, [viewsCount]);

  const extractedTags = useMemo(() => {
    if (post.tags && post.tags.length > 0) {
      return post.tags.map((t) => (t.startsWith("#") ? t : `#${t}`));
    }
    const matches = post.content.match(
      /#[a-zA-Z0-9_\u0400-\u04FF\u0100-\u024F]+/g,
    );
    if (matches && matches.length > 0) {
      return Array.from(new Set(matches)).slice(0, 4);
    }
    const tags: string[] = [];
    if (post.topic)
      tags.push(`#${post.topic.toLowerCase().replace(/[^a-z0-9]/g, "")}`);
    if (post.projectStage) tags.push(`#${post.projectStage}`);
    return tags;
  }, [post.tags, post.content, post.topic, post.projectStage]);

  return (
    <>
      <article
        aria-label={`${post.author.name} posti`}
        className={`relative w-full rounded-2xl border transition-all duration-200 p-4 sm:p-5 mb-4 ${
          highlightActive
            ? "animate-highlight-pulse bg-[#f7f9f9] dark:bg-[#16181c] border-[#2dd4bf]/50"
            : "bg-white dark:bg-[#000000] border-[#cfd9de] dark:border-[#2f3336] hover:border-[#8b98a5] dark:hover:border-[#3e4144]"
        }`}
      >
        {/* 1. Header: Author Identity & Metadata */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar */}
            <Link
              href={authorProfileHref}
              className="shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
              title={`${post.author.name} profili`}
            >
              <UserAvatar
                name={post.author.name}
                avatarUrl={post.author.avatarUrl}
                size="md"
              />
            </Link>

            {/* Author Name, Verified Badge & Metadata */}
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <Link
                href={authorProfileHref}
                className="font-semibold text-[13px] sm:text-[14px] text-[#0f1419] dark:text-[#e7e9ea] hover:underline truncate"
              >
                {post.author.name}
              </Link>

              {/* Verified Badge */}
              {post.author.verified && (
                <VerifiedBadge
                  size={16}
                  title={t("common.verifiedAuthor")}
                />
              )}

              {/* Metadata: @handle · time */}
              <span className="text-[12px] text-slate-500 dark:text-[#8b98a5] flex items-center gap-1.5 whitespace-nowrap">
                <span className="font-normal">{authorHandle}</span>
                <span>·</span>
                <span>{formatRelativeTime(post.createdAt)}</span>
              </span>

              {/* Optional Intent Badge */}
              {post.author.intent && post.author.intent !== "none" && (
                <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#16181c] text-slate-600 dark:text-[#8b98a5] border border-slate-200 dark:border-[#2f3336]">
                  {post.author.intent === "looking_for_cofounder" &&
                    t("intents.badge_cofounder")}
                  {post.author.intent === "open_to_work" &&
                    t("intents.badge_open_to_work")}
                  {post.author.intent === "raising_funds" &&
                    t("intents.badge_raising")}
                  {post.author.intent === "open_to_advisory" &&
                    t("intents.badge_advisory")}
                </span>
              )}
            </div>
          </div>

          {/* Options Dropdown Trigger */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen((prev) => !prev);
              }}
              className="p-1.5 rounded-md text-slate-400 dark:text-[#8b98a5] hover:text-slate-700 dark:hover:text-[#e7e9ea] hover:bg-slate-100 dark:hover:bg-[#202327] transition-colors cursor-pointer"
              aria-label={t("post.options")}
            >
              <MoreHorizontal size={18} />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#16181c] rounded-xl border border-slate-200 dark:border-[#2f3336] shadow-lg py-1 z-20 text-xs animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-full px-3 py-2 text-left text-slate-700 dark:text-[#cfd9de] hover:bg-slate-50 dark:hover:bg-[#202327] flex items-center gap-2 cursor-pointer"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>{t("common.share")}</span>
                </button>

                {!isOwnPost && (
                  <button
                    type="button"
                    onClick={handleToggleFollow}
                    className="w-full px-3 py-2 text-left text-slate-700 dark:text-[#cfd9de] hover:bg-slate-50 dark:hover:bg-[#202327] flex items-center gap-2 cursor-pointer"
                  >
                    {isFollowingAuthor ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                        <span className="font-medium">
                          {t("common.unfollow") || "Kuzatishni to‘xtatish"}
                        </span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5 text-slate-500" />
                        <span>{t("common.follow") || "Kuzatish"}</span>
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
                      snippet: getExcerpt(post.content, 100),
                    });
                    setIsReportOpen(true);
                  }}
                  className="w-full px-3 py-2 text-left text-slate-700 dark:text-[#cfd9de] hover:bg-slate-50 dark:hover:bg-[#202327] flex items-center gap-2 cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>{t("post.report")}</span>
                </button>

                {isOwnPost && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsEditModalOpen(true);
                      }}
                      className="w-full px-3 py-2 text-left text-slate-700 dark:text-[#cfd9de] hover:bg-slate-50 dark:hover:bg-[#202327] flex items-center gap-2 cursor-pointer border-t border-slate-100 dark:border-[#2f3336]"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      <span>Tahrirlash</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsConfirmDeleteOpen(true);
                      }}
                      className="w-full px-3 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2 cursor-pointer border-t border-slate-100 dark:border-[#2f3336]"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      <span>{t("post.deleteConfirm")}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 2. Middle Body: Two-column layout (Left: Title, Description, Tags; Right: Media thumbnail) */}
        <div className="mt-3.5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              {/* Title */}
              {currentTitle && (
                <Link href={postDetailHref}>
                  <h2 className="text-[14px] sm:text-[15px] font-bold text-slate-900 dark:text-[#e7e9ea] hover:underline cursor-pointer leading-[20px] line-clamp-2 mb-1.5">
                    <HighlightText
                      text={currentTitle}
                      query={activeSearchQuery}
                    />
                  </h2>
                </Link>
              )}

              {/* Description */}
              <div className="relative">
                <div
                  className={
                    !isContentExpanded ? "line-clamp-3 overflow-hidden" : ""
                  }
                >
                  <Link
                    href={postDetailHref}
                    className="block group"
                  >
                    <RichContent
                      content={currentContent}
                      searchQuery={activeSearchQuery}
                      className="text-[12px] sm:text-[13px] leading-[20px] text-slate-600 dark:text-[#cfd9de] group-hover:text-slate-900 dark:group-hover:text-[#e7e9ea] transition-colors"
                    />
                  </Link>
                </div>

                {/* Read more toggle if long content (calculated on clean text, not raw tags) */}
                {(stripHtml(currentContent).length > 220 ||
                  (stripHtml(currentContent).match(/\n/g) || []).length >= 3) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsContentExpanded((prev) => !prev);
                    }}
                    className="mt-1 text-xs font-semibold text-blue-600 dark:text-[#2dd4bf] hover:underline cursor-pointer inline-flex items-center gap-0.5"
                  >
                    {isContentExpanded ? "Yashirish" : "Ko'proq o'qish"}
                  </button>
                )}
              </div>
            </div>

            {/* Tags - Neutral styling (NO pink, NO purple) */}
            {extractedTags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-3">
                {extractedTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-slate-100 dark:bg-[#16181c] border border-slate-200/90 dark:border-[#2f3336] text-[11px] sm:text-[12px] font-medium text-slate-600 dark:text-[#8b98a5]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Optional External Link Attachment */}
            {post.projectUrl && (
              <div className="mt-2.5">
                <a
                  href={post.projectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-[#16181c] text-blue-600 dark:text-[#2dd4bf] border border-slate-200/90 dark:border-[#2f3336] hover:border-slate-300 dark:hover:border-[#3e4144] transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>
                    {
                      post.projectUrl
                        .replace(/^https?:\/\/(www\.)?/, "")
                        .split("/")[0]
                    }
                  </span>
                </a>
              </div>
            )}
          </div>

          {/* Right: Media Thumbnail (Figma: w-[240px] h-[154px] rounded-[12px]) */}
          {mediaList.length > 0 && (
            <div
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setLightboxIndex(0);
              }}
              className="group/media relative w-full sm:w-[220px] md:w-[240px] h-[140px] sm:h-[154px] shrink-0 rounded-[12px] border border-slate-200 dark:border-[#2f3336] bg-slate-100 dark:bg-[#16181c] cursor-zoom-in overflow-hidden"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaList[0]}
                alt={post.title || "Post tasviri"}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-300 transform-gpu group-hover/media:scale-105"
              />
              {mediaList.length > 1 && (
                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[11px] font-semibold backdrop-blur-xs">
                  +{mediaList.length - 1}
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover/media:bg-black/10 transition-colors pointer-events-none" />
            </div>
          )}
        </div>

        {/* Attached Video Player */}
        {post.videoUrl && (
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="mt-3 overflow-hidden rounded-[12px] bg-black"
          >
            <video
              src={post.videoUrl}
              poster={post.coverImageUrl || mediaList[0] || undefined}
              controls
              playsInline
              preload="metadata"
              className="w-full max-h-[420px] object-contain"
            />
          </div>
        )}

        {/* 3. Footer Action Bar */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-[#2f3336] flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            {/* Like Action */}
            <button
              type="button"
              onClick={handleLike}
              aria-pressed={isLiked}
              aria-label={t("post.like")}
              className={`flex items-center gap-1.5 text-[12px] font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 rounded px-1 -ml-1 ${
                isLiked
                  ? "text-red-500 font-semibold"
                  : "text-slate-500 dark:text-[#e7e9ea] hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <HeartIcon
                size={17}
                className={`transition-transform duration-150 ${
                  isLiked
                    ? "fill-red-500 stroke-red-500 scale-110"
                    : "hover:scale-105"
                }`}
              />
              <span className="tabular-nums">{likesCount}</span>
            </button>

            {/* Comment Action: Opens Slide-over Drawer */}
            <button
              type="button"
              onClick={handleOpenDiscussion}
              aria-label={`${t("post.comment")} (${commentsCount})`}
              className="flex items-center gap-1.5 text-[12px] font-medium cursor-pointer text-slate-500 dark:text-[#e7e9ea] hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 rounded px-1"
            >
              <MessageIcon size={17} />
              <span className="tabular-nums">{commentsCount}</span>
            </button>

            {/* Views Count */}
            <div
              title={`${viewsCount} ${t("common.views")}`}
              className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500 dark:text-[#e7e9ea] px-1 select-none"
            >
              <Eye size={17} className="stroke-[1.8]" />
              <span className="tabular-nums">{formattedViews}</span>
            </div>

            {/* Share Action */}
            <button
              type="button"
              onClick={handleShare}
              aria-label={t("common.share")}
              className={`flex items-center gap-1.5 text-[12px] font-medium cursor-pointer text-slate-500 dark:text-[#e7e9ea] hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 rounded px-1 ${
                isShareActive ? "scale-95 text-slate-900 dark:text-white" : ""
              }`}
            >
              <ShareIcon size={17} />
              <span>Ulashish</span>
            </button>
          </div>

          {/* Bookmark / Save Action */}
          <button
            type="button"
            onClick={handleSave}
            aria-pressed={isSaved}
            aria-label={isSaved ? t("post.saved") : t("post.save")}
            className={`flex items-center gap-1.5 text-[12px] font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 rounded px-2 py-1 ${
              isSaved
                ? "text-blue-600 dark:text-[#2dd4bf] font-semibold"
                : "text-slate-500 dark:text-[#e7e9ea] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#16181c]"
            }`}
          >
            <BookmarkIcon
              size={17}
              className={isSaved ? "fill-current" : ""}
            />
            <span className="hidden xs:inline-block">
              {isSaved ? t("post.saved") || "Saqlandi" : "Saqlash"}
            </span>
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

      {/* Edit Post Modal */}
      <EditPostModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        postId={post.id}
        initialTitle={currentTitle}
        initialContent={currentContent}
        onSuccess={({ title, content }) => {
          setCurrentTitle(title || undefined);
          setCurrentContent(content);
        }}
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
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
                  setLightboxIndex((prev) =>
                    prev !== null && prev > 0 ? prev - 1 : prev,
                  );
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
                    prev !== null && prev < mediaList.length - 1
                      ? prev + 1
                      : prev,
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
