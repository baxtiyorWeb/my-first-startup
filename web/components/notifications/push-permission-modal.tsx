"use client";

import { useEffect, useState } from "react";
import { Bell, X, BellRing } from "lucide-react";
import { promptPushNotification, getPushPermissionStatus } from "./onesignal-initializer";

const STORAGE_KEY = "geters_push_prompt_shown";
// Delay before showing the modal (ms) — give user time to load the page
const SHOW_DELAY_MS = 8000;

/**
 * PushPermissionModal
 * Shows once per browser session for logged-in users who have not yet
 * granted or denied push notification permission.
 * Stored in localStorage so it won't re-appear after the user dismisses it.
 */
export function PushPermissionModal() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // SSR guard
    if (typeof window === "undefined") return;

    // 1. Already shown before → skip
    if (localStorage.getItem(STORAGE_KEY) === "1") return;

    // 2. Already have a permission decision → skip
    const currentStatus = getPushPermissionStatus();
    if (currentStatus === "granted" || currentStatus === "denied") {
      localStorage.setItem(STORAGE_KEY, "1");
      return;
    }

    // 3. Show after a short delay so the page loads first
    const timer = setTimeout(() => {
      // Re-check in case status changed during delay
      const statusNow = getPushPermissionStatus();
      if (statusNow === "default") {
        setVisible(true);
      } else {
        localStorage.setItem(STORAGE_KEY, "1");
      }
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  const handleEnable = async () => {
    setLoading(true);
    try {
      await promptPushNotification();
    } finally {
      setLoading(false);
      dismiss();
    }
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-[min(92vw,420px)]
                 bg-[#16181c] border border-slate-700/60 rounded-2xl shadow-2xl
                 animate-in slide-in-from-bottom-4 fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-label="Push bildirishnomalarni yoqish"
    >
      {/* Close */}
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 text-slate-400 hover:text-slate-200 transition-colors"
        aria-label="Yopish"
      >
        <X size={18} />
      </button>

      <div className="flex items-start gap-4 p-5 pb-4">
        {/* Icon */}
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center">
          <BellRing size={22} className="text-indigo-400" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 pr-5">
          <p className="text-sm font-semibold text-white leading-snug">
            Yangiliklar va postlardan xabardor bo'ling
          </p>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            Kimdir post yozsa, sizga like qo'ysa yoki xabar yuborghanda — bildirishnoma keladi.
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 px-5 pb-5">
        <button
          onClick={handleEnable}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                     bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60
                     text-white text-sm font-medium transition-colors"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <Bell size={15} />
          )}
          {loading ? "Yuklanmoqda…" : "Yoqish"}
        </button>
        <button
          onClick={dismiss}
          className="flex-1 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500
                     text-slate-400 hover:text-slate-200 text-sm font-medium transition-colors"
        >
          Keyinroq
        </button>
      </div>
    </div>
  );
}
