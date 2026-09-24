import React from "react";
import Link from "next/link";

export default function GuidelinesPage() {
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
          Hamjamiyat Qoidalari
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Madaniyatli va intellektual muloqot mezonlari
        </p>

        <div className="space-y-3 text-xs sm:text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
          <p>
            «Fikr» — shov-shuv va haqoratlardan xoli, ilm, tajriba va konstruktiv tahlillar almashish
            makoni. Barcha a’zolar quyidagi qoidalarga rioya qilishi lozim:
          </p>

          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 pt-2">
            1. Shaxsiyatga tegmaslik
          </h2>
          <p>
            Har qanday mavzuda bahslashish mumkin, lekin shaxsni haqorat qilish, kamsitish yoki guruhlarga
            nisbatan nafrat uyg‘otish qat’iyan man etiladi.
          </p>

          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 pt-2">
            2. Asoslangan fikr va dalillar
          </h2>
          <p>
            Fikringizni asoslash uchun ishonchli manbalar, ilmiy dalillar yoki shaxsiy amaliy tajribani
            keltirish tavsiya etiladi.
          </p>

          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 pt-2">
            3. Spamsiz muhit
          </h2>
          <p>
            Keraksiz reklama havolalari yoki o‘zaro kelishilgan sun’iy layklar tarmog‘i bloklanadi.
          </p>
        </div>
      </div>
    </div>
  );
}
