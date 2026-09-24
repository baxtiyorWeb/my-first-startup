import React from "react";
import { PlusIcon, SparklesIcon } from "@/components/icons";

interface DashboardHeaderProps {
  userName?: string;
}

export function DashboardHeader({ userName = "Alisher" }: DashboardHeaderProps) {
  const hour = new Date().getHours();
  let greeting = "Xayrli kun";
  if (hour >= 5 && hour < 12) greeting = "Xayrli tong";
  else if (hour >= 18 || hour < 5) greeting = "Xayrli oqshom";

  return (
    <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
      <div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <SparklesIcon size={12} className="text-slate-700 dark:text-slate-300" />
          <span>Fikr Platformasi</span>
        </div>
        <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {greeting}, {userName}!
        </h1>
      </div>

      <button
        type="button"
        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold transition-all shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        <PlusIcon size={14} />
        <span>Fikr yozish</span>
      </button>
    </div>
  );
}
