"use client";

import React, { useMemo } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Globe,
  Tag,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react";
import { analyzeSeoReadiness } from "@/lib/seo/seo-analyzer";
import { CONTENT_CATEGORIES } from "@/lib/seo/slugify";
import type { ContentKind } from "@/types/social";

interface SeoInspectorPanelProps {
  contentKind: ContentKind;
  locale: "uz" | "ru" | "en";
  onLocaleChange: (loc: "uz" | "ru" | "en") => void;
  category: string;
  onCategoryChange: (cat: string) => void;
  tagsInput: string;
  onTagsInputChange: (val: string) => void;
  title: string;
  slug: string;
  onSlugChange: (val: string) => void;
  seoTitle: string;
  onSeoTitleChange: (val: string) => void;
  seoDescription: string;
  onSeoDescriptionChange: (val: string) => void;
  focusKeyword: string;
  onFocusKeywordChange: (val: string) => void;
  coverImageUrl: string;
  coverImageAlt: string;
  onCoverImageAltChange: (val: string) => void;
  isIndexable: boolean;
  onIsIndexableChange: (val: boolean) => void;
  status: "draft" | "published";
  onStatusChange: (val: "draft" | "published") => void;
  htmlContent: string;
  videoUrl: string;
  chaptersCount: number;
}

export function SeoInspectorPanel({
  contentKind,
  locale,
  onLocaleChange,
  category,
  onCategoryChange,
  tagsInput,
  onTagsInputChange,
  title,
  slug,
  onSlugChange,
  seoTitle,
  onSeoTitleChange,
  seoDescription,
  onSeoDescriptionChange,
  focusKeyword,
  onFocusKeywordChange,
  coverImageUrl,
  coverImageAlt,
  onCoverImageAltChange,
  isIndexable,
  onIsIndexableChange,
  status,
  onStatusChange,
  htmlContent,
  videoUrl,
  chaptersCount,
}: SeoInspectorPanelProps) {
  const analysis = useMemo(
    () =>
      analyzeSeoReadiness({
        contentKind,
        title,
        slug,
        seoTitle,
        seoDescription,
        focusKeyword,
        htmlContent,
        coverImageUrl,
        coverImageAlt,
        videoUrl,
        chaptersCount,
      }),
    [
      contentKind,
      title,
      slug,
      seoTitle,
      seoDescription,
      focusKeyword,
      htmlContent,
      coverImageUrl,
      coverImageAlt,
      videoUrl,
      chaptersCount,
    ]
  );

  const routeSeg =
    contentKind === "video"
      ? "videos"
      : contentKind === "news"
      ? "news"
      : "articles";

  const previewTitle = (seoTitle || title || "Maqola sarlavhasi shu yerda ko'rinadi").slice(0, 65);
  const previewDesc = (
    seoDescription ||
    "Google qidiruv natijasida ko'rinadigan qisqa va jalb qiluvchi ta'rif..."
  ).slice(0, 160);

  const scoreColor =
    analysis.score >= 80
      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30"
      : analysis.score >= 55
      ? "text-amber-500 bg-amber-500/10 border-amber-500/30"
      : "text-rose-500 bg-rose-500/10 border-rose-500/30";

  return (
    <aside className="space-y-4">
      {/* 1. SEO Score & Live Google SERP Preview */}
      <div className="rounded-[16px] bg-white dark:bg-[#101117] border border-slate-200/90 dark:border-[#24252f] p-4 sm:p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-[#3995ff]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              SEO Expert Auditi
            </h2>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${scoreColor}`}
          >
            {analysis.score}/100 ({analysis.grade})
          </span>
        </div>

        {/* Google SERP Preview */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0b0c13] border border-slate-200/80 dark:border-[#1e202c] space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
            <Globe className="w-3 h-3 text-[#3995ff] shrink-0" />
            <span className="truncate">
              geters.uz › {locale} › {routeSeg} › {slug || "..."}
            </span>
          </div>
          <div className="text-sm font-semibold text-blue-700 dark:text-[#76b7ff] leading-snug line-clamp-2">
            {previewTitle}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
            {previewDesc}
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
          {analysis.checks.map((chk) => (
            <div
              key={chk.id}
              className="flex items-start gap-2 text-[11px] leading-snug"
            >
              {chk.status === "good" ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              ) : chk.status === "warning" ? (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {chk.label}:{" "}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {chk.message}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Taxonomy, URL Slug & Publishing Controls */}
      <div className="rounded-[16px] bg-white dark:bg-[#101117] border border-slate-200/90 dark:border-[#24252f] p-4 sm:p-5 space-y-3.5 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
          <Sparkles className="w-3.5 h-3.5 text-[#3995ff]" />
          <span>Nashr va SEO Sozlamalari</span>
        </div>

        {/* Status + Language */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Holati
            </label>
            <select
              value={status}
              onChange={(e) => onStatusChange(e.target.value as "draft" | "published")}
              className="w-full rounded-lg bg-slate-50 dark:bg-[#14151d] border border-slate-200 dark:border-[#24252f] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3995ff]"
            >
              <option value="published">Nashr qilish</option>
              <option value="draft">Qoralama (Draft)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Til (hreflang)
            </label>
            <select
              value={locale}
              onChange={(e) => onLocaleChange(e.target.value as "uz" | "ru" | "en")}
              className="w-full rounded-lg bg-slate-50 dark:bg-[#14151d] border border-slate-200 dark:border-[#24252f] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3995ff]"
            >
              <option value="uz">O‘zbekcha (uz)</option>
              <option value="ru">Русский (ru)</option>
              <option value="en">English (en)</option>
            </select>
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Kategoriya / Rukn
          </label>
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full rounded-lg bg-slate-50 dark:bg-[#14151d] border border-slate-200 dark:border-[#24252f] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3995ff]"
          >
            {CONTENT_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label.uz}
              </option>
            ))}
          </select>
        </div>

        {/* Focus Keyword */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Asosiy Kalit So‘z (Focus Keyword)
          </label>
          <input
            type="text"
            value={focusKeyword}
            onChange={(e) => onFocusKeywordChange(e.target.value)}
            placeholder="Masalan: nextjs app router darslik"
            className="w-full rounded-lg bg-slate-50 dark:bg-[#14151d] border border-slate-200 dark:border-[#24252f] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3995ff]"
          />
        </div>

        {/* Semantic Slug */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            URL Slug (301 redirect qo‘llab-quvvatlanadi)
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => onSlugChange(e.target.value)}
            placeholder="avtomatik-yaratiladi"
            className="w-full rounded-lg bg-slate-50 dark:bg-[#14151d] border border-slate-200 dark:border-[#24252f] px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3995ff]"
          />
        </div>

        {/* SEO Title */}
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <label className="font-semibold text-slate-500 dark:text-slate-400">
              SEO Title (ixtiyoriy override)
            </label>
            <span className="text-slate-400">{(seoTitle || title).length}/65</span>
          </div>
          <input
            type="text"
            value={seoTitle}
            onChange={(e) => onSeoTitleChange(e.target.value)}
            placeholder={title || "Google sarlavhasi..."}
            className="w-full rounded-lg bg-slate-50 dark:bg-[#14151d] border border-slate-200 dark:border-[#24252f] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3995ff]"
          />
        </div>

        {/* Meta Description */}
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <label className="font-semibold text-slate-500 dark:text-slate-400">
              Meta Description
            </label>
            <span className="text-slate-400">{seoDescription.length}/160</span>
          </div>
          <textarea
            rows={3}
            value={seoDescription}
            onChange={(e) => onSeoDescriptionChange(e.target.value)}
            placeholder="Google qidiruv natijasida ko'rinadigan 120-160 belgili jozibador ta'rif..."
            className="w-full rounded-lg bg-slate-50 dark:bg-[#14151d] border border-slate-200 dark:border-[#24252f] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3995ff] resize-none"
          />
        </div>

        {/* Cover Image Alt Text */}
        <div>
          <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <ImageIcon className="w-3 h-3" />
            <span>Rasm Alt-matni (Image SEO)</span>
          </label>
          <input
            type="text"
            value={coverImageAlt}
            onChange={(e) => onCoverImageAltChange(e.target.value)}
            placeholder="Muqova rasmida nima tasvirlangan?"
            className="w-full rounded-lg bg-slate-50 dark:bg-[#14151d] border border-slate-200 dark:border-[#24252f] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3995ff]"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <Tag className="w-3 h-3" />
            <span>Teglar (vergul bilan ajrating)</span>
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => onTagsInputChange(e.target.value)}
            placeholder="nextjs, react, seo, typescript"
            className="w-full rounded-lg bg-slate-50 dark:bg-[#14151d] border border-slate-200 dark:border-[#24252f] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3995ff]"
          />
        </div>

        {/* Google Index Toggle */}
        <label className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-[#14151d] border border-slate-200/80 dark:border-[#24252f] cursor-pointer">
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              Google &amp; Yandex Indeksi
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              Ochiq Sitemap va qidiruv tizimlariga chiqarish
            </div>
          </div>
          <input
            type="checkbox"
            checked={isIndexable}
            onChange={(e) => onIsIndexableChange(e.target.checked)}
            className="h-4 w-4 accent-[#3995ff] cursor-pointer"
          />
        </label>
      </div>
    </aside>
  );
}
