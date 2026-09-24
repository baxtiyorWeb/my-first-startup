import React from "react";
import Link from "next/link";
import { MediaIcon } from "@/components/icons";

export default function ReelsPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4 text-center">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-8 space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
          <MediaIcon size={24} />
        </div>

        <div className="space-y-1.5">
          <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            Rejalashtirilgan Modul
          </span>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            Media va video tahlillar
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Hozirgi bosqichda Fikr platformasi matnli fikrlar, tahliliy maqolalar va intellektual muhokamalarga qaratilgan.
            Video va media bo‘limi kelgusi bosqichlarda bosqichma-bosqich ishga tushiriladi.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold cursor-pointer transition-colors"
          >
            Bosh sahifaga qaytish
          </Link>
        </div>
      </div>
    </div>
  );
}
