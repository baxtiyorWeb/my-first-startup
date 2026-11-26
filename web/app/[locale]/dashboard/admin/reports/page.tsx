"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Clock,
  User as UserIcon,
  MessageSquare,
  FileText,
  RefreshCw,
  Loader2,
  XCircle,
} from "lucide-react";
import { useAdmin } from "@/components/admin/admin-shell";
import { AdminHeader } from "@/components/admin/admin-header";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ContentPreview } from "@/components/format";
import { useI18n } from "@/lib/i18n/context";
import { toast } from "@/components/ui/toast";

interface AdminReport {
  id: string;
  targetId: string;
  targetType: "post" | "comment" | "user";
  reason: string;
  context: string | null;
  createdAt: string;
  targetSnippet: string | null;
  targetAuthor: string | null;
  reporter: {
    id: string;
    name: string;
    handle: string;
    avatarUrl?: string | null;
  } | null;
}

export default function AdminReportsPage() {
  const { openSidebar } = useAdmin();
  const { localePath, locale, formatRelativeTime } = useI18n();

  const [reports, setReports] = useState<AdminReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/reports");
      const json = await res.json();
      if (json.success && json.data) {
        setReports(json.data.reports || []);
      }
    } catch {
      toast.error(
        locale === "uz"
          ? "Shikoyatlarni yuklashda xatolik yuz berdi"
          : "Ошибка при загрузке жалоб"
      );
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleAction = async (reportId: string, action: "dismiss" | "delete_content") => {
    if (
      action === "delete_content" &&
      !confirm("Haqiqatan ham ushbu qoidabuzar kontentni butunlay o'chirmoqchimisiz?")
    ) {
      return;
    }

    try {
      setActionLoadingId(reportId);
      const res = await fetch(`/api/admin/reports?id=${reportId}&action=${action}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        setReports((prev) => prev.filter((r) => r.id !== reportId));
      } else {
        toast.error(json.error || "Amalni bajarishda xatolik yuz berdi");
      }
    } catch {
      toast.error("Server bilan aloqa uzildi");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredReports = reports.filter((r) => {
    if (filterType === "all") return true;
    return r.targetType === filterType;
  });

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/60 dark:bg-black min-h-screen">
      <AdminHeader
        title={locale === "uz" ? "Shikoyatlar va Moderatsiya" : "Жалобы и модерация"}
        subtitle={
          locale === "uz"
            ? "Foydalanuvchilar tomonidan bildirilgan shikoyatlarni ko'rib chiqish"
            : "Рассмотрение жалоб от пользователей"
        }
        onOpenSidebar={openSidebar}
      />

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#101117] p-3.5 rounded-[16px] border border-slate-200/90 dark:border-[#24252f] shadow-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {[
              { id: "all", label: "Barchasi" },
              { id: "post", label: "Postlar" },
              { id: "comment", label: "Sharhlar" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id)}
                className={`h-9 px-3.5 rounded-[11px] text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                  filterType === tab.id
                    ? "bg-[#3995ff] text-white"
                    : "bg-slate-100 dark:bg-[#181920] text-slate-600 dark:text-[#a0a5b8] hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={fetchReports}
            disabled={isLoading}
            className="h-9 px-3.5 rounded-[11px] bg-slate-100 dark:bg-[#181920] hover:bg-slate-200 dark:hover:bg-[#20222e] text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Yangilash</span>
          </button>
        </div>

        {/* Content Table / Cards */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 rounded-[16px] bg-white dark:bg-[#101117] border border-slate-200/90 dark:border-[#24252f] animate-pulse"
              />
            ))}
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-[#101117] rounded-[16px] border border-slate-200/90 dark:border-[#24252f] p-8 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Check className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Hozircha shikoyatlar yo'q!
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#a0a5b8] max-w-sm mx-auto">
              Barcha bildirilgan murojaatlar ko'rib chiqilgan. Yangi shikoyatlar tushganda shu yerda ko'rinadi.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="bg-white dark:bg-[#101117] rounded-[16px] border border-slate-200/90 dark:border-[#24252f] p-4 sm:p-5 shadow-xs space-y-3.5 transition-colors hover:border-slate-300 dark:hover:border-[#383a48]"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[8px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold uppercase">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{report.reason}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[8px] bg-slate-100 dark:bg-[#181920] text-slate-600 dark:text-[#a0a5b8] text-[11px] font-semibold border border-slate-200/60 dark:border-[#262836]">
                      {report.targetType === "post" && <FileText className="w-3 h-3 text-[#3995ff]" />}
                      {report.targetType === "comment" && <MessageSquare className="w-3 h-3 text-emerald-500" />}
                      <span className="capitalize">{report.targetType}</span>
                    </span>

                    <span className="text-[11px] text-slate-400 dark:text-[#8e95ab] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatRelativeTime(report.createdAt)}</span>
                    </span>
                  </div>

                  {/* Reporter details */}
                  {report.reporter && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#a0a5b8]">
                      <span>Shikoyatchi:</span>
                      <UserAvatar
                        name={report.reporter.name}
                        avatarUrl={report.reporter.avatarUrl || undefined}
                        size="xs"
                      />
                      <span className="font-semibold text-slate-800 dark:text-[#f4f4fa]">
                        {report.reporter.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Target content snippet */}
                <div className="p-3.5 rounded-[12px] bg-slate-50 dark:bg-[#151722] border border-slate-200/60 dark:border-[#222430] space-y-1">
                  {report.targetAuthor && (
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-[#8e95ab]">
                      Muallif: <span className="text-slate-800 dark:text-[#f2f4fa]">{report.targetAuthor}</span>
                    </p>
                  )}
                  {report.targetSnippet ? (
                    <ContentPreview
                      content={report.targetSnippet}
                      lineClamp={2}
                      className="text-xs sm:text-[13px] text-slate-800 dark:text-[#e4e7f5]"
                    />
                  ) : (
                    <span className="text-xs italic text-slate-400">
                      (Kontent allaqachon o'chirilgan yoki mavjud emas)
                    </span>
                  )}
                  {report.context && (
                    <p className="text-[11px] text-slate-500 dark:text-[#8e95ab] pt-1">
                      Izoh: &ldquo;{report.context}&rdquo;
                    </p>
                  )}
                </div>

                {/* Actions row */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-[#24252f]">
                  <button
                    type="button"
                    disabled={actionLoadingId === report.id}
                    onClick={() => handleAction(report.id, "dismiss")}
                    className="h-8 px-3 rounded-[9px] bg-slate-100 dark:bg-[#181920] hover:bg-slate-200 dark:hover:bg-[#252838] text-slate-700 dark:text-[#c4c7d9] text-xs font-semibold cursor-pointer transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Bekor qilish (Yopish)</span>
                  </button>

                  <button
                    type="button"
                    disabled={actionLoadingId === report.id}
                    onClick={() => handleAction(report.id, "delete_content")}
                    className="h-8 px-3.5 rounded-[9px] bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    {actionLoadingId === report.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Kontentni o'chirish</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
