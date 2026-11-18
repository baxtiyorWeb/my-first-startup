"use client";

import React, { useState } from "react";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

interface UserAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  size?: AvatarSize;
  className?: string;
  alt?: string;
}

const SIZE_STYLES: Record<AvatarSize, { container: string; text: string }> = {
  xs: { container: "w-6 h-6", text: "text-[10px]" },
  sm: { container: "w-7 h-7", text: "text-[11px]" },
  md: { container: "w-8 h-8", text: "text-xs" },
  lg: { container: "w-10 h-10", text: "text-sm" },
  xl: { container: "w-16 h-16 sm:w-20 sm:h-20", text: "text-xl sm:text-2xl" },
};

export function UserAvatar({
  name,
  avatarUrl,
  size = "sm",
  className = "",
  alt,
}: UserAvatarProps) {
  const [prevAvatarUrl, setPrevAvatarUrl] = useState(avatarUrl);
  const [hasError, setHasError] = useState(false);

  if (avatarUrl !== prevAvatarUrl) {
    setPrevAvatarUrl(avatarUrl);
    setHasError(false);
  }

  const initials = name
    ? name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "GG";

  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.sm;

  if (avatarUrl && !hasError) {
    return (
      <div
        className={`relative shrink-0 rounded-full overflow-hidden select-none bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-800 ${sizeStyle.container} ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt={alt || name || "Foydalanuvchi rasmi"}
          className="w-full h-full object-cover rounded-full"
          onError={() => setHasError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={`shrink-0 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold flex items-center justify-center select-none ring-1 ring-slate-200 dark:ring-slate-800 ${sizeStyle.container} ${sizeStyle.text} ${className}`}
      aria-label={alt || name || "Foydalanuvchi"}
    >
      {initials}
    </div>
  );
}
