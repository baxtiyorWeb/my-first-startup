"use client";

import React, { useState, useRef, useEffect } from "react";
import { Globe, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { LOCALES, LOCALES_META, type Locale } from "@/lib/i18n/config";

interface HeaderLanguageSwitcherProps {
  variant?: "header" | "compact" | "segmented";
}

export function LanguageSwitcher({ variant = "header" }: HeaderLanguageSwitcherProps) {
  const { locale, switchLocale } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Segmented control (used in mobile drawer or settings)
  if (variant === "segmented") {
    return (
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700/80">
        {LOCALES.map((loc) => {
          const meta = LOCALES_META[loc];
          const isSelected = locale === loc;
          return (
            <button
              key={loc}
              type="button"
              onClick={() => switchLocale(loc)}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all cursor-pointer ${
                isSelected
                  ? "bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <span>{meta.flag}</span>
              <span className="text-[11px]">{meta.shortLabel}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Compact variant for collapsed sidebar
  if (variant === "compact") {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          title={`Tilni tanlash (${LOCALES_META[locale].label})`}
          className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
        >
          <span className="text-sm select-none">{LOCALES_META[locale].flag}</span>
        </button>

        {isOpen && (
          <div className="absolute left-[calc(100%+8px)] bottom-0 w-36 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 text-xs">
            {LOCALES.map((loc) => {
              const meta = LOCALES_META[loc];
              const isSelected = locale === loc;
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => {
                    switchLocale(loc);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-slate-50 dark:bg-slate-800 font-semibold text-slate-950 dark:text-white"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{meta.flag}</span>
                    <span>{meta.nativeName}</span>
                  </span>
                  {isSelected && <Check size={13} className="text-slate-900 dark:text-white" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Default header dropdown
  const currentMeta = LOCALES_META[locale];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="Tilni tanlash / Выбор языка / Select language"
        className="flex items-center gap-1.5 h-8 px-2 sm:px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors cursor-pointer"
      >
        <Globe size={13} className="text-slate-500 dark:text-slate-400" />
        <span className="text-xs select-none">{currentMeta.flag}</span>
        <span className="hidden sm:inline text-[11px] font-semibold tracking-wide">
          {currentMeta.shortLabel}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-44 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100 text-xs">
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Til / Язык / Language
          </div>

          <div className="py-1">
            {LOCALES.map((loc) => {
              const meta = LOCALES_META[loc];
              const isSelected = locale === loc;
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => {
                    switchLocale(loc);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3.5 py-2 text-left flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-slate-50 dark:bg-slate-800 font-semibold text-slate-950 dark:text-white"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-sm">{meta.flag}</span>
                    <span className="text-xs">{meta.nativeName}</span>
                  </span>
                  {isSelected && (
                    <Check size={14} className="text-slate-900 dark:text-white shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
