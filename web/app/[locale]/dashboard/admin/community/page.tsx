"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  Trash2,
  Loader2,
  MessageSquare,
  Paperclip,
  RefreshCw,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { useAdmin } from "@/components/admin/admin-shell";
import { AdminHeader } from "@/components/admin/admin-header";
import { useI18n } from "@/lib/i18n/context";
import { toast } from "@/components/ui/toast";

interface ModerationMessage {
  id: string;
  content: string;
  messageType: string;
  attachments: Array<{ url: string; name: string; kind: string }>;
  createdAt: string;
  deletedAt: string | null;
  sender: { id: string; name: string; handle: string };
  reactionsCount: number;
}

export default function AdminCommunityPage() {
  const { openSidebar } = useAdmin();
  const { localePath, formatRelativeTime } = useI18n();

  const [items, setItems] = useState<ModerationMessage[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(
    async (options: { cursor?: string | null; search?: string } = {}) => {
      const params = new URLSearchParams();
      params.set("limit", "30");
      if (options.search) params.set("q", options.search);
      if (options.cursor) params.set("cursor", options.cursor);

      const response = await fetch(`/api/admin/community?${params.toString()}`);
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.error?.message ||
            (typeof payload?.error === "string" ? payload.error : null) ||
            "Xabarlarni yuklab bo'lmadi"
        );
      }
      return payload.data as {
        items: ModerationMessage[];
        hasMore: boolean;
        nextCursor: string | null;
      };
    },
    []
  );

  const load = useCallback(
    async (activeSearch: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchMessages({ search: activeSearch });
        setItems(data.items);
        setHasMore(data.hasMore);
        setCursor(data.nextCursor);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Xatolik");
      } finally {
        setIsLoading(false);
      }
    },
    [fetchMessages]
  );

  useEffect(() => {
    load(search);
  }, [load, search]);

  const loadMore = async () => {
    if (!hasMore || !cursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const data = await fetchMessages({ cursor, search });
      setItems((prev) => [...prev, ...data.items]);
      setHasMore(data.hasMore);
      setCursor(data.nextCursor);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bu xabarni guruhdan o'chirmoqchimisiz?")) return;
    setDeletingId(id);
    try {
      const response = await fetch(`/api/admin/community?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.error?.message ||
            (typeof payload?.error === "string" ? payload.error : null) ||
            "O'chirib bo'lmadi"
        );
      }
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, deletedAt: new Date().toISOString() } : item
        )
      );
      toast.success("Xabar o'chirildi");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "O'chirib bo'lmadi");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/60 dark:bg-black min-h-screen">
      <AdminHeader
        title="Guruh moderatsiyasi"
        subtitle="Geters Community xabarlarini ko'rish va moderatsiya qilish"
        onOpenSidebar={openSidebar}
        onRefresh={() => load(search)}
        isRefreshing={isLoading}
      />

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-4 max-w-5xl w-full mx-auto">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 dark:border-[#2f3336] dark:bg-black sm:flex-row sm:items-center sm:justify-between">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(query.trim());
            }}
            className="flex flex-1 items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Xabar matni bo'yicha qidirish..."
                aria-label="Guruh xabarlarini qidirish"
                className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
              />
            </div>
            <button
              type="submit"
              className="h-9 rounded-xl bg-blue-600 px-3 text-xs font-bold text-white hover:bg-blue-700"
            >
              Qidirish
            </button>
          </form>

          <Link
            href={localePath("/dashboard/community")}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Guruhni ochish
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white dark:border-[#2f3336] dark:bg-black">
          <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 dark:border-white/10">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
              So&apos;nggi xabarlar
            </h2>
            <span className="text-[11px] text-slate-500 dark:text-zinc-500">
              {items.length} ta ko&apos;rsatilgan
            </span>
          </div>

          {isLoading && items.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-8 text-xs text-slate-500 dark:text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Yuklanmoqda...
            </div>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-slate-500 dark:text-zinc-400">
              Xabarlar topilmadi.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-white/5">
              {items.map((message) => (
                <li key={message.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {message.sender.name}
                      </span>
                      <span className="text-[10.5px] text-slate-500 dark:text-zinc-500">
                        @{message.sender.handle.replace(/^@+/, "")}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-600">
                        {formatRelativeTime(message.createdAt)}
                      </span>
                      {message.deletedAt && (
                        <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[9.5px] font-bold text-rose-600 dark:text-rose-400">
                          o&apos;chirilgan
                        </span>
                      )}
                    </div>

                    <p className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-700 dark:text-zinc-300">
                      {message.content || (
                        <span className="italic text-slate-400 dark:text-zinc-500">
                          Matnsiz xabar
                        </span>
                      )}
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10.5px] text-slate-500 dark:text-zinc-500">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-zinc-900">
                        {message.messageType}
                      </span>
                      {message.attachments.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Paperclip className="h-3 w-3" />
                          {message.attachments.length} ta ilova
                        </span>
                      )}
                      {message.reactionsCount > 0 && (
                        <span>{message.reactionsCount} reaksiya</span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(message.id)}
                    disabled={Boolean(message.deletedAt) || deletingId === message.id}
                    aria-label="Xabarni o'chirish"
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-rose-500/20 px-2 py-1.5 text-[10.5px] font-bold text-rose-600 transition-colors hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40 dark:text-rose-400"
                  >
                    {deletingId === message.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    O&apos;chirish
                  </button>
                </li>
              ))}
            </ul>
          )}

          {hasMore && (
            <div className="border-t border-slate-200/80 px-4 py-3 dark:border-white/10">
              <button
                type="button"
                onClick={loadMore}
                disabled={isLoadingMore}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                {isLoadingMore ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Yana yuklash
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
