"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { toast } from "@/components/ui/toast";
import { Check, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const { session, isLoaded, updateCurrentUser } = useAuth();

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
      toast.error("Ismingizni kiriting");
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
      toast.success("Sozlamalar muvaffaqiyatli saqlandi");
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      toast.error("Sozlamalarni saqlashda xatolik yuz berdi");
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
          Tizim sozlamalari
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Profilingiz, til va maxfiylik parametrlarini boshqaring.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* 1. Hisob ma'lumotlari */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 sm:p-4 space-y-3 shadow-2xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Hisob ma’lumotlari
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                To‘liq ism
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="To‘liq ismingiz"
                className="w-full h-8 px-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Foydalanuvchi nomi
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
                  title="Foydalanuvchi nomi o‘zgarmas identifikator hisoblanadi"
                  className="w-full h-8 pl-6 pr-2.5 text-xs bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-md text-slate-500 dark:text-slate-400 cursor-not-allowed select-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kasb / Faoliyat sohasi
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Masalan: Startap asoschisi & Muhandis"
                className="w-full h-8 px-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Telefon raqam
              </label>
              <input
                type="text"
                value={phone}
                disabled
                readOnly
                title="Bog‘langan telefon raqami"
                className="w-full h-8 px-2.5 text-xs bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-md text-slate-500 dark:text-slate-400 cursor-not-allowed select-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Qisqacha bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              placeholder="O‘zingiz haqingizda qisqacha ma’lumot..."
              className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400 resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* 2. Til va Alifbo sozlamalari */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 sm:p-4 space-y-3 shadow-2xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Til va Imlo tizimi
          </h3>

          <div className="space-y-2">
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              Afzal ko‘rilgan alifbo (avtomatik transliteratsiya):
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`p-2.5 rounded-md border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                  alphabet === "latin"
                    ? "border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-800/80 font-semibold text-slate-900 dark:text-slate-100"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <span>O‘zbekcha (Lotin)</span>
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
                <span>Ўзбекча (Кирилл)</span>
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
              Matnlar siz tanlagan alifboga avtomatik moslashtirib ko‘rsatiladi.
            </p>
          </div>
        </div>

        {/* 3. Maxfiylik va Xavfsizlik */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 sm:p-4 space-y-3 shadow-2xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Maxfiylik
          </h3>

          <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
            <label className="flex items-center justify-between cursor-pointer">
              <span>
                Shaxsiy xabarlarni faqat kuzatuvchilardan qabul qilish
              </span>
              <input
                type="checkbox"
                defaultChecked
                className="rounded text-slate-900 focus:ring-slate-400 h-4 w-4"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span>Karmam va reytingim profilimda ko‘rinib tursin</span>
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
                <span>Saqlanmoqda...</span>
              </>
            ) : (
              <span>O‘zgarishlarni saqlash</span>
            )}
          </button>

          {savedSuccess && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in">
              <Check size={14} />
              <span>Sozlamalar muvaffaqiyatli saqlandi!</span>
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
