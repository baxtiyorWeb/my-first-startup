"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Check, Sparkles, ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import type {
  PricingOverviewResponse,
  PricingPlanDto,
  PaymentStatusResponse,
} from "@/lib/api/pricing";
import { toast } from "@/components/ui/toast";

function formatUzs(amount: number): string {
  if (amount <= 0) return "Bepul";
  return `${amount.toLocaleString("uz-UZ")} so'm`;
}

function planActionLabel(params: {
  isCurrent: boolean;
  price: number;
  purchasesEnabled: boolean;
  busy: boolean;
}): string {
  if (params.busy) return "To'lov sahifasi ochilmoqda...";
  if (params.isCurrent) return "Joriy reja";
  if (!params.purchasesEnabled) return params.price <= 0 ? "Bepul reja" : "Tez orada";
  return params.price <= 0 ? "Bepul rejaga o'tish" : "Rejani tanlash";
}

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [data, setData] = useState<PricingOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingPayment, setPendingPayment] = useState<PaymentStatusResponse | null>(null);

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

  // After the inPAY checkout the user comes back with ?payment=<transactionId>.
  // The status is verified server-side (provider lookup), not from URL params.
  useEffect(() => {
    const paymentId = new URLSearchParams(window.location.search).get("payment");
    if (!paymentId) return;

    let cancelled = false;

    const verify = async (attempt: number) => {
      try {
        const res = await api.pricing.getPaymentStatus(paymentId);
        if (cancelled) return;
        setPendingPayment(res);

        if (res.status === "succeeded") {
          toast.success(res.message);
          window.history.replaceState({}, "", window.location.pathname);
          await loadPricing();
          return;
        }

        if (res.status === "failed" || res.status === "refunded") {
          toast.error(res.message);
          window.history.replaceState({}, "", window.location.pathname);
          return;
        }

        if (attempt < 4) {
          window.setTimeout(() => void verify(attempt + 1), 3000);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err instanceof Error ? err.message : "To'lov holatini tekshirishda xatolik"
          );
        }
      }
    };

    void verify(0);

    return () => {
      cancelled = true;
    };
  }, [loadPricing]);

  const handleCheckPayment = async () => {
    if (!pendingPayment) return;
    try {
      setBusySlug("check");
      const res = await api.pricing.getPaymentStatus(pendingPayment.transactionId);
      setPendingPayment(res);
      if (res.status === "succeeded") {
        toast.success(res.message);
        await loadPricing();
      } else if (res.status !== "pending") {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "To'lov holatini tekshirishda xatolik");
    } finally {
      setBusySlug(null);
    }
  };

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
        window.location.assign(res.checkoutUrl);
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
  // Purchases stay disabled (and the buttons read "Tez orada") until the kassa
  // keys are configured on the server, so nobody hits a 503 dead end.
  const purchasesEnabled = Boolean(data?.providerConfigured);

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
          To&apos;lov inPAY orqali xavfsiz amalga oshiriladi va obuna tasdiqlangach darhol faollashadi.
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
          {!currentSub.cancelAtPeriodEnd && currentSub.autoRenew && currentSub.planSlug !== "free" && (
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

      {pendingPayment && pendingPayment.status === "pending" && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs dark:border-amber-500/30 dark:bg-amber-500/10">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <Loader2 className={`h-4 w-4 ${busySlug === "check" ? "animate-spin" : ""}`} />
            <span>{pendingPayment.message}</span>
          </div>
          <button
            type="button"
            disabled={busySlug === "check"}
            onClick={handleCheckPayment}
            className="rounded-full bg-amber-600 px-3.5 py-1.5 font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
          >
            Holatni tekshirish
          </button>
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
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {(data?.plans || []).map((plan) => {
            const price =
              billingCycle === "yearly" ? plan.priceYearlyUzs : plan.priceMonthlyUzs;
            const isPro = plan.slug === "pro";

            return (
              <div
                key={plan.id}
                className={`flex flex-col rounded-2xl p-6 border transition-colors ${
                  isPro
                    ? "bg-[#f7f9f9] dark:bg-[#16181c] border-[#2dd4bf] text-[#0f1419] dark:text-[#e7e9ea]"
                    : "bg-white dark:bg-[#000000] border-[#cfd9de] dark:border-[#2f3336] text-[#0f1419] dark:text-[#e7e9ea]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">{plan.name}</h2>
                  {plan.isCurrent && (
                    <span className="rounded-full bg-[#00ba7c]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#00ba7c]">
                      Faol
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-[#536471] dark:text-[#71767b]">
                  {plan.description}
                </p>

                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold">{formatUzs(price)}</span>
                  {price > 0 && (
                    <span className="text-xs text-[#536471] dark:text-[#71767b]">
                      / {billingCycle === "yearly" ? "yil" : "oy"}
                    </span>
                  )}
                </div>

                <ul className="mt-5 flex-1 space-y-2.5 text-xs">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00ba7c]" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  disabled={!purchasesEnabled || plan.isCurrent || busySlug === plan.slug}
                  onClick={() => handleSelectPlan(plan)}
                  className={`mt-6 w-full rounded-full py-2.5 text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-45 cursor-pointer ${
                    isPro
                      ? "bg-[#2dd4bf] hover:bg-[#14b8a6] text-[#0f1419]"
                      : "bg-[#0f1419] hover:bg-[#272c30] text-white dark:bg-[#e7e9ea] dark:text-[#0f1419]"
                  }`}
                >
                  {planActionLabel({
                    isCurrent: plan.isCurrent,
                    price,
                    purchasesEnabled,
                    busy: busySlug === plan.slug,
                  })}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
