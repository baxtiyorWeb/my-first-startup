"use client";

import React, { useState } from "react";
import { GETERS_COLORS } from "@/lib/design-tokens";
import { VerifiedBadge } from "./verified-badge";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

interface UserAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  size?: AvatarSize;
  isOnline?: boolean;
  isVerified?: boolean;
  className?: string;
  alt?: string;
}

const SIZE_STYLES: Record<AvatarSize, { container: string; text: string; dot: string; badge: number }> = {
  xs: { container: "w-6 h-6", text: "text-[10px]", dot: "w-2 h-2", badge: 12 },
  sm: { container: "w-8 h-8", text: "text-[11px]", dot: "w-2.5 h-2.5", badge: 13 },
  md: { container: "w-[38px] h-[38px]", text: "text-[13px]", dot: "w-2.5 h-2.5", badge: 14 },
  lg: { container: "w-11 h-11", text: "text-sm", dot: "w-3 h-3", badge: 15 },
  xl: { container: "w-16 h-16 sm:w-20 sm:h-20", text: "text-xl sm:text-2xl", dot: "w-3.5 h-3.5", badge: 18 },
};

function getGradientPair(seed: string): readonly [string, string] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % GETERS_COLORS.avatarGradients.length;
  return GETERS_COLORS.avatarGradients[idx];
}

/**
 * Unified Geters Avatar (mirrors mobile `AppAvatar` 1:1).
 */
export function UserAvatar({
  name,
  avatarUrl,
  size = "sm",
  isOnline = false,
  isVerified = false,
  className = "",
  alt,
}: UserAvatarProps) {
  const [prevAvatarUrl, setPrevAvatarUrl] = useState(avatarUrl);
  const [hasError, setHasError] = useState(false);

  if (avatarUrl !== prevAvatarUrl) {
    setPrevAvatarUrl(avatarUrl);
    setHasError(false);
  }

  const displayName = (name || "").trim();
  const initials = displayName
    ? displayName
        .split(/\s+/)
        .map((n) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "G";

  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.sm;
  const [gradStart, gradEnd] = getGradientPair(displayName || "G");

  const core =
    avatarUrl && !hasError ? (
      <div
        className={`relative shrink-0 rounded-full overflow-hidden select-none bg-[#f7f9f9] dark:bg-[#16181c] border border-[#cfd9de] dark:border-[#2f3336] ${sizeStyle.container} ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt={alt || displayName || "Foydalanuvchi rasmi"}
          className="w-full h-full object-cover rounded-full"
          onError={() => setHasError(true)}
          loading="lazy"
        />
      </div>
    ) : (
      <div
        style={{
          backgroundImage: `linear-gradient(135deg, ${gradStart}, ${gradEnd})`,
        }}
        className={`shrink-0 rounded-full text-white font-bold flex items-center justify-center select-none border border-[#cfd9de] dark:border-[#2f3336] ${sizeStyle.container} ${sizeStyle.text} ${className}`}
        aria-label={alt || displayName || "Foydalanuvchi"}
      >
        {initials}
      </div>
    );

  if (!isOnline && !isVerified) {
    return core;
  }

  return (
    <div className="relative inline-flex shrink-0">
      {core}
      {isOnline && (
        <span
          aria-label="Onlayn"
          className={`absolute -bottom-0.5 -right-0.5 rounded-full bg-[#00ba7c] ring-2 ring-white dark:ring-[#000000] ${sizeStyle.dot}`}
        />
      )}
      {!isOnline && isVerified && (
        <span className="absolute -bottom-0.5 -right-0.5 ring-2 ring-white dark:ring-[#000000] rounded-full">
          <VerifiedBadge size={sizeStyle.badge} />
        </span>
      )}
    </div>
  );
}
