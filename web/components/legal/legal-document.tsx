"use client";

import React from "react";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export interface LegalSection {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}

interface LegalDocumentProps {
  title: string;
  subtitle?: string;
  updated: string;
  intro?: string;
  sections: LegalSection[];
  backHref: string;
  backLabel: string;
  contactEmail?: { label: string; value: string };
  relatedLinks?: { label: string; href: string }[];
}

/**
 * Maxfiylik siyosati, foydalanish shartlari va bolalar xavfsizligi kabi
 * huquqiy hujjatlar uchun yagona, o'qishga qulay shablon.
 */
export function LegalDocument({
  title,
  subtitle,
  updated,
  intro,
  sections,
  backHref,
  backLabel,
  contactEmail,
  relatedLinks,
}: LegalDocumentProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 sm:p-8 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href={backHref}
            className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 inline-flex items-center gap-1 transition-colors"
          >
            ← {backLabel}
          </Link>
          <LanguageSwitcher variant="header" />
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {updated}
          </p>
        </div>

        <div className="space-y-4 text-xs sm:text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
          {intro && <p>{intro}</p>}

          {sections.map((section, index) => (
            <section key={index} className="pt-2 space-y-1.5">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {section.title}
              </h2>
              {section.paragraphs?.map((paragraph, pIndex) => (
                <p
                  key={pIndex}
                  className="text-slate-600 dark:text-slate-400"
                >
                  {paragraph}
                </p>
              ))}
              {section.bullets && section.bullets.length > 0 && (
                <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400">
                  {section.bullets.map((bullet, bIndex) => (
                    <li key={bIndex}>{bullet}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {contactEmail && (
            <section className="pt-2 space-y-1.5">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {contactEmail.label}
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                <a
                  href={`mailto:${contactEmail.value}`}
                  className="underline hover:text-slate-900 dark:hover:text-slate-100"
                >
                  {contactEmail.value}
                </a>
              </p>
            </section>
          )}

          {relatedLinks && relatedLinks.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px]">
              {relatedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 underline transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
