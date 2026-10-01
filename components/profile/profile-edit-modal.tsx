"use client";

import React, { useState, useEffect, useRef } from "react";
import { Camera, Trash2, Dice5 } from "lucide-react";
import { CloseIcon, CheckIcon } from "@/components/icons";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { compressAvatarImage } from "@/lib/image-compressor";
import { generateRandomAvatar } from "@/lib/avatar";
import type { UserProfile, UserIntent } from "@/types/social";
import { useI18n } from "@/lib/i18n/context";
import { CustomSelect } from "@/components/ui/custom-select";
import { useAuth } from "@/components/auth/auth-context";

interface ProfileEditModalProps {
  isOpen: boolean;
  profile: UserProfile;
  onClose: () => void;
  onSave: (updatedProfile: Partial<UserProfile>) => void;
}

function ProfileEditForm({
  profile,
  onClose,
  onSave,
}: {
  profile: UserProfile;
  onClose: () => void;
  onSave: (updatedProfile: Partial<UserProfile>) => void;
}) {
  const { t } = useI18n();
  const { updateCurrentUser } = useAuth();

  const [name, setName] = useState(profile.name);
  const [role, setRole] = useState(profile.role);
  const [bio, setBio] = useState(profile.bio);
  const [location, setLocation] = useState(profile.location || "");
  const [website, setWebsite] = useState(profile.website || "");
  const [coverPhotoUrl, setCoverPhotoUrl] = useState(profile.coverPhotoUrl || "");
  const [intent, setIntent] = useState<UserIntent>(profile.intent || "none");

  // Local-only avatar & cover selection before saving
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState(
    () => profile.avatarUrl || generateRandomAvatar(profile.handle || profile.name)
  );
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [isPendingDelete, setIsPendingDelete] = useState(false);

  const [previewCoverUrl, setPreviewCoverUrl] = useState(profile.coverPhotoUrl || "");
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [isPendingCoverDelete, setIsPendingCoverDelete] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const coverObjectUrlRef = useRef<string | null>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      if (coverObjectUrlRef.current) {
        URL.revokeObjectURL(coverObjectUrlRef.current);
      }
    };
  }, []);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Rasm hajmi 10MB dan oshmasligi kerak");
      return;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const localUrl = URL.createObjectURL(file);
    objectUrlRef.current = localUrl;
    setPreviewAvatarUrl(localUrl);
    setSelectedAvatarFile(file);
    setIsPendingDelete(false);
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Rasm hajmi 10MB dan oshmasligi kerak");
      return;
    }

    if (coverObjectUrlRef.current) {
      URL.revokeObjectURL(coverObjectUrlRef.current);
    }

    const localUrl = URL.createObjectURL(file);
    coverObjectUrlRef.current = localUrl;
    setPreviewCoverUrl(localUrl);
    setSelectedCoverFile(file);
    setIsPendingCoverDelete(false);
  };

  const handleGenerateRandomAvatar = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setSelectedAvatarFile(null);
    setIsPendingDelete(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    const newAvatar = generateRandomAvatar();
    setPreviewAvatarUrl(newAvatar);
  };

  const handleRemoveAvatar = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setSelectedAvatarFile(null);
    setPreviewAvatarUrl("");
    setIsPendingDelete(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveCover = () => {
    if (coverObjectUrlRef.current) {
      URL.revokeObjectURL(coverObjectUrlRef.current);
      coverObjectUrlRef.current = null;
    }
    setSelectedCoverFile(null);
    setPreviewCoverUrl("");
    setIsPendingCoverDelete(true);
    if (coverFileInputRef.current) {
      coverFileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t("settings.nameRequired"));
      return;
    }

    setIsSaving(true);
    try {
      let finalAvatarUrl: string | undefined = profile.avatarUrl;

      if (isPendingDelete) {
        finalAvatarUrl = "";
      } else if (selectedAvatarFile) {
        const compressedBlob = await compressAvatarImage(selectedAvatarFile);
        const compressedFile = new File([compressedBlob], "avatar.webp", {
          type: "image/webp",
        });

        const uploadRes = await api.upload.uploadAvatar(compressedFile);
        finalAvatarUrl = uploadRes.url;
      } else if (previewAvatarUrl) {
        finalAvatarUrl = previewAvatarUrl;
      }

      let finalCoverUrl: string | undefined = profile.coverPhotoUrl;
      if (isPendingCoverDelete) {
        finalCoverUrl = "";
      } else if (selectedCoverFile) {
        const uploadRes = await api.upload.uploadFile(selectedCoverFile, "covers");
        finalCoverUrl = uploadRes.url;
      } else if (previewCoverUrl) {
        finalCoverUrl = previewCoverUrl;
      }

      await updateCurrentUser({
        name: name.trim(),
        role: role.trim(),
        bio: bio.trim(),
        location: location.trim() || undefined,
        website: website.trim() || undefined,
        avatarUrl: finalAvatarUrl,
        coverPhotoUrl: finalCoverUrl,
        intent,
      });

      onSave({
        name: name.trim(),
        role: role.trim(),
        bio: bio.trim(),
        location: location.trim() || undefined,
        website: website.trim() || undefined,
        avatarUrl: finalAvatarUrl || undefined,
        coverPhotoUrl: finalCoverUrl || undefined,
        intent,
      });

      toast.success(t("common.saved"));
      onClose();
    } catch {
      toast.error(t("settings.errorSaved"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h2
            id="edit-profile-title"
            className="text-base font-bold text-slate-950 dark:text-white"
          >
            {t("profile.editModal.title")}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t("profile.editModal.subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <CloseIcon size={18} />
        </button>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Avatar Upload / Preview */}
        <div className="flex items-center gap-4 pb-2 border-b border-slate-100 dark:border-slate-800/80">
          <div className="relative w-16 h-16 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xl flex items-center justify-center ring-2 ring-violet-500/20 dark:ring-violet-400/20 shadow-xs overflow-hidden shrink-0 select-none">
            {previewAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewAvatarUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
            )}
          </div>

          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
              {t("profile.editModal.name")}
            </span>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <button
                type="button"
                disabled={isSaving}
                onClick={handleGenerateRandomAvatar}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800/80 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/60 transition-colors cursor-pointer shadow-2xs"
                title="Yangi tasodifiy avatar yaratish"
              >
                <Dice5 size={13} className="text-violet-600 dark:text-violet-400" />
                <span>{t("profile.editModal.randomAvatar") || "Tasodifiy avatar"}</span>
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors cursor-pointer shadow-2xs"
              >
                <Camera size={13} />
                <span>
                  {previewAvatarUrl
                    ? t("profile.editModal.changePhoto") || "Rasm almashtirish"
                    : t("profile.editModal.uploadPhoto") || "Rasm yuklash"}
                </span>
              </button>
              {previewAvatarUrl && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleRemoveAvatar}
                  className="inline-flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer transition-colors px-1 py-1"
                >
                  <Trash2 size={12} />
                  <span>{t("common.delete")}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {t("profile.editModal.name")}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-9 px-3 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("profile.editModal.role")}
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Masalan: Senior Software Architect"
              className="w-full h-9 px-3 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <div className="pt-0.5">
            <CustomSelect<UserIntent>
              label={t("intents.label")}
              value={intent}
              onChange={setIntent}
              options={[
                { value: "none", label: t("intents.none"), description: t("intents.noneDesc") },
                { value: "looking_for_cofounder", label: t("intents.badge_cofounder"), description: t("intents.cofounderDesc") },
                { value: "open_to_work", label: t("intents.badge_open_to_work"), description: t("intents.openToWorkDesc") },
                { value: "raising_funds", label: t("intents.badge_raising"), description: t("intents.raisingDesc") },
                { value: "open_to_advisory", label: t("intents.badge_advisory"), description: t("intents.advisoryDesc") },
              ]}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {t("profile.editModal.bio")}
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full p-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400 resize-none leading-relaxed"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Hudud / Shahar
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Toshkent, O‘zbekiston"
              className="w-full h-9 px-3 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Veb-sayt yoki GitHub
            </label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="github.com/username"
              className="w-full h-9 px-3 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>

        {/* Cover Image Uploader */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Muqova rasmi (Cover Photo)
          </label>
          <input
            ref={coverFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleCoverChange}
          />
          <div className="relative h-24 w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center group">
            {previewCoverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewCoverUrl}
                alt="Cover Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs text-slate-400 font-medium">
                Muqova rasmi tanlanmagan
              </span>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => coverFileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-900 text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Camera size={13} />
                <span>Fayldan tanlash</span>
              </button>
              {previewCoverUrl && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleRemoveCover}
                  className="px-3 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>O‘chirish</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-60 shadow-xs"
          >
            <CheckIcon size={14} />
            <span>
              {isSaving
                ? t("profile.editModal.saving")
                : t("profile.editModal.save")}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}

export function ProfileEditModal({
  isOpen,
  profile,
  onClose,
  onSave,
}: ProfileEditModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
    >
      <ProfileEditForm
        profile={profile}
        onClose={onClose}
        onSave={onSave}
      />
    </div>
  );
}
