"use client";

import React from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export default function TermsPage() {
  const { t, locale, localePath } = useI18n();

  const content = {
    uz: {
      title: "Foydalanish Shartlari",
      date: "Kuchga kirish sanasi: 2026-yil",
      intro: "«Fikr» ijtimoiy-intellektual tarmog‘iga a’zo bo‘lish orqali siz quyidagi shartlarga rozilik bildirasiz:",
      sections: [
        {
          title: "1. Hisobdan foydalanish",
          desc: "Har bir foydalanuvchi o‘z hisobi xavfsizligi va undan amalga oshirilgan harakatlar uchun shaxsan javobgardir. Begona shaxslar nomidan soxta hisob ochish taqiqlanadi.",
        },
        {
          title: "2. Mualliflik huquqi",
          desc: "Siz platformada e’lon qilgan o‘z mualliflik ishlaringizning to‘laqonli egasi bo‘lib qolasiz. Boshqalarning intellektual mulkini o‘zlashtirib olish qat’iyan man etiladi.",
        },
      ],
    },
    ru: {
      title: "Условия Использования",
      date: "Дата вступления в силу: 2026 г.",
      intro: "Присоединяясь к интеллектуальной сети «Fikr», вы подтверждаете своё согласие со следующими условиями:",
      sections: [
        {
          title: "1. Использование аккаунта",
          desc: "Каждый пользователь несёт персональную ответственность за действия, совершённые с его аккаунта. Создание поддельных профилей строго запрещено.",
        },
        {
          title: "2. Авторские права",
          desc: "Вы сохраняете авторство на все созданные вами публикации. Плагиат и присвоение чужой интеллектуальной собственности недопустимы.",
        },
      ],
    },
    en: {
      title: "Terms of Service",
      date: "Effective date: 2026",
      intro: "By accessing and using Fikr, you acknowledge and agree to the following operational terms:",
      sections: [
        {
          title: "1. Account Responsibility",
          desc: "You are solely responsible for activities occurring under your authenticated credentials. Impersonating other individuals or entities is strictly prohibited.",
        },
        {
          title: "2. Intellectual Property",
          desc: "You retain full intellectual ownership of your original ideas and writings. Plagiarism and copyright infringement are grounds for immediate account closure.",
        },
      ],
    },
  };

  const current = content[locale] || content.uz;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 sm:p-8 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href={localePath("/dashboard")}
            className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 inline-flex items-center gap-1 transition-colors"
          >
            ← {t("create.backToDashboard")}
          </Link>
          <LanguageSwitcher variant="header" />
        </div>

        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
          {current.title}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {current.date}
        </p>

        <div className="space-y-3 text-xs sm:text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
          <p>{current.intro}</p>

          {current.sections.map((sec, idx) => (
            <div key={idx} className="pt-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {sec.title}
              </h2>
              <p className="mt-0.5 text-slate-600 dark:text-slate-400">
                {sec.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
