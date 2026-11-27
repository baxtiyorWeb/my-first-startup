"use client";

import React from "react";
import { Check } from "lucide-react";

interface VerifiedBadgeProps {
  size?: number;
  title?: string;
  className?: string;
}

/**
 * Unified Geters Verified Badge (matches mobile `VerifiedBadge`).
 * Circular #1A8CD8 badge with crisp white checkmark.
 */
export function VerifiedBadge({
  size = 16,
  title = "Tasdiqlangan muallif",
  className = "",
}: VerifiedBadgeProps) {
  const iconSize = Math.max(9, Math.round(size * 0.65));
  return (
    <span
      title={title}
      aria-label={title}
      style={{ width: size, height: size }}
      className={`inline-flex items-center justify-center rounded-full bg-[#1a8cd8] text-white shrink-0 ${className}`}
    >
      <Check size={iconSize} strokeWidth={3} />
    </span>
  );
}
