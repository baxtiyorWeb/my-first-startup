"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { toast } from "@/components/ui/toast";
import { Check, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { LOCALES, LOCALES_META, type Locale } from "@/lib/i18n/config";

export default function SettingsPage() {
  const { session, isLoaded, updateCurrentUser } = useAuth();
  const { t, locale, switchLocale } = useI18n();

  const [prevUserId, setPrevUserId] = useState(session.user.id);
  const [name, setName] = useState(session.user.name || "");
  const [handle, setHandle] = useState(
    session.user.handle.replace(/^@/, "") || ""
  );
  const [role, setRole] = useState(session.user.role || "");
  const [phone, setPhone] = useState(session.phoneNumber || "");
  const [bio, setBio] = useState(session.user.bio || "");
  const [alphabet, setAlphabet] = useState<string>(() => {
    if (typeof window === "undefined") return "latin";
    try {
      const saved = localStorage.getItem("fikr_alphabet");
      return saved === "cyrillic" || saved === "latin" ? saved : "latin";
    } catch {
      return "latin";
    }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state during render when session loads with actual user data
  if (prevUserId !== session.user.id && session.user.id) {
    setPrevUserId(session.user.id);
    setName(session.user.name || "");
    setHandle(session.user.handle.replace(/^@/, "") || "");
    setRole(session.user.role || "");
    setPhone(session.phoneNumber || "");
    setBio(session.user.bio || "");
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t("settings.nameRequired"));
      return;
    }

    setIsSubmitting(true);
    try {
      await updateCurrentUser({
        name: name.trim(),
        role: role.trim(),
        bio: bio.trim(),
      });

      localStorage.setItem("fikr_alphabet", alphabet);
      setSavedSuccess(true);
      toast.success(t("settings.successSaved"));
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      toast.error(t("settings.errorSaved"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="space-y-4 w-full animate-pulse">
        <div className="h-10 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-64 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800" />
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
          {t("settings.title")}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t("settings.subtitle")}
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* 1. Hisob ma'lumotlari */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 sm:p-4 space-y-3 shadow-2xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t("settings.accountSection")}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("settings.fullName")}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("settings.fullNamePlaceholder")}
                className="w-full h-8 px-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("settings.username")}
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 select-none">
                  @
                </span>
                <input
                  type="text"
                  value={handle}
                  disabled
                  readOnly
                  title={t("settings.usernameHint")}
                  className="w-full h-8 pl-6 pr-2.5 text-xs bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-md text-slate-500 dark:text-slate-400 cursor-not-allowed select-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("settings.role")}
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder={t("settings.rolePlaceholder")}
                className="w-full h-8 px-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("settings.phone")}
              </label>
              <input
                type="text"
                value={phone}
                disabled
                readOnly
                title={t("settings.phoneHint")}
                className="w-full h-8 px-2.5 text-xs bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-md text-slate-500 dark:text-slate-400 cursor-not-allowed select-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("settings.bio")}
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              placeholder={t("settings.bioPlaceholder")}
              className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400 resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* 2. Til va Alifbo sozlamalari */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 sm:p-4 space-y-4 shadow-2xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t("settings.languageSection")}
          </h3>

          {/* 3 ta Til Tanlash */}
          <div className="space-y-2">
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              {t("settings.languageSelectLabel")}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {LOCALES.map((loc) => {
                const meta = LOCALES_META[loc];
                const isSelected = locale === loc;
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => switchLocale(loc)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all ${
                      isSelected
                        ? "border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-800/90 font-semibold text-slate-950 dark:text-white ring-1 ring-slate-900 dark:ring-slate-100 shadow-xs"
                        : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg select-none">{meta.flag}</span>
                      <div className="text-left">
                        <div className="text-xs font-semibold leading-tight">
                          {meta.nativeName}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {meta.label}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <Check size={15} className="text-slate-900 dark:text-white shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400">
              {t("settings.languageSelectHint")}
            </p>
          </div>

          {/* Alifbo tanlash (faqat O'zbek tili uchun) */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              {t("settings.alphabetLabel")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`p-2.5 rounded-md border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                  alphabet === "latin"
                    ? "border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-800/80 font-semibold text-slate-900 dark:text-slate-100"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <span>{t("settings.alphabetLatin")}</span>
                <input
                  type="radio"
                  name="alphabet"
                  value="latin"
                  checked={alphabet === "latin"}
                  onChange={() => setAlphabet("latin")}
                  className="sr-only"
                />
              </label>

              <label
                className={`p-2.5 rounded-md border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                  alphabet === "cyrillic"
                    ? "border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-800/80 font-semibold text-slate-900 dark:text-slate-100"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <span>{t("settings.alphabetCyrillic")}</span>
                <input
                  type="radio"
                  name="alphabet"
                  value="cyrillic"
                  checked={alphabet === "cyrillic"}
                  onChange={() => setAlphabet("cyrillic")}
                  className="sr-only"
                />
              </label>
            </div>
            <p className="text-[10px] text-slate-400">
              {t("settings.alphabetHint")}
            </p>
          </div>
        </div>

        {/* 3. Maxfiylik va Xavfsizlik */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 sm:p-4 space-y-3 shadow-2xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t("settings.privacySection")}
          </h3>

          <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
            <label className="flex items-center justify-between cursor-pointer">
              <span>{t("settings.privacyMessages")}</span>
              <input
                type="checkbox"
                defaultChecked
                className="rounded text-slate-900 focus:ring-slate-400 h-4 w-4"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span>{t("settings.privacyKarma")}</span>
              <input
                type="checkbox"
                defaultChecked
                className="rounded text-slate-900 focus:ring-slate-400 h-4 w-4"
              />
            </label>
          </div>
        </div>

        {/* Save button & success message */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>{t("settings.savingChanges")}</span>
              </>
            ) : (
              <span>{t("settings.saveChanges")}</span>
            )}
          </button>

          {savedSuccess && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in">
              <Check size={14} />
              <span>{t("settings.successSaved")}</span>
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
