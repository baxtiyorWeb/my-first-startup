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
      // Ignore localStorage errors
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

  // Global hotkeys: Cmd+K / Ctrl+K and Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Debounced search with AbortController
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setIsLoading(false);
      setSearchResponse((prev) => ({
        ...prev,
        items: [],
        counts: { all: 0, user: 0, post: 0 },
      }));
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    const performSearch = debounce(async (searchQuery: string, cat: SearchCategory) => {
      try {
        const res = await api.search.searchContent(searchQuery, 20, cat, controller.signal);
        setSearchResponse(res);
        setSelectedIndex(0);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        setSearchResponse((prev) => ({
          ...prev,
          items: [],
        }));
      } finally {
        setIsLoading(false);
      }
    }, 250);

    performSearch(trimmed, category);

    return () => {
      performSearch.cancel();
      controller.abort();
    };
  }, [query, category]);

  // Auto scroll selected item into view
  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

  const handleSelect = (item: SearchItem) => {
    if (query.trim()) {
      saveRecentSearch(query.trim());
    }
    const trimmed = query.trim();
    let targetUrl = item.href;
    if (trimmed) {
      targetUrl += `${item.href.includes("?") ? "&" : "?"}hl=${encodeURIComponent(trimmed)}`;
    }
    router.push(targetUrl);
    onClose();
  };

  const handleRecentClick = (searchTerm: string) => {
    setQuery(searchTerm);
    inputRef.current?.focus();
  };

  // Keyboard navigation
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    const itemsLength = searchResponse.items.length;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (itemsLength > 0) {
        setSelectedIndex((prev) => (prev + 1) % itemsLength);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (itemsLength > 0) {
        setSelectedIndex((prev) => (prev === 0 ? itemsLength - 1 : prev - 1));
      }
    } else if (e.key === "Enter" && itemsLength > 0 && searchResponse.items[selectedIndex]) {
      e.preventDefault();
      handleSelect(searchResponse.items[selectedIndex]);
    } else if (e.key === "Tab") {
      // Cycle category tabs with Tab key
      e.preventDefault();
      const categories: SearchCategory[] = ["all", "user", "post"];
      const currentIndex = categories.indexOf(category);
      const nextCategory = categories[(currentIndex + (e.shiftKey ? 2 : 1)) % 3];
      setCategory(nextCategory);
    }
  };

  const getIcon = (type: SearchItem["type"]) => {
    switch (type) {
      case "user":
      case "author":
        return <User className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />;
      case "post":
        return <MessageSquare className="w-4 h-4 text-blue-500 dark:text-blue-400" />;
      default:
        return <Search className="w-4 h-4 text-slate-400" />;
    }
  };

  const categoryTabs: { id: SearchCategory; label: string; count?: number }[] = [
    { id: "all", label: "Barchasi", count: searchResponse.counts.all },
    { id: "user", label: "Mualliflar", count: searchResponse.counts.user },
    { id: "post", label: "Fikrlar", count: searchResponse.counts.post },
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
        
        {/* Search Bar Input Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 dark:border-slate-800/80 gap-3">
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-indigo-500 shrink-0 animate-spin" />
          ) : (
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={hasQuery}
            aria-autocomplete="list"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Mualliflar va munozaralarni qidirish..."
            className="w-full text-base text-slate-900 dark:text-white placeholder:text-slate-400 bg-transparent focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="So'rovni tozalash"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex text-[11px] font-mono font-semibold px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60 select-none">
            ESC
          </kbd>
        </div>

        {/* Category Tabs Filter Bar (Visible when query exists) */}
        {hasQuery && (
          <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar">
            {categoryTabs.map((tab) => {
              const isActive = category === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategory(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-xs font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? "bg-white/20 text-white"
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

        {/* Results Body / Content Area */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-[180px]">
          
          {/* STATE 1: Empty Query State -> Show Recent Searches */}
          {!hasQuery && (
            <div className="p-3">
              {recentSearches.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between px-2 mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <History className="w-3.5 h-3.5" />
                      <span>Oxirgi qidiruvlar</span>
                    </div>
                    <button
                      type="button"
                      onClick={clearAllRecent}
                      className="text-[11px] text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Tarixni tozalash</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {recentSearches.map((item) => (
                      <div
                        key={item}
                        onClick={() => handleRecentClick(item)}
                        className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer transition-all border border-slate-200/50 dark:border-slate-700/50"
                      >
                        <Search className="w-3 h-3 text-slate-400 group-hover:text-indigo-500 transition-colors" />
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
                  Muallif yoki munozara nomini kiriting...
                </div>
              )}
            </div>
          )}

          {/* STATE 2: Loading Skeleton */}
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

          {/* STATE 3: No Results Found State */}
          {hasQuery && !isLoading && searchResponse.items.length === 0 && (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  “{query}” bo‘yicha hech narsa topilmadi
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Imlo xatosini tekshirib ko‘ring yoki boshqa kalit so‘z bilan urinib ko‘ring.
                </p>
              </div>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  So‘rovni tozalash
                </button>
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
                      ? "bg-indigo-50/80 dark:bg-indigo-950/60 text-slate-900 dark:text-white border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Item Avatar or Category Icon */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        item.type === "user"
                          ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200/60 dark:border-emerald-800/50"
                          : "bg-blue-50 dark:bg-blue-950/50 border-blue-200/60 dark:border-blue-800/50"
                      }`}
                    >
                      {item.avatarUrl ? (
                        <img
                          src={item.avatarUrl}
                          alt={item.title}
                          className="w-full h-full rounded-xl object-cover"
                        />
                      ) : (
                        getIcon(item.type)
                      )}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-semibold truncate text-slate-900 dark:text-white">
                          <HighlightText text={item.title} query={query} />
                        </span>
                        {item.badge && (
                          <span
                            className={`text-[9px] uppercase font-mono font-semibold px-1.5 py-0.2 rounded-md ${
                              item.type === "user"
                                ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300"
                                : "bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>

                      {item.subtitle && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate leading-relaxed">
                          <HighlightText text={item.subtitle} query={query} />
                        </p>
                      )}

                      {/* Item Stats or Meta */}
                      {(item.createdAt || item.stats) && (
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          {item.createdAt && <span>{item.createdAt}</span>}
                          {item.createdAt && item.stats && <span>•</span>}
                          {item.stats && <span>{item.stats}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {isSelected && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100/70 dark:bg-indigo-900/50 px-2 py-0.5 rounded-md">
                        <CornerDownLeft className="w-3 h-3" />
                        Ochish
                      </span>
                    )}
                    <ArrowRight
                      className={`w-4 h-4 transition-transform ${
                        isSelected
                          ? "opacity-100 text-indigo-600 dark:text-indigo-400 translate-x-0.5"
                          : "opacity-0 text-slate-400"
                      }`}
                    />
                  </div>
                </button>
              );
            })}
        </div>

        {/* Footer Shortcut Bar */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="font-mono font-semibold bg-slate-200/80 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-700 dark:text-slate-300">
                ↑↓
              </kbd>{" "}
              tanlash
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono font-semibold bg-slate-200/80 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-700 dark:text-slate-300">
                Tab
              </kbd>{" "}
              kategoriya
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono font-semibold bg-slate-200/80 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-700 dark:text-slate-300">
                ↵
              </kbd>{" "}
              ochish
            </span>
          </div>
          <span className="font-semibold text-slate-400 dark:text-slate-500">Spotlight Search</span>
        </div>
      </div>
    </div>
  );
}
