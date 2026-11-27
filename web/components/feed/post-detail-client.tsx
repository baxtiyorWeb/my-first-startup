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
  UserCheck,
  Edit2,
  Check,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Post, CommentThreadItem } from "@/types/social";
import { useAuth } from "@/components/auth/auth-context";
import { toast } from "@/components/ui/toast";
import { ReportModal } from "@/components/ui/report-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EditPostModal } from "@/components/feed/edit-post-modal";
import { UserAvatar } from "@/components/ui/user-avatar";
import { RichContent } from "@/components/feed/rich-content";
import { HighlightText } from "@/lib/highlight";
import { useI18n } from "@/lib/i18n/context";
import { isSameUser } from "@/lib/user-utils";
import { TrendingTopicsWidget, SuggestedAuthorsWidget } from "@/components/feed/right-sidebar";

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

  // Search highlight state
  const cardRef = useRef<HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window !== "undefined" && postId && hlParam) {
      try {
        const hasSeen = sessionStorage.getItem(`seen_hl_${postId}`);
        if (hasSeen === hlParam) {
          return "";
        }
      } catch {
        // Ignore
      }
    }
    return hlParam;
  });

  const [isHighlighted, setIsHighlighted] = useState(() => Boolean(searchQuery));

  useEffect(() => {
    if (searchQuery) {
      if (typeof window !== "undefined" && postId) {
        try {
          sessionStorage.setItem(`seen_hl_${postId}`, searchQuery);
        } catch {
          // Ignore
        }
      }

      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

      const timer = setTimeout(() => {
        setIsHighlighted(false);
        setSearchQuery("");

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

  // Modals & Menu
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isAuthorReportOpen, setIsAuthorReportOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false);

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
        setIsFollowingAuthor(Boolean(postData.author.isFollowing));
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
    if (!session.isAuthenticated) {
      toast.info(t("auth.loginRequired") || "Yoqtirish uchun tizimga kiring");
      return;
    }
    const prevLiked = isLiked;
    const prevCount = likesCount;
    const nextState = !prevLiked;
    setIsLiked(nextState);
    setLikesCount(nextState ? prevCount + 1 : Math.max(0, prevCount - 1));

    try {
      const res = await api.posts.toggleLike(postId);
      setIsLiked(res.liked);
      setLikesCount(res.likesCount);
    } catch (err) {
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
      toast.error(err instanceof Error ? err.message : "Yoqtirish amalga oshmadi");
    }
  };

  const handleSave = async () => {
    if (!session.isAuthenticated) {
      toast.info(t("auth.loginRequired") || "Saqlash uchun tizimga kiring");
      return;
    }
    const prevSaved = isSaved;
    const nextState = !prevSaved;
    setIsSaved(nextState);

    try {
      const res = await api.posts.toggleBookmark(postId);
      setIsSaved(res.saved);
      if (res.saved) {
        toast.success("Saqlanganlarga qo‘shildi");
      } else {
        toast.info("Saqlanganlardan olib tashlandi");
      }
    } catch (err) {
      setIsSaved(prevSaved);
      toast.error(err instanceof Error ? err.message : "Saqlashda xatolik yuz berdi");
    }
  };

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.info(t("post.copiedPostLink") || "Havola nusxalandi!");
    }
  };

  const handleDeletePost = async () => {
    try {
      await api.posts.deletePost(postId);
      toast.success(t("feed.deleteSuccess") || "Post o'chirildi");
      router.push(localePath("/dashboard"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (t("feed.deleteError") || "O'chirishda xatolik"));
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newCommentText.trim();
    if (!text || isSubmittingComment) return;

    if (!session.isAuthenticated) {
      toast.info(t("discussion.authRequired") || "Fikr bildirish uchun tizimga kiring");
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
      toast.success(t("discussion.publishSuccess") || "Fikringiz muvaffaqiyatli chop etildi!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (t("discussion.sendError") || "Fikr yuborishda xatolik yuz berdi"));
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleAddReply = async (parentId: string) => {
    const text = replyText.trim();
    if (!text || isSubmittingReply) return;

    if (!session.isAuthenticated) {
      toast.info(t("discussion.authRequired") || "Javob yozish uchun tizimga kiring");
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
      toast.success(t("discussion.publishSuccess") || "Javobingiz chop etildi!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (t("discussion.sendError") || "Javob yuborishda xatolik yuz berdi"));
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleToggleCommentLike = async (commentId: string) => {
    if (!session.isAuthenticated) {
      toast.info(t("auth.loginRequired") || "Fikrni yoqtirish uchun tizimga kiring");
      return;
    }

    const prevComments = comments;
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          const nextLiked = !c.isLiked;
          return {
            ...c,
            isLiked: nextLiked,
            likesCount: nextLiked ? c.likesCount + 1 : Math.max(0, c.likesCount - 1),
          };
        }
        if (c.replies && c.replies.length > 0) {
          return {
            ...c,
            replies: c.replies.map((r) => {
              if (r.id === commentId) {
                const nextLiked = !r.isLiked;
                return {
                  ...r,
                  isLiked: nextLiked,
                  likesCount: nextLiked ? r.likesCount + 1 : Math.max(0, r.likesCount - 1),
                };
              }
              return r;
            }),
          };
        }
        return c;
      })
    );

    try {
      await api.comments.toggleCommentLike(commentId);
    } catch (err) {
      setComments(prevComments);
      toast.error(err instanceof Error ? err.message : "Yoqtirish amalga oshmadi");
    }
  };

  if (loading) {
    return (
      <div className="w-full flex items-start justify-center gap-6 py-4">
        <div className="flex-1 max-w-3xl space-y-4 animate-pulse">
          <div className="h-9 w-28 bg-slate-200 dark:bg-[#202327] rounded-xl" />
          <div className="h-72 bg-white dark:bg-[#000000] border border-slate-200/80 dark:border-[#2f3336] rounded-[16px]" />
          <div className="h-44 bg-white dark:bg-[#000000] border border-slate-200/80 dark:border-[#2f3336] rounded-[16px]" />
        </div>
        <div className="hidden xl:block w-[320px] space-y-4 animate-pulse">
          <div className="h-48 bg-white dark:bg-[#000000] border border-slate-200/80 dark:border-[#2f3336] rounded-[16px]" />
          <div className="h-64 bg-white dark:bg-[#000000] border border-slate-200/80 dark:border-[#2f3336] rounded-[16px]" />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="w-full py-16 px-4 text-center max-w-md mx-auto space-y-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#000000] border border-slate-200/90 dark:border-[#2f3336] shadow-xs space-y-3">
          <p className="text-sm font-semibold text-slate-700 dark:text-[#e7e9ea]">
            {error || t("search.noResults") || "Post topilmadi"}
          </p>
          <Link
            href={localePath("/dashboard")}
            className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl bg-[#1d9bf0] text-white hover:bg-[#1a8cd8] transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>{t("create.backToDashboard") || "Lentaga qaytish"}</span>
          </Link>
        </div>
      </div>
    );
  }

  const isOwnPost = isSameUser(session.user, post.author);

  return (
    <div className="w-full flex items-start justify-center gap-6 py-2">
      {/* Left: Main Post & Discussion Column */}
      <div className="flex-1 max-w-3xl min-w-0 space-y-4">
        {/* Back Button */}
        <Link
          href={localePath("/dashboard")}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-[#8b98a5] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#16181c] transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>{t("create.backToDashboard") || "Lentaga qaytish"}</span>
        </Link>

        {/* Main Post Card */}
        <article
          ref={cardRef}
          className={`bg-white dark:bg-[#000000] border border-slate-200/90 dark:border-[#2f3336] rounded-[16px] p-5 sm:p-6 shadow-xs transition-all duration-300 ${
            isHighlighted
              ? "animate-highlight-pulse border-amber-400/80 dark:border-amber-400/60 ring-2 ring-amber-400/50"
              : ""
          }`}
        >
          {/* Author Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href={localePath(`/dashboard/profile?handle=${encodeURIComponent(post.author.handle?.replace(/^@+/, ""))}`)}
                className="shrink-0"
              >
                <UserAvatar
                  name={post.author.name}
                  avatarUrl={post.author.avatarUrl}
                  size="md"
                  className="size-[46px] rounded-full border border-slate-200 dark:border-[#2f3336]"
                />
              </Link>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Link
                    href={localePath(`/dashboard/profile?handle=${encodeURIComponent(post.author.handle?.replace(/^@+/, ""))}`)}
                    className="text-sm sm:text-[15px] font-bold text-slate-900 dark:text-[#e7e9ea] hover:text-[#1d9bf0] transition-colors truncate"
                  >
                    {post.author.name}
                  </Link>
                  {post.author.verified && (
                    <span
                      title={t("feed.verifiedTooltip") || "Tasdiqlangan muallif"}
                      className="bg-[#1d9bf0] rounded-[4px] size-[13px] flex items-center justify-center shrink-0"
                    >
                      <Check size={9} className="text-white stroke-[2.5]" />
                    </span>
                  )}
                  <span className="text-xs text-slate-400 dark:text-[#71767b] font-mono">
                    {post.author.handle?.startsWith("@") ? post.author.handle : `@${post.author.handle}`}
                  </span>
                  <span className="text-[10px] text-slate-300 dark:text-zinc-700">•</span>
                  <time className="text-xs text-slate-400 dark:text-[#71767b]">
                    {formatRelativeTime(post.createdAt)}
                  </time>
                </div>
                <p className="text-xs text-slate-500 dark:text-[#8b98a5] truncate mt-0.5">
                  {post.author.role}
                </p>
              </div>
            </div>

            {/* Right: Follow Button + Options Menu */}
            <div className="flex items-center gap-2 shrink-0">
              {!isOwnPost && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!session.isAuthenticated) {
                      toast.info(t("auth.loginRequired") || "Kuzatish uchun tizimga kiring");
                      return;
                    }
                    const nextState = !isFollowingAuthor;
                    setIsFollowingAuthor(nextState);
                    try {
                      const res = await api.users.toggleFollow(post.author.handle);
                      const following = res.isFollowing ?? res.following;
                      setIsFollowingAuthor(following);
                      if (following) {
                        toast.success(`${post.author.name} kuzatuvchilari ro'yxatiga qo'shildingiz`);
                      } else {
                        toast.info(`${post.author.name} kuzatish to'xtatildi`);
                      }
                    } catch (err) {
                      setIsFollowingAuthor(!nextState);
                      toast.error(err instanceof Error ? err.message : "Kuzatish amalida xatolik yuz berdi");
                    }
                  }}
                  className={`h-[32px] px-3 rounded-[12px] text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isFollowingAuthor
                      ? "bg-slate-100 dark:bg-[#202327] border border-slate-200 dark:border-[#2f3336] text-slate-700 dark:text-[#cfd9de] hover:bg-slate-200"
                      : "bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white shadow-xs"
                  }`}
                >
                  {isFollowingAuthor ? (
                    <>
                      <UserCheck size={13} />
                      <span>{t("common.following") || "Obunadasiz"}</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={13} />
                      <span>{t("common.follow") || "Obuna bo'lish"}</span>
                    </>
                  )}
                </button>
              )}

              {/* Options Menu Toggle */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsMenuOpen((prev) => !prev)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#202327] transition-colors cursor-pointer"
                  title="Amallar"
                >
                  <MoreHorizontal size={16} />
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-[#16181c] rounded-[14px] border border-slate-200 dark:border-[#2f3336] shadow-xl py-1.5 z-30 text-xs animate-in fade-in zoom-in-95">
                    <button
                      type="button"
                      onClick={() => {
                        handleShare();
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-[#cfd9de] hover:bg-slate-50 dark:hover:bg-[#202327] flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Share2 size={14} />
                      <span>Ulashish</span>
                    </button>
                    {isOwnPost ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            setIsEditModalOpen(true);
                          }}
                          className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-[#cfd9de] hover:bg-slate-50 dark:hover:bg-[#202327] flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Edit2 size={14} />
                          <span>Tahrirlash</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            setIsConfirmDeleteOpen(true);
                          }}
                          className="w-full px-3.5 py-2 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                          <span>O'chirish</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            setIsReportOpen(true);
                          }}
                          className="w-full px-3.5 py-2 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Flag size={14} />
                          <span>Postga shikoyat qilish</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            setIsAuthorReportOpen(true);
                          }}
                          className="w-full px-3.5 py-2 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Flag size={14} />
                          <span>Muallifni shikoyat qilish</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Project Box (if project info exists) */}
          {post.projectUrl && (
            <div className="mb-4 p-3.5 rounded-[12px] bg-slate-50 dark:bg-[#16181c] border border-slate-200/80 dark:border-[#2f3336] space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-[#e7e9ea]">
                  <Rocket size={14} className="text-[#1d9bf0]" />
                  <span>Startap / Loyiha:</span>
                </span>
                {post.projectStage && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-blue-50 dark:bg-blue-950/60 text-[#1d9bf0] border border-[#1d9bf0]/20">
                    Bosqich: {post.projectStage}
                  </span>
                )}
              </div>
              {post.lookingFor && (
                <p className="text-xs text-slate-600 dark:text-[#8b98a5]">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Qidirilmoqda:</span> {post.lookingFor}
                </p>
              )}
              <a
                href={post.projectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1d9bf0] hover:underline"
              >
                <span>{post.projectUrl.replace(/^https?:\/\//, "")}</span>
                <ExternalLink size={12} />
              </a>
            </div>
          )}

          {/* Title */}
          {post.title && (
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-[#e7e9ea] mb-3 leading-snug">
              {searchQuery ? (
                <HighlightText text={post.title} query={searchQuery} />
              ) : (
                post.title
              )}
            </h1>
          )}

          {/* Content */}
          <div className="text-[14px] sm:text-[15px] leading-relaxed text-slate-800 dark:text-[#d6d9db]">
            <RichContent content={post.content} searchQuery={searchQuery} />
          </div>

          {/* Attached Video Player */}
          {post.videoUrl && (
            <div className="mt-4 overflow-hidden rounded-[12px] bg-black">
              <video
                src={post.videoUrl}
                poster={post.coverImageUrl || mediaList[0] || undefined}
                controls
                playsInline
                preload="metadata"
                className="w-full max-h-[520px] object-contain"
              />
            </div>
          )}

          {/* Media Attachments Gallery */}
          {mediaList.length > 0 && (
            <div
              className={`mt-4 w-full grid gap-2.5 ${
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
                  className={`relative group rounded-[12px] overflow-hidden bg-slate-100 dark:bg-[#16181c] border border-slate-200/80 dark:border-[#2f3336] focus:outline-none focus:ring-2 focus:ring-[#1d9bf0] cursor-pointer ${
                    mediaList.length === 1
                      ? "aspect-video sm:aspect-auto sm:h-80"
                      : mediaList.length === 2
                      ? "aspect-[4/3] sm:aspect-auto sm:h-60"
                      : "aspect-square sm:aspect-auto sm:h-48"
                  }`}
                >
                  <img
                    src={url}
                    alt={`Media ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Post Metrics and Actions Bar */}
          <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-[#2f3336] flex items-center justify-between text-xs text-slate-500 dark:text-[#8b98a5]">
            <div className="flex items-center gap-4 sm:gap-6">
              <button
                type="button"
                onClick={handleLike}
                className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isLiked
                    ? "text-rose-600 dark:text-rose-400 font-semibold"
                    : "hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Heart
                  size={16}
                  className={isLiked ? "fill-rose-600 dark:fill-rose-400 text-rose-600" : ""}
                />
                <span className="font-medium">{likesCount}</span>
              </button>

              <div className="flex items-center gap-1.5">
                <MessageSquare size={16} />
                <span className="font-medium">{commentsCount}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Eye size={16} />
                <span className="font-medium">{viewsCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                aria-label="Saqlash"
                className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#202327] transition-colors cursor-pointer ${
                  isSaved ? "text-amber-500" : ""
                }`}
              >
                <Bookmark size={16} className={isSaved ? "fill-amber-500 text-amber-500" : ""} />
              </button>

              <button
                type="button"
                onClick={handleShare}
                aria-label="Ulashish"
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#202327] text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <Share2 size={16} />
              </button>
            </div>
          </div>
        </article>

        {/* Discussion Thread Card */}
        <section className="bg-white dark:bg-[#000000] border border-slate-200/90 dark:border-[#2f3336] rounded-[16px] p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#2f3336]">
            <h2 className="text-[15px] font-bold text-slate-900 dark:text-[#e7e9ea] flex items-center gap-2">
              <MessageSquare size={16} className="text-[#1d9bf0]" />
              <span>Muhokamalar va Fikrlar</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-[#202327] text-slate-600 dark:text-[#8b98a5]">
                {commentsCount}
              </span>
            </h2>
          </div>

          {/* New Comment Composer */}
          <form onSubmit={handleAddComment} className="space-y-3">
            <div className="flex items-start gap-3">
              <UserAvatar
                name={session.user?.name || "Siz"}
                avatarUrl={session.user?.avatarUrl}
                size="sm"
                className="size-[36px] rounded-full shrink-0 mt-1 border border-slate-200 dark:border-[#2f3336]"
              />
              <div className="flex-1 min-w-0">
                <textarea
                  rows={2}
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Mavzu yuzasidan o'z fikringiz yoki tahlilingizni yozing..."
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-[14px] border border-slate-200 dark:border-[#2f3336] bg-slate-50/70 dark:bg-[#16181c] text-slate-900 dark:text-[#e7e9ea] placeholder:text-slate-400 dark:placeholder:text-[#71767b] focus:outline-none focus:border-[#1d9bf0] focus:ring-1 focus:ring-[#1d9bf0] transition-all resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!newCommentText.trim() || isSubmittingComment}
                className="h-[36px] px-4 rounded-[12px] bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send size={13} />
                <span>{isSubmittingComment ? "Yuborilmoqda..." : "Fikr qoldirish"}</span>
              </button>
            </div>
          </form>

          {/* Comments List */}
          <div className="space-y-4 pt-2">
            {comments.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 dark:text-[#71767b]">
                Hozircha hech kim fikr bildirmadi. Birinchi bo'lib o'z fikringizni ulashing!
              </div>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-3.5 rounded-[14px] bg-slate-50/50 dark:bg-[#16181c]/60 border border-slate-200/60 dark:border-[#202327] space-y-2.5 transition-colors"
                >
                  {/* Comment Author Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Link
                        href={localePath(`/dashboard/profile?handle=${encodeURIComponent(comment.author.handle?.replace(/^@+/, ""))}`)}
                      >
                        <UserAvatar
                          name={comment.author.name}
                          avatarUrl={comment.author.avatarUrl}
                          size="sm"
                          className="size-[32px] rounded-full"
                        />
                      </Link>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={localePath(`/dashboard/profile?handle=${encodeURIComponent(comment.author.handle?.replace(/^@+/, ""))}`)}
                            className="text-xs font-bold text-slate-900 dark:text-[#e7e9ea] hover:text-[#1d9bf0] transition-colors"
                          >
                            {comment.author.name}
                          </Link>
                          {comment.author.verified && (
                            <span
                              title="Tasdiqlangan muallif"
                              className="bg-[#1d9bf0] rounded-[3px] size-[11px] flex items-center justify-center shrink-0"
                            >
                              <Check size={8} className="text-white stroke-[2.5]" />
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400 dark:text-[#71767b] font-mono">
                            {comment.author.handle?.startsWith("@") ? comment.author.handle : `@${comment.author.handle}`}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-[#71767b]">{comment.author.role}</p>
                      </div>
                    </div>
                    <time className="text-[11px] text-slate-400 dark:text-[#71767b] font-mono">
                      {formatRelativeTime(comment.createdAt)}
                    </time>
                  </div>

                  {/* Comment Content */}
                  <div className="text-xs sm:text-[13px] leading-relaxed text-slate-700 dark:text-[#d6d9db] pl-1">
                    <RichContent content={comment.content} />
                  </div>

                  {/* Comment Actions: Like + Reply */}
                  <div className="flex items-center gap-4 pt-1 text-xs text-slate-400 dark:text-[#71767b]">
                    <button
                      type="button"
                      onClick={() => handleToggleCommentLike(comment.id)}
                      className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                        comment.isLiked
                          ? "text-rose-600 dark:text-rose-400 font-semibold"
                          : "hover:text-slate-700 dark:hover:text-white"
                      }`}
                    >
                      <Heart
                        size={13}
                        className={comment.isLiked ? "fill-rose-600 dark:fill-rose-400 text-rose-600" : ""}
                      />
                      <span>{comment.likesCount}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setReplyingToId((prev) => (prev === comment.id ? null : comment.id))
                      }
                      className="hover:text-slate-900 dark:hover:text-white cursor-pointer font-medium"
                    >
                      Javob berish
                    </button>
                  </div>

                  {/* Inline Reply Form */}
                  {replyingToId === comment.id && (
                    <div className="ml-4 sm:ml-6 pt-2 flex gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`@${comment.author.handle?.replace(/^@+/, "")} ga javob yozish...`}
                        className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[#2f3336] bg-white dark:bg-[#000000] text-slate-900 dark:text-white focus:outline-none focus:border-[#1d9bf0]"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddReply(comment.id)}
                        disabled={!replyText.trim() || isSubmittingReply}
                        className="px-3 py-1.5 rounded-xl bg-[#1d9bf0] text-white text-xs font-bold hover:bg-[#1a8cd8] disabled:opacity-50 cursor-pointer"
                      >
                        Yuborish
                      </button>
                    </div>
                  )}

                  {/* Nested Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-3 sm:ml-5 space-y-2.5 pt-2 border-l-2 border-slate-200 dark:border-[#2f3336] pl-3.5">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CornerDownRight size={12} className="text-slate-400 shrink-0" />
                            <Link
                              href={localePath(`/dashboard/profile?handle=${encodeURIComponent(reply.author.handle?.replace(/^@+/, ""))}`)}
                              className="text-xs font-bold text-slate-900 dark:text-[#e7e9ea] hover:text-[#1d9bf0] transition-colors"
                            >
                              {reply.author.name}
                            </Link>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {reply.author.handle?.startsWith("@") ? reply.author.handle : `@${reply.author.handle}`}
                            </span>
                            <span className="text-slate-300 dark:text-zinc-700 text-[10px]">•</span>
                            <time className="text-[10px] text-slate-400">
                              {formatRelativeTime(reply.createdAt)}
                            </time>
                          </div>
                          <div className="text-xs text-slate-700 dark:text-[#d6d9db] pl-5">
                            <RichContent content={reply.content} />
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
      </div>

      {/* Right Sidebar: Author Bio & Trends (Visible on wide screens) */}
      <aside className="hidden xl:block w-[320px] shrink-0 space-y-4 sticky top-20">
        {/* Author Mini Card */}
        {post && (
          <div className="bg-white dark:bg-[#000000] border border-slate-200/90 dark:border-[#2f3336] rounded-[16px] p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <Link href={localePath(`/dashboard/profile?handle=${encodeURIComponent(post.author.handle?.replace(/^@+/, ""))}`)}>
                <UserAvatar
                  name={post.author.name}
                  avatarUrl={post.author.avatarUrl}
                  size="md"
                  className="size-[44px] rounded-full"
                />
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 truncate">
                  <Link
                    href={localePath(`/dashboard/profile?handle=${encodeURIComponent(post.author.handle?.replace(/^@+/, ""))}`)}
                    className="font-bold text-sm text-slate-900 dark:text-[#e7e9ea] hover:text-[#1d9bf0] truncate"
                  >
                    {post.author.name}
                  </Link>
                  {post.author.verified && (
                    <span className="bg-[#1d9bf0] rounded-[3px] size-[12px] flex items-center justify-center shrink-0">
                      <Check size={8} className="text-white stroke-[2.5]" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-mono truncate">
                  {post.author.handle?.startsWith("@") ? post.author.handle : `@${post.author.handle}`}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-[#8b98a5] line-clamp-3">
              {post.author.role}
            </p>

            <Link
              href={localePath(`/dashboard/profile?handle=${encodeURIComponent(post.author.handle?.replace(/^@+/, ""))}`)}
              className="block w-full py-2 rounded-xl text-center text-xs font-bold bg-slate-50 dark:bg-[#202327] border border-slate-200 dark:border-[#2f3336] text-slate-800 dark:text-[#e7e9ea] hover:bg-slate-100 dark:hover:bg-[#202327] transition-colors"
            >
              Muallif profilini ko'rish
            </Link>
          </div>
        )}

        {/* Trending Topics Widget */}
        <TrendingTopicsWidget />

        {/* Suggested Authors Widget */}
        <SuggestedAuthorsWidget />
      </aside>

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetId={post.id}
        targetType="post"
        authorName={post.author.name}
        snippet={post.title || post.content.slice(0, 100)}
      />

      {/* Author Report Modal */}
      <ReportModal
        isOpen={isAuthorReportOpen}
        onClose={() => setIsAuthorReportOpen(false)}
        targetId={post.author.id}
        targetType="user"
        authorName={post.author.name}
        snippet={post.author.handle}
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
        <div className="w-full flex items-start justify-center gap-6 py-4 animate-pulse">
          <div className="flex-1 max-w-3xl space-y-4">
            <div className="h-9 w-28 bg-slate-200 dark:bg-[#202327] rounded-xl" />
            <div className="h-72 bg-white dark:bg-[#000000] border border-slate-200/80 dark:border-[#2f3336] rounded-[16px]" />
          </div>
        </div>
      }
    >
      <PostDetailInner params={params} />
    </Suspense>
  );
}
