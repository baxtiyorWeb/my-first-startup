"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Trash2, ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

const CONTACT_EMAIL = "support@thegogetters.uz";

/**
 * Google Play "Account deletion" talabi: foydalanuvchi ilovani o'rnatmasdan
 * ham hisobini va ma'lumotlarini o'chirishni so'rashi mumkin bo'lgan ochiq
 * veb-sahifa. So'rov admin panelda ko'rib chiqiladi.
 */
export default function AccountDeletePage() {
  const { locale, localePath } = useI18n();

  const content: Record<
    string,
    {
      title: string;
      subtitle: string;
      intro: string;
      stepsTitle: string;
      steps: string[];
      deletedTitle: string;
      deleted: string[];
      keptTitle: string;
      kept: string[];
      inAppTitle: string;
      inAppText: string;
      identifierLabel: string;
      identifierPlaceholder: string;
      reasonLabel: string;
      reasonPlaceholder: string;
      confirmLabel: string;
      submit: string;
      submitting: string;
      successTitle: string;
      successText: string;
      errorDefault: string;
      contact: string;
      back: string;
      privacy: string;
    }
  > = {
    uz: {
      title: "Hisobni o‘chirish",
      subtitle: "Google Play talabiga muvofiq — ilovadan tashqarida ham mavjud",
      intro:
        "Bu sahifa orqali Geters hisobingizni va u bilan bog‘liq ma’lumotlarni butunlay o‘chirishni so‘rashingiz mumkin. So‘rov moderatsiya jamoasi tomonidan tekshiriladi va 30 kun ichida bajariladi.",
      stepsTitle: "Qanday ishlaydi",
      steps: [
        "Hisobingizga bog‘langan email, telefon raqam yoki @handle ni kiriting.",
        "So‘rovni yuboring — tizim uni darhol qabul qiladi.",
        "Jamoamiz 30 kun ichida hisobni va ma’lumotlarni o‘chiradi.",
      ],
      deletedTitle: "Nimalar o‘chiriladi",
      deleted: [
        "Hisob yozuvi, profil ma’lumotlari, avatar va muqova rasmi.",
        "Postlar, maqolalar, izohlar, layklar va saqlangan postlar.",
        "Obunalar (follow), bloklar, shaxsiy xabarlar va bildirishnoma tokenlari.",
      ],
      keptTitle: "Nimalar saqlanishi mumkin",
      kept: [
        "Anonimlashtirilgan statistika (sizni aniqlash imkonsiz).",
        "Qonun bo‘yicha saqlanishi shart bo‘lgan to‘lov va moderatorlik yozuvlari.",
        "Zaxira nusxalardagi ma’lumotlar — 30 kungacha, so‘ng avtomatik o‘chiriladi.",
      ],
      inAppTitle: "Ilova ichida o‘chirish",
      inAppText:
        "Agar hisobingizga kirgan bo‘lsangiz, ilovada Profil → Sozlamalar → «Hisobni o‘chirish» bo‘limidan darhol o‘chirishingiz mumkin.",
      identifierLabel: "Email, telefon raqam yoki @handle",
      identifierPlaceholder: "masalan: @ali yoki ali@example.com",
      reasonLabel: "Sabab (ixtiyoriy)",
      reasonPlaceholder: "Nima uchun hisobni o‘chirmoqchisiz?",
      confirmLabel:
        "Hisobim va yuqorida sanab o‘tilgan ma’lumotlar butunlay o‘chirilishiga roziman.",
      submit: "O‘chirish so‘rovini yuborish",
      submitting: "Yuborilmoqda...",
      successTitle: "So‘rov qabul qilindi",
      successText:
        "So‘rovingiz navbatga qo‘yildi. Hisob 30 kun ichida o‘chiriladi. Qo‘shimcha ma’lumot kerak bo‘lsa, siz bilan bog‘lanamiz.",
      errorDefault: "So‘rovni yuborishda xatolik yuz berdi. Keyinroq qayta urinib ko‘ring.",
      contact: "Savollar bo‘lsa:",
      back: "Orqaga",
      privacy: "Maxfiylik siyosati",
    },
    ru: {
      title: "Удаление аккаунта",
      subtitle: "Доступно вне приложения — требование Google Play",
      intro:
        "На этой странице вы можете запросить полное удаление аккаунта Geters и связанных с ним данных. Запрос рассматривается командой модерации и выполняется в течение 30 дней.",
      stepsTitle: "Как это работает",
      steps: [
        "Укажите email, номер телефона или @handle, привязанные к аккаунту.",
        "Отправьте запрос — система примет его сразу.",
        "Наша команда удалит аккаунт и данные в течение 30 дней.",
      ],
      deletedTitle: "Что удаляется",
      deleted: [
        "Запись аккаунта, данные профиля, аватар и обложка.",
        "Посты, статьи, комментарии, лайки и сохранённые материалы.",
        "Подписки, блокировки, личные сообщения и токены уведомлений.",
      ],
      keptTitle: "Что может сохраниться",
      kept: [
        "Анонимизированная статистика (идентифицировать вас невозможно).",
        "Платёжные и модерационные записи, хранение которых требует закон.",
        "Данные в резервных копиях — до 30 дней, затем удаляются автоматически.",
      ],
      inAppTitle: "Удаление в приложении",
      inAppText:
        "Если вы вошли в аккаунт, удалить его можно сразу в приложении: Профиль → Настройки → «Удалить аккаунт».",
      identifierLabel: "Email, номер телефона или @handle",
      identifierPlaceholder: "например: @ali или ali@example.com",
      reasonLabel: "Причина (необязательно)",
      reasonPlaceholder: "Почему вы хотите удалить аккаунт?",
      confirmLabel:
        "Я подтверждаю, что мой аккаунт и перечисленные данные будут удалены безвозвратно.",
      submit: "Отправить запрос на удаление",
      submitting: "Отправка...",
      successTitle: "Запрос принят",
      successText:
        "Ваш запрос поставлен в очередь. Аккаунт будет удалён в течение 30 дней. Если понадобится дополнительная информация, мы свяжемся с вами.",
      errorDefault: "Не удалось отправить запрос. Попробуйте позже.",
      contact: "Вопросы:",
      back: "Назад",
      privacy: "Политика конфиденциальности",
    },
    en: {
      title: "Delete your account",
      subtitle: "Available outside the app — a Google Play requirement",
      intro:
        "Use this page to request permanent deletion of your Geters account and associated data. Our moderation team reviews the request and completes deletion within 30 days.",
      stepsTitle: "How it works",
      steps: [
        "Enter the email, phone number or @handle linked to your account.",
        "Submit the request — it is recorded immediately.",
        "Our team deletes the account and its data within 30 days.",
      ],
      deletedTitle: "What is deleted",
      deleted: [
        "Account record, profile details, avatar and cover image.",
        "Posts, articles, comments, likes and saved posts.",
        "Follows, blocks, direct messages and notification tokens.",
      ],
      keptTitle: "What may be retained",
      kept: [
        "Anonymized statistics (you cannot be identified).",
        "Payment and moderation records required by law.",
        "Backup copies — up to 30 days, then deleted automatically.",
      ],
      inAppTitle: "Delete in the app",
      inAppText:
        "If you are signed in, you can delete your account immediately in the app: Profile → Settings → “Delete account”.",
      identifierLabel: "Email, phone number or @handle",
      identifierPlaceholder: "e.g. @ali or ali@example.com",
      reasonLabel: "Reason (optional)",
      reasonPlaceholder: "Why do you want to delete your account?",
      confirmLabel:
        "I understand that my account and the data listed above will be permanently deleted.",
      submit: "Submit deletion request",
      submitting: "Submitting...",
      successTitle: "Request received",
      successText:
        "Your request is queued. The account will be deleted within 30 days. We will contact you if we need more information.",
      errorDefault: "Could not submit the request. Please try again later.",
      contact: "Questions:",
      back: "Back",
      privacy: "Privacy Policy",
    },
  };

  const current = content[locale] || content.en;

  const [identifier, setIdentifier] = useState("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (identifier.trim().length < 3) {
      setError(current.identifierLabel);
      return;
    }
    if (!confirmed) {
      setError(current.confirmLabel);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/account/delete-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          reason: reason.trim() || undefined,
        }),
      });

      const json = await response.json().catch(() => null);

      if (!response.ok || !json?.success) {
        const message =
          (json?.error && typeof json.error === "object"
            ? json.error.message
            : json?.error) || current.errorDefault;
        setError(typeof message === "string" ? message : current.errorDefault);
        return;
      }

      setIsSubmitted(true);
    } catch {
      setError(current.errorDefault);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 sm:p-8 shadow-2xs space-y-5">
        <div className="flex items-center justify-between">
          <Link
            href={localePath("/")}
            className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 inline-flex items-center gap-1 transition-colors"
          >
            ← {current.back}
          </Link>
          <LanguageSwitcher variant="header" />
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 shrink-0">
            <Trash2 size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
              {current.title}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {current.subtitle}
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
          {current.intro}
        </p>

        {isSubmitted ? (
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-5 space-y-2 text-center">
            <CheckCircle2 className="mx-auto text-emerald-600 dark:text-emerald-400" size={28} />
            <h2 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
              {current.successTitle}
            </h2>
            <p className="text-xs text-emerald-700 dark:text-emerald-400/90 leading-relaxed">
              {current.successText}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 pt-2">
              {current.contact}{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="underline hover:text-slate-900 dark:hover:text-slate-100"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
                  {current.deletedTitle}
                </h2>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                  {current.deleted.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
                  {current.keptTitle}
                </h2>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                  {current.kept.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3 text-[11px] text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-slate-100 block mb-1">
                {current.inAppTitle}
              </span>
              {current.inAppText}
            </div>

            <div>
              <label
                htmlFor="deletion-identifier"
                className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                {current.identifierLabel}
              </label>
              <input
                id="deletion-identifier"
                type="text"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder={current.identifierPlaceholder}
                autoComplete="username"
                className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="deletion-reason"
                className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                {current.reasonLabel}
              </label>
              <textarea
                id="deletion-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={current.reasonPlaceholder}
                rows={2}
                maxLength={1000}
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 resize-none"
              />
            </div>

            <label className="flex items-start gap-2.5 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                className="mt-0.5 accent-rose-600"
              />
              <span>{current.confirmLabel}</span>
            </label>

            {error && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 w-full h-10 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{current.submitting}</span>
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  <span>{current.submit}</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={13} />
            <span>
              {current.contact}{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="underline hover:text-slate-900 dark:hover:text-slate-100"
              >
                {CONTACT_EMAIL}
              </a>
            </span>
          </div>
          <Link
            href={localePath("/privacy")}
            className="inline-block underline hover:text-slate-900 dark:hover:text-slate-100"
          >
            {current.privacy}
          </Link>
        </div>
      </div>
    </div>
  );
}
