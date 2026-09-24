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
import { formatRelativeTime } from "@/lib/format-date";

interface DiscussionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
  onReportClick?: (targetId: string, authorName: string, textSnippet: string) => void;
  onCommentAdded?: () => void;
}

import { api, ApiError } from "@/lib/api";

export function DiscussionDrawer({
  isOpen,
  onClose,
  post,
  onReportClick,
  onCommentAdded,
}: DiscussionDrawerProps) {
  const { session } = useAuth();

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
            toast.error("Izohlarni yuklashda xatolik yuz berdi");
          }
        });

      return () => {
        isMounted = false;
      };
    }
  }, [post?.id, isOpen]);

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
      toast.info("Munozarada qatnashish uchun avval tizimga kiring");
      return;
    }

    try {
      const created = await api.comments.addComment(post.id, {
        content: commentText.trim(),
      });
      setComments((prev) => [created, ...prev]);
      setCommentText("");
      onCommentAdded?.();
      toast.success("Fikringiz muvaffaqiyatli chop etildi.");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Izohni yuborishda xatolik yuz berdi";
      toast.error(msg);
    }
  };

  const handleAddReply = async (parentId: string) => {
    if (!replyText.trim()) return;

    if (!session.isAuthenticated) {
      toast.info("Javob yozish uchun avval tizimga kiring");
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
      toast.success("Javobingiz qoldirildi.");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Javobni yuborishda xatolik yuz berdi";
      toast.error(msg);
    }
  };

  const toggleCommentLike = async (commentId: string, isNested = false, parentId?: string) => {
    setComments((prev) =>
      prev.map((c) => {
        if (isNested && parentId && c.id === parentId) {
          return {
            ...c,
            replies: (c.replies || []).map((r) =>
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
      await api.comments.toggleCommentLike(commentId);
    } catch {
      // Ignore background error
    }
  };

  const totalCommentsCount = comments.reduce(
    (acc, curr) => acc + 1 + (curr.replies ? curr.replies.length : 0),
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
              Munozara ({totalCommentsCount})
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
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
                placeholder="Fikr bildiring yoki yangi nuqtayi nazar qo‘shing..."
                className="w-full p-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent focus:outline-none resize-none leading-relaxed"
              />

              <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 rounded-b-xl">
                <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
                  Ctrl + Enter orqali jo‘natish
                </span>
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ml-auto shadow-xs"
                >
                  <span>Qo‘shish</span>
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </div>
          </form>

          {/* Comments List */}
          <div className="space-y-5 pt-2">
            {comments.length === 0 ? (
              <div className="text-center py-10 px-4">
                <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2 stroke-[1.5]" />
                <p className="text-sm font-medium text-slate-900 dark:text-slate-200">
                  Hozircha fikrlar yo‘q
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Ushbu mavzuda birinchi bo‘lib mulohaza bildiring
                </p>
              </div>
            ) : (
              comments.map((item) => (
                <div key={item.id} className="space-y-3">
                  {/* Top Level Comment */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                    {/* Author Bar */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-800 dark:text-slate-200 shrink-0">
                          {item.author.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <Link
                              href={`/dashboard/profile?user=${item.author.handle}`}
                              className="text-xs font-semibold text-slate-900 dark:text-white hover:underline truncate"
                            >
                              {item.author.name}
                            </Link>
                            {item.author.verified && (
                              <CheckCircle2 className="w-3 h-3 text-slate-900 dark:text-white fill-current" />
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            {item.author.role} • {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>
                      </div>

                      {onReportClick && (
                        <button
                          type="button"
                          onClick={() =>
                            onReportClick(item.id, item.author.name, item.content.slice(0, 60))
                          }
                          title="Shikoyat qilish"
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded"
                        >
                          <Flag className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Content */}
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                      {item.content}
                    </p>

                    {/* Actions */}
                    <div className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-700/60 flex items-center gap-4 text-xs">
                      <button
                        type="button"
                        onClick={() => toggleCommentLike(item.id)}
                        className={`inline-flex items-center gap-1 font-medium transition-colors cursor-pointer ${
                          item.isLiked
                            ? "text-red-600 dark:text-red-400 font-semibold"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            item.isLiked ? "fill-current" : ""
                          }`}
                        />
                        <span className="text-[11px]">{item.likesCount}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setReplyingToId((prev) => (prev === item.id ? null : item.id))
                        }
                        className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium cursor-pointer transition-colors text-[11px]"
                      >
                        <CornerDownRight className="w-3 h-3" />
                        <span>Javob berish</span>
                      </button>
                    </div>

                    {/* Inline Reply Input */}
                    {replyingToId === item.id && (
                      <div className="mt-3 pt-3 border-t border-slate-200/70 dark:border-slate-700/60 space-y-2">
                        <textarea
                          rows={2}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder={`${item.author.name}ga javob...`}
                          className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-950 dark:focus:ring-white resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingToId(null);
                              setReplyText("");
                            }}
                            className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800"
                          >
                            Bekor qilish
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddReply(item.id)}
                            disabled={!replyText.trim()}
                            className="px-3 py-1 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-md text-xs font-semibold disabled:opacity-40"
                          >
                            Javob jo‘natish
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
                                title="Shikoyat qilish"
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 rounded"
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
                              className={`inline-flex items-center gap-1 text-[11px] font-medium ${
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
