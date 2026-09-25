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
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          <SparklesIcon size={13} className="text-cyan-500 animate-pulse" />
          <span>The Go-getters Platformasi</span>
        </div>
        <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
          {greeting}, {userName}!
        </h1>
      </div>

      <button
        type="button"
        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:opacity-95 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20 hover:scale-[1.02] cursor-pointer"
      >
        <PlusIcon size={14} className="stroke-[2.5]" />
        <span>Tashabbus yozish</span>
      </button>
    </div>
  );
}
