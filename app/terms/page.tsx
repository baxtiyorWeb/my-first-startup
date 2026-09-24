import React from "react";
import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 sm:p-8 shadow-2xs space-y-4">
        <Link
          href="/dashboard"
          className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 inline-flex items-center gap-1 mb-2 transition-colors"
        >
          ← Bosh sahifaga qaytish
        </Link>

        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
          Foydalanish Shartlari
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Oxirgi yangilanish: 2026-yil 1-fevral
        </p>

        <div className="space-y-3 text-xs sm:text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
          <p>
            «Fikr» platformasiga xush kelibsiz. Ushbu platformadan foydalanish orqali siz quyidagi
            asosiy qoidalarga rozilik bildirasiz.
          </p>

          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 pt-2">
            1. Mas’uliyat
          </h2>
          <p>
            Foydalanuvchi o‘zi joylagan barcha fikr, izoh va ma’lumotlarning qonuniyligi va haqqoniyligi
            uchun shaxsan javobgardir.
          </p>

          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 pt-2">
            2. Intellektual mulk
          </h2>
          <p>
            Siz yaratgan original kontent sizning mualliflik huquqingizda qoladi. Boshqa manbalardan
            foydalanganda muallif va manbani ko‘rsatish shart.
          </p>
        </div>
      </div>
    </div>
  );
}
