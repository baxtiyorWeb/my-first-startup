"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Bot,
  Play,
  Pause,
  Clock,
  Zap,
  Loader2,
  Sparkles,
  Globe,
  MessageSquare,
  Brain,
  Eye,
  Heart,
  CheckSquare,
  Info,
  ChevronDown,
  ChevronUp,
  Save,
} from "lucide-react";
import { useAdmin } from "@/components/admin/admin-shell";
import { AdminHeader } from "@/components/admin/admin-header";
import { useI18n } from "@/lib/i18n/context";
import { toast } from "@/components/ui/toast";

interface OverviewStats {
  users: { total: number; real: number; bots: number };
  posts: { total: number; real: number; bots: number };
  comments: { total: number };
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

export default function AdminEnginePage() {
  const { openSidebar } = useAdmin();
  const { locale } = useI18n();

  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Settings form
  const [dailyLimitInput, setDailyLimitInput] = useState<number>(30);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Autonomous Scheduler State
  const [isAutoSchedulerActive, setIsAutoSchedulerActive] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("gogetters_bot_scheduler_active") === "true";
    } catch {
      return false;
    }
  });

  const [schedulerIntervalSeconds, setSchedulerIntervalSeconds] = useState<number>(() => {
    if (typeof window === "undefined") return 10;
    try {
      const saved = localStorage.getItem("gogetters_bot_scheduler_interval_seconds");
      return saved ? Number(saved) : 10;
    } catch {
      return 10;
    }
  });

  const [selectedSections, setSelectedSections] = useState<string[]>(() => {
    if (typeof window === "undefined") return ["thoughts", "comments", "views", "likes"];
    try {
      const saved = localStorage.getItem("gogetters_bot_scheduler_sections");
      return saved ? JSON.parse(saved) : ["thoughts", "comments", "views", "likes"];
    } catch {
      return ["thoughts", "comments", "views", "likes"];
    }
  });

  const [selectedTopicFocus, setSelectedTopicFocus] = useState<string>(() => {
    if (typeof window === "undefined") return "all";
    try {
      return localStorage.getItem("gogetters_bot_scheduler_topic") || "all";
    } catch {
      return "all";
    }
  });

  const [secondsUntilNextTick, setSecondsUntilNextTick] = useState<number>(
    () => schedulerIntervalSeconds
  );
  const [isExecutingCycle, setIsExecutingCycle] = useState<boolean>(false);
  const [showViewLogicInfo, setShowViewLogicInfo] = useState<boolean>(false);

  // Load Overview Data
  const fetchOverview = useCallback(async () => {
    try {
      setIsStatsLoading(true);
      const res = await fetch("/api/admin/overview");
      const json = await res.json();
      if (json.success) {
        setStats(json.data);
        setDailyLimitInput(json.data.engine.dailyLimit);
      }
    } catch {
      toast.error("Statistika ma'lumotlarini yuklashda xatolik yuz berdi");
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  const schedulerIntervalRef = useRef(schedulerIntervalSeconds);
  useEffect(() => {
    schedulerIntervalRef.current = schedulerIntervalSeconds;
  }, [schedulerIntervalSeconds]);

  const executeAutonomousCycle = useCallback(
    async (force = false) => {
      if (isExecutingCycle) return;
      setIsExecutingCycle(true);
      try {
        const res = await fetch("/api/admin/bots/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "autonomous_cycle",
            sections: selectedSections,
            topicFocus: selectedTopicFocus,
            force,
          }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success(`🤖 Sikl bajarildi: ${data.message}`);
          await fetchOverview();
        } else {
          toast.info(data.message || "Sikl o'tkazib yuborildi");
        }
      } catch (err) {
        console.error("Cycle execution error:", err);
        toast.error("Avtonom siklni bajarishda xatolik yuz berdi");
      } finally {
        setIsExecutingCycle(false);
        setSecondsUntilNextTick(schedulerIntervalRef.current);
      }
    },
    [isExecutingCycle, selectedSections, selectedTopicFocus, fetchOverview]
  );

  const executeRef = useRef(executeAutonomousCycle);
  useEffect(() => {
    executeRef.current = executeAutonomousCycle;
  }, [executeAutonomousCycle]);

  // Solid, uninterrupted 1-second countdown timer
  useEffect(() => {
    if (!isAutoSchedulerActive) return;

    const timer = setInterval(() => {
      setSecondsUntilNextTick((prev) => {
        if (prev <= 1) {
          setTimeout(() => {
            executeRef.current?.(true);
          }, 0);
          return schedulerIntervalRef.current;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAutoSchedulerActive]);

  const toggleAutoScheduler = async () => {
    const nextState = !isAutoSchedulerActive;
    setIsAutoSchedulerActive(nextState);

    if (nextState) {
      setSecondsUntilNextTick(schedulerIntervalSeconds);
      toast.success(
        `Uzluksiz jonli bot oqimi yoqildi! Oraliq tanaffus: ${schedulerIntervalSeconds} soniya.`
      );
      try {
        await fetch("/api/admin/bots/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update_settings", isActive: true }),
        });
      } catch {}

      setTimeout(() => {
        executeAutonomousCycle(true);
      }, 100);
    } else {
      toast.info("Avtomatik bot faolligi to'xtatildi");
    }

    try {
      localStorage.setItem("gogetters_bot_scheduler_active", String(nextState));
    } catch {}
  };

  const handleIntervalChange = (secs: number) => {
    setSchedulerIntervalSeconds(secs);
    setSecondsUntilNextTick(secs);
    try {
      localStorage.setItem("gogetters_bot_scheduler_interval_seconds", String(secs));
    } catch {}
  };

  const toggleSection = (sectionKey: string) => {
    setSelectedSections((prev) => {
      const next = prev.includes(sectionKey)
        ? prev.filter((s) => s !== sectionKey)
        : [...prev, sectionKey];
      const finalSections = next.length > 0 ? next : [sectionKey];
      try {
        localStorage.setItem("gogetters_bot_scheduler_sections", JSON.stringify(finalSections));
      } catch {}
      return finalSections;
    });
  };

  const handleTopicFocusChange = (topic: string) => {
    setSelectedTopicFocus(topic);
    try {
      localStorage.setItem("gogetters_bot_scheduler_topic", topic);
    } catch {}
  };

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
        toast.error(json.error || "Amalni bajarishda xatolik yuz berdi");
      }
    } catch (err) {
      toast.error((err as Error).message || "Server bilan aloqa uzildi");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingSettings(true);
      await handleBotAction("update_settings", { dailyLimit: dailyLimitInput });
    } finally {
      setIsSavingSettings(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const pageTitle =
    locale === "uz"
      ? "AI Bot Dvigateli"
      : locale === "ru"
      ? "AI Bot Движок"
      : "AI Bot Engine";

  const pageSubtitle =
    locale === "uz"
      ? "Gemini avtonom harakatlari, sikllar, limitlar va bo'limlar nazorati"
      : locale === "ru"
      ? "Автономные действия Gemini, циклы, лимиты и разделы"
      : "Gemini autonomous cycles, limits and section controls";

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
        {/* Engine Master Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Bot className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    stats?.engine.isActive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                  }`}
                />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  {stats?.engine.isActive ? "Dvigatel: Faol (Active)" : "Dvigatel: Pauzada"}
                </span>
                {isAutoSchedulerActive && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Avtonom oqim yoniq
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                Gemini Sun&apos;iy Intellekt Dvigateli
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Bugungi faollik:{" "}
                <strong className="text-slate-900 dark:text-white font-mono">
                  {stats?.engine.todayCount ?? 0}
                </strong>{" "}
                / {stats?.engine.dailyLimit ?? 30} harakat
              </p>
            </div>
          </div>

          {/* Master Switch Actions */}
          <div className="flex items-center gap-2.5 self-stretch md:self-auto justify-end">
            <button
              type="button"
              onClick={() => handleBotAction("toggle_active")}
              disabled={actionLoading === "toggle_active"}
              className={`flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                stats?.engine.isActive
                  ? "bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              {stats?.engine.isActive ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Dvigatelni Pauzaga Qo&apos;yish</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Dvigatelni Yoqish</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Autonomous Bot Activity Scheduler */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/10 pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Uzluksiz Jonli Bot Oqimi</span>
                    {isAutoSchedulerActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Ishlamoqda
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-500 border border-slate-200 dark:border-white/10">
                        Pauzada
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Botlarni qo&apos;lda boshqarish shart emas. Vaqt oralig&apos;ini va bo&apos;limlarni tanlang, tizim avtomatik postlar yozadi va munosabat bildiradi.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {isAutoSchedulerActive && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-white/10 text-xs font-medium text-slate-600 dark:text-zinc-300">
                  <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-pulse" />
                  <span>Keyingi amalga:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {secondsUntilNextTick < 60
                      ? `${secondsUntilNextTick}s`
                      : `${Math.floor(secondsUntilNextTick / 60)}:${String(
                          secondsUntilNextTick % 60
                        ).padStart(2, "0")}`}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={() => executeAutonomousCycle(true)}
                disabled={isExecutingCycle}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 hover:bg-blue-100/70 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
              >
                {isExecutingCycle ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Bajarilmoqda...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Hozir bir amal bajartirish</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={toggleAutoScheduler}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  isAutoSchedulerActive
                    ? "bg-rose-500 hover:bg-rose-600 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {isAutoSchedulerActive ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>To&apos;xtatish</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Avtomatik Oqimni Yoqish</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 1. Interval Settings & 2. Topic Focus */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Interval */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Amallar oralig&apos;i (Pauza vaqti)
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Jonli oqim
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { secs: 5, label: "5s", tag: "Super" },
                  { secs: 10, label: "10s", tag: "Tavsiya" },
                  { secs: 15, label: "15s", tag: "Jonli" },
                  { secs: 30, label: "30s", tag: "Me'yorda" },
                  { secs: 60, label: "1m", tag: "Sokin" },
                ].map((item) => (
                  <button
                    key={item.secs}
                    type="button"
                    onClick={() => handleIntervalChange(item.secs)}
                    className={`py-2 px-1 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      schedulerIntervalSeconds === item.secs
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-zinc-800/40 text-slate-600 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    <span>{item.label}</span>
                    <span
                      className={`text-[9px] font-normal ${
                        schedulerIntervalSeconds === item.secs
                          ? "text-blue-100"
                          : "text-slate-400 dark:text-zinc-500"
                      }`}
                    >
                      {item.tag}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-2">
                Botlar har {schedulerIntervalSeconds} soniyada navbatdagi tabiiy amalni bajaradi.
              </p>
            </div>

            {/* Topic Focus */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2">
                Mavzu yo&apos;nalishi (Topic Focus)
              </label>
              <select
                value={selectedTopicFocus}
                onChange={(e) => handleTopicFocusChange(e.target.value)}
                className="w-full py-2 px-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-zinc-800 text-xs font-medium text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500"
              >
                <option value="all">Barcha mavzular (Xilma-xil muvozanatli yo&apos;nalishlar)</option>
                <option value="productivity">Mahsuldorlik, Diqqat & Odatlar (Atomic Habits, Deep Work)</option>
                <option value="business_startup">Startaplar, Biznes & Mijozlar (MVP, Monetizatsiya, Sotuv)</option>
                <option value="career_team">Karyera, Ish bozori & Jamoa (Soft skills, Remote work)</option>
                <option value="psychology_burnout">Ish-hayot balansi & Salomatlik (Burnout, Uyqu, Detox)</option>
                <option value="books_science">Kitoblar, Tahlillar & Ilmiy tadqiqotlar</option>
                <option value="questions_debates">Hamjamiyat bahslari & Savollar (&quot;Sizda qanday?&quot;)</option>
                <option value="design_ux">UI/UX Dizayn & Foydalanuvchi tajribasi (Figma, Qulaylik)</option>
                <option value="tech_innovation">Dasturlash & Texnologiyalar (Soddalik, AI, Muhandislik)</option>
              </select>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-2">
                Botlar post uzunligini va uslubini personaga qarab tanlaydi.
              </p>
            </div>
          </div>

          {/* 3. Sections Multi-select */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2.5">
              Faol bo&apos;limlar (AI botlar qaysi amallarni mustaqil bajarsin)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                {
                  id: "thoughts",
                  title: "AI Fikrlar (Postlar)",
                  desc: "Botlar o'z mutaxassisligi bo'yicha erkin postlar yozadi",
                  icon: Sparkles,
                  badge: "Post",
                },
                {
                  id: "search_thoughts",
                  title: "Google Grounding (Search)",
                  desc: "Internetdan yangi trend va faktlarni topib tahliliy post yozadi",
                  icon: Globe,
                  badge: "Google Search",
                },
                {
                  id: "comments",
                  title: "Chuqur Tahliliy Izohlar",
                  desc: "Mavjud postlarni tushunib, professional mulohaza bildiradi",
                  icon: MessageSquare,
                  badge: "Izoh",
                },
                {
                  id: "replies",
                  title: "Munozaraga Javoblar (Replies)",
                  desc: "Izohlarga javob yozib, jonli munozara hosil qiladi",
                  icon: Brain,
                  badge: "Dialog",
                },
                {
                  id: "views",
                  title: "Postlarni Ko'rish & O'rganish",
                  desc: "Postni ko'radi, bazada ko'rishlar sonini oshiradi",
                  icon: Eye,
                  badge: "24h Deduplication",
                },
                {
                  id: "likes",
                  title: "Layklar & Obunalar",
                  desc: "Qiziqarli postlarga layk bosadi va obuna bo'ladi",
                  icon: Heart,
                  badge: "Reaksiya",
                },
              ].map((sec) => {
                const isChecked = selectedSections.includes(sec.id);
                const SecIcon = sec.icon;
                return (
                  <div
                    key={sec.id}
                    onClick={() => toggleSection(sec.id)}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                      isChecked
                        ? "border-blue-500/60 bg-blue-50/20 dark:bg-blue-950/20 shadow-xs"
                        : "border-slate-200/80 dark:border-white/10 bg-slate-50/40 dark:bg-zinc-800/30 opacity-60 hover:opacity-85"
                    }`}
                  >
                    <div
                      className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                        isChecked
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-700"
                      }`}
                    >
                      {isChecked && <CheckSquare className="w-3 h-3 fill-current" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <SecIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {sec.title}
                        </span>
                        <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 font-medium">
                          {sec.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                        {sec.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Collapsible Info */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-zinc-800/40 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowViewLogicInfo(!showViewLogicInfo)}
              className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer hover:bg-slate-100/60 dark:hover:bg-zinc-800/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                  Mantiqiy tushuntirish: AI bot ning postni ko&apos;rishini tizim qanday aniqlaydi?
                </span>
              </div>
              {showViewLogicInfo ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showViewLogicInfo && (
              <div className="px-4 pb-4 pt-1 border-t border-slate-200/60 dark:border-white/5 text-xs text-slate-600 dark:text-zinc-300 space-y-3">
                <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                  AI bot inson kabi postni &quot;o&apos;qishi&quot; va tizimda bu ko&apos;rish sifatida hisoblanishi uchun 4 bosqichli mantiq ishlaydi:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10">
                    <span className="font-bold text-blue-600 dark:text-blue-400 block mb-1">
                      1. Lentani kashf qilish (Post Discovery)
                    </span>
                    Bot feed&apos;dagi eng so&apos;nggi postlarni ko&apos;rib chiqadi va sarlavhalarini o&apos;rganadi.
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10">
                    <span className="font-bold text-blue-600 dark:text-blue-400 block mb-1">
                      2. Persona & Qiziqish Korrelyatsiyasi (Interest Match)
                    </span>
                    Har bir bot o&apos;z mutaxassislik personasiga ega (Frontend, Backend, UI/UX, Biznes) va mos mavzuni diqqat bilan o&apos;qiydi.
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10">
                    <span className="font-bold text-blue-600 dark:text-blue-400 block mb-1">
                      3. PostViews bazasi & 24h Deduplikatsiya
                    </span>
                    Tizim ma&apos;lumotlar bazasidagi haqiqiy postViews jadvaliga yozadi. 24 soat ichida bir bot qayta ko&apos;rsa sun&apos;iy ko&apos;paymaydi.
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10">
                    <span className="font-bold text-blue-600 dark:text-blue-400 block mb-1">
                      4. O&apos;qishdan keyingi Munosabat (Read to Action)
                    </span>
                    Postni ko&apos;rgan bot keyinchalik unga izoh yozishi yoki layk bosishi ehtimoli ortadi.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Global Limits & Settings */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-5">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Global Limitlar va Sozlamalar
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Spam ko&apos;rinishining oldini olish va model parametrlarini saqlash
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Kunlik maksimal harakatlar limiti (Postlar + Izohlar)
              </label>
              <input
                type="number"
                min={1}
                max={1000}
                value={dailyLimitInput}
                onChange={(e) => setDailyLimitInput(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Tavsiya etilgan: 20 dan 50 tagacha (tabiiy oqimni saqlash uchun)
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-white/5 space-y-2.5 text-xs text-slate-600 dark:text-zinc-300">
              <div className="flex items-center justify-between">
                <span>Sun&apos;iy Intellekt Modeli:</span>
                <strong className="text-slate-900 dark:text-white font-mono">
                  Google Gemini 2.5 / 3.5 Flash
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Tungi Sukunat Rejimi:</span>
                <strong className="text-slate-900 dark:text-white">
                  01:00 — 07:00 (Toshkent vaqti)
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Xavfsizlik & Anti-Robot:</span>
                <strong className="text-emerald-600 dark:text-emerald-400">
                  O&apos;zbek tili Anti-Robot filtri faol
                </strong>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingSettings}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSavingSettings ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{isSavingSettings ? "Saqlanmoqda..." : "Sozlamalarni saqlash"}</span>
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
