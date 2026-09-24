"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  User,
  MessageSquare,
  ArrowRight,
  X,
  Loader2,
  History,
  Trash2,
  CornerDownLeft,
} from "lucide-react";
import { debounce } from "lodash";
import { api } from "@/lib/api";
import type { SearchItem, SearchCategory, SearchResponse } from "@/types/social";
import { HighlightText } from "@/lib/highlight";
import { useI18n } from "@/lib/i18n/context";

const RECENT_SEARCHES_KEY = "fikr_recent_searches_v1";
const MAX_RECENT_ITEMS = 5;

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  if (!isOpen) return null;
  return <SearchModalContent onClose={onClose} />;
}

function SearchModalContent({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { t, localePath } = useI18n();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SearchCategory>("all");
  const [searchResponse, setSearchResponse] = useState<SearchResponse>({
    items: [],
    counts: { all: 0, user: 0, post: 0 },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch {
      // Ignore
    }
  }, []);

  const saveRecentSearch = useCallback((searchTerm: string) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, MAX_RECENT_ITEMS);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  }, []);

  const removeRecentSearch = (itemToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches((prev) => {
      const updated = prev.filter((item) => item !== itemToRemove);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // Ignore
    }
  };

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Debounced search caller
  const performSearch = useCallback(
    debounce(async (searchQuery: string, searchCategory: SearchCategory) => {
      if (!searchQuery.trim() || searchQuery.trim().length < 2) {
        setSearchResponse({ items: [], counts: { all: 0, user: 0, post: 0 } });
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await api.search.query({
          q: searchQuery.trim(),
          category: searchCategory,
        });
        setSearchResponse(response);
        setSelectedIndex(0);
      } catch {
        setSearchResponse({ items: [], counts: { all: 0, user: 0, post: 0 } });
      } finally {
        setIsLoading(false);
      }
    }, 250),
    []
  );

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResponse({ items: [], counts: { all: 0, user: 0, post: 0 } });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    performSearch(trimmed, category);

    return () => {
      performSearch.cancel();
    };
  }, [query, category, performSearch]);

  const handleSelect = (item: SearchItem) => {
    if (query.trim()) {
      saveRecentSearch(query.trim());
    }
    const trimmed = query.trim();
    let targetUrl = item.href;
    if (trimmed) {
      targetUrl += `${item.href.includes("?") ? "&" : "?"}hl=${encodeURIComponent(trimmed)}`;
    }
    router.push(localePath(targetUrl));
    onClose();
  };

  const handleRecentClick = (searchTerm: string) => {
    setQuery(searchTerm);
    inputRef.current?.focus();
  };

  const categoryTabs: { id: SearchCategory; label: string; count?: number }[] = [
    { id: "all", label: t("search.all"), count: searchResponse.counts.all },
    { id: "user", label: t("search.users"), count: searchResponse.counts.user },
    { id: "post", label: t("search.posts"), count: searchResponse.counts.post },
  ];

  const hasQuery = query.trim().length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Spotlight search modal"
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-3 sm:px-4"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
      />

      {/* Main Palette Modal */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        {/* Top Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search.inputPlaceholder")}
            className="flex-1 bg-transparent text-sm sm:text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
          />

          {isLoading ? (
            <Loader2 className="w-4 h-4 text-slate-400 animate-spin shrink-0" />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}

          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Category Tabs */}
        {hasQuery && (
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 text-xs overflow-x-auto scrollbar-none">
            {categoryTabs.map((tab) => {
              const isActive = category === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategory(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-xs font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? "bg-white/20 text-white dark:bg-slate-950/20 dark:text-slate-950"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-[180px]">
          {/* STATE 1: Empty Query State -> Show Recent Searches */}
          {!hasQuery && (
            <div className="p-3">
              {recentSearches.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between px-2 mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <History className="w-3.5 h-3.5" />
                      <span>{t("search.recentSearches")}</span>
                    </div>
                    <button
                      type="button"
                      onClick={clearAllRecent}
                      className="text-[11px] text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{t("search.clearRecent")}</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {recentSearches.map((item) => (
                      <div
                        key={item}
                        onClick={() => handleRecentClick(item)}
                        className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer transition-all border border-slate-200/50 dark:border-slate-700/50"
                      >
                        <Search className="w-3 h-3 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
                        <span>{item}</span>
                        <button
                          type="button"
                          onClick={(e) => removeRecentSearch(item, e)}
                          className="p-0.5 rounded-full hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                  {t("search.minCharsHint")}
                </div>
              )}
            </div>
          )}

          {/* STATE 2: Loading */}
          {hasQuery && isLoading && searchResponse.items.length === 0 && (
            <div className="p-3 space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 animate-pulse"
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="w-1/3 h-4 bg-slate-200 dark:bg-slate-700 rounded-md" />
                    <div className="w-3/4 h-3 bg-slate-200/70 dark:bg-slate-700/60 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STATE 3: No Results */}
          {hasQuery && !isLoading && searchResponse.items.length === 0 && (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t("search.noResults")}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  {t("search.noResultsHint")}
                </p>
              </div>
            </div>
          )}

          {/* STATE 4: Results List */}
          {hasQuery &&
            searchResponse.items.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all cursor-pointer group ${
                    isSelected
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xs"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      {item.type === "user" ? (
                        <User className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                      ) : (
                        <MessageSquare className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-semibold truncate">
                          <HighlightText text={item.title} query={query} />
                        </span>
                        {item.subtitle && (
                          <span className="text-[11px] text-slate-400 truncate">
                            {item.subtitle}
                          </span>
                        )}
                      </div>
                      {item.snippet && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          <HighlightText text={item.snippet} query={query} />
                        </p>
                      )}
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors shrink-0 ml-2" />
                </button>
              );
            })}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>{t("search.pressEsc")}</span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-mono">
              <CornerDownLeft className="w-3 h-3" /> Enter
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
