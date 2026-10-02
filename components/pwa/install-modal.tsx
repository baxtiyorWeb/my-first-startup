"use client";

import React from "react";
import Image from "next/image";
import { X, Smartphone, Download, Share, PlusSquare, Bell, Zap, CheckCircle2 } from "lucide-react";
import { usePwaInstall } from "./pwa-install-context";

export function InstallModal() {
  const { isModalOpen, closeInstallModal, promptInstall, isIOS, isInstalled } = usePwaInstall();

  if (!isModalOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={closeInstallModal}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Yopish"
        >
          <X size={18} />
        </button>

        {/* Header Icon + Brand */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-md bg-slate-950 shrink-0 border border-slate-700/50">
            <Image
              src="/logo.png"
              alt="The Go-getters"
              fill
              className="object-cover"
              sizes="48px"
            />
          </div>
          <div>
            <h2 id="install-modal-title" className="text-lg font-bold tracking-tight">
              The Go-getters ilovasi
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Telefoningizga o‘rnating va barcha qulayliklardan foydalaning
            </p>
          </div>
        </div>

        {/* Benefits list */}
        <div className="grid grid-cols-3 gap-2.5 my-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-center">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1.5">
              <Zap size={16} />
            </div>
            <span className="text-[11px] font-semibold">Tezkor</span>
            <span className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">Bir zumda ochiladi</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1.5">
              <Bell size={16} />
            </div>
            <span className="text-[11px] font-semibold">Bildirishnoma</span>
            <span className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">Xabarlarni o‘tkazmang</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1.5">
              <Smartphone size={16} />
            </div>
            <span className="text-[11px] font-semibold">To‘liq ekran</span>
            <span className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">Mobil ilova kabi</span>
          </div>
        </div>

        {/* iOS vs Android / Desktop Instructions */}
        {isInstalled ? (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm">
            <CheckCircle2 className="shrink-0" size={20} />
            <p className="font-medium">
              Ilova telefoningizga muvaffaqiyatli o‘rnatilgan! Bosh ekrandagi belgi orqali kirishingiz mumkin.
            </p>
          </div>
        ) : isIOS ? (
          <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs">
            <p className="font-semibold text-slate-700 dark:text-slate-200">
              iPhone yoki iPad da o‘rnatish:
            </p>
            <ol className="space-y-2 text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  Safari brauzeri pastidagi <strong className="text-slate-800 dark:text-slate-200 font-semibold inline-flex items-center gap-1 mx-1"><Share size={12} /> Ulashish (Share)</strong> tugmasini bosing.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  Pastga surib, <strong className="text-slate-800 dark:text-slate-200 font-semibold inline-flex items-center gap-1 mx-1"><PlusSquare size={12} /> Bosh ekranga qo‘shish</strong> ni tanlang.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  Yuqori o‘ng burchakdagi <strong className="text-slate-800 dark:text-slate-200 font-semibold">"Qo‘shish" (Add)</strong> tugmasini bosing.
                </span>
              </li>
            </ol>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={promptInstall}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg active:scale-[0.99] cursor-pointer"
            >
              <Download size={18} />
              Ilovani telefon / kompyuterga o‘rnatish
            </button>
            <p className="text-[11px] text-center text-slate-500 dark:text-slate-400">
              Hech qanday og‘ir fayl yuklanmaydi, joy egallamaydi va bir zumda o‘rnatiladi.
            </p>
          </div>
        )}

        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-end">
          <button
            type="button"
            onClick={closeInstallModal}
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Tushundim, yopish
          </button>
        </div>
      </div>
    </div>
  );
}
