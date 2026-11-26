"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Heart,
  MessageSquare,
  Bookmark,
  Share2,
  Send,
  CornerDownRight,
  Check,
  Loader2,
  Copy,
} from "lucide-react";
import { api } from "@/lib/api";
import type { CommentThreadItem } from "@/types/social";
import { useAuth } from "@/components/auth/auth-context";
import { useI18n } from "@/lib/i18n/context";
import { UserAvatar } from "@/components/ui/user-avatar";
import { toast } from "@/components/ui/toast";

interface DiscussionIslandProps {
  postId: string;
  canonicalUrl: string;
  title: string;
  initialLikesCount: number;
  initialCommentsCount: number;
  initialViewsCount: number;
}

export function DiscussionIsland({
  postId,
  canonicalUrl,
  title,
  initialLikesCount,
  initialCommentsCount,
  initialViewsCount,
}: DiscussionIslandProps) {
  const { session } = useAuth();
  const { localePath, formatRelativeTime } = useI18n();

  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [commentsCount, setCommentsCount] = useState(initialCommentsCount);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const [comments, setComments] = useState<CommentThreadItem[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    let active = true;
    // Record unique view cleanly without blocking SSR
    api.posts.recordPostView(postId).catch(() => null);

    // Fetch viewer-specific flags if authenticated
    if (session?.isAuthenticated) {
      api.posts
        .getPost(postId)
        .then((p) => {
          if (active) {
            setIsLiked(Boolean(p.isLiked));
            setIsSaved(Boolean(p.isSaved));
            setLikesCount(p.likesCount);
          }
        })
        .catch(() => null);
    }

    api.comments
      .getComments(postId)
      .then((list) => {
        if (active) setComments(list);
      })
      .catch(() => {
        if (active) setComments([]);
      })
      .finally(() => {
        if (active) setIsLoadingComments(false);
      });

    return () => {
      active = false;
    };
  }, [postId, session?.isAuthenticated]);

  const handleToggleLike = useCallback(async () => {
    if (!session?.isAuthenticated) {
      toast.info("Layk bosish uchun tizimga kiring");
      return;
    }
    const prevLiked = isLiked;
    const prevCount = likesCount;
    setIsLiked(!prevLiked);
    setLikesCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);
    try {
      const res = await api.posts.toggleLike(postId);
      setIsLiked(res.liked);
      setLikesCount(res.likesCount);
    } catch (err) {
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
      toast.error(err instanceof Error ? err.message : "Amalni bajarishda xatolik");
    }
  }, [session?.isAuthenticated, isLiked, likesCount, postId]);

  const handleToggleBookmark = useCallback(async () => {
    if (!session?.isAuthenticated) {
      toast.info("Saqlash uchun tizimga kiring");
      return;
    }
    const prev = isSaved;
    setIsSaved(!prev);
    try {
      const res = await api.posts.toggleBookmark(postId);
      setIsSaved(res.saved);
      toast.success(res.saved ? "Saqlanganlarga qo'shildi" : "Saqlanganlardan olindi");
    } catch (err) {
      setIsSaved(prev);
      toast.error(err instanceof Error ? err.message : "Amalni bajarishda xatolik");
    }
  }, [session?.isAuthenticated, isSaved, postId]);

  const handleCopyShare = () => {
    const shareTarget = typeof window !== "undefined" ? window.location.href : canonicalUrl;
    navigator.clipboard?.writeText(shareTarget);
    toast.success("Havola nusxalandi");
  };

  const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(canonicalUrl)}&text=${encodeURIComponent(title)}`;

  const handlePostComment = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault();
    if (!session?.isAuthenticated) {
      toast.info("Izoh qoldirish uchun tizimga kiring");
      return;
    }
    const content = (parentId ? replyText : newComment).trim();
    if (!content) return;

    try {
      setIsSubmitting(true);
      const created = await api.comments.addComment(postId, { content, parentId });
      if (parentId) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentId
              ? { ...c, replies: [...(c.replies || []), created] }
              : c
          )
        );
        setReplyText("");
        setReplyTargetId(null);
      } else {
        setComments((prev) => [created, ...prev]);
        setNewComment("");
      }
      setCommentsCount((c) => c + 1);
      toast.success("Izohingiz qo'shildi");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Izohni yuborishda xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleCommentLike = async (commentId: string) => {
    if (!session?.isAuthenticated) {
      toast.info("Layk bosish uchun tizimga kiring");
      return;
    }
    try {
      const res = await api.comments.toggleCommentLike(commentId);
      const patchList = (items: CommentThreadItem[]): CommentThreadItem[] =>
        items.map((item) => ({
          ...(item.id === commentId
            ? { ...item, isLiked: res.liked, likesCount: res.likesCount }
            : item),
          replies: item.replies ? patchList(item.replies) : undefined,
        }));
      setComments(patchList);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xatolik yuz berdi");
    }
  };

  return (
    <section
      aria-label="Muhokama va Fikrlar"
      className="space-y-6 pt-6 border-t border-slate-200/80 dark:border-[#2f3336]"
    >
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-[16px] bg-white dark:bg-[#000000] border border-slate-200/90 dark:border-[#2f3336]">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleToggleLike}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              isLiked
                ? "bg-rose-500/10 border-rose-500/30 text-rose-500"
                : "bg-slate-50 dark:bg-[#16181c] border-slate-200 dark:border-[#2f3336] text-slate-700 dark:text-slate-300 hover:border-rose-500/40"
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
            <span>{likesCount}</span>
          </button>

          <a
            href="#comments"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-[#16181c] border border-slate-200 dark:border-[#2f3336] text-slate-700 dark:text-slate-300 hover:border-[#1d9bf0]/40 transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-[#1d9bf0]" />
            <span>{commentsCount}</span>
          </a>

          <span className="hidden sm:inline-flex items-center px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
            {initialViewsCount} ko‘rilgan
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleBookmark}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              isSaved
                ? "bg-[#1d9bf0]/10 border-[#1d9bf0]/30 text-[#1d9bf0]"
                : "bg-slate-50 dark:bg-[#16181c] border-slate-200 dark:border-[#2f3336] text-slate-700 dark:text-slate-300 hover:border-[#1d9bf0]/40"
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
            <span className="hidden sm:inline">{isSaved ? "Saqlandi" : "Saqlash"}</span>
          </button>

          <a
            href={telegramShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#1d9bf0]/10 text-[#1d9bf0] border border-[#1d9bf0]/25 hover:bg-[#1d9bf0]/20 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>Telegram</span>
          </a>

          <button
            type="button"
            onClick={handleCopyShare}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-[#16181c] border border-slate-200 dark:border-[#2f3336] text-slate-700 dark:text-slate-300 hover:border-[#1d9bf0]/40 transition-colors cursor-pointer"
            title="Havolani nusxalash"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Threaded Comments Box */}
      <div
        id="comments"
        className="rounded-[16px] bg-white dark:bg-[#000000] border border-slate-200/90 dark:border-[#2f3336] p-5 sm:p-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-950 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#1d9bf0]" />
            <span>Muhokama va savollar ({commentsCount})</span>
          </h2>
        </div>

        {/* New Comment Composer */}
        {session?.isAuthenticated ? (
          <form onSubmit={(e) => handlePostComment(e)} className="flex items-start gap-3">
            <UserAvatar
              name={session.user.name}
              avatarUrl={session.user.avatarUrl || undefined}
              size="md"
            />
            <div className="flex-1 space-y-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={2}
                placeholder="Fikringiz yoki savolingizni yozing..."
                className="w-full rounded-xl bg-slate-50 dark:bg-[#16181c] border border-slate-200 dark:border-[#2f3336] p-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1d9bf0] resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || !newComment.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#1d9bf0] hover:bg-blue-600 text-white text-xs font-bold disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Yuborish</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#16181c] border border-slate-200/80 dark:border-[#2f3336] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Savol berish va muhokamada qatnashish uchun hisobingizga kiring.
            </p>
            <Link
              href={localePath("/auth/login")}
              className="inline-flex items-center justify-center px-4 py-1.5 rounded-lg bg-[#1d9bf0] hover:bg-blue-600 text-white text-xs font-bold shrink-0 transition-colors"
            >
              Kirish
            </Link>
          </div>
        )}

        {/* Comments List */}
        {isLoadingComments ? (
          <div className="py-6 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-[#1d9bf0]" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">
            Hozircha izohlar yo‘q. Birinchi bo‘lib fikr qoldiring!
          </p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="space-y-2.5">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#16181c] border border-slate-200/70 dark:border-[#2f3336] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        name={comment.author.name}
                        avatarUrl={comment.author.avatarUrl}
                        size="sm"
                      />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {comment.author.name}
                      </span>
                      {comment.author.verified && (
                        <span className="size-3.5 rounded-full bg-[#1d9bf0] text-white flex items-center justify-center">
                          <Check size={8} strokeWidth={3} />
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {comment.content}
                  </p>
                  <div className="flex items-center gap-4 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <button
                      type="button"
                      onClick={() => handleToggleCommentLike(comment.id)}
                      className={`inline-flex items-center gap-1 cursor-pointer hover:text-rose-500 ${
                        comment.isLiked ? "text-rose-500 font-semibold" : ""
                      }`}
                    >
                      <Heart className={`w-3 h-3 ${comment.isLiked ? "fill-current" : ""}`} />
                      <span>{comment.likesCount}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setReplyTargetId(replyTargetId === comment.id ? null : comment.id)
                      }
                      className="inline-flex items-center gap-1 cursor-pointer hover:text-[#1d9bf0]"
                    >
                      <CornerDownRight className="w-3 h-3" />
                      <span>Javob berish</span>
                    </button>
                  </div>

                  {replyTargetId === comment.id && session?.isAuthenticated && (
                    <form
                      onSubmit={(e) => handlePostComment(e, comment.id)}
                      className="pt-2 flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Javobingizni yozing..."
                        className="flex-1 rounded-lg bg-white dark:bg-[#000000] border border-slate-200 dark:border-[#2f3336] px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1d9bf0]"
                      />
                      <button
                        type="submit"
                        disabled={isSubmitting || !replyText.trim()}
                        className="px-3 py-1.5 rounded-lg bg-[#1d9bf0] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                      >
                        Yuborish
                      </button>
                    </form>
                  )}
                </div>

                {/* Nested Replies */}
                {Array.isArray(comment.replies) && comment.replies.length > 0 && (
                  <div className="pl-4 sm:pl-6 border-l-2 border-slate-200 dark:border-[#2f3336] space-y-2">
                    {comment.replies.map((reply) => (
                      <div
                        key={reply.id}
                        className="p-3 rounded-xl bg-slate-50/70 dark:bg-[#000000] border border-slate-200/60 dark:border-[#2f3336] space-y-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            name={reply.author.name}
                            avatarUrl={reply.author.avatarUrl}
                            size="xs"
                          />
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {reply.author.name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {formatRelativeTime(reply.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {reply.content}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleToggleCommentLike(reply.id)}
                          className={`inline-flex items-center gap-1 text-[11px] cursor-pointer hover:text-rose-500 ${
                            reply.isLiked ? "text-rose-500 font-semibold" : "text-slate-400"
                          }`}
                        >
                          <Heart className={`w-3 h-3 ${reply.isLiked ? "fill-current" : ""}`} />
                          <span>{reply.likesCount}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
