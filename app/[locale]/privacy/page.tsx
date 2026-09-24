"use client";

import React from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export default function PrivacyPage() {
  const { t, locale, localePath } = useI18n();

  const content = {
    uz: {
      title: "Maxfiylik Siyosati",
      date: "Oxirgi yangilanish: 2026-yil",
      intro: "«Fikr» platformasi foydalanuvchilarning shaxsiy ma’lumotlari daxlsizligini oliy darajada qadrlaydi. Biz sizning ma’lumotlaringizni uchinchi shaxslarga sotmaymiz va marketing maqsadlarida suiiste’mol qilmaymiz.",
      sections: [
        {
          title: "1. To‘planadigan ma’lumotlar",
          desc: "Biz faqat hisob ochish va xizmatdan foydalanish uchun zarur bo‘lgan telefon raqam, ism, faoliyat sohasi hamda siz ixtiyoriy ravishda e’lon qilgan fikrlar va mulohazalarni saqlaymiz.",
        },
        {
          title: "2. Xavfsizlik va Himoya",
          desc: "Barcha ma’lumotlar zamonaviy shifrlash protokollari orqali himoyalanadi va ruxsatsiz kirishlardan to‘liq asraladi.",
        },
      ],
    },
    ru: {
      title: "Политика Конфиденциальности",
      date: "Последнее обновление: 2026 г.",
      intro: "Платформа «Fikr» ставит конфиденциальность пользователей на первое место. Мы никогда не продаём ваши персональные данные третьим лицам и не используем их в агрессивных маркетинговых целях.",
      sections: [
        {
          title: "1. Собираемые данные",
          desc: "Мы собираем исключительно минимально необходимые сведения: номер телефона для авторизации, указанные вами имя и сферу деятельности, а также опубликованные вами мысли и комментарии.",
        },
        {
          title: "2. Защита и безопасность",
          desc: "Все соединения защищены с помощью шифрования (TLS/HTTPS). Доступ к данным строго разграничен.",
        },
      ],
    },
    en: {
      title: "Privacy Policy",
      date: "Last updated: 2026",
      intro: "Fikr is built on intellectual trust and digital privacy. We do not sell personal data to third parties nor do we exploit user activities for unsolicited advertising.",
      sections: [
        {
          title: "1. Information We Collect",
          desc: "We collect only what is necessary to authenticate and serve you: phone number, profile name, professional domain, and public contributions you author.",
        },
        {
          title: "2. Data Protection",
          desc: "All network traffic is encrypted via TLS/HTTPS, and credentials are protected with industry-standard cryptographic measures.",
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
