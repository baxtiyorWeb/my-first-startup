"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  CreditCard,
  RefreshCw,
  Loader2,
  Check,
  Clock,
  XCircle,
  RotateCcw,
  Wallet,
  Link2,
} from "lucide-react";
import { useAdmin } from "@/components/admin/admin-shell";
import { AdminHeader } from "@/components/admin/admin-header";
import { useI18n } from "@/lib/i18n/context";
import { toast } from "@/components/ui/toast";

interface PaymentTransaction {
  id: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
  provider: string;
  amount: number;
  currency: string;
  providerTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
  subscriptionId: string | null;
  user: { id: string; name: string; handle: string; email: string | null };
  plan: { slug: string; name: string };
}

interface PaymentSummary {
  total: number;
  succeeded: number;
  pending: number;
  failed: number;
  refunded: number;
  revenueUzs: number;
}

interface ProviderStatus {
  configured: boolean;
  merchantId: string | null;
  apiBaseUrl: string;
  missingEnv: string[];
}

interface ConnectionCheck {
  ok: boolean;
  message: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  succeeded: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  failed: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  refunded: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Kutilmoqda",
  succeeded: "To'landi",
  failed: "Muvaffaqiyatsiz",
  refunded: "Qaytarilgan",
};

const FILTERS = [
  { id: "", label: "Barchasi" },
  { id: "succeeded", label: "To'landi" },
  { id: "pending", label: "Kutilmoqda" },
  { id: "failed", label: "Muvaffaqiyatsiz" },
  { id: "refunded", label: "Qaytarilgan" },
];

function formatUzs(amount: number): string {
  return `${amount.toLocaleString("uz-UZ")} so'm`;
}

export default function AdminPaymentsPage() {
  const { openSidebar } = useAdmin();
  const { formatRelativeTime } = useI18n();

  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [filter, setFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [provider, setProvider] = useState<ProviderStatus | null>(null);
  const [connection, setConnection] = useState<ConnectionCheck | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Read from the server on every page load, so a key added to .env is visible
  // immediately instead of guessed from the pricing API.
  const fetchProvider = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/payments/provider");
      const json = await res.json();
      if (json.success) setProvider(json.data as ProviderStatus);
    } catch {
      // The indicator stays in its unknown state; payments list still works.
    }
  }, []);

  useEffect(() => {
    fetchProvider();
  }, [fetchProvider]);

  const handleTestConnection = async () => {
    try {
      setIsTesting(true);
      const res = await fetch("/api/admin/payments/provider", { method: "POST" });
      const json = await res.json();
      if (json.success && json.data?.ok) {
        setConnection({
          ok: true,
          message: `Ulanish tasdiqlandi · ${json.data.latencyMs} ms`,
        });
      } else {
        setConnection({
          ok: false,
          message:
            (typeof json.data?.message === "string" ? json.data.message : null) ||
            (typeof json.error === "string" ? json.error : null) ||
            "Ulanishni tekshirib bo'lmadi",
        });
      }
    } catch {
      setConnection({ ok: false, message: "Server bilan aloqa uzildi" });
    } finally {
      setIsTesting(false);
    }
  };

  const fetchPayments = useCallback(async () => {
    try {
      setIsLoading(true);
      const query = filter ? `?status=${encodeURIComponent(filter)}` : "";
      const res = await fetch(`/api/admin/payments${query}`);
      const json = await res.json();
      if (json.success && json.data) {
        setTransactions(json.data.transactions || []);
        setSummary(json.data.summary || null);
      } else {
        toast.error(
          (typeof json.error === "string" ? json.error : json.error?.message) ||
            "To'lovlarni yuklashda xatolik"
        );
      }
    } catch {
      toast.error("To'lovlarni yuklashda xatolik");
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleReconcile = async (id: string) => {
    try {
      setActionId(id);
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (json.success) {
        const status = json.data?.status;
        if (status === "succeeded") {
          toast.success("To'lov tasdiqlandi va obuna faollashtirildi");
        } else if (status === "pending") {
          toast.success("Provayder hali to'lovni tasdiqlamadi");
        } else {
          toast.success(`Holat yangilandi: ${STATUS_LABELS[status] ?? status}`);
        }
        await fetchPayments();
      } else {
        toast.error(
          (typeof json.error === "string" ? json.error : json.error?.message) ||
            "Holatni tekshirishda xatolik"
        );
      }
    } catch {
      toast.error("Server bilan aloqa uzildi");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/60 dark:bg-black min-h-screen">
      <AdminHeader
        title="To'lovlar"
        subtitle="inPAY tranzaksiyalari, obunalar va holatni tekshirish"
        onOpenSidebar={openSidebar}
      />

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
        <div className="flex flex-col gap-3 rounded-[16px] border border-slate-200/90 bg-white p-4 dark:border-[#2f3336] dark:bg-[#000000] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <span
              className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                !provider
                  ? "bg-slate-300 dark:bg-[#3a3f45]"
                  : !provider.configured
                    ? "bg-amber-500"
                    : connection && !connection.ok
                      ? "bg-rose-500"
                      : "bg-emerald-500"
              }`}
            />
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Kassa ulanishi:{" "}
                {!provider
                  ? "Tekshirilmoqda..."
                  : !provider.configured
                    ? "Sozlanmagan"
                    : connection?.ok
                      ? "Ulangan"
                      : connection && !connection.ok
                        ? "Ulanish xatosi"
                        : "Kalitlar kiritilgan"}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-[#8b98a5]">
                {!provider
                  ? "inPAY holati o'qilmoqda"
                  : !provider.configured
                    ? `Yetishmayotgan kalitlar: ${provider.missingEnv.join(", ")}`
                    : connection
                      ? connection.message
                      : `inPAY · merchant ${provider.merchantId ?? "—"} · ${provider.apiBaseUrl}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting || !provider?.configured}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-[11px] bg-slate-100 px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-40 dark:bg-[#16181c] dark:text-[#cfd9de] dark:hover:bg-[#202327]"
          >
            {isTesting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Link2 className="h-3.5 w-3.5" />
            )}
            Ulanishni tekshirish
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-[16px] border border-slate-200/90 bg-white p-4 dark:border-[#2f3336] dark:bg-[#000000]">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-slate-500 dark:text-[#8b98a5]">
              <Wallet className="h-3.5 w-3.5" /> Tushum
            </div>
            <p className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white">
              {formatUzs(summary?.revenueUzs ?? 0)}
            </p>
            <p className="mt-1 text-[11px] text-slate-400 dark:text-[#71767b]">
              {summary?.succeeded ?? 0} muvaffaqiyatli to&apos;lov
            </p>
          </div>

          <div className="rounded-[16px] border border-slate-200/90 bg-white p-4 dark:border-[#2f3336] dark:bg-[#000000]">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-slate-500 dark:text-[#8b98a5]">
              <CreditCard className="h-3.5 w-3.5" /> Jami
            </div>
            <p className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white">
              {summary?.total ?? 0}
            </p>
            <p className="mt-1 text-[11px] text-slate-400 dark:text-[#71767b]">
              Barcha tranzaksiyalar
            </p>
          </div>

          <div className="rounded-[16px] border border-slate-200/90 bg-white p-4 dark:border-[#2f3336] dark:bg-[#000000]">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-slate-500 dark:text-[#8b98a5]">
              <Clock className="h-3.5 w-3.5" /> Kutilmoqda
            </div>
            <p className="mt-2 text-xl font-extrabold text-amber-600 dark:text-amber-400">
              {summary?.pending ?? 0}
            </p>
            <p className="mt-1 text-[11px] text-slate-400 dark:text-[#71767b]">
              Webhook kutilayotgan
            </p>
          </div>

          <div className="rounded-[16px] border border-slate-200/90 bg-white p-4 dark:border-[#2f3336] dark:bg-[#000000]">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-slate-500 dark:text-[#8b98a5]">
              <XCircle className="h-3.5 w-3.5" /> Muammoli
            </div>
            <p className="mt-2 text-xl font-extrabold text-rose-600 dark:text-rose-400">
              {(summary?.failed ?? 0) + (summary?.refunded ?? 0)}
            </p>
            <p className="mt-1 text-[11px] text-slate-400 dark:text-[#71767b]">
              Bekor qilingan / qaytarilgan
            </p>
          </div>
        </div>

        <div className="flex flex-col items-stretch justify-between gap-3 rounded-[16px] border border-slate-200/90 bg-white p-3.5 dark:border-[#2f3336] dark:bg-[#000000] sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTERS.map((tab) => (
              <button
                key={tab.id || "all"}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`h-9 rounded-[11px] px-3.5 text-xs font-semibold transition-colors ${
                  filter === tab.id
                    ? "bg-[#2dd4bf] text-white"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-[#16181c] dark:text-[#8b98a5] dark:hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              fetchPayments();
              fetchProvider();
            }}
            disabled={isLoading}
            className="inline-flex h-9 items-center gap-2 rounded-[11px] bg-slate-100 px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-[#16181c] dark:text-slate-200 dark:hover:bg-[#202327]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Yangilash</span>
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-[16px] border border-slate-200/90 bg-white dark:border-[#2f3336] dark:bg-[#000000]"
              />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="space-y-3 rounded-[16px] border border-slate-200/90 bg-white p-8 py-16 text-center dark:border-[#2f3336] dark:bg-[#000000]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-[#16181c] dark:text-[#8b98a5]">
              <CreditCard className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Tranzaksiyalar yo&apos;q
            </h3>
            <p className="mx-auto max-w-sm text-xs text-slate-500 dark:text-[#8b98a5]">
              Foydalanuvchi tarif sotib olganda to&apos;lov shu yerda paydo bo&apos;ladi.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[16px] border border-slate-200/90 bg-white dark:border-[#2f3336] dark:bg-[#000000]">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-slate-200/90 text-[11px] uppercase text-slate-500 dark:border-[#2f3336] dark:text-[#8b98a5]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Holat</th>
                  <th className="px-4 py-3 font-semibold">Foydalanuvchi</th>
                  <th className="px-4 py-3 font-semibold">Tarif</th>
                  <th className="px-4 py-3 font-semibold">Summa</th>
                  <th className="px-4 py-3 font-semibold">inPAY order</th>
                  <th className="px-4 py-3 font-semibold">Vaqt</th>
                  <th className="px-4 py-3 font-semibold text-right">Amal</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-slate-100 last:border-0 dark:border-[#2f3336]"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-[8px] border px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                          STATUS_STYLES[tx.status]
                        }`}
                      >
                        {tx.status === "succeeded" && <Check className="h-3 w-3" />}
                        {tx.status === "pending" && <Clock className="h-3 w-3" />}
                        {tx.status === "failed" && <XCircle className="h-3 w-3" />}
                        {tx.status === "refunded" && <RotateCcw className="h-3 w-3" />}
                        {STATUS_LABELS[tx.status] ?? tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {tx.user.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-[#8b98a5]">
                        @{tx.user.handle}
                        {tx.user.email ? ` · ${tx.user.email}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-[#cfd9de]">
                      {tx.plan.name}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {formatUzs(tx.amount)}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500 dark:text-[#8b98a5]">
                      {tx.providerTransactionId || "—"}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500 dark:text-[#8b98a5]">
                      {formatRelativeTime(tx.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={actionId === tx.id || tx.status !== "pending"}
                        onClick={() => handleReconcile(tx.id)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-[9px] bg-slate-100 px-3 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-40 dark:bg-[#16181c] dark:text-[#cfd9de] dark:hover:bg-[#2f3336]"
                      >
                        {actionId === tx.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        Tekshirish
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-start gap-2.5 rounded-[14px] border border-slate-200/90 bg-white p-3.5 text-[11px] text-slate-500 dark:border-[#2f3336] dark:bg-[#000000] dark:text-[#8b98a5]">
          <CreditCard className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            &laquo;Tekshirish&raquo; tugmasi to&apos;lov holatini inPAY&apos;dan qayta so&apos;raydi va
            webhook kelmagan bo&apos;lsa ham obunani faollashtiradi. Bu amal faqat kutilayotgan
            tranzaksiyalar uchun mavjud.
          </p>
        </div>
      </div>
    </div>
  );
}
