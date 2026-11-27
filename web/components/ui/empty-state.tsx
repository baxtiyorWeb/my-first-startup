"use client";

import React from "react";
import { AppButton } from "./button";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * Unified Geters Empty State (mirrors mobile `EmptyStateWidget`).
 */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-6 py-12 rounded-2xl bg-white dark:bg-[#000000] border border-[#cfd9de] dark:border-[#2f3336] ${className}`}
    >
      <div className="size-12 rounded-full bg-[#f7f9f9] dark:bg-[#16181c] border border-[#cfd9de] dark:border-[#2f3336] flex items-center justify-center text-[#536471] dark:text-[#71767b] mb-3.5">
        {icon}
      </div>
      <h3 className="text-[15px] font-bold text-[#0f1419] dark:text-[#e7e9ea]">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 text-xs sm:text-[13px] text-[#536471] dark:text-[#71767b] max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <div className="mt-4">
          <AppButton size="sm" variant="primary" onClick={onAction}>
            {actionLabel}
          </AppButton>
        </div>
      )}
    </div>
  );
}
