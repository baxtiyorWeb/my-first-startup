"use client";

import React from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export default function GuidelinesPage() {
  const { t, locale, localePath } = useI18n();

  const content = {
    uz: {
      title: "Hamjamiyat Qoidalari",
      subtitle: "Madaniyatli va intellektual muloqot mezonlari",
      intro: "«Fikr» — shov-shuv va haqoratlardan xoli, ilm, tajriba va konstruktiv tahlillar almashish makoni. Barcha a’zolar quyidagi qoidalarga rioya qilishi lozim:",
      rules: [
        {
          title: "1. Shaxsiyatga tegmaslik",
          desc: "Har qanday mavzuda bahslashish mumkin, lekin shaxsni haqorat qilish, kamsitish yoki guruhlarga nisbatan nafrat uyg‘otish qat’iyan man etiladi.",
        },
        {
          title: "2. Asoslangan fikr va dalillar",
          desc: "Fikringizni asoslash uchun ishonchli manbalar, ilmiy dalillar yoki shaxsiy amaliy tajribani keltirish tavsiya etiladi.",
        },
        {
          title: "3. Spamsiz muhit",
          desc: "Keraksiz reklama havolalari yoki o‘zaro kelishilgan sun’iy layklar tarmog‘i bloklanadi.",
        },
      ],
    },
    ru: {
      title: "Правила Сообщества",
      subtitle: "Стандарты интеллектуального и уважительного диалога",
      intro: "«Fikr» — это пространство без информационного шума и оскорблений, созданное для обмена знаниями, опытом и конструктивным анализом.",
      rules: [
        {
          title: "1. Уважение к личности",
          desc: "Дискуссия на любые темы приветствуется, однако оскорбления, переход на личности, дискриминация и разжигание розни строго запрещены.",
        },
        {
          title: "2. Аргументированность",
          desc: "Подкрепляйте свои суждения достоверными источниками, научными фактами или проверенным практическим опытом.",
        },
        {
          title: "3. Пространство без спама",
          desc: "Рекламные ссылки, бессодержательные публикации и накрутка активности приводят к блокировке аккаунта.",
        },
      ],
    },
    en: {
      title: "Community Guidelines",
      subtitle: "Standards for civilized, intellectual discourse",
      intro: "Fikr is a sanctuary for thoughtful ideas, domain expertise, and analytical dialogue. All contributors are expected to honor these core principles:",
      rules: [
        {
          title: "1. Mutual Respect",
          desc: "Rigorous debate is welcomed, but personal attacks, harassment, discrimination, or hate speech are strictly prohibited.",
        },
        {
          title: "2. Evidence-Based Thinking",
          desc: "Substantiate your insights with verifiable sources, empirical data, or concrete practical experience.",
        },
        {
          title: "3. Spam-Free Environment",
          desc: "Unsolicited promotional links, automated content, and artificial engagement manipulation will result in permanent suspension.",
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
          {current.subtitle}
        </p>

        <div className="space-y-3 text-xs sm:text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
          <p>{current.intro}</p>

          {current.rules.map((rule, idx) => (
            <div key={idx} className="pt-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {rule.title}
              </h2>
              <p className="mt-0.5 text-slate-600 dark:text-slate-400">
                {rule.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
