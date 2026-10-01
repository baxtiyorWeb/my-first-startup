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
  UserPlus,
  Edit2,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Post, CommentThreadItem } from "@/types/social";
import { useAuth } from "@/components/auth/auth-context";
import { toast } from "@/components/ui/toast";
import { VerifiedBadgeIcon } from "@/components/icons";
import { ReportModal } from "@/components/ui/report-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EditPostModal } from "@/components/feed/edit-post-modal";
import { UserAvatar } from "@/components/ui/user-avatar";
import { RichContent } from "@/components/feed/rich-content";
import { HighlightText } from "@/lib/highlight";
import { useI18n } from "@/lib/i18n/context";
import { isSameUser } from "@/lib/user-utils";

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

  // Search highlight state: shows once when navigated from search, then disappears
  const cardRef = useRef<HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window !== "undefined" && postId && hlParam) {
      try {
        const hasSeen = sessionStorage.getItem(`seen_hl_${postId}`);
        if (hasSeen === hlParam) {
          return "";
        }
      } catch {
        // Ignore storage error
      }
    }
    return hlParam;
  });

  const [isHighlighted, setIsHighlighted] = useState(() => Boolean(searchQuery));

  useEffect(() => {
    if (searchQuery) {
      // Record in session so this post never highlights this term again
      if (typeof window !== "undefined" && postId) {
        try {
          sessionStorage.setItem(`seen_hl_${postId}`, searchQuery);
        } catch {
          // Ignore
        }
      }

      // Smooth scroll to card
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

      // Highlight once for 2 seconds, then remove highlighting completely
      const timer = setTimeout(() => {
        setIsHighlighted(false);
        setSearchQuery("");

        // Clean query parameter from URL without page reload
        if (typeof window !== "undefined") {
          const currentUrl = new URL(window.location.href);
          if (currentUrl.searchParams.has("hl") || currentUrl.searchParams.has("q")) {
            currentUrl.searchParams.delete("hl");
            currentUrl.searchParams.delete("q");
            const cleanUrl = currentUrl.pathname + (currentUrl.search ? currentUrl.search : "");
            window.history.replaceState(null, "", cleanUrl);
          }
        }
      }, 2000);

      return () => clearTimeout(timer);
    } else if (typeof window !== "undefined" && (hlParam || searchParams.has("hl") || searchParams.has("q"))) {
      // Clean query parameter if already seen
      const currentUrl = new URL(window.location.href);
      if (currentUrl.searchParams.has("hl") || currentUrl.searchParams.has("q")) {
        currentUrl.searchParams.delete("hl");
        currentUrl.searchParams.delete("q");
        const cleanUrl = currentUrl.pathname + (currentUrl.search ? currentUrl.search : "");
        window.history.replaceState(null, "", cleanUrl);
      }
    }
  }, [searchQuery, postId, hlParam, searchParams]);

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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
          setError(t("post.notFound") || "Ushbu post topilmadi yoki o‘chirilgan");
        } else {
          setError(t("post.loadError") || "Postni yuklashda xatolik yuz berdi");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [postId, t]);

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

  const isOwnPost = isSameUser(session.user, post.author);

  return (
    <div className="w-full py-4 space-y-4">
      {/* Back Button */}
      <Link
        href={localePath("/dashboard")}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={14} />
        <span>{t("create.backToDashboard")}</span>
      </Link>

      {/* Main Post Card */}
      <article
        ref={cardRef}
        className={`bg-transparent pb-6 border-b border-slate-100 dark:border-slate-800/80 transition-all duration-300 ${
          isHighlighted
            ? "animate-highlight-pulse border-amber-400/80 dark:border-amber-400/60 ring-2 ring-amber-400/50 rounded-xl p-3"
            : ""
        }`}
      >
        {/* Author header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={localePath(`/dashboard/profile?user=${encodeURIComponent(post.author.handle)}`)}
              className="shrink-0"
            >
              <UserAvatar
                name={post.author.name}
                avatarUrl={post.author.avatarUrl}
                size="lg"
              />
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
                {!isOwnPost && (
                  <button
                    type="button"
                    onClick={async () => {
                      setIsMenuOpen(false);
                      if (!session.isAuthenticated) {
                        toast.info(t("auth.loginRequired") || "Kuzatish uchun tizimga kiring");
                        return;
                      }
                      if (isOwnPost) {
                        toast.error("O‘zingizni kuzata olmaysiz");
                        return;
                      }
                      try {
                        const res = await api.users.toggleFollow(post.author.handle);
                        if (res.following) {
                          toast.success(`${post.author.name} obunachilaringiz ro‘yxatiga qo‘shildi`);
                        } else {
                          toast.info(`${post.author.name} obunadan chiqarildi`);
                        }
                      } catch (err: unknown) {
                        const msg = err instanceof Error ? err.message : "Kuzatish amalida xatolik yuz berdi";
                        toast.error(msg);
                      }
                    }}
                    className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                  >
                    <UserPlus size={14} />
                    <span>{t("common.follow")}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsReportOpen(true);
                  }}
                  className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <Flag size={14} />
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
                      className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer border-t border-slate-100 dark:border-slate-800"
                    >
                      <Edit2 size={14} className="text-indigo-500" />
                      <span>Tahrirlash</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsConfirmDeleteOpen(true);
                      }}
                      className="w-full px-3 py-2 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer"
                    >
                      <Trash2 size={14} />
                      <span>{t("post.delete")}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Project Showcase Badge */}
        {post.postType === "project" && (
          <div className="mt-3.5 p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Rocket className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wide">
                  Startap / Loyiha
                </span>
              </div>
              {post.projectStage && (
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                  Bosqich: {post.projectStage}
                </span>
              )}
            </div>

            {post.lookingFor && (
              <p className="text-xs text-emerald-800 dark:text-emerald-300">
                <span className="font-semibold">Qidirilmoqda:</span> {post.lookingFor}
              </p>
            )}

            {post.projectUrl && (
              <a
                href={post.projectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline pt-0.5"
              >
                <span>{post.projectUrl.replace(/^https?:\/\//, "")}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Title */}
        {post.title && (
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-3.5 leading-snug">
            {searchQuery ? (
              <HighlightText text={post.title} query={searchQuery} />
            ) : (
              post.title
            )}
          </h1>
        )}

        {/* Content */}
        <div className="mt-3.5">
          <RichContent content={post.content} searchQuery={searchQuery} />
        </div>

        {/* Media Grid */}
        {mediaList.length > 0 && (
          <div
            className={`mt-4 w-full sm:max-w-[560px] grid gap-2 ${
              mediaList.length === 1
                ? "grid-cols-1"
                : mediaList.length === 2
                ? "grid-cols-2"
                : "grid-cols-2 sm:grid-cols-3"
            }`}
          >
            {mediaList.map((url, idx) => (
              <button
                type="button"
                key={url}
                onClick={() => setLightboxIndex(idx)}
                className={`relative group rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ${
                  mediaList.length === 1
                    ? "aspect-video sm:aspect-auto sm:h-72"
                    : mediaList.length === 2
                    ? "aspect-[4/3] sm:aspect-auto sm:h-52"
                    : "aspect-square sm:aspect-auto sm:h-44"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Post media ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </button>
            ))}
          </div>
        )}

        {/* Footer Metrics & Actions */}
        <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-4 sm:gap-6">
            <button
              type="button"
              onClick={handleLike}
              className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                isLiked
                  ? "text-rose-600 dark:text-rose-400 font-semibold"
                  : "hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Heart
                size={16}
                className={isLiked ? "fill-rose-600 dark:fill-rose-400 text-rose-600" : ""}
              />
              <span>{likesCount}</span>
            </button>

            <div className="flex items-center gap-1.5">
              <MessageSquare size={16} />
              <span>{commentsCount}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Eye size={16} />
              <span>{viewsCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              aria-label={t("post.bookmark")}
              className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                isSaved ? "text-amber-500" : ""
              }`}
            >
              <Bookmark size={16} className={isSaved ? "fill-amber-500 text-amber-500" : ""} />
            </button>

            <button
              type="button"
              onClick={handleShare}
              aria-label={t("post.share")}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>
      </article>

      {/* Discussion Thread Section */}
      <section className="bg-transparent pt-2 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          {t("discussion.title")} ({commentsCount})
        </h2>

        {/* New Comment Input */}
        <form onSubmit={handleAddComment} className="flex gap-2">
          <input
            type="text"
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder={t("discussion.writeComment")}
            className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
          <button
            type="submit"
            disabled={!newCommentText.trim() || isSubmittingComment}
            className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer flex items-center gap-1.5"
          >
            <Send size={13} />
            <span>{t("discussion.send")}</span>
          </button>
        </form>

        {/* Comments List */}
        <div className="space-y-4 pt-2">
          {comments.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
              {t("discussion.noCommentsYet")}
            </p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="space-y-2 border-b border-slate-100 dark:border-slate-800 pb-3 last:border-none">
                <div className="flex items-start gap-2.5">
                  <UserAvatar
                    name={comment.author.name}
                    avatarUrl={comment.author.avatarUrl}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {comment.author.name}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {comment.author.handle}
                      </span>
                    </div>
                    <div className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                      <RichContent content={comment.content} />
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                      <button
                        type="button"
                        onClick={() =>
                          setReplyingToId((prev) => (prev === comment.id ? null : comment.id))
                        }
                        className="hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                      >
                        {t("discussion.reply")}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline Reply Input */}
                {replyingToId === comment.id && (
                  <div className="ml-8 pt-1 flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`${comment.author.name} ga javob yozish...`}
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddReply(comment.id)}
                      disabled={!replyText.trim() || isSubmittingReply}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
                    >
                      {t("discussion.reply")}
                    </button>
                  </div>
                )}

                {/* Nested Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-8 space-y-2 pt-1 border-l-2 border-slate-100 dark:border-slate-800 pl-3">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex items-start gap-2">
                        <CornerDownRight size={12} className="text-slate-400 mt-1 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                              {reply.author.name}
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">
                              {reply.author.handle}
                            </span>
                          </div>
                          <div className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                            <RichContent content={reply.content} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetId={post.id}
        targetType="post"
        authorName={post.author.name}
        snippet={post.title || post.content.slice(0, 100)}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleDeletePost}
        title={t("post.deleteTitle") || "Postni o‘chirish"}
        description={t("post.deleteConfirm") || "Ushbu postni haqiqatan ham o‘chirmoqchimisiz?"}
        confirmText={t("post.delete") || "O‘chirish"}
      />

      {/* Edit Post Modal */}
      <EditPostModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        postId={post.id}
        initialTitle={post.title}
        initialContent={post.content}
        onSuccess={({ title, content }) => {
          setPost((prev) => (prev ? { ...prev, title: title || undefined, content } : null));
        }}
      />

      {/* Lightbox Modal */}
      {lightboxIndex !== null && mediaList.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>

          <div
            className="relative max-w-5xl max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaList[lightboxIndex]}
              alt={`Full view ${lightboxIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
          </div>

          {mediaList.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) =>
                    prev !== null ? (prev === 0 ? mediaList.length - 1 : prev - 1) : 0
                  );
                }}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-xs font-mono font-medium text-white/90 tracking-wider">
                {lightboxIndex + 1} / {mediaList.length}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) =>
                    prev !== null ? (prev === mediaList.length - 1 ? 0 : prev + 1) : 0
                  );
                }}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
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

export function PostDetailClient({
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
