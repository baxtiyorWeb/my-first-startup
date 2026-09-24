"use client";

import React from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export default function HelpPage() {
  const { t, locale, localePath } = useI18n();

  const faqs = {
    uz: [
      {
        q: "Karma va reputatsiya tizimi qanday ishlaydi?",
        a: "Siz ulashgan fikrlar boshqa foydalanuvchilar tomonidan foydali deb topilganda, karmangiz oshadi. Bu sizning profilingiz ishonchliligini belgilaydi.",
      },
      {
        q: "Lotin va Kirill alifbosini qanday o‘zgartirish mumkin?",
        a: "Sozlamalar bo‘limidagi 'Til va Imlo tizimi' orqali o‘zingizga qulay alifboni tanlang, tizim matnlarni avtomatik tarzda o‘giradi.",
      },
      {
        q: "Moviy tasdiqlash belgisi (badge) qanday olinadi?",
        a: "O‘z sohangizdagi ekspertlikni tasdiqlovchi portfolio, ilmiy daraja yoki startapingizni ko‘rsatgan holda ariza topshirishingiz mumkin.",
      },
    ],
    ru: [
      {
        q: "Как работает система кармы и репутации?",
        a: "Когда ваши мысли и аналитические заметки оцениваются другими участниками как полезные, ваша карма растёт. Это отражает уровень доверия к вашему профилю.",
      },
      {
        q: "Как изменить язык интерфейса или алфавит?",
        a: "В разделе «Настройки» выберите удобный язык интерфейса и предпочитаемый алфавит (для узбекского языка).",
      },
      {
        q: "Как получить значок подтверждённого автора?",
        a: "Вы можете подать заявку, подтвердив экспертизу в своей сфере: портфолио, учёная степень, публикации или основанный стартап.",
      },
    ],
    en: [
      {
        q: "How does the karma and reputation system work?",
        a: "When your thoughts and analyses are found valuable by fellow thinkers, your karma increases, establishing your credibility across the network.",
      },
      {
        q: "How can I change the interface language or script?",
        a: "Navigate to Settings and select your preferred language and transliteration preferences under Language & Writing System.",
      },
      {
        q: "How to receive a verified contributor badge?",
        a: "You can apply for verification by submitting proof of domain expertise, such as research publications, professional credentials, or startup leadership.",
      },
    ],
  };

  const currentFaqs = faqs[locale] || faqs.uz;

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
          {t("footer.help")}
        </h1>

        <div className="space-y-3 pt-2">
          {currentFaqs.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40"
            >
              <h2 className="text-xs sm:text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                {item.q}
              </h2>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {item.a}
              </p>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
          support@fikr.uz
        </div>
      </div>
    </div>
  );
}
