import React from "react";
import Link from "next/link";

export default function PrivacyPage() {
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
          Maxfiylik Siyosati
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Oxirgi yangilanish: 2026-yil 1-fevral
        </p>

        <div className="space-y-3 text-xs sm:text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
          <p>
            «Fikr» platformasi foydalanuvchilarning shaxsiy ma’lumotlari daxlsizligini oliy darajada
            qadrlaydi. Biz sizning ma’lumotlaringizni uchinchi shaxslarga sotmaymiz va marketing
            maqsadlarida suiiste’mol qilmaymiz.
          </p>

          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 pt-2">
            1. To‘planadigan ma’lumotlar
          </h2>
          <p>
            Biz faqat hisob ochish uchun zarur bo‘lgan ism, foydalanuvchi nomi, elektron pochta manzili
            hamda siz mustaqil ravishda ulashgan fikrlar va izohlarni saqlaymiz.
          </p>

          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 pt-2">
            2. Xavfsizlik va Himoya
          </h2>
          <p>
            Barcha ma’lumotlar shifrlangan holda (TLS / AES) uzatiladi va zamonaviy xavfsizlik
            standartlariga muvofiq saqlanadi.
          </p>
        </div>
      </div>
    </div>
  );
}
