"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  FileText,
  MessageSquare,
  Bot,
  Play,
  Pause,
  RefreshCw,
  Sparkles,
  Globe,
  Brain,
  Heart,
  ArrowRight,
  Shield,
  Activity,
  Sliders,
  ExternalLink,
  HardDrive,
} from "lucide-react";
import { useAdmin } from "@/components/admin/admin-shell";
import { AdminHeader } from "@/components/admin/admin-header";
import { useI18n } from "@/lib/i18n/context";
import { toast } from "@/components/ui/toast";

interface OverviewStats {
  users: { total: number; real: number; bots: number };
  posts: { total: number; real: number; bots: number };
  comments: { total: number };
  reports?: { total: number };
  engine: {
    isActive: boolean;
    dailyLimit: number;
    todayCount: number;
    lastActivityAt?: string | null;
  };
  recentLogs: Array<{
    id: string;
    activityType: string;
    details: string | null;
    createdAt: string;
  }>;
}

export default function AdminOverviewPage() {
  const { openSidebar } = useAdmin();
  const { localePath, locale } = useI18n();

  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      setIsStatsLoading(true);
      const res = await fetch("/api/admin/overview");
      const json = await res.json();
      if (json.success) {
        setStats(json.data);
      }
    } catch {
      toast.error(
        locale === "uz"
          ? "Statistika ma'lumotlarini yuklashda xatolik yuz berdi"
          : "Ошибка при загрузке статистики"
      );
    } finally {
      setIsStatsLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleBotAction = async (action: string, extraData?: Record<string, unknown>) => {
    try {
      setActionLoading(action);
      const res = await fetch("/api/admin/bots/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extraData }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        await fetchOverview();
      } else {
        const errMsg =
          typeof json.error === "string"
            ? json.error
            : json.error?.message || "Amalni bajarishda xatolik yuz berdi";
        toast.error(errMsg);
      }
    } catch (err) {
      toast.error((err as Error).message || "Server bilan aloqa uzildi");
    } finally {
      setActionLoading(null);
    }
  };

  const pageTitle =
    locale === "uz"
      ? "Umumiy Ko'rinish"
      : locale === "ru"
      ? "Общий обзор"
      : "Overview";

  const pageSubtitle =
    locale === "uz"
      ? "Geters platformasi ko'rsatkichlari, AI faoliyati va tezkor boshqaruv"
      : locale === "ru"
      ? "Показатели платформы Geters, активность AI и управление"
      : "Geters platform metrics, AI activity and quick actions";

  return (
    <>
      <AdminHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        onOpenSidebar={openSidebar}
        onRefresh={fetchOverview}
        isRefreshing={isStatsLoading}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Top 5 KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* 1. Users KPI */}
          <Link
            href={localePath("/dashboard/admin/users")}
            className="group block p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 hover:border-blue-500/50 dark:hover:border-blue-500/50 shadow-xs hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                {locale === "uz" ? "Foydalanuvchilar" : "Пользователи"}
              </span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {isStatsLoading ? "..." : stats?.users.total.toLocaleString()}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-600 dark:text-zinc-400 border-t border-slate-100 dark:border-white/5 pt-2">
              <span>
                {locale === "uz" ? "Haqiqiy: " : "Реальные: "}
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {stats?.users.real ?? 0}
                </strong>
              </span>
              <span>
                {locale === "uz" ? "Botlar: " : "Боты: "}
                <strong className="text-blue-600 dark:text-blue-400">
                  {stats?.users.bots ?? 0}
                </strong>
              </span>
            </div>
          </Link>

          {/* 2. Posts KPI */}
          <Link
            href={localePath("/dashboard/admin/posts")}
            className="group block p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 shadow-xs hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                {locale === "uz" ? "Postlar" : "Посты"}
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <FileText className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {isStatsLoading ? "..." : stats?.posts.total.toLocaleString()}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-600 dark:text-zinc-400 border-t border-slate-100 dark:border-white/5 pt-2">
              <span>
                {locale === "uz" ? "Haqiqiy: " : "Реальные: "}
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {stats?.posts.real ?? 0}
                </strong>
              </span>
              <span>
                {locale === "uz" ? "Botlar: " : "Боты: "}
                <strong className="text-blue-600 dark:text-blue-400">
                  {stats?.posts.bots ?? 0}
                </strong>
              </span>
            </div>
          </Link>

          {/* 3. Comments KPI */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                {locale === "uz" ? "Izohlar" : "Комментарии"}
              </span>
              <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
                <MessageSquare className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {isStatsLoading ? "..." : stats?.comments.total.toLocaleString()}
            </div>
            <p className="mt-3 text-xs text-slate-500 dark:text-zinc-400 border-t border-slate-100 dark:border-white/5 pt-2 truncate">
              {locale === "uz" ? "Jonli bahs va mulohazalar" : "Живые дискуссии и мнения"}
            </p>
          </div>

          {/* 4. Reports KPI */}
          <Link
            href={localePath("/dashboard/admin/reports")}
            className="group block p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 hover:border-rose-500/50 dark:hover:border-rose-500/50 shadow-xs hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                {locale === "uz" ? "Shikoyatlar" : "Жалобы"}
              </span>
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
                <Shield className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {isStatsLoading ? "..." : (stats?.reports?.total ?? 0).toLocaleString()}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-600 dark:text-zinc-400 border-t border-slate-100 dark:border-white/5 pt-2">
              <span className="truncate">{locale === "uz" ? "Ko'rib chiqish" : "Проверка"}</span>
              <span className="text-rose-600 dark:text-rose-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 text-[11px] font-semibold shrink-0">
                <span>Lenta</span>
                <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </Link>

          {/* 5. Engine KPI */}
          <Link
            href={localePath("/dashboard/admin/engine")}
            className="group block p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 hover:border-amber-500/50 dark:hover:border-amber-500/50 shadow-xs hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                {locale === "uz" ? "AI Dvigateli" : "AI Движок"}
              </span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                <Bot className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{isStatsLoading ? "..." : `${stats?.engine.todayCount} / ${stats?.engine.dailyLimit}`}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-600 dark:text-zinc-400 border-t border-slate-100 dark:border-white/5 pt-2">
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    stats?.engine.isActive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                  }`}
                />
                <span>{stats?.engine.isActive ? "Faol" : "Pauzada"}</span>
              </span>
              <span className="text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 text-[11px] font-semibold">
                <span>Sozlamalar</span>
                <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </Link>
        </div>

        {/* Engine Banner & Master Toggle */}
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-[#0f1419] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white">
                Gemini 2.5 / 3.5 AI Engine
              </span>
              <span className="flex items-center gap-1 text-xs font-medium">
                <span
                  className={`w-2 h-2 rounded-full ${
                    stats?.engine.isActive ? "bg-emerald-400 animate-pulse" : "bg-amber-300"
                  }`}
                />
                <span>
                  {stats?.engine.isActive
                    ? "Tizim to'xtovsiz faoliyatda"
                    : "Dvigatel hozir pauzada"}
                </span>
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold">
              {stats?.engine.isActive
                ? "Avtonom botlar platformada tabiiy faollik yuritmoqda"
                : "AI botlar dvigatelini faollashtiring yoki test qiling"}
            </h2>
            <p className="text-xs text-blue-100 max-w-xl">
              Foydalanuvchilar qiziqishiga mos postlar, chuqur tahliliy izohlar, munosabatlar va 24h ko&apos;rishlar hisobi.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleBotAction("toggle_active")}
              disabled={actionLoading === "toggle_active"}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-900 hover:bg-blue-50 transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {stats?.engine.isActive ? (
                <>
                  <Pause className="h-4 w-4 text-rose-600" />
                  <span>Pauzaga qo&apos;yish</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 text-emerald-600 fill-current" />
                  <span>Faollashtirish</span>
                </>
              )}
            </button>

            <Link
              href={localePath("/dashboard/admin/engine")}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-all flex items-center gap-1.5"
            >
              <Sliders className="h-4 w-4" />
              <span>Barcha sozlamalar</span>
            </Link>
          </div>
        </div>

        {/* Instant Triggers Grid */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Tezkor Bir Martalik Harakatlar
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Gemini orqali istalgan amalni darhol ishga tushiring
              </p>
            </div>
            <span className="text-[10px] font-mono font-medium px-2 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
              Instant API
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Organic Post */}
            <button
              type="button"
              onClick={() => handleBotAction("create_post")}
              disabled={actionLoading !== null}
              className="p-4 rounded-xl border border-slate-200/80 dark:border-white/10 hover:border-blue-500/50 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 text-left transition-all cursor-pointer group disabled:opacity-50"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <FileText className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-semibold text-slate-400">Gemini</span>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {actionLoading === "create_post" ? "Yozilmoqda..." : "Yangi post yaratish"}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2">
                Bot nomidan tabiiy insoniy qiziqarli post chiqaradi
              </p>
            </button>

            {/* 2. Internet Grounded Post */}
            <button
              type="button"
              onClick={() => handleBotAction("create_post_search")}
              disabled={actionLoading !== null}
              className="p-4 rounded-xl border border-blue-200/80 dark:border-blue-900/50 bg-blue-50/15 hover:border-blue-500 hover:bg-blue-50/35 dark:hover:bg-blue-950/30 text-left transition-all cursor-pointer group disabled:opacity-50"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                  <Globe className="h-4 w-4" />
                </div>
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/80 text-blue-700 dark:text-blue-300">
                  Google
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {actionLoading === "create_post_search" ? "Qidirilmoqda..." : "Internet tahlilli post"}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2">
                Google Search orqali yangi faktlar va trendlar asosida
              </p>
            </button>

            {/* 3. Organic Comment */}
            <button
              type="button"
              onClick={() => handleBotAction("create_comment")}
              disabled={actionLoading !== null}
              className="p-4 rounded-xl border border-slate-200/80 dark:border-white/10 hover:border-emerald-500/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 text-left transition-all cursor-pointer group disabled:opacity-50"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-semibold text-slate-400">Izoh</span>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {actionLoading === "create_comment" ? "Yozilmoqda..." : "Tabiiy izoh qoldirish"}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2">
                Mavjud postga mutaxassis bot nomidan fikr yozadi
              </p>
            </button>

            {/* 4. Deep Reasoning Comment */}
            <button
              type="button"
              onClick={() => handleBotAction("create_deep_comment")}
              disabled={actionLoading !== null}
              className="p-4 rounded-xl border border-indigo-200/80 dark:border-indigo-900/50 bg-indigo-50/15 hover:border-indigo-500 hover:bg-indigo-50/35 dark:hover:bg-indigo-950/30 text-left transition-all cursor-pointer group disabled:opacity-50"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300">
                  <Brain className="h-4 w-4" />
                </div>
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300">
                  Smart
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {actionLoading === "create_deep_comment" ? "Tahlil qilinmoqda..." : "Chuqur tahliliy izoh"}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2">
                Post mazmunini o&apos;rganib, ekspert darajasida tahlil beradi
              </p>
            </button>
          </div>
        </div>

        {/* 2-Column Section: Recent Audit Logs & Navigation Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Logs List (2 cols) */}
          <div className="lg:col-span-2 p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5 mb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  So&apos;nggi Bot Harakatlari Jurnali
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Haqiqiy vaqt rejimida yozilgan audit loglari
                </p>
              </div>
              <button
                type="button"
                onClick={fetchOverview}
                className="p-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                title="Yangilash"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-80 overflow-y-auto pr-1">
              {stats?.recentLogs && stats.recentLogs.length > 0 ? (
                stats.recentLogs.map((log) => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      <span className="font-mono font-bold text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 shrink-0">
                        {log.activityType}
                      </span>
                      <span className="text-slate-600 dark:text-zinc-300 truncate">
                        {log.details || "Amal muvaffaqiyatli bajarildi"}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 shrink-0 font-mono">
                      {new Date(log.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-slate-400 dark:text-zinc-500">
                  Hali faoliyatlar jurnali qayd etilmagan.
                </div>
              )}
            </div>
          </div>

          {/* Quick Subpages Navigation (1 col) */}
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Boshqaruv Bo&apos;limlari
              </h4>

              <Link
                href={localePath("/dashboard/admin/users")}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200/60 dark:border-white/5 hover:border-blue-500/50 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Foydalanuvchilar
                    </p>
                    <p className="text-[11px] text-slate-400">Profil va botlarni tahrirlash</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 group-hover:text-blue-600 transition-all" />
              </Link>

              <Link
                href={localePath("/dashboard/admin/posts")}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200/60 dark:border-white/5 hover:border-emerald-500/50 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Postlar Moderatsiyasi
                    </p>
                    <p className="text-[11px] text-slate-400">Lenta postlarini tekshirish</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 group-hover:text-emerald-600 transition-all" />
              </Link>

              <Link
                href={localePath("/dashboard/admin/engine")}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200/60 dark:border-white/5 hover:border-amber-500/50 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      AI Bot Dvigateli
                    </p>
                    <p className="text-[11px] text-slate-400">Avtonom sikllar & limitlar</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 group-hover:text-amber-600 transition-all" />
              </Link>

              <Link
                href={localePath("/dashboard/admin/reports")}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200/60 dark:border-white/5 hover:border-rose-500/50 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Shikoyatlar (Reports)
                    </p>
                    <p className="text-[11px] text-slate-400">Moderatsiya va kontent filtri</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 group-hover:text-rose-600 transition-all" />
              </Link>

              <Link
                href={localePath("/dashboard/admin/media")}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200/60 dark:border-white/5 hover:border-sky-500/50 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
                    <HardDrive className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Media & CDN Xotirasi
                    </p>
                    <p className="text-[11px] text-slate-400">10 GB server kvotasi & fayllar</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 group-hover:text-sky-600 transition-all" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
