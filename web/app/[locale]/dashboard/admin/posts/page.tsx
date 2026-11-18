"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Eye,
  Heart,
  MessageSquare,
  Globe,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useAdmin } from "@/components/admin/admin-shell";
import { AdminHeader } from "@/components/admin/admin-header";
import { UserAvatar } from "@/components/ui/user-avatar";
import { EditPostModal } from "@/components/feed/edit-post-modal";
import { useI18n } from "@/lib/i18n/context";
import { toast } from "@/components/ui/toast";

interface AdminPost {
  id: string;
  title: string | null;
  content: string;
  postType: string;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  createdAt: string;
  author: {
    id: string;
    name: string;
    handle: string;
    avatarUrl: string | null;
    isBot: boolean;
  };
}

type PostFilter = "all" | "real" | "bots";

export default function AdminPostsPage() {
  const { openSidebar } = useAdmin();
  const { localePath, locale } = useI18n();

  const [postsList, setPostsList] = useState<AdminPost[]>([]);
  const [counts, setCounts] = useState<{ total: number; real: number; bots: number }>({
    total: 0,
    real: 0,
    bots: 0,
  });
  const [postFilter, setPostFilter] = useState<PostFilter>("all");
  const [postSearch, setPostSearch] = useState("");
  const [isPostsLoading, setIsPostsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Edit Post State
  const [editingPost, setEditingPost] = useState<AdminPost | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      setIsPostsLoading(true);
      const params = new URLSearchParams();
      if (postFilter !== "all") params.set("filter", postFilter);
      if (postSearch) params.set("q", postSearch);

      const res = await fetch(`/api/admin/posts?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setPostsList(json.data.posts);
        if (json.data.counts) {
          setCounts(json.data.counts);
        }
      }
    } catch {
      toast.error(
        locale === "uz"
          ? "Postlarni yuklashda xatolik yuz berdi"
          : "Ошибка при загрузке постов"
      );
    } finally {
      setIsPostsLoading(false);
    }
  }, [postFilter, postSearch, locale]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleCreatePost = async (type: "organic" | "search") => {
    const actionKey = type === "search" ? "create_post_search" : "create_post";
    try {
      setActionLoading(actionKey);
      const res = await fetch("/api/admin/bots/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionKey }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        fetchPosts();
      } else {
        toast.error(json.error || "Xatolik yuz berdi");
      }
    } catch {
      toast.error("Server bilan aloqa uzildi");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm(locale === "uz" ? "Ushbu postni o'chirmoqchimisiz?" : "Удалить этот пост?")) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success(locale === "uz" ? "Post o'chirildi" : "Пост удален");
        fetchPosts();
      } else {
        toast.error(json.error || "O'chirishda xatolik");
      }
    } catch {
      toast.error("Xatolik yuz berdi");
    }
  };

  const pageTitle =
    locale === "uz"
      ? "Postlar Moderatsiyasi"
      : locale === "ru"
      ? "Модерация постов"
      : "Posts Moderation";

  const pageSubtitle =
    locale === "uz"
      ? "Lentadagi postlar, statistika, tahrirlash va filtrlash"
      : locale === "ru"
      ? "Посты в ленте, статистика, редактирование и фильтрация"
      : "Feed posts, stats, moderation and filters";

  return (
    <>
      <AdminHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        onOpenSidebar={openSidebar}
        onRefresh={fetchPosts}
        isRefreshing={isPostsLoading}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Controls Bar */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Filters */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200/60 dark:border-white/5">
            {[
              { id: "all", label: locale === "uz" ? "Barchasi" : "Все", count: counts.total },
              { id: "real", label: locale === "uz" ? "Haqiqiy" : "Реальные", count: counts.real },
              { id: "bots", label: locale === "uz" ? "AI Botlar" : "AI Боты", count: counts.bots },
            ].map((f) => {
              const active = postFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setPostFilter(f.id as PostFilter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    active
                      ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs font-bold"
                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span>{f.label}</span>
                  {f.count > 0 && (
                    <span
                      className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        active
                          ? "bg-blue-600/10 dark:bg-blue-400/20 text-blue-600 dark:text-blue-400 font-bold"
                          : "bg-slate-200/80 dark:bg-zinc-700 text-slate-600 dark:text-zinc-400"
                      }`}
                    >
                      {f.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: Search & Fast Create Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={postSearch}
                onChange={(e) => setPostSearch(e.target.value)}
                placeholder={
                  locale === "uz"
                    ? "Sarlavha yoki matn bo'yicha..."
                    : "По заголовку или тексту..."
                }
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-zinc-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={() => handleCreatePost("organic")}
              disabled={actionLoading !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              {actionLoading === "create_post" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              )}
              <span className="hidden sm:inline">
                {locale === "uz" ? "AI Post" : "AI Пост"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleCreatePost("search")}
              disabled={actionLoading !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {actionLoading === "create_post_search" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Globe className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {locale === "uz" ? "Google Tahlilli Post" : "Google Анализ"}
              </span>
            </button>
          </div>
        </div>

        {/* Posts List */}
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {isPostsLoading ? (
              <div className="py-20 text-center text-slate-400">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span>Postlar yuklanmoqda...</span>
                </div>
              </div>
            ) : postsList.length > 0 ? (
              postsList.map((p) => (
                <div
                  key={p.id}
                  className="p-5 hover:bg-slate-50/60 dark:hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2 min-w-0 flex-1">
                      {/* Author Line */}
                      <div className="flex items-center gap-2.5 text-xs">
                        <UserAvatar
                          avatarUrl={p.author.avatarUrl}
                          name={p.author.name}
                          size="xs"
                        />
                        <span className="font-bold text-slate-900 dark:text-white">
                          {p.author.name}
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          @{p.author.handle?.replace(/^@+/, "")}
                        </span>
                        <span className="text-slate-300 dark:text-zinc-700">•</span>
                        <div className="inline-flex items-center gap-1 font-medium text-[11px]">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              p.author.isBot ? "bg-blue-500" : "bg-emerald-500"
                            }`}
                          />
                          <span
                            className={
                              p.author.isBot
                                ? "text-blue-600 dark:text-blue-400 font-semibold"
                                : "text-emerald-600 dark:text-emerald-400"
                            }
                          >
                            {p.author.isBot ? "AI Bot" : "Haqiqiy"}
                          </span>
                        </div>
                        <span className="text-slate-300 dark:text-zinc-700">•</span>
                        <span className="text-slate-400 text-[11px] font-mono">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Title */}
                      {p.title && (
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                          {p.title}
                        </h4>
                      )}

                      {/* Content Preview */}
                      <p className="text-xs text-slate-600 dark:text-zinc-300 line-clamp-3 leading-relaxed">
                        {p.content}
                      </p>

                      {/* Stats counter */}
                      <div className="flex items-center gap-4 pt-1 text-[11px] text-slate-400 dark:text-zinc-500">
                        <span className="flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5" />
                          <span className="font-mono font-medium">{p.viewsCount}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Heart className="w-3.5 h-3.5 text-rose-500/70" />
                          <span className="font-mono font-medium">{p.likesCount}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-500/70" />
                          <span className="font-mono font-medium">{p.commentsCount}</span>
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingPost(p)}
                        className="p-2 rounded-xl border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-zinc-300 hover:text-blue-600 hover:border-blue-500/50 dark:hover:text-blue-400 transition-colors cursor-pointer"
                        title="Tahrirlash"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <Link
                        href={localePath(`/dashboard/posts/${p.id}`)}
                        target="_blank"
                        className="p-2 rounded-xl border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                        title="Saytda ko'rish"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleDeletePost(p.id)}
                        className="p-2 rounded-xl border border-slate-200/80 dark:border-white/10 text-slate-400 hover:text-rose-500 hover:border-rose-300 dark:hover:border-rose-900 transition-colors cursor-pointer"
                        title="O'chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 text-center text-slate-400">Postlar topilmadi.</div>
            )}
          </div>
        </div>

        {/* Edit Post Modal */}
        {editingPost && (
          <EditPostModal
            isOpen={Boolean(editingPost)}
            onClose={() => setEditingPost(null)}
            postId={editingPost.id}
            initialTitle={editingPost.title}
            initialContent={editingPost.content}
            onSuccess={() => {
              setEditingPost(null);
              fetchPosts();
            }}
          />
        )}
      </main>
    </>
  );
}
