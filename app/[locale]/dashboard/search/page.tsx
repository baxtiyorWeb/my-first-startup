"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  User,
  MessageSquare,
  ArrowRight,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import type { SearchCategory, SearchResponse } from "@/types/social";
import { UserAvatar } from "@/components/ui/user-avatar";
import { HighlightText } from "@/lib/highlight";
import { useI18n } from "@/lib/i18n/context";

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, localePath, formatRelativeTime } = useI18n();

  const rawQuery = searchParams.get("q") || "";
  const rawCategory = (searchParams.get("category") as SearchCategory) || "all";

  const [inputVal, setInputVal] = useState(rawQuery);
  const [activeCategory, setActiveCategory] = useState<SearchCategory>(
    rawCategory === "user" || rawCategory === "post" ? rawCategory : "all"
  );
  const [results, setResults] = useState<SearchResponse>({
    items: [],
    counts: { all: 0, user: 0, post: 0 },
  });
  const [isLoading, setIsLoading] = useState(Boolean(rawQuery.trim()));

  // Keep input in sync with URL
  useEffect(() => {
    setInputVal(rawQuery);
  }, [rawQuery]);

  const executeSearch = useCallback(
    async (q: string, category: SearchCategory) => {
      const trimmed = q.trim();
      if (!trimmed || trimmed.length < 2) {
        setResults({ items: [], counts: { all: 0, user: 0, post: 0 } });
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const data = await api.search.query({
          q: trimmed,
          category,
          limit: 30,
        });
        setResults(data);
      } catch {
        setResults({ items: [], counts: { all: 0, user: 0, post: 0 } });
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (rawQuery.trim()) {
      executeSearch(rawQuery, activeCategory);
    } else {
      setResults({ items: [], counts: { all: 0, user: 0, post: 0 } });
      setIsLoading(false);
    }
  }, [rawQuery, activeCategory, executeSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputVal.trim();
    if (!trimmed) return;

    const params = new URLSearchParams();
    params.set("q", trimmed);
    if (activeCategory !== "all") {
      params.set("category", activeCategory);
    }
    router.push(localePath(`/dashboard/search?${params.toString()}`));
  };

  const handleCategoryChange = (cat: SearchCategory) => {
    setActiveCategory(cat);
    const params = new URLSearchParams();
    if (inputVal.trim()) {
      params.set("q", inputVal.trim());
    }
    if (cat !== "all") {
      params.set("category", cat);
    }
    router.push(localePath(`/dashboard/search?${params.toString()}`));
  };

  const userItems = results.items.filter((item) => item.type === "user");
  const postItems = results.items.filter((item) => item.type === "post");

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto pb-12">
      {/* Search Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
            <Search className="w-5 h-5 text-indigo-500" />
            <span>{t("search.resultsFor")}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t("search.searchDescription")}
          </p>
        </div>

        {/* Search Input Bar */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={t("search.inputPlaceholder")}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
            />
            {inputVal && (
              <button
                type="button"
                onClick={() => setInputVal("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={!inputVal.trim()}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer shrink-0"
          >
            {t("common.search")}
          </button>
        </form>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => handleCategoryChange("all")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeCategory === "all"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <span>{t("search.all")}</span>
            {results.counts.all > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeCategory === "all"
                    ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                }`}
              >
                {results.counts.all}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleCategoryChange("post")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeCategory === "post"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{t("search.posts")}</span>
            {results.counts.post > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeCategory === "post"
                    ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                }`}
              >
                {results.counts.post}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleCategoryChange("user")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeCategory === "user"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>{t("search.users")}</span>
            {results.counts.user > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeCategory === "user"
                    ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                }`}
              >
                {results.counts.user}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Results Section */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="space-y-1.5 flex-1">
                  <div className="w-1/4 h-3.5 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="w-1/6 h-3 bg-slate-200/70 dark:bg-slate-800/60 rounded" />
                </div>
              </div>
              <div className="w-3/4 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="w-full h-3 bg-slate-200/60 dark:bg-slate-800/40 rounded" />
            </div>
          ))}
        </div>
      ) : !rawQuery.trim() ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-3">
          <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {t("search.inputPlaceholder")}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {t("search.minCharsHint")}
          </p>
        </div>
      ) : results.items.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {t("search.noResults")}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {t("search.noResultsHint")}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Authors List (if present and in All or User tab) */}
          {(activeCategory === "all" || activeCategory === "user") &&
            userItems.length > 0 && (
              <div className="space-y-3">
                {activeCategory === "all" && (
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
                    <User className="w-3.5 h-3.5" />
                    <span>
                      {t("search.users")} ({userItems.length})
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {userItems.map((u) => (
                    <Link
                      key={u.id}
                      href={localePath(u.href)}
                      className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs transition-all flex items-center justify-between gap-3 group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar
                          name={u.title}
                          avatarUrl={u.avatarUrl}
                          size="md"
                          className="shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:underline">
                            <HighlightText text={u.title} query={rawQuery} />
                          </p>
                          {u.subtitle && (
                            <p className="text-[11px] text-slate-400 truncate">
                              {u.subtitle}
                            </p>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

          {/* Posts List (if present and in All or Post tab) */}
          {(activeCategory === "all" || activeCategory === "post") &&
            postItems.length > 0 && (
              <div className="space-y-3">
                {activeCategory === "all" && (
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>
                      {t("search.posts")} ({postItems.length})
                    </span>
                  </div>
                )}
                <div className="space-y-3">
                  {postItems.map((p) => (
                    <Link
                      key={p.id}
                      href={localePath(p.href)}
                      className="block p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs hover:shadow-xs transition-all group cursor-pointer space-y-2.5"
                    >
                      {/* Author Header */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <UserAvatar
                            name={p.subtitle || p.title}
                            avatarUrl={p.avatarUrl}
                            size="sm"
                            className="shrink-0"
                          />
                          <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {p.subtitle || "The Go-getters"}
                          </span>
                        </div>
                        {p.createdAt && (
                          <span className="text-[11px] text-slate-400 shrink-0">
                            {formatRelativeTime(p.createdAt)}
                          </span>
                        )}
                      </div>

                      {/* Post Title */}
                      <h2 className="text-sm sm:text-base font-bold text-slate-950 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                        <HighlightText text={p.title} query={rawQuery} />
                      </h2>

                      {/* Post Snippet */}
                      {p.snippet && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                          <HighlightText text={p.snippet} query={rawQuery} />
                        </p>
                      )}

                      <div className="pt-2 flex items-center justify-end text-xs font-semibold text-indigo-600 dark:text-indigo-400 gap-1 opacity-80 group-hover:opacity-100">
                        <span>{t("common.readMore")}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 w-full max-w-4xl mx-auto animate-pulse p-4">
          <div className="h-32 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800" />
          <div className="h-40 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
