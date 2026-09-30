"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./theme-context";

interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md";
}

export function ThemeToggle({ className = "", size = "md" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = theme === "dark";
  const iconSize = size === "sm" ? 15 : 17;
  const paddingClass = size === "sm" ? "p-1.5" : "p-2";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Yorug' mavzuga o'tish" : "Qorong'u mavzuga o'tish"}
      title={isDark ? "Yorug' mavzu" : "Qorong'u mavzu"}
      className={`relative inline-flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
        isDark
          ? "bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white border border-white/[0.1]"
          : "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200"
      } ${paddingClass} ${className}`}
    >
      {/* Sun Icon */}
      <Sun
        size={iconSize}
        className={`transition-all duration-300 ${
          mounted && !isDark
            ? "rotate-0 scale-100 opacity-100 text-amber-500"
            : "-rotate-90 scale-0 opacity-0 absolute"
        }`}
      />
      {/* Moon Icon */}
      <Moon
        size={iconSize}
        className={`transition-all duration-300 ${
          mounted && isDark
            ? "rotate-0 scale-100 opacity-100 text-zinc-200"
            : "rotate-90 scale-0 opacity-0 absolute"
        }`}
      />
    </button>
  );
}
