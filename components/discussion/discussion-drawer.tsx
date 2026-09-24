"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  X,
  Send,
  CornerDownRight,
  Heart,
  Flag,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";
import type { Post, CommentThreadItem } from "@/types/social";
import { useAuth } from "@/components/auth/auth-context";
import { toast } from "@/components/ui/toast";
import { RichContent } from "@/components/feed/rich-content";
import { api, ApiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n/context";

interface DiscussionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
  onReportClick?: (targetId: string, authorName: string, textSnippet: string) => void;
  onCommentAdded?: () => void;
}

export function DiscussionDrawer({
  isOpen,
  onClose,
  post,
  onReportClick,
  onCommentAdded,
}: DiscussionDrawerProps) {
  const { session } = useAuth();
  const { t, localePath, formatRelativeTime } = useI18n();

  const [commentText, setCommentText] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [comments, setComments] = useState<CommentThreadItem[]>([]);

  // Load comments and record view for this post
  useEffect(() => {
    if (post?.id && isOpen) {
      const postId = post.id;
      let isMounted = true;

      // Record view (1-hour deduplication handled by server)
      api.posts.recordPostView(postId).catch(() => {});

      api.comments
        .getComments(postId)
        .then((data) => {
          if (isMounted) {
            setComments(data);
          }
        })
        .catch(() => {
          if (isMounted) {
            toast.error(t("discussion.loadError"));
          }
        });

      return () => {
        isMounted = false;
      };
    }
  }, [post?.id, isOpen, t]);

  const drawerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      textareaRef.current?.focus();
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !post) return null;

  const handleAddComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim()) return;

    if (!session.isAuthenticated) {
      toast.info(t("discussion.authRequired"));
      return;
    }

    try {
      const created = await api.comments.addComment(post.id, {
        content: commentText.trim(),
      });
      setComments((prev) => [created, ...prev]);
      setCommentText("");
      onCommentAdded?.();
      toast.success(t("discussion.publishSuccess"));
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : t("discussion.sendError");
      toast.error(msg);
    }
  };

  const handleAddReply = async (parentId: string) => {
    if (!replyText.trim()) return;

    if (!session.isAuthenticated) {
      toast.info(t("discussion.authRequired"));
      return;
    }

    try {
      const created = await api.comments.addComment(post.id, {
        content: replyText.trim(),
        parentId,
      });
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId
            ? { ...c, replies: [...(c.replies || []), created] }
            : c
        )
      );
      setReplyingToId(null);
      setReplyText("");
      toast.success(t("discussion.publishSuccess"));
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : t("discussion.sendError");
      toast.error(msg);
    }
  };

  const toggleCommentLike = async (commentId: string, isNested = false, parentId?: string) => {
    setComments((prev) =>
      prev.map((c) => {
        if (isNested && parentId && c.id === parentId) {
          return {
            ...c,
            replies: c.replies?.map((r) =>
              r.id === commentId
                ? {
                    ...r,
                    isLiked: !r.isLiked,
                    likesCount: r.isLiked ? r.likesCount - 1 : r.likesCount + 1,
                  }
                : r
            ),
          };
        }
        if (c.id === commentId) {
          return {
            ...c,
            isLiked: !c.isLiked,
            likesCount: c.isLiked ? c.likesCount - 1 : c.likesCount + 1,
          };
        }
        return c;
      })
    );

    try {
      await api.comments.toggleLike(commentId);
    } catch {
      // Revert silently on failure
    }
  };

  const totalCommentsCount = comments.reduce(
    (acc, curr) => acc + 1 + (curr.replies?.length || 0),
    0
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="discussion-drawer-title"
      className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        className="relative w-full max-w-lg h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col z-10 border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-250 ease-out"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            <h2
              id="discussion-drawer-title"
              className="text-base font-serif font-bold text-slate-950 dark:text-white"
            >
              {t("discussion.title")} ({totalCommentsCount})
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Post Snippet Context */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span className="font-semibold text-slate-900 dark:text-slate-200">
                {post.author.name}
              </span>
            </div>
            {post.title && (
              <h3 className="text-xs sm:text-sm font-semibold text-slate-950 dark:text-white mb-1">
                {post.title}
              </h3>
            )}
            <RichContent
              content={post.content}
              className="text-xs line-clamp-3 leading-relaxed"
            />
          </div>

          {/* Primary Comment Input */}
          <form onSubmit={handleAddComment} className="space-y-2.5">
            <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 focus-within:border-slate-950 dark:focus-within:border-white focus-within:ring-2 focus-within:ring-slate-950/10 dark:focus-within:ring-white/10 transition-all bg-white dark:bg-slate-900">
              <textarea
                ref={textareaRef}
                rows={3}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
                placeholder={t("discussion.placeholder")}
                className="w-full p-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent focus:outline-none resize-none leading-relaxed"
              />

              <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 rounded-b-xl">
                <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
                  Ctrl + Enter
                </span>
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ml-auto shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{t("discussion.send")}</span>
                </button>
              </div>
            </div>
          </form>

          {/* Discussion Stream / Tree */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t("discussion.emptyTitle")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  {t("discussion.emptySubtitle")}
                </p>
              </div>
            ) : (
              comments.map((item) => (
                <div key={item.id} className="space-y-3">
                  {/* Parent Comment Card */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Link
                          href={localePath(`/dashboard/profile?user=${encodeURIComponent(item.author.handle)}`)}
                          className="w-6 h-6 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-bold flex items-center justify-center"
                        >
                          {item.author.name[0]}
                        </Link>
                        <span className="text-xs font-semibold text-slate-900 dark:text-white">
                          {item.author.name}
                        </span>
                        {item.author.verified && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-900 dark:text-white fill-current" />
                        )}
                        <span className="text-[11px] text-slate-400">
                          • {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>

                      {onReportClick && (
                        <button
                          type="button"
                          onClick={() =>
                            onReportClick(
                              item.id,
                              item.author.name,
                              item.content.slice(0, 80)
                            )
                          }
                          title={t("post.report")}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded transition-colors"
                        >
                          <Flag className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                      {item.content}
                    </p>

                    {/* Actions Row */}
                    <div className="mt-3 flex items-center gap-4 text-xs">
                      <button
                        type="button"
                        onClick={() => toggleCommentLike(item.id)}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-colors ${
                          item.isLiked
                            ? "text-red-600 dark:text-red-400 font-semibold"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                        }`}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${item.isLiked ? "fill-current" : ""}`}
                        />
                        <span>{item.likesCount}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setReplyingToId(replyingToId === item.id ? null : item.id)
                        }
                        className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium cursor-pointer transition-colors"
                      >
                        <CornerDownRight className="w-3.5 h-3.5" />
                        <span>{t("discussion.reply")}</span>
                      </button>
                    </div>

                    {/* Inline Reply Input */}
                    {replyingToId === item.id && (
                      <div className="mt-3 pt-3 border-t border-slate-200/70 dark:border-slate-700/60 space-y-2">
                        <textarea
                          rows={2}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder={`${item.author.name} ${t("discussion.replyPlaceholder")}`}
                          className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-950 dark:focus:ring-white resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingToId(null);
                              setReplyText("");
                            }}
                            className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                          >
                            {t("discussion.cancelReply")}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddReply(item.id)}
                            disabled={!replyText.trim()}
                            className="px-3 py-1 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-md text-xs font-semibold disabled:opacity-40 cursor-pointer"
                          >
                            {t("discussion.send")}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Nested Replies */}
                  {item.replies && item.replies.length > 0 && (
                    <div className="pl-5 ml-3 border-l-2 border-slate-200 dark:border-slate-800 space-y-2.5">
                      {item.replies.map((reply) => (
                        <div
                          key={reply.id}
                          className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                                {reply.author.name}
                              </span>
                              {reply.author.verified && (
                                <CheckCircle2 className="w-3 h-3 text-slate-900 dark:text-white fill-current" />
                              )}
                              <span className="text-[10px] text-slate-400">
                                • {formatRelativeTime(reply.createdAt)}
                              </span>
                            </div>

                            {onReportClick && (
                              <button
                                type="button"
                                onClick={() =>
                                  onReportClick(
                                    reply.id,
                                    reply.author.name,
                                    reply.content.slice(0, 60)
                                  )
                                }
                                title={t("post.report")}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 rounded cursor-pointer"
                              >
                                <Flag className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>

                          <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                            {reply.content}
                          </p>

                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleCommentLike(reply.id, true, item.id)}
                              className={`inline-flex items-center gap-1 text-[11px] font-medium cursor-pointer ${
                                reply.isLiked
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                              }`}
                            >
                              <Heart
                                className={`w-3 h-3 ${reply.isLiked ? "fill-current" : ""}`}
                              />
                              <span>{reply.likesCount}</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
