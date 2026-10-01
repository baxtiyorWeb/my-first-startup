"use client";

import React, { useState, useRef } from "react";
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
import { UserAvatar } from "@/components/ui/user-avatar";

import { useAuth } from "@/components/auth/auth-context";
import { isSameUser } from "@/lib/user-utils";
import { Menu, Camera, Loader2, Trash2 } from "lucide-react";
import { ProfileMenuModal } from "./profile-menu-modal";
import { api } from "@/lib/api";

interface ProfileHeaderProps {
  profile: UserProfile;
  isSelf: boolean;
  onEditClick: () => void;
  onFollowToggle?: (isFollowing: boolean) => void;
  onTabChange?: (tab: ProfileTab) => void;
  onProfileUpdate?: (updates: Partial<UserProfile>) => void;
}

export function ProfileHeader({
  profile,
  isSelf,
  onEditClick,
  onFollowToggle,
  onTabChange,
  onProfileUpdate,
}: ProfileHeaderProps) {
  const { session, updateCurrentUser } = useAuth();
  const { t, localePath } = useI18n();
  const isSelfUser = isSelf || isSameUser(session.user, profile);
  const [isFollowing, setIsFollowing] = useState(isSelfUser ? false : (profile.isFollowing ?? false));
  const [followersCount, setFollowersCount] = useState(profile.stats.followersCount);
  const [isSharing, setIsSharing] = useState(false);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState(profile.coverPhotoUrl || "");
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setCoverPhotoUrl(profile.coverPhotoUrl || "");
  }, [profile.coverPhotoUrl]);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Muqova rasmi 10MB dan oshmasligi kerak");
      return;
    }

    setIsUploadingCover(true);
    try {
      const res = await api.upload.uploadFile(file, "covers");
      setCoverPhotoUrl(res.url);
      await updateCurrentUser({ coverPhotoUrl: res.url });
      onProfileUpdate?.({ coverPhotoUrl: res.url });
      toast.success("Muqova rasmi muvaffaqiyatli yangilandi");
    } catch {
      toast.error("Muqova rasmini yuklashda xatolik yuz berdi");
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) {
        coverInputRef.current.value = "";
      }
    }
  };

  const handleRemoveCover = async () => {
    setIsUploadingCover(true);
    try {
      setCoverPhotoUrl("");
      await updateCurrentUser({ coverPhotoUrl: "" });
      onProfileUpdate?.({ coverPhotoUrl: "" });
      toast.success("Muqova rasmi olib tashlandi");
    } catch {
      toast.error("Muqovani o'chirishda xatolik yuz berdi");
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) {
        coverInputRef.current.value = "";
      }
    }
  };

  const handleFollow = () => {
    if (isSelfUser) {
      toast.error("O‘zingizni kuzata olmaysiz");
      return;
    }
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
        : `https://gogetters.uz/profile/${profile.handle}`;

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      toast.success(t("profile.profileCopied"));
    } else {
      toast.info(t("common.linkCopied"));
    }
  };

  return (
    <header className="bg-transparent rounded-2xl overflow-hidden border-b border-slate-100 dark:border-slate-800/80 pb-4">
      {/* Cover Photo Banner */}
      <div className="relative h-36 sm:h-48 w-full bg-gradient-to-r from-slate-900 via-zinc-800 to-slate-800 overflow-hidden select-none group">
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          onChange={handleCoverUpload}
          className="hidden"
        />

        {coverPhotoUrl ? (
          <img
            src={coverPhotoUrl}
            alt={`${profile.name} cover`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-700 via-slate-900 to-black opacity-90 flex items-center justify-center">
            <div className="text-white/10 text-4xl font-black tracking-widest uppercase select-none font-mono">
              {profile.handle}
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

        {isSelfUser && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
            <button
              type="button"
              disabled={isUploadingCover}
              onClick={() => coverInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer opacity-90 hover:opacity-100 shadow-sm disabled:opacity-50"
            >
              {isUploadingCover ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Yuklanmoqda...</span>
                </>
              ) : (
                <>
                  <Camera size={14} />
                  <span>{coverPhotoUrl ? "Muqovani almashtirish" : "Muqova qo‘yish"}</span>
                </>
              )}
            </button>
            {coverPhotoUrl && !isUploadingCover && (
              <button
                type="button"
                onClick={handleRemoveCover}
                title="Muqova rasmini olib tashlash"
                className="p-1.5 rounded-xl bg-black/60 hover:bg-rose-600 backdrop-blur-md text-white/80 hover:text-white transition-all cursor-pointer shadow-sm"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Profile Details Header */}
      <div className="px-4 sm:px-6 pb-5 pt-0">
        {/* Avatar Overlap & Action Buttons Row */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 -mt-12 sm:-mt-16 mb-4">
          {/* Avatar with authority ring */}
          <div className="relative shrink-0 select-none">
            <UserAvatar
              name={profile.name}
              avatarUrl={profile.avatarUrl}
              size="xl"
              className="w-20 h-20 sm:w-28 sm:h-28 ring-4 ring-white dark:ring-slate-900 shadow-md"
            />
            {profile.verified && (
              <span
                className="absolute bottom-0 right-0 p-0.5 rounded-full bg-white dark:bg-slate-900"
                title={t("common.verifiedAuthor")}
              >
                <VerifiedBadgeIcon size={20} className="text-slate-900 dark:text-slate-100" />
              </span>
            )}
          </div>

          {/* Right: Contextual Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto w-full sm:w-auto pt-2 sm:pt-0">
            {isSelfUser ? (
              <>
                <button
                  type="button"
                  onClick={onEditClick}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all cursor-pointer"
                >
                  <span>{t("profile.editProfile")}</span>
                </button>

                {/* Menu Button (Open Sheet/Modal) */}
                <button
                  type="button"
                  onClick={() => setIsMenuModalOpen(true)}
                  aria-label="Profil Menyusi"
                  title="Profil Menyusi"
                  className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Menu size={18} />
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  aria-label={t("profile.shareProfile")}
                  title={t("profile.shareProfile")}
                  className={`p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                    isSharing ? "scale-95 text-slate-950 dark:text-white" : ""
                  }`}
                >
                  <ShareIcon size={16} />
                </button>

                {/* Profile Menu Modal */}
                <ProfileMenuModal
                  isOpen={isMenuModalOpen}
                  onClose={() => setIsMenuModalOpen(false)}
                />
              </>
            ) : (
              <>
                {/* Follow / Following Toggle */}
                <button
                  type="button"
                  onClick={handleFollow}
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                    isFollowing
                      ? "border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                      : "bg-slate-950 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-200 shadow-xs"
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <CheckIcon size={14} />
                      <span>{t("common.following")}</span>
                    </>
                  ) : (
                    <span>{t("common.follow")}</span>
                  )}
                </button>

                {/* Direct Message Link */}
                <Link
                  href={localePath(`/dashboard/messages?to=${profile.handle}`)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  title={t("nav.messages")}
                >
                  <MessageIcon size={15} />
                  <span>{t("nav.messages")}</span>
                </Link>

                {/* Share button */}
                <button
                  type="button"
                  onClick={handleShare}
                  aria-label={t("profile.shareProfile")}
                  className={`p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                    isSharing ? "scale-95 text-slate-950 dark:text-white" : ""
                  }`}
                >
                  <ShareIcon size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Primary Identity Info */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">
              {profile.name}
            </h1>
            <span className="text-xs text-slate-400 font-mono">
              {profile.handle}
            </span>
          </div>

          <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
            {profile.role}
          </p>

          {/* Location, Joined & Social Links */}
          <div className="flex items-center gap-3.5 mt-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
            {profile.location && (
              <div className="flex items-center gap-1 font-medium">
                <span>📍 {profile.location}</span>
              </div>
            )}
            {profile.joinedDate && (
              <div className="flex items-center gap-1 font-medium text-slate-400">
                <span>🗓️ {profile.joinedDate}</span>
              </div>
            )}
            {profile.socialLinks?.github && (
              <a
                href={profile.socialLinks.github}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-950 dark:hover:text-white font-semibold flex items-center gap-1"
                title="GitHub"
              >
                <span>GitHub</span>
              </a>
            )}
            {profile.socialLinks?.linkedin && (
              <a
                href={profile.socialLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-950 dark:hover:text-white font-semibold flex items-center gap-1"
                title="LinkedIn"
              >
                <span>LinkedIn</span>
              </a>
            )}
            {profile.socialLinks?.twitter && (
              <a
                href={profile.socialLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-950 dark:hover:text-white font-semibold flex items-center gap-1"
                title="Twitter / X"
              >
                <span>Twitter</span>
              </a>
            )}
            {(profile.socialLinks?.website || profile.website) && (
              <a
                href={profile.socialLinks?.website || profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline flex items-center gap-1 text-slate-900 dark:text-slate-100 font-semibold"
              >
                <span>🌐 {(profile.socialLinks?.website || profile.website || "").replace(/^https?:\/\//, "")}</span>
              </a>
            )}
          </div>
        </div>

      {/* 2. Core Perspective (Bio) */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
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
    </div>
  </header>
  );
}
