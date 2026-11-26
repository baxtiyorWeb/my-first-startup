"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Check, Sparkles, ShieldCheck, Loader2, AlertCircle, Lock } from "lucide-react";
import { api } from "@/lib/api";
import type { PricingOverviewResponse, PricingPlanDto } from "@/lib/api/pricing";
import { toast } from "@/components/ui/toast";

// Pullik tariflar hozircha vaqtincha yopiq: rejalar hammaga ko'rinadi, lekin
// sotib olish tugmalari faollashtirilmagan. Tariflar ishga tushganda `false`
// qilib qo'yish kifoya.
const PLANS_TEMPORARILY_PAUSED = true;

function formatUzs(amount: number): string {
  if (amount <= 0) return "Bepul";
  return `${amount.toLocaleString("uz-UZ")} so'm`;
}

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [data, setData] = useState<PricingOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPricing = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.pricing.getOverview();
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tariflarni yuklashda xatolik");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPricing();
  }, [loadPricing]);

  const handleSelectPlan = async (plan: PricingPlanDto) => {
    try {
      setBusySlug(plan.slug);
      const res = await api.pricing.checkout({
        planSlug: plan.slug,
        billingCycle,
        provider: "inpay",
      });

      if (res.requiresPayment && res.checkoutUrl) {
        toast.success("To'lov sahifasiga o'tilmoqda...");
        window.location.href = res.checkoutUrl;
        return;
      }

      toast.success(res.message);
      await loadPricing();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Tarifni tanlashda xatolik");
    } finally {
      setBusySlug(null);
    }
  };

  const handleCancel = async () => {
    try {
      setBusySlug("cancel");
      await api.pricing.cancel();
      toast.success("Avtomatik yangilanish bekor qilindi");
      await loadPricing();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bekor qilishda xatolik");
    } finally {
      setBusySlug(null);
    }
  };

  const currentSub = data?.currentSubscription;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-zinc-900 dark:text-zinc-300">
          <Sparkles className="h-3.5 w-3.5" /> Geters Tariflari
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
          O&apos;sish sur&apos;atingizga mos rejani tanlang
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600 dark:text-zinc-400">
          Rejalar bilan bemalol tanishing. To&apos;lovlar hozircha vaqtincha to&apos;xtatilgan — barcha imkoniyatlar hamma uchun bepul.
        </p>

        {/* Billing Cycle Toggle */}
        <div className="mt-5 inline-flex rounded-full bg-slate-100 p-1 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              billingCycle === "monthly"
                ? "bg-white text-slate-950 dark:bg-zinc-800 dark:text-white"
                : "text-slate-600 dark:text-zinc-400"
            }`}
          >
            Oylik
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("yearly")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              billingCycle === "yearly"
                ? "bg-white text-slate-950 dark:bg-zinc-800 dark:text-white"
                : "text-slate-600 dark:text-zinc-400"
            }`}
          >
            Yillik (20% tejash)
          </button>
        </div>
      </div>

      {currentSub && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-zinc-900/70">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-sm font-bold text-slate-950 dark:text-white">
                Joriy reja: {currentSub.planName} ({currentSub.billingCycle === "yearly" ? "Yillik" : "Oylik"})
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Amal qilish muddati:{" "}
                {new Date(currentSub.currentPeriodEnd).toLocaleDateString("uz-UZ")}
                {currentSub.cancelAtPeriodEnd ? " · Davr yakunida bekor qilinadi" : ""}
              </p>
            </div>
          </div>
          {!currentSub.cancelAtPeriodEnd && currentSub.planSlug !== "free" && (
            <button
              type="button"
              disabled={busySlug === "cancel"}
              onClick={handleCancel}
              className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:bg-zinc-800 dark:text-red-400"
            >
              {busySlug === "cancel" ? "Kutilmoqda..." : "Avto-uzaytirishni bekor qilish"}
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-red-50 p-8 text-center text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
          <AlertCircle className="mb-2 h-6 w-6" />
          <p>{error}</p>
        </div>
      ) : (
        <div className="relative">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {(data?.plans || []).map((plan) => {
              const price =
                billingCycle === "yearly" ? plan.priceYearlyUzs : plan.priceMonthlyUzs;
              const isPro = plan.slug === "pro";

              return (
                <div
                  key={plan.id}
                  className={`flex flex-col rounded-2xl p-6 transition-colors ${
                    isPro
                      ? "bg-slate-950 text-white dark:bg-zinc-900"
                      : "bg-slate-50 text-slate-950 dark:bg-zinc-950 dark:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold">{plan.name}</h2>
                    {plan.isCurrent && (
                      <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-500">
                        Faol
                      </span>
                    )}
                  </div>
                  <p
                    className={`mt-1.5 text-xs ${
                      isPro ? "text-slate-300" : "text-slate-500 dark:text-zinc-400"
                    }`}
                  >
                    {plan.description}
                  </p>

                  <div className="mt-5 flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold">{formatUzs(price)}</span>
                    {price > 0 && (
                      <span
                        className={`text-xs ${
                          isPro ? "text-slate-400" : "text-slate-500 dark:text-zinc-400"
                        }`}
                      >
                        / {billingCycle === "yearly" ? "yil" : "oy"}
                      </span>
                    )}
                  </div>

                  <ul className="mt-5 flex-1 space-y-2.5 text-xs">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <Check
                          className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                            isPro ? "text-emerald-400" : "text-emerald-600"
                          }`}
                        />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    disabled={
                      PLANS_TEMPORARILY_PAUSED || plan.isCurrent || busySlug === plan.slug
                    }
                    onClick={() => handleSelectPlan(plan)}
                    className={`mt-6 w-full rounded-full py-2.5 text-xs font-bold transition-opacity disabled:opacity-50 ${
                      isPro
                        ? "bg-white text-slate-950 hover:opacity-90"
                        : "bg-slate-950 text-white hover:opacity-90 dark:bg-white dark:text-black"
                    }`}
                  >
                    {busySlug === plan.slug
                      ? "To'lov sahifasi ochilmoqda..."
                      : plan.isCurrent
                      ? "Joriy reja"
                      : PLANS_TEMPORARILY_PAUSED
                      ? price <= 0
                        ? "Bepul reja"
                        : "Tez orada ishga tushadi"
                      : price <= 0
                      ? "Bepul rejaga o'tish"
                      : "Rejani tanlash"}
                  </button>
                </div>
              );
            })}
          </div>

          {PLANS_TEMPORARILY_PAUSED && (
            <div className="mt-6 rounded-2xl border border-blue-200/70 bg-blue-50/70 p-5 dark:border-blue-500/25 dark:bg-blue-500/10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-950 dark:text-white">
                    Tariflar hozircha vaqtincha yopiq
                  </h2>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-zinc-300">
                    Rejalar bilan bemalol tanishing, lekin sotib olish hozircha
                    vaqtincha o&apos;chirilgan. Bu davrda Geters&apos;ning barcha asosiy
                    imkoniyatlari hamma uchun bepul ishlaydi — hech qanday
                    to&apos;lov olinmaydi va kartangizdan pul yechilmaydi.
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-zinc-300">
                    Tariflar ishga tushganda shu sahifada va bildirishnomalar
                    orqali xabar beramiz. Savolingiz bo&apos;lsa, qo&apos;llab-quvvatlash
                    jamoasiga yozishingiz mumkin.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
