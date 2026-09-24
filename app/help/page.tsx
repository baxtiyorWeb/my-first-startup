import React from "react";
import Link from "next/link";

export default function HelpPage() {
  const faqs = [
    {
      q: "Karma va reputatsiya tizimi qanday ishlaydi?",
      a: "Siz ulashgan fikrlar boshqa foydalanuvchilar tomonidan 'Foydali' deb topilganda, karmangiz oshadi. Bu sizning profilingiz ishonchliligini belgilaydi.",
    },
    {
      q: "Lotin va Kirill alifbosini qanday o‘zgartirish mumkin?",
      a: "Sozlamalar bo‘limidagi 'Til va Imlo tizimi' orqali o‘zingizga qulay alifboni tanlang, tizim matnlarni avtomatik tarzda o‘giradi.",
    },
    {
      q: "Moviy tasdiqlash belgisi (badge) qanday olinadi?",
      a: "O‘z sohangizdagi ekspertlikni tasdiqlovchi portfolio, ilmiy daraja yoki startapingizni ko‘rsatgan holda ariza topshirishingiz mumkin.",
    },
  ];

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
          Yordam Markazi
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Eng ko‘p beriladigan savollar va javoblar
        </p>

        <div className="space-y-3 pt-2">
          {faqs.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40"
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
          Savolingizga javob topmadingizmi? Qo‘llab-quvvatlash xizmati:{" "}
          <span className="font-medium text-slate-900 dark:text-slate-100">support@fikr.uz</span>
        </div>
      </div>
    </div>
  );
}
