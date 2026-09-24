"use client";

import React, { useState, useEffect } from "react";
import { Flag, X, CheckCircle2, ShieldAlert } from "lucide-react";
import type { ReportTargetType, ReportReasonType } from "@/types/social";
import { toast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  authorName: string;
  snippet?: string;
}

const REPORT_REASONS: { id: ReportReasonType; label: string; description: string }[] = [
  {
    id: "spam",
    label: "Spam yoki sun’iy intellekt xuruji",
    description: "Reklama, foydasiz takroriy xabarlar yoki AI tomonidan generatsiya qilingan mazmunsiz matn",
  },
  {
    id: "harassment",
    label: "Haqorat yoki shaxsiyatga tajovuz",
    description: "Boshqa ishtirokchilarga nisbatan tahdid, kamsitish yoki haqoratomuz so‘zlar",
  },
  {
    id: "misinformation",
    label: "Yolg‘on yoki manipulyativ ma’lumot",
    description: "Jamiyatni chalg‘ituvchi, manbasi ko‘rsatilmagan yoki asossiz xabarlar",
  },
  {
    id: "inappropriate",
    label: "Noo‘rin yoki taqiqlangan kontent",
    description: "Fikr qoidalariga va axloqiy me’yorlarga zid bo‘lgan materiallar",
  },
  {
    id: "other",
    label: "Boshqa sabab",
    description: "Yuqoridagi toifalarga kirmaydigan boshqa qoidabuzarlik",
  },
];

export function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  authorName,
  snippet,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReasonType>("spam");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isSubmitting]);

  if (!isOpen) return null;

  const getTargetTitle = () => {
    switch (targetType) {
      case "post":
        return "Fikr yuzasidan shikoyat";
      case "comment":
        return "Izoh yuzasidan shikoyat";
      case "user":
        return "Foydalanuvchi profiliga shikoyat";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await api.reports.createReport({
        targetType,
        targetId,
        reason: selectedReason,
        context: additionalNotes.trim() || undefined,
      });

      setIsSubmitting(false);
      setIsSubmitted(true);
      toast.success("Shikoyatingiz qabul qilindi. Moderatorlar jamoasi ko‘rib chiqadi.");

      setTimeout(() => {
        setIsSubmitted(false);
        onClose();
      }, 1400);
    } catch (err) {
      setIsSubmitting(false);
      const msg =
        err instanceof ApiError ? err.message : "Shikoyat yuborishda xatolik yuz berdi";
      toast.error(msg);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        onClick={isSubmitting ? undefined : onClose}
        className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      />

      {/* Modal Surface */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400">
              <Flag className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="report-modal-title"
                className="text-sm sm:text-base font-semibold text-slate-950 dark:text-white"
              >
                {getTargetTitle()}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Muallif: <span className="font-medium text-slate-700 dark:text-slate-300">{authorName}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSubmitted ? (
          <div className="p-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-in zoom-in" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Tashakkur, murojaat qabul qilindi
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Fikr platformasida intellektual va xavfsiz muhitni saqlashga qo‘shayotgan hissangiz uchun rahmat.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {snippet && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 italic">
                “{snippet}”
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Asosiy sababni tanlang:
              </label>

              <div className="space-y-2">
                {REPORT_REASONS.map((r) => {
                  const isChecked = selectedReason === r.id;
                  return (
                    <label
                      key={r.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                        isChecked
                          ? "border-slate-950 dark:border-white bg-slate-50 dark:bg-slate-800/60"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="report_reason"
                        value={r.id}
                        checked={isChecked}
                        onChange={() => setSelectedReason(r.id)}
                        className="mt-0.5 accent-slate-950 dark:accent-white"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                          {r.label}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-normal">
                          {r.description}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Qo‘shimcha izoh (ixtiyoriy)
              </label>
              <textarea
                rows={2}
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Moderatorlar uchun aniqroq tafsilot bering..."
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-950 dark:focus:ring-white resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <ShieldAlert className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Murojaat mutlaqo anonim yuboriladi</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Bekor qilish
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Yuborilmoqda..." : "Shikoyatni yuborish"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
