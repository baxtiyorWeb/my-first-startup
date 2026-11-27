"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  LayoutGrid,
  List as ListIcon,
  ChevronDown,
  FileText,
  Check,
} from "lucide-react";

export type FeedTab = "all" | "articles" | "videos" | "news" | "posts";
export type SortOption = "latest" | "popular" | "views";
export type ViewMode = "list" | "grid";

interface FeedFilterToolbarProps {
  activeTab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function FeedFilterToolbar({
  activeTab,
  onTabChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
}: FeedFilterToolbarProps) {
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    if (isSortOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSortOpen]);

  const tabs: {
    id: FeedTab;
    label: string;
    icon: React.ComponentType<{ className?: string; size?: number }>;
  }[] = [
      { id: "all", label: "Barchasi", icon: LayoutGrid },
      { id: "posts", label: "Muhokamalar", icon: FileText },
    ];

  const sortOptions: { id: SortOption; label: string }[] = [
    { id: "latest", label: "Eng yangilar" },
    { id: "popular", label: "Ommabop" },
    { id: "views", label: "Ko'p ko'rilgan" },
  ];

  const currentSortLabel =
    sortOptions.find((o) => o.id === sortBy)?.label || "Eng yangilar";

  return (
    <div
      data-node-id="11:6"
      data-name="Tasma filtrlari"
      className="w-full flex items-center justify-between gap-2 sm:gap-3 mb-4 select-none"
    >
      {/* Left: Feed Category Tabs (Horizontal row, scrollable on very small screens) */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none shrink min-w-0 py-0.5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`h-[40px] px-2.5 sm:px-3 rounded-[14px] flex items-center gap-1.5 text-[12px] sm:text-[13px] font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${isActive
                  ? "bg-[#2dd4bf] text-white shadow-xs"
                  : "bg-white dark:bg-[#16181c] text-slate-700 dark:text-[#cfd9de] hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#202327] border border-slate-200/90 dark:border-[#2f3336]"
                }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right: Sorting Dropdown & Grid/List View Mode Toggle (Always on the same row) */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Sort Dropdown */}
        <div className="relative" ref={sortRef}>
          <button
            type="button"
            onClick={() => setIsSortOpen((prev) => !prev)}
            className="h-[40px] px-2.5 sm:px-3 rounded-[14px] bg-white dark:bg-[#16181c] border border-slate-200/90 dark:border-[#2f3336] flex items-center gap-1.5 text-[11px] sm:text-[12px] font-semibold text-slate-700 dark:text-[#e7e9ea] hover:border-slate-300 dark:hover:border-[#3e4144] transition-colors cursor-pointer whitespace-nowrap"
          >
            <span> {currentSortLabel}</span>
            <ChevronDown
              size={12}
              className={`transition-transform duration-150 ${isSortOpen ? "rotate-180" : ""}`}
            />
          </button>

          {isSortOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-44 bg-white dark:bg-[#16181c] rounded-[14px] border border-slate-200 dark:border-[#2f3336] shadow-lg py-1.5 z-30 text-xs animate-in fade-in zoom-in-95">
              {sortOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onSortChange(opt.id);
                    setIsSortOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-[#202327] transition-colors ${sortBy === opt.id
                      ? "text-[#2dd4bf] font-semibold"
                      : "text-slate-700 dark:text-[#cfd9de]"
                    }`}
                >
                  <span>{opt.label}</span>
                  {sortBy === opt.id && (
                    <Check size={14} className="text-[#2dd4bf]" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View Mode Toggle (Grid / List) */}
        <div className="h-[40px] bg-white dark:bg-[#16181c] border border-slate-200/90 dark:border-[#2f3336] rounded-[14px] p-0.5 sm:p-1 flex items-center gap-0.5">
          <button
            type="button"
            title="Katakcha ko'rinishi (Grid)"
            onClick={() => onViewModeChange("grid")}
            className={`p-1.5 rounded-[8px] transition-colors cursor-pointer ${viewMode === "grid"
                ? "bg-slate-100 dark:bg-[#2f3336] text-slate-900 dark:text-white"
                : "text-slate-400 dark:text-[#71767b] hover:text-slate-700 dark:hover:text-white"
              }`}
          >
            <LayoutGrid size={15} />
          </button>
          <button
            type="button"
            title="Ro'yxat ko'rinishi (List)"
            onClick={() => onViewModeChange("list")}
            className={`p-1.5 rounded-[8px] transition-colors cursor-pointer ${viewMode === "list"
                ? "bg-slate-100 dark:bg-[#2f3336] text-slate-900 dark:text-white"
                : "text-slate-400 dark:text-[#71767b] hover:text-slate-700 dark:hover:text-white"
              }`}
          >
            <ListIcon size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
