"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  UserMinus,
  Check,
  XCircle,
  RefreshCw,
  Loader2,
  Clock,
  Trash2,
  Mail,
  AtSign,
  Phone,
} from "lucide-react";
import { useAdmin } from "@/components/admin/admin-shell";
import { AdminHeader } from "@/components/admin/admin-header";
import { useI18n } from "@/lib/i18n/context";
import { toast } from "@/components/ui/toast";

interface DeletionRequest {
  id: string;
  identifier: string;
  reason: string | null;
  status: "pending" | "completed" | "rejected";
  matchedUserId: string | null;
  requestIp: string | null;
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  completed:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  rejected:
    "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
};

export default function AdminAccountDeletionsPage() {
  const { openSidebar } = useAdmin();
  const { locale, formatRelativeTime } = useI18n();

  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const fetchRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/account-deletions");
      const json = await res.json();
      if (json.success && json.data) {
        setRequests(json.data.requests || []);
      }
    } catch {
      toast.error(
        locale === "uz"
          ? "So'rovlarni yuklashda xatolik yuz berdi"
          : "Ошибка при загрузке запросов"
      );
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    if (
      action === "approve" &&
      !confirm(
        "Hisob va u bilan bog'liq barcha ma'lumotlar butunlay o'chiriladi. Davom etasizmi?"
      )
    ) {
      return;
    }

    try {
      setActionId(id);
      const res = await fetch("/api/admin/account-deletions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        setRequests((prev) =>
          prev.map((request) =>
            request.id === id
              ? {
                  ...request,
                  status: action === "approve" ? "completed" : "rejected",
                  resolvedAt: new Date().toISOString(),
                }
              : request
          )
        );
      } else {
        toast.error(
          (typeof json.error === "string" ? json.error : json.error?.message) ||
            "Amalni bajarishda xatolik yuz berdi"
        );
      }
    } catch {
      toast.error("Server bilan aloqa uzildi");
    } finally {
      setActionId(null);
    }
  };

  const visibleRequests =
    filter === "all"
      ? requests
      : requests.filter((request) => request.status === "pending");

  const identifierIcon = (identifier: string) => {
    if (identifier.includes("@") && identifier.includes(".")) {
      return <Mail className="w-3 h-3" />;
    }
    if (/^[+]?[\d\s()-]{7,}$/.test(identifier)) {
      return <Phone className="w-3 h-3" />;
    }
    return <AtSign className="w-3 h-3" />;
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/60 dark:bg-black min-h-screen">
      <AdminHeader
        title={
          locale === "uz"
            ? "Hisob o'chirish so'rovlari"
            : "Запросы на удаление аккаунта"
        }
        subtitle={
          locale === "uz"
            ? "Google Play talabiga muvofiq veb-sayt orqali kelgan so'rovlar"
            : "Запросы, поступившие через сайт в соответствии с Google Play"
        }
        onOpenSidebar={openSidebar}
      />

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#000000] p-3.5 rounded-[16px] border border-slate-200/90 dark:border-[#2f3336] shadow-xs">
          <div className="flex items-center gap-1.5">
            {[
              { id: "pending" as const, label: "Kutilayotgan" },
              { id: "all" as const, label: "Barchasi" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`h-9 px-3.5 rounded-[11px] text-xs font-semibold cursor-pointer transition-colors ${
                  filter === tab.id
                    ? "bg-[#2dd4bf] text-white"
                    : "bg-slate-100 dark:bg-[#16181c] text-slate-600 dark:text-[#8b98a5] hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={fetchRequests}
            disabled={isLoading}
            className="h-9 px-3.5 rounded-[11px] bg-slate-100 dark:bg-[#16181c] hover:bg-slate-200 dark:hover:bg-[#202327] text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
            <span>Yangilash</span>
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 rounded-[16px] bg-white dark:bg-[#000000] border border-slate-200/90 dark:border-[#2f3336] animate-pulse"
              />
            ))}
          </div>
        ) : visibleRequests.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-[#000000] rounded-[16px] border border-slate-200/90 dark:border-[#2f3336] p-8 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Check className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {filter === "pending"
                ? "Kutilayotgan so'rovlar yo'q"
                : "Hozircha so'rovlar yo'q"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#8b98a5] max-w-sm mx-auto">
              Yangi so'rovlar geters.uz/account/delete sahifasi orqali keladi va
              shu yerda ko'rinadi.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {visibleRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white dark:bg-[#000000] rounded-[16px] border border-slate-200/90 dark:border-[#2f3336] p-4 sm:p-5 shadow-xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[8px] border text-[11px] font-bold uppercase ${
                        STATUS_STYLES[request.status]
                      }`}
                    >
                      {request.status === "pending" && (
                        <Clock className="w-3 h-3" />
                      )}
                      {request.status === "completed" && (
                        <Check className="w-3 h-3" />
                      )}
                      {request.status === "rejected" && (
                        <XCircle className="w-3 h-3" />
                      )}
                      <span>{request.status}</span>
                    </span>

                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[8px] bg-slate-100 dark:bg-[#16181c] text-slate-700 dark:text-[#cfd9de] text-[11px] font-semibold border border-slate-200/60 dark:border-[#2f3336]">
                      {identifierIcon(request.identifier)}
                      <span>{request.identifier}</span>
                    </span>

                    <span className="text-[11px] text-slate-400 dark:text-[#71767b]">
                      {formatRelativeTime(request.createdAt)}
                    </span>
                  </div>

                  {request.matchedUserId && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      Hisob bazada topildi
                    </span>
                  )}
                </div>

                {request.reason && (
                  <p className="text-xs text-slate-600 dark:text-[#8b98a5] p-3 rounded-[12px] bg-slate-50 dark:bg-[#16181c] border border-slate-200/60 dark:border-[#2f3336]">
                    Izoh: &ldquo;{request.reason}&rdquo;
                  </p>
                )}

                {request.status === "pending" && (
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-[#2f3336]">
                    <button
                      type="button"
                      disabled={actionId === request.id}
                      onClick={() => handleAction(request.id, "reject")}
                      className="h-8 px-3 rounded-[9px] bg-slate-100 dark:bg-[#16181c] hover:bg-slate-200 dark:hover:bg-[#2f3336] text-slate-700 dark:text-[#cfd9de] text-xs font-semibold cursor-pointer transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Rad etish</span>
                    </button>

                    <button
                      type="button"
                      disabled={actionId === request.id}
                      onClick={() => handleAction(request.id, "approve")}
                      className="h-8 px-3.5 rounded-[9px] bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                    >
                      {actionId === request.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      <span>Hisobni o'chirish</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-start gap-2.5 text-[11px] text-slate-500 dark:text-[#8b98a5] bg-white dark:bg-[#000000] border border-slate-200/90 dark:border-[#2f3336] rounded-[14px] p-3.5">
          <UserMinus className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            So&apos;rovni tasdiqlash hisobni va unga bog&apos;liq postlar,
            izohlar, xabarlar va sessiyalarni butunlay o&apos;chiradi. Bu amalni
            ortga qaytarib bo&apos;lmaydi.
          </p>
        </div>
      </div>
    </div>
  );
}
