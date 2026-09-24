import React from "react";
import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="w-full border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors py-4 mt-auto select-none"
      role="contentinfo"
    >
      <div
        className="w-full mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400"
        style={{ maxWidth: "var(--content-max-width, 940px)" }}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800 dark:text-slate-200">Fikr</span>
          <span>•</span>
          <span>© {currentYear} Barcha huquqlar himoyalangan</span>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5" aria-label="Footer havolalari">
          <Link
            href="/privacy"
            className="hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer transition-colors"
          >
            Maxfiylik
          </Link>
          <Link
            href="/terms"
            className="hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer transition-colors"
          >
            Foydalanish shartlari
          </Link>
          <Link
            href="/guidelines"
            className="hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer transition-colors"
          >
            Qoidalar
          </Link>
          <Link
            href="/help"
            className="hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer transition-colors"
          >
            Yordam
          </Link>
        </nav>
      </div>
    </footer>
  );
}
