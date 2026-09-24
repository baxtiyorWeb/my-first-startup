"use client";

import React, { useState, useEffect, useRef } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { CloseIcon, CheckIcon } from "@/components/icons";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { compressAvatarImage } from "@/lib/image-compressor";
import type { UserProfile } from "@/types/social";

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
  const [name, setName] = useState(profile.name);
  const [role, setRole] = useState(profile.role);
  const [bio, setBio] = useState(profile.bio);
  const [location, setLocation] = useState(profile.location || "");
  const [website, setWebsite] = useState(profile.website || "");

  // Local-only avatar selection before saving (prevents Bunny.net costs on cancelled/changed images)
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState(profile.avatarUrl || "");
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [isPendingDelete, setIsPendingDelete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Clean up object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
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

  // Local file selection (0 network requests, 0 Bunny storage cost!)
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Rasm hajmi 10MB dan oshmasligi kerak");
      return;
    }

    // Clean up previous preview URL if it was a local blob
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    // Create instant local browser preview
    const localUrl = URL.createObjectURL(file);
    objectUrlRef.current = localUrl;
    setPreviewAvatarUrl(localUrl);
    setSelectedAvatarFile(file);
    setIsPendingDelete(false);

    toast.info("Rasm tanlandi. Saqlash uchun 'O‘zgarishlarni saqlash' tugmasini bosing");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Ism bo‘sh bo‘lishi mumkin emas");
      return;
    }

    setIsSaving(true);
    try {
      let finalAvatarUrl: string | undefined = profile.avatarUrl || undefined;

      // Only upload to Bunny.net when the user actually commits by saving!
      if (selectedAvatarFile) {
        // 1. Compress image in browser (reduces ~5MB photo to ~50KB WebP with 0 quality loss)
        const compressedFile = await compressAvatarImage(selectedAvatarFile, 400, 0.85);

        // 2. Upload compressed file to Bunny.net
        const result = await api.upload.uploadFile(compressedFile, "avatars");
        finalAvatarUrl = result.url;
      } else if (isPendingDelete) {
        finalAvatarUrl = "";
      }

      await onSave({
        name: name.trim(),
        role: role.trim(),
        bio: bio.trim(),
        location: location.trim() || undefined,
        website: website.trim() || undefined,
        avatarUrl: finalAvatarUrl,
      });

      toast.success("Profil ma’lumotlari muvaffaqiyatli saqlandi");
      onClose();
    } catch {
      toast.error("Profilni saqlashda xatolik yuz berdi");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <h2
          id="edit-profile-title"
          className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100"
        >
          Profilni tahrirlash
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Yopish"
          className="p-1 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <CloseIcon size={18} />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Avatar Local Preview & Upload Section */}
        <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="relative group w-16 h-16 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 border-2 border-white dark:border-slate-800 shadow-sm">
            {previewAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewAvatarUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg font-bold text-slate-600 dark:text-slate-300">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            {isSaving && selectedAvatarFile && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Profil rasmi
              </p>
              {selectedAvatarFile && (
                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                  Lokal tanlandi (saqlanmagan)
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              JPG, PNG yoki WebP. Saqlashda avtomatik siqiladi.
            </p>
            <div className="mt-2 flex items-center gap-2">
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
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors cursor-pointer shadow-2xs"
              >
                <Camera size={13} />
                <span>{previewAvatarUrl ? "Boshqa rasm tanlash" : "Rasm tanlash"}</span>
              </button>
              {previewAvatarUrl && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleRemoveAvatar}
                  className="inline-flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer transition-colors"
                >
                  <Trash2 size={12} />
                  <span>O‘chirish</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            To‘liq ism
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-9 px-3 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Mutaxassislik yoki faoliyat sohasi
          </label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Masalan: Senior Software Architect"
            className="w-full h-9 px-3 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Qarashlaringiz va qiziqishlaringiz (Bio)
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Platformadagi kuzatuvlaringiz, izlanishlaringiz haqida qisqacha..."
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

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-60"
          >
            <CheckIcon size={14} />
            <span>{isSaving ? "Siqilmoqda va saqlanmoqda..." : "O‘zgarishlarni saqlash"}</span>
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
    >
      <ProfileEditForm profile={profile} onClose={onClose} onSave={onSave} />
    </div>
  );
}
