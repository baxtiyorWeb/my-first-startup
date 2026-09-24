"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  VerifiedBadgeIcon,
  ShareIcon,
  MessageIcon,
  CheckIcon,
} from "@/components/icons";
import { toast } from "@/components/ui/toast";
import type { UserProfile } from "@/types/social";

interface ProfileHeaderProps {
  profile: UserProfile;
  isSelf: boolean;
  onEditClick: () => void;
  onFollowToggle?: (isFollowing: boolean) => void;
}

export function ProfileHeader({
  profile,
  isSelf,
  onEditClick,
  onFollowToggle,
}: ProfileHeaderProps) {
  const [isFollowing, setIsFollowing] = useState(profile.isFollowing ?? false);
  const [followersCount, setFollowersCount] = useState(profile.stats.followersCount);
  const [isSharing, setIsSharing] = useState(false);

  const handleFollow = () => {
    const nextState = !isFollowing;
    const nextCount = nextState ? followersCount + 1 : Math.max(0, followersCount - 1);
    setIsFollowing(nextState);
    setFollowersCount(nextCount);
    onFollowToggle?.(nextState);

    if (nextState) {
      toast.success(`${profile.name} kuzatuvchilaringiz safiga qo‘shildi`);
    } else {
      toast.info(`${profile.name} kuzatishdan chiqarildi`);
    }
  };

  const handleShare = () => {
    setIsSharing(true);
    setTimeout(() => setIsSharing(false), 400);

    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/dashboard/profile?user=${profile.handle}`
        : `https://fikr.uz/profile/${profile.handle}`;

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Profil havolasi buferga nusxalandi");
    } else {
      toast.info("Havola nusxalandi");
    }
  };

  return (
    <header className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-7 shadow-xs">
      {/* 1. Identity & Actions Row */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
        {/* Left: Avatar + Primary Identity */}
        <div className="flex items-start gap-4 sm:gap-5">
          {/* Avatar with subtle authority ring */}
          <div className="relative shrink-0 select-none">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xl sm:text-2xl flex items-center justify-center ring-2 ring-slate-200 dark:ring-slate-800 shadow-sm">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                profile.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
              )}
            </div>
            {profile.verified && (
              <span
                className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-white dark:bg-slate-900"
                title="Tasdiqlangan intellektual muallif"
              >
                <VerifiedBadgeIcon size={18} className="text-slate-900 dark:text-slate-100" />
              </span>
            )}
          </div>

          {/* Name, Handle & Professional Role */}
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-950 dark:text-white leading-tight">
                {profile.name}
              </h1>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {profile.handle}
              </span>
            </div>

            <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mt-1">
              {profile.role}
            </p>

            {/* Context metadata (Location, Joined Date, Website) */}
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              {profile.location && (
                <span className="flex items-center gap-1">
                  <svg
                    className="w-3.5 h-3.5 text-slate-400 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span>{profile.location}</span>
                </span>
              )}

              <span className="flex items-center gap-1">
                <svg
                  className="w-3.5 h-3.5 text-slate-400 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
                <span>{profile.joinedDate}</span>
              </span>

              {profile.website && (
                <a
                  href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100 hover:underline transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5 text-slate-400 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
                    />
                  </svg>
                  <span>{profile.website.replace(/^https?:\/\//, "")}</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Right: Contextual Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto w-full sm:w-auto">
          {isSelf ? (
            <>
              <button
                type="button"
                onClick={onEditClick}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                <svg
                  className="w-3.5 h-3.5 text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                <span>Profilni tahrirlash</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                aria-label="Profil havolasini nusxalash"
                title="Profil havolasini nusxalash"
                className={`p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${isSharing ? "scale-95 text-slate-950 dark:text-white" : ""
                  }`}
              >
                <ShareIcon size={15} />
              </button>
            </>
          ) : (
            <>
              {/* Follow / Following Toggle */}
              <button
                type="button"
                onClick={handleFollow}
                className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${isFollowing
                    ? "border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900/60 group"
                    : "bg-slate-950 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-200 shadow-xs"
                  }`}
              >
                {isFollowing ? (
                  <>
                    <CheckIcon size={14} className="group-hover:hidden" />
                    <span className="group-hover:hidden">Kuzatilyapti</span>
                    <span className="hidden group-hover:inline">Bekor qilish</span>
                  </>
                ) : (
                  <span>Kuzatish</span>
                )}
              </button>

              {/* Direct Message Link */}
              <Link
                href={`/dashboard/messages?to=${profile.handle}`}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                title="Shaxsiy fikr almashish"
              >
                <MessageIcon size={14} />
                <span>Xabar</span>
              </Link>

              {/* Share button */}
              <button
                type="button"
                onClick={handleShare}
                aria-label="Profil havolasini nusxalash"
                className={`p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${isSharing ? "scale-95 text-slate-950 dark:text-white" : ""
                  }`}
              >
                <ShareIcon size={15} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. Core Perspective (Bio) */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80">
        <p className="text-xs sm:text-[13.5px] leading-relaxed text-slate-800 dark:text-slate-200 font-normal">
          {profile.bio}
        </p>
      </div>

      {/* 4. Discussion & Contribution Signals (Discussion-First, Not Vanity Numbers) */}
      <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
        <div className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
          <span className="text-base sm:text-lg font-bold text-slate-950 dark:text-white tabular-nums block leading-tight">
            {profile.stats.postsCount}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
            Fikrlar va tahlillar
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
          <span className="text-base sm:text-lg font-bold text-slate-950 dark:text-white tabular-nums block leading-tight">
            {profile.stats.discussionsCount}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
            Boshlangan muhokamalar
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
          <span className="text-base sm:text-lg font-bold text-slate-950 dark:text-white tabular-nums block leading-tight">
            {profile.stats.repliesCount}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
            Mulohazalardagi ishtirok
          </span>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
          <span className="text-base sm:text-lg font-bold text-slate-950 dark:text-white tabular-nums block leading-tight">
            {followersCount.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
            Kuzatuvchilar
          </span>
        </div>
      </div>
    </header>
  );
}
