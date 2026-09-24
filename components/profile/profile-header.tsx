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
import type { UserProfile, ProfileTab } from "@/types/social";
import { useI18n } from "@/lib/i18n/context";

interface ProfileHeaderProps {
  profile: UserProfile;
  isSelf: boolean;
  onEditClick: () => void;
  onFollowToggle?: (isFollowing: boolean) => void;
  onTabChange?: (tab: ProfileTab) => void;
}

export function ProfileHeader({
  profile,
  isSelf,
  onEditClick,
  onFollowToggle,
  onTabChange,
}: ProfileHeaderProps) {
  const { t, localePath } = useI18n();
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
      toast.success(`${profile.name} (${t("common.following")})`);
    } else {
      toast.info(`${profile.name} (${t("common.unfollow")})`);
    }
  };

  const handleShare = () => {
    setIsSharing(true);
    setTimeout(() => setIsSharing(false), 400);

    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}${localePath(`/dashboard/profile?user=${profile.handle}`)}`
        : `https://fikr.uz/profile/${profile.handle}`;

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      toast.success(t("profile.profileCopied"));
    } else {
      toast.info(t("common.linkCopied"));
    }
  };

  return (
    <header className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-7 shadow-xs">
      {/* 1. Identity & Actions Row */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
        {/* Left: Avatar + Primary Identity */}
        <div className="flex items-start gap-4 sm:gap-5">
          {/* Avatar with authority ring */}
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
                title={t("common.verifiedAuthor")}
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

            {profile.intent && profile.intent !== "none" && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700">
                <span>
                  {profile.intent === "looking_for_cofounder" && t("intents.badge_cofounder")}
                  {profile.intent === "open_to_work" && t("intents.badge_open_to_work")}
                  {profile.intent === "raising_funds" && t("intents.badge_raising")}
                  {profile.intent === "open_to_advisory" && t("intents.badge_advisory")}
                </span>
              </div>
            )}

            {/* Location & Links */}
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
              {profile.location && (
                <div className="flex items-center gap-1">
                  <span>{profile.location}</span>
                </div>
              )}
              {profile.joinedDate && (
                <div className="flex items-center gap-1">
                  <span>{t("profile.joined")}: {profile.joinedDate}</span>
                </div>
              )}
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline flex items-center gap-1 text-slate-900 dark:text-slate-100"
                >
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
                <span>{t("profile.editProfile")}</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                aria-label={t("profile.shareProfile")}
                title={t("profile.shareProfile")}
                className={`p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                  isSharing ? "scale-95 text-slate-950 dark:text-white" : ""
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
                className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  isFollowing
                    ? "border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900/60 group"
                    : "bg-slate-950 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-200 shadow-xs"
                }`}
              >
                {isFollowing ? (
                  <>
                    <CheckIcon size={14} className="group-hover:hidden" />
                    <span className="group-hover:hidden">{t("common.following")}</span>
                    <span className="hidden group-hover:inline">{t("common.unfollow")}</span>
                  </>
                ) : (
                  <span>{t("common.follow")}</span>
                )}
              </button>

              {/* Direct Message Link */}
              <Link
                href={localePath(`/dashboard/messages?to=${profile.handle}`)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                title={t("nav.messages")}
              >
                <MessageIcon size={14} />
                <span>{t("nav.messages")}</span>
              </Link>

              {/* Share button */}
              <button
                type="button"
                onClick={handleShare}
                aria-label={t("profile.shareProfile")}
                className={`p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                  isSharing ? "scale-95 text-slate-950 dark:text-white" : ""
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

      {/* 3. Discussion & Contribution Signals */}
      {/* Mobile: Compact, sleek inline metrics bar (Zero chunky boxes) */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 sm:hidden flex items-center justify-between gap-1 text-center py-0.5">
        <button
          type="button"
          onClick={() => onTabChange?.("posts")}
          className="flex-1 py-1 px-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 active:scale-95 transition-all text-center cursor-pointer"
        >
          <span className="text-sm font-bold text-slate-950 dark:text-white tabular-nums block leading-tight">
            {profile.stats.postsCount}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 font-medium truncate">
            {t("profile.stats.thoughts")}
          </span>
        </button>

        <div className="w-px h-5 bg-slate-200/70 dark:bg-slate-800 shrink-0" />

        <button
          type="button"
          onClick={() => onTabChange?.("discussions")}
          className="flex-1 py-1 px-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 active:scale-95 transition-all text-center cursor-pointer"
        >
          <span className="text-sm font-bold text-slate-950 dark:text-white tabular-nums block leading-tight">
            {profile.stats.discussionsCount}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 font-medium truncate">
            {t("profile.stats.discussions")}
          </span>
        </button>

        <div className="w-px h-5 bg-slate-200/70 dark:bg-slate-800 shrink-0" />

        <div className="flex-1 py-1 px-1 text-center">
          <span className="text-sm font-bold text-slate-950 dark:text-white tabular-nums block leading-tight">
            {followersCount.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 font-medium truncate">
            {t("profile.stats.followers")}
          </span>
        </div>

        <div className="w-px h-5 bg-slate-200/70 dark:bg-slate-800 shrink-0" />

        <div className="flex-1 py-1 px-1 text-center">
          <span className="text-sm font-bold text-slate-950 dark:text-white tabular-nums block leading-tight">
            {profile.stats.followingCount.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 font-medium truncate">
            {t("profile.stats.following")}
          </span>
        </div>
      </div>

      {/* Tablet & Desktop: Refined metric tiles */}
      <div className="hidden sm:grid sm:grid-cols-4 gap-3 mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 text-left">
        <button
          type="button"
          onClick={() => onTabChange?.("posts")}
          className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors text-left cursor-pointer"
        >
          <span className="text-base sm:text-lg font-bold text-slate-950 dark:text-white tabular-nums block leading-tight">
            {profile.stats.postsCount}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 font-medium">
            {t("profile.stats.thoughts")}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange?.("discussions")}
          className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors text-left cursor-pointer"
        >
          <span className="text-base sm:text-lg font-bold text-slate-950 dark:text-white tabular-nums block leading-tight">
            {profile.stats.discussionsCount}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 font-medium">
            {t("profile.stats.discussions")}
          </span>
        </button>

        <div className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
          <span className="text-base sm:text-lg font-bold text-slate-950 dark:text-white tabular-nums block leading-tight">
            {followersCount.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 font-medium">
            {t("profile.stats.followers")}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
          <span className="text-base sm:text-lg font-bold text-slate-950 dark:text-white tabular-nums block leading-tight">
            {profile.stats.followingCount.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 font-medium">
            {t("profile.stats.following")}
          </span>
        </div>
      </div>
    </header>
  );
}
