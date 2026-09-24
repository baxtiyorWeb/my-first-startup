"use client";

import React, { useEffect, useState, use, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Heart,
  MessageSquare,
  Bookmark,
  Share2,
  Eye,
  Send,
  CornerDownRight,
  MoreHorizontal,
  Trash2,
  Flag,
  Rocket,
  ExternalLink,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Post, CommentThreadItem } from "@/types/social";
import { useAuth } from "@/components/auth/auth-context";
import { toast } from "@/components/ui/toast";
import { VerifiedBadgeIcon } from "@/components/icons";
import { ReportModal } from "@/components/ui/report-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RichContent } from "@/components/feed/rich-content";
import { HighlightText } from "@/lib/highlight";
import { useI18n } from "@/lib/i18n/context";

function PostDetailInner({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const postId = resolvedParams.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const hlParam = searchParams.get("hl") || searchParams.get("q") || "";
  const { session } = useAuth();
  const { t, localePath, formatRelativeTime } = useI18n();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<CommentThreadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const mediaList: string[] = post
    ? Array.isArray(post.mediaUrls)
      ? post.mediaUrls
      : typeof (post as any).mediaUrls === "string"
        ? JSON.parse((post as any).mediaUrls || "[]")
        : Array.isArray((post as any).media_urls)
          ? (post as any).media_urls
          : typeof (post as any).media_urls === "string"
            ? JSON.parse((post as any).media_urls || "[]")
            : []
    : [];

  // Search highlight & 1.5-second scale pulse state
  const cardRef = useRef<HTMLElement>(null);
  const searchQuery = hlParam;
  const [prevHl, setPrevHl] = useState(hlParam);
  const [isHighlighted, setIsHighlighted] = useState(Boolean(hlParam));

  if (prevHl !== hlParam) {
    setPrevHl(hlParam);
    setIsHighlighted(Boolean(hlParam));
  }

  useEffect(() => {
    if (isHighlighted) {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      const timer = setTimeout(() => {
        setIsHighlighted(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isHighlighted]);

  // Interaction states
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [viewsCount, setViewsCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);

  // New comment / reply
  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Modals
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  // Load post and record view
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Record post view (server deduplicates within 1 hour)
        const viewPromise = api.posts.recordPostView(postId).catch(() => null);

        // Fetch post & comments concurrently
        const [postData, commentsData, viewResult] = await Promise.all([
          api.posts.getPost(postId),
          api.comments.getComments(postId).catch(() => []),
          viewPromise,
        ]);

        if (!isMounted) return;

        setPost(postData);
        setIsLiked(Boolean(postData.isLiked));
        setLikesCount(postData.likesCount);
        setIsSaved(Boolean(postData.isSaved));
        setViewsCount(viewResult?.viewsCount ?? postData.viewsCount ?? 0);
        setComments(commentsData);
        setCommentsCount(postData.commentsCount);
      } catch (err) {
        if (!isMounted) return;
        if (err instanceof ApiError && err.status === 404) {
          setError("Ushbu fikr topilmadi yoki o‘chirilgan");
        } else {
          setError("Fikrni yuklashda xatolik yuz berdi");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [postId]);

  const handleLike = async () => {
    const nextState = !isLiked;
    setIsLiked(nextState);
    setLikesCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));

    try {
      const res = await api.posts.toggleLike(postId);
      setIsLiked(res.liked);
      setLikesCount(res.likesCount);
    } catch {
      // Revert on failure
      setIsLiked(!nextState);
      setLikesCount((prev) => (!nextState ? prev + 1 : Math.max(0, prev - 1)));
      toast.error("Yoqtirish amalga oshmadi");
    }
  };

  const handleSave = async () => {
    const nextState = !isSaved;
    setIsSaved(nextState);
    if (nextState) {
      toast.success("Saqlanganlarga qo‘shildi");
    } else {
      toast.info("Saqlanganlardan olib tashlandi");
    }

    try {
      const res = await api.posts.toggleBookmark(postId);
      setIsSaved(res.saved);
    } catch {
      setIsSaved(!nextState);
      toast.error("Saqlashda xatolik yuz berdi");
    }
  };

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.info(t("post.copiedPostLink"));
    }
  };

  const handleDeletePost = async () => {
    try {
      await api.posts.deletePost(postId);
      toast.success(t("feed.deleteSuccess"));
      router.push(localePath("/dashboard"));
    } catch {
      toast.error(t("feed.deleteError"));
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newCommentText.trim();
    if (!text || isSubmittingComment) return;

    if (!session.isAuthenticated) {
      toast.info(t("discussion.authRequired"));
      return;
    }

    setIsSubmittingComment(true);
    try {
      const added = await api.comments.addComment(postId, { content: text });
      const newCommentItem: CommentThreadItem = {
        id: added.id,
        postId: added.postId,
        author: added.author,
        content: added.content,
        createdAt: new Date().toISOString(),
        likesCount: 0,
        isLiked: false,
        replies: [],
      };
      setComments((prev) => [newCommentItem, ...prev]);
      setCommentsCount((prev) => prev + 1);
      setNewCommentText("");
      toast.success(t("discussion.publishSuccess"));
    } catch {
      toast.error(t("discussion.sendError"));
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleAddReply = async (parentId: string) => {
    const text = replyText.trim();
    if (!text || isSubmittingReply) return;

    if (!session.isAuthenticated) {
      toast.info(t("discussion.authRequired"));
      return;
    }

    setIsSubmittingReply(true);
    try {
      const added = await api.comments.addComment(postId, { content: text, parentId });
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === parentId) {
            return {
              ...c,
              replies: [
                ...(c.replies || []),
                {
                  id: added.id,
                  postId: added.postId,
                  parentId,
                  author: added.author,
                  content: added.content,
                  createdAt: new Date().toISOString(),
                  likesCount: 0,
                  isLiked: false,
                },
              ],
            };
          }
          return c;
        })
      );
      setCommentsCount((prev) => prev + 1);
      setReplyText("");
      setReplyingToId(null);
      toast.success(t("discussion.publishSuccess"));
    } catch {
      toast.error(t("discussion.sendError"));
    } finally {
      setIsSubmittingReply(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full py-4 space-y-4 animate-pulse">
        <div className="h-9 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="h-64 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl" />
        <div className="h-32 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="w-full py-12 px-4 text-center">
        <p className="text-slate-600 dark:text-slate-400 font-medium mb-4">
          {error || t("search.noResults")}
        </p>
        <Link
          href={localePath("/dashboard")}
          className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 transition-opacity"
        >
          <ArrowLeft size={14} />
          {t("create.backToDashboard")}
        </Link>
      </div>
    );
  }

  const isOwnPost =
    session.user.handle === post.author.handle || post.author.id === "me";

  return (
    <div className="w-full py-4 space-y-4">


      {/* Main Post Card with 1.5-second scale & glow effect when navigated from search */}
      <article
        ref={cardRef}
        className={`bg-white dark:bg-slate-900 border rounded-xl p-4 sm:p-5 shadow-sm transition-all duration-300 ${isHighlighted
          ? "animate-highlight-pulse border-amber-400/80 dark:border-amber-400/60 ring-2 ring-amber-400/50"
          : "border-slate-200 dark:border-slate-800"
          }`}
      >
        {/* Author header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={localePath(`/dashboard/profile?user=${encodeURIComponent(post.author.handle)}`)}
              className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-semibold text-xs text-slate-700 dark:text-slate-300 overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800 shrink-0"
            >
              {post.author.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.author.avatarUrl}
                  alt={post.author.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                post.author.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
              )}
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link
                  href={localePath(`/dashboard/profile?user=${encodeURIComponent(post.author.handle)}`)}
                  className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:underline"
                >
                  {post.author.name}
                </Link>
                {post.author.verified && (
                  <VerifiedBadgeIcon size={14} className="text-slate-900 dark:text-slate-100" />
                )}
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {post.author.handle}
                </span>
                <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
                <time className="text-xs text-slate-400 dark:text-slate-500">
                  {formatRelativeTime(post.createdAt)}
                </time>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {post.author.role}
              </p>
            </div>
          </div>

          {/* Options Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label={t("post.options")}
              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <MoreHorizontal size={16} />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg py-1 z-30 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    handleShare();
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <Share2 size={14} />
                  <span>{t("post.share")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsReportOpen(true);
                  }}
                  className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <Flag size={14} className="text-amber-500" />
                  <span>{t("post.report")}</span>
                </button>
                {isOwnPost && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsConfirmDeleteOpen(true);
                    }}
                    className="w-full px-3 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800"
                  >
                    <Trash2 size={14} />
                    <span>{t("common.delete")}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-2">
          {post.title && (
            <h1 className="text-base sm:text-lg font-semibold text-slate-950 dark:text-slate-50 tracking-tight">
              <HighlightText text={post.title} query={searchQuery} />
            </h1>
          )}
          <RichContent
            content={post.content}
            searchQuery={searchQuery}
            className="text-[14.5px]"
          />

          {/* Post Media Attachments (up to 3 images) */}
          {mediaList.length > 0 && (
            <div
              className={`mt-4 w-full grid gap-2 overflow-hidden rounded-xl ${mediaList.length === 1
                  ? "grid-cols-1"
                  : mediaList.length === 2
                    ? "grid-cols-2"
                    : "grid-cols-3"
                }`}
            >
              {mediaList.map((url, idx) => (
                <div
                  key={idx}
                  onClick={() => setLightboxIndex(idx)}
                  className={`group/media relative w-full overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-950/5 dark:bg-slate-950/40 cursor-zoom-in ${mediaList.length === 1
                      ? "aspect-video max-h-96"
                      : mediaList.length === 2
                        ? "aspect-[4/3] sm:aspect-video"
                        : "aspect-square sm:aspect-[4/3]"
                    }`}
                >
                  <img
                    src={url}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover blur-md scale-110 opacity-35 dark:opacity-25 pointer-events-none transform-gpu"
                  />

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
            <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
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
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  <span>{t("project.visitProject")}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Action bar with view count */}
        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-5 sm:gap-7">
            {/* Like */}
            <button
              type="button"
              onClick={handleLike}
              className={`flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-colors ${isLiked
                ? "text-slate-950 dark:text-slate-50 font-semibold"
                : "hover:text-slate-900 dark:hover:text-slate-200"
                }`}
            >
              <Heart
                size={16}
                className={isLiked ? "fill-current text-slate-900 dark:text-slate-100" : ""}
              />
              <span className="tabular-nums">{likesCount}</span>
            </button>

            {/* Comments */}
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 select-none">
              <MessageSquare size={16} />
              <span className="tabular-nums">{commentsCount}</span>
              <span className="hidden sm:inline-block text-[11px] text-slate-400">{t("post.comment")}</span>
            </div>

            {/* Views count */}
            <div
              title={`${t("common.views")} (1h deduplication)`}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 select-none"
            >
              <Eye size={16} className="stroke-[1.75]" />
              <span className="tabular-nums">{viewsCount}</span>
              <span className="hidden sm:inline-block text-[11px] text-slate-400">{t("common.views")}</span>
            </div>

            {/* Share */}
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1.5 text-xs font-medium hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              <Share2 size={16} />
              <span className="hidden sm:inline-block text-[11px]">{t("common.share")}</span>
            </button>
          </div>

          {/* Bookmark */}
          <button
            type="button"
            onClick={handleSave}
            className={`p-1.5 rounded transition-colors ${isSaved
              ? "text-slate-950 dark:text-slate-50"
              : "text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
          >
            <Bookmark size={17} className={isSaved ? "fill-current" : ""} />
          </button>
        </div>
      </article>

      {/* Comment Input Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-sm">
        <form onSubmit={handleAddComment} className="space-y-3">
          <textarea
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder={
              session.isAuthenticated
                ? t("discussion.placeholder")
                : t("discussion.authRequired")
            }
            disabled={!session.isAuthenticated || isSubmittingComment}
            rows={2}
            className="w-full resize-none bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-600 disabled:opacity-60"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              {t("discussion.title")}
            </span>
            <button
              type="submit"
              disabled={!newCommentText.trim() || isSubmittingComment || !session.isAuthenticated}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={13} />
              <span>{t("discussion.send")}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Comments List */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
          {t("discussion.title")} ({commentsCount})
        </h2>

        {comments.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
            {t("discussion.emptySubtitle")}
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 space-y-3"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-semibold text-[11px] text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-800 shrink-0">
                  {comment.author.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {comment.author.name}
                    </span>
                    {comment.author.verified && (
                      <VerifiedBadgeIcon size={12} className="text-slate-900 dark:text-slate-100" />
                    )}
                    <span className="text-[11px] text-slate-400">
                      {comment.author.handle}
                    </span>
                    <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-[11px] text-slate-400">{formatRelativeTime(comment.createdAt)}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{comment.author.role}</p>
                </div>
              </div>

              <p className="text-xs sm:text-[13px] leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line">
                {comment.content}
              </p>

              <div className="flex items-center gap-4 text-xs text-slate-400">
                <button
                  type="button"
                  onClick={() =>
                    setReplyingToId((prev) => (prev === comment.id ? null : comment.id))
                  }
                  className="hover:text-slate-700 dark:hover:text-slate-200 font-medium"
                >
                  {replyingToId === comment.id ? t("common.cancel") : t("discussion.reply")}
                </button>
              </div>

              {/* Reply Box */}
              {replyingToId === comment.id && (
                <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-800 space-y-2 mt-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`@${comment.author.handle.replace("@", "")} (${t("discussion.reply")})...`}
                    rows={2}
                    className="w-full resize-none bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setReplyingToId(null)}
                      className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700"
                    >
                      {t("common.cancel")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddReply(comment.id)}
                      disabled={!replyText.trim() || isSubmittingReply}
                      className="px-3 py-1 rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 disabled:opacity-40"
                    >
                      {t("discussion.send")}
                    </button>
                  </div>
                </div>
              )}

              {/* Replies Thread */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="space-y-2.5 pl-4 border-l-2 border-slate-100 dark:border-slate-800/80 pt-1">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <CornerDownRight size={11} className="text-slate-300 dark:text-slate-600" />
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {reply.author.name}
                        </span>
                        {reply.author.verified && (
                          <VerifiedBadgeIcon size={11} className="text-slate-900 dark:text-slate-100" />
                        )}
                        <span className="text-[10px] text-slate-400">{formatRelativeTime(reply.createdAt)}</span>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 pl-4">
                        {reply.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </section>

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetId={post.id}
        targetType="post"
        authorName={post.author.name}
        snippet={post.content.slice(0, 100)}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleDeletePost}
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
              alt={post?.title || "Preview"}
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
    </div>
  );
}

export default function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="w-full py-4 space-y-4 animate-pulse">
          <div className="h-9 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-64 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl" />
          <div className="h-32 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl" />
        </div>
      }
    >
      <PostDetailInner params={params} />
    </Suspense>
  );
}

