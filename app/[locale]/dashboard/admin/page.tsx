"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Users,
  FileText,
  MessageSquare,
  Bot,
  Activity,
  Play,
  Pause,
  RefreshCw,
  Trash2,
  ExternalLink,
  Search,
  Sparkles,
  Sliders,
  Eye,
  Heart,
  Edit2,
  Dice5,
  X,
  Loader2,
  Globe,
  Brain,
  Clock,
  CheckSquare,
  Square,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { EditPostModal } from "@/components/feed/edit-post-modal";
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

interface AdminUser {
  id: string;
  name: string;
  handle: string;
  email: string | null;
  phone: string | null;
  role: string;
  bio: string | null;
  avatarUrl: string | null;
  isBot: boolean;
  botPersona: string | null;
  createdAt: string;
  postsCount: number;
}

interface AdminPost {
  id: string;
  title: string | null;
  content: string;
  postType: string;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  createdAt: string;
  author: {
    id: string;
    name: string;
    handle: string;
    avatarUrl: string | null;
    isBot: boolean;
  };
}

type TabType = "overview" | "users" | "posts" | "settings";
type UserFilter = "all" | "real" | "bots";
type PostFilter = "all" | "real" | "bots";

export default function AdminPage() {
  const { localePath } = useI18n();

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  // Users Tab State
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [userFilter, setUserFilter] = useState<UserFilter>("all");
  const [userSearch, setUserSearch] = useState("");
  const [isUsersLoading, setIsUsersLoading] = useState(false);

  // Posts Tab State
  const [postsList, setPostsList] = useState<AdminPost[]>([]);
  const [postFilter, setPostFilter] = useState<PostFilter>("all");
  const [postSearch, setPostSearch] = useState("");
  const [isPostsLoading, setIsPostsLoading] = useState(false);

  // Bot Action Trigger Loading State
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Edit Bot Profile State
  const [editingBot, setEditingBot] = useState<AdminUser | null>(null);
  const [editBotName, setEditBotName] = useState("");
  const [editBotHandle, setEditBotHandle] = useState("");
  const [editBotRole, setEditBotRole] = useState("");
  const [editBotBio, setEditBotBio] = useState("");
  const [editBotAvatarUrl, setEditBotAvatarUrl] = useState("");
  const [editBotPersona, setEditBotPersona] = useState("");
  const [isSavingBot, setIsSavingBot] = useState(false);

  // Edit Post State
  const [editingPost, setEditingPost] = useState<AdminPost | null>(null);

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
      if (saved) return Number(saved);
      return 10;
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

  const [secondsUntilNextTick, setSecondsUntilNextTick] = useState<number>(() => schedulerIntervalSeconds);
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
  schedulerIntervalRef.current = schedulerIntervalSeconds;

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
  executeRef.current = executeAutonomousCycle;

  // Solid, uninterrupted 1-second countdown timer
  useEffect(() => {
    if (!isAutoSchedulerActive) return;

    const timer = setInterval(() => {
      setSecondsUntilNextTick((prev) => {
        if (prev <= 1) {
          // Trigger autonomous action outside state updater
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
      // Ensure backend engine is active
      try {
        await fetch("/api/admin/bots/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update_settings", isActive: true }),
        });
      } catch {}

      // Execute first action immediately so user doesn't wait in silence
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

  const handleOpenEditBot = (u: AdminUser) => {
    setEditingBot(u);
    setEditBotName(u.name);
    setEditBotHandle(u.handle);
    setEditBotRole(u.role);
    setEditBotBio(u.bio || "");
    setEditBotAvatarUrl(u.avatarUrl || "");
    setEditBotPersona(u.botPersona || "");
  };

  const handleRandomAvatar = () => {
    const seed = Math.random().toString(36).substring(7);
    const collections = ["micah", "personas", "bottts", "avataaars"];
    const col = collections[Math.floor(Math.random() * collections.length)];
    setEditBotAvatarUrl(`https://api.dicebear.com/7.x/${col}/svg?seed=${seed}`);
  };

  const handleSaveBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBot) return;
    try {
      setIsSavingBot(true);
      const res = await fetch("/api/admin/bots/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_bot_profile",
          botId: editingBot.id,
          name: editBotName,
          handle: editBotHandle,
          role: editBotRole,
          bio: editBotBio,
          avatarUrl: editBotAvatarUrl,
          botPersona: editBotPersona,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Bot profili muvaffaqiyatli yangilandi!");
        setEditingBot(null);
        fetchUsers();
      } else {
        toast.error(json.error || "Saqlashda xatolik yuz berdi");
      }
    } catch {
      toast.error("Server bilan aloqa uzildi");
    } finally {
      setIsSavingBot(false);
    }
  };

  // Load Users List
  const fetchUsers = useCallback(async () => {
    try {
      setIsUsersLoading(true);
      const params = new URLSearchParams();
      if (userFilter !== "all") params.set("filter", userFilter);
      if (userSearch) params.set("q", userSearch);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setUsersList(json.data.users);
      }
    } catch {
      toast.error("Foydalanuvchilarni yuklashda xatolik");
    } finally {
      setIsUsersLoading(false);
    }
  }, [userFilter, userSearch]);

  // Load Posts List
  const fetchPosts = useCallback(async () => {
    try {
      setIsPostsLoading(true);
      const params = new URLSearchParams();
      if (postFilter !== "all") params.set("filter", postFilter);
      if (postSearch) params.set("q", postSearch);

      const res = await fetch(`/api/admin/posts?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setPostsList(json.data.posts);
      }
    } catch {
      toast.error("Postlarni yuklashda xatolik");
    } finally {
      setIsPostsLoading(false);
    }
  }, [postFilter, postSearch]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    } else if (activeTab === "posts") {
      fetchPosts();
    }
  }, [activeTab, fetchUsers, fetchPosts]);

  // Handle Bot Actions
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
        if (activeTab === "users") fetchUsers();
        if (activeTab === "posts") fetchPosts();
      } else {
        toast.error(json.error || "Amalni bajarishda xatolik yuz berdi");
      }
    } catch (err) {
      toast.error((err as Error).message || "Server bilan aloqa uzildi");
    } finally {
      setActionLoading(null);
    }
  };

  // Delete User
  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Haqiqatan ham "${name}" profilini o'chirmoqchimisiz?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Profil o'chirildi");
        fetchUsers();
        fetchOverview();
      } else {
        toast.error(json.error || "O'chirishda xatolik");
      }
    } catch {
      toast.error("Xatolik yuz berdi");
    }
  };

  // Delete Post
  const handleDeletePost = async (id: string) => {
    if (!confirm("Ushbu postni o'chirmoqchimisiz?")) return;
    try {
      const res = await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Post o'chirildi");
        fetchPosts();
        fetchOverview();
      } else {
        toast.error(json.error || "O'chirishda xatolik");
      }
    } catch {
      toast.error("Xatolik yuz berdi");
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingSettings(true);
      await handleBotAction("update_settings", { dailyLimit: dailyLimitInput });
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 pb-16">
      {/* Top Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                  A
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight">
                    Admin Boshqaruv Markazi
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Haqiqiy foydalanuvchilar, botlar va platforma faoliyati
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Engine State Indicator */}
            {stats && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full ${
                      stats.engine.isActive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                    }`}
                  />
                  <span>
                    Bot Tizimi:{" "}
                    <strong>{stats.engine.isActive ? "Faol (Active)" : "Pauzada (Paused)"}</strong>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleBotAction("toggle_active")}
                  disabled={actionLoading === "toggle_active"}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    stats.engine.isActive
                      ? "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {stats.engine.isActive ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>To'xtatish</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Faollashtirish</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Navigation Tabs - Clean, no badges */}
          <div className="flex items-center gap-6 mt-6 border-t border-slate-100 dark:border-slate-800 pt-3">
            {[
              { id: "overview", label: "Umumiy ko'rinish", icon: Activity },
              { id: "users", label: "Foydalanuvchilar va Botlar", icon: Users },
              { id: "posts", label: "Postlar arxivi", icon: FileText },
              { id: "settings", label: "Bot sozlamalari", icon: Sliders },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2 pb-2 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                    isActive
                      ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                      : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW */}
        {/* ========================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* 4 Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Users Metric */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
                  <span className="text-xs font-medium uppercase tracking-wider">Foydalanuvchilar</span>
                  <Users className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {isStatsLoading ? "..." : stats?.users.total}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2">
                  <span>
                    Haqiqiy: <strong className="text-emerald-600 dark:text-emerald-400">{stats?.users.real}</strong>
                  </span>
                  <span>
                    Botlar: <strong className="text-indigo-600 dark:text-indigo-400">{stats?.users.bots}</strong>
                  </span>
                </div>
              </div>

              {/* Posts Metric */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
                  <span className="text-xs font-medium uppercase tracking-wider">Postlar</span>
                  <FileText className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {isStatsLoading ? "..." : stats?.posts.total}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2">
                  <span>
                    Haqiqiy: <strong className="text-emerald-600 dark:text-emerald-400">{stats?.posts.real}</strong>
                  </span>
                  <span>
                    Botlar: <strong className="text-indigo-600 dark:text-indigo-400">{stats?.posts.bots}</strong>
                  </span>
                </div>
              </div>

              {/* Comments Metric */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
                  <span className="text-xs font-medium uppercase tracking-wider">Izohlar (Comments)</span>
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {isStatsLoading ? "..." : stats?.comments.total}
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2">
                  Jonli bahslar va munozaralar
                </p>
              </div>

              {/* Today Bot Activity */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
                  <span className="text-xs font-medium uppercase tracking-wider">Bugungi Bot Faolligi</span>
                  <Bot className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {isStatsLoading ? "..." : `${stats?.engine.todayCount} / ${stats?.engine.dailyLimit}`}
                </div>
                <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        ((stats?.engine.todayCount || 0) / (stats?.engine.dailyLimit || 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Autonomous Bot Activity Controller */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Uzluksiz Avtonom Bot Faolligi</span>
                        {isAutoSchedulerActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Faol ishlamoqda
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Pauzada
                          </span>
                        )}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Botlarni bittalab boshqarish shart emas. Bo'limlar va vaqt oralig'ini tanlang, botlar o'zi avtomatik fikrlar, izohlar va munosabatlar bildiradi.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {isAutoSchedulerActive && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                      <span>Keyingi amalga:</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {secondsUntilNextTick < 60
                          ? `${secondsUntilNextTick} soniya`
                          : `${Math.floor(secondsUntilNextTick / 60)}:${String(secondsUntilNextTick % 60).padStart(2, "0")}`}
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => executeAutonomousCycle(true)}
                    disabled={isExecutingCycle}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 hover:bg-indigo-100/70 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
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
                    className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
                      isAutoSchedulerActive
                        ? "bg-rose-500 hover:bg-rose-600 text-white"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white"
                    }`}
                  >
                    {isAutoSchedulerActive ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>To'xtatish</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Avtomatik oqimni yoqish</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Settings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Interval Settings */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Amallar oralig&apos;i (Pauza vaqti)
                    </label>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      To&apos;xtovsiz jonli oqim
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { secs: 5, label: "5 soniya", tag: "Super tez" },
                      { secs: 10, label: "10 soniya", tag: "Tavsiya" },
                      { secs: 15, label: "15 soniya", tag: "Jonli" },
                      { secs: 30, label: "30 soniya", tag: "Me'yorda" },
                      { secs: 60, label: "60 soniya", tag: "1 daqiqa" },
                    ].map((item) => (
                      <button
                        key={item.secs}
                        type="button"
                        onClick={() => handleIntervalChange(item.secs)}
                        className={`py-2 px-1.5 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                          schedulerIntervalSeconds === item.secs
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                            : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        <span>{item.label}</span>
                        <span
                          className={`text-[9px] font-normal ${
                            schedulerIntervalSeconds === item.secs
                              ? "text-indigo-100"
                              : "text-slate-400 dark:text-slate-500"
                          }`}
                        >
                          {item.tag}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                    Botlar to&apos;xtamasdan ketma-ket ishlaydi: har {schedulerIntervalSeconds} soniyada navbatdagi amal (yangi fikr, izoh, bahsga javob, layk yoki ko&apos;rish) avtomatik bajariladi.
                  </p>
                </div>

                {/* 2. Topic Focus */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Mavzu yo'nalishi (Topic Focus)
                  </label>
                  <select
                    value={selectedTopicFocus}
                    onChange={(e) => handleTopicFocusChange(e.target.value)}
                    className="w-full py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">Barcha mavzular (Xilma-xil muvozanatli yo'nalishlar)</option>
                    <option value="productivity">Mahsuldorlik, Diqqat & Odatlar (Atomic Habits, Deep Work)</option>
                    <option value="business_startup">Startaplar, Biznes & Mijozlar (MVP, Monetizatsiya, Sotuv)</option>
                    <option value="career_team">Karyera, Ish bozori & Jamoa (Soft skills, Remote work, Suhbatlar)</option>
                    <option value="psychology_burnout">Ish-hayot balansi & Salomatlik (Burnout, Uyqu, Digital Detox)</option>
                    <option value="books_science">Kitoblar, Tahlillar & Ilmiy tadqiqotlar (Bestsellerlar, Psixologiya)</option>
                    <option value="questions_debates">Hamjamiyat bahslari & Savollar ("Sizda qanday?", Fikr almashish)</option>
                    <option value="design_ux">UI/UX Dizayn & Foydalanuvchi tajribasi (Figma, Qulaylik)</option>
                    <option value="tech_innovation">Dasturlash & Texnologiyalar (Soddalik, AI, Muhandislik)</option>
                  </select>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                    Botlar post uzunligini me&apos;yorda (qisqa fikrlar, o&apos;rtacha keyslar, tahliliy maqolalar) va boy HTML formatida yozadi.
                  </p>
                </div>
              </div>

              {/* 3. Sections Multi-select */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2.5">
                  Faol bo'limlar va imkoniyatlar (AI botlar qaysi amallarni mustaqil bajarsin)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    {
                      id: "thoughts",
                      title: "AI Fikrlar (Postlar)",
                      desc: "Botlar o'z mutaxassisligi bo'yicha erkin fikr va postlar yozadi",
                      icon: Sparkles,
                      badge: "Post",
                    },
                    {
                      id: "search_thoughts",
                      title: "Internet Tahlili (Google Search)",
                      desc: "Internetdan eng so'nggi yangilik va faktlarni topib tahliliy post yozadi",
                      icon: Globe,
                      badge: "Google Grounding",
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
                      desc: "Izohlarga javob yozib, jonli munozara va bahs hosil qiladi",
                      icon: Brain,
                      badge: "Dialog",
                    },
                    {
                      id: "views",
                      title: "Postlarni Ko'rish & O'rganish",
                      desc: "Postni ko'radi, bazada ko'rishlar sonini oshiradi va o'rganadi",
                      icon: Eye,
                      badge: "24h Deduplication",
                    },
                    {
                      id: "likes",
                      title: "Layklar & Obunalar",
                      desc: "Qiziqarli postlarga layk bosadi va mualliflarga obuna bo'ladi",
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
                        className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                          isChecked
                            ? "border-indigo-500/60 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-xs"
                            : "border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 opacity-60 hover:opacity-85"
                        }`}
                      >
                        <div
                          className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                            isChecked
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                          }`}
                        >
                          {isChecked && <CheckSquare className="w-3 h-3 fill-current" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <SecIcon className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {sec.title}
                            </span>
                            <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                              {sec.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            {sec.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. Collapsible Explanation: Bot postni ko'rishini qanday aniqlaydi? */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowViewLogicInfo(!showViewLogicInfo)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-800/70 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Mantiqiy tushuntirish: AI bot ning postni ko'rishini tizim qanday aniqlaydi?
                    </span>
                  </div>
                  {showViewLogicInfo ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {showViewLogicInfo && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-3">
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                      AI bot inson kabi postni "o'qishi" va tizimda bu ko'rish sifatida hisoblanishi uchun 4 bosqichli mantiq ishlaydi:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">
                          1. Lentani kashf qilish (Post Discovery)
                        </span>
                        Bot feed&apos;dagi eng so&apos;nggi postlarni ko&apos;rib chiqadi. Qaysi postlar yaqinda chiqqanini va ularning sarlavha/matnini o&apos;rganadi.
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">
                          2. Persona & Qiziqish Korrelyatsiyasi (Interest Match)
                        </span>
                        Har bir bot o&apos;z mutaxassislik personasiga ega (Frontend, Backend, UI/UX, Biznes). Bot o&apos;z roliga yaqin mavzudagi postlarni ko&apos;proq diqqat bilan o&apos;qiydi.
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">
                          3. PostViews bazasi & 24h Deduplikatsiya
                        </span>
                        Tizim <code className="text-indigo-500 font-mono">recordPostView(postId, botId)</code> ni chaqirib, ma&apos;lumotlar bazasidagi haqiqiy <code className="text-indigo-500 font-mono">postViews</code> jadvaliga yozadi va post hisoblagichini oshiradi. 24 soat ichida bir bot qayta ko&apos;rsa, sun&apos;iy ko&apos;paytirishning oldi olinadi.
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">
                          4. O&apos;qishdan keyingi Munosabat (Read to Action)
                        </span>
                        Postni ko&apos;rgan bot keyingi qadamda unga izoh yozishi yoki layk bosishi ehtimoli oshadi. Barcha ko&apos;rishlar <code className="text-indigo-500 font-mono">botActivities</code> audit jadvalida qayd etiladi.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Tezkor Harakatlar (Instant Triggers)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Gemini AI orqali bir martalik amallarni darhol bajarish
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchOverview}
                  className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Yangilash</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Organic Post */}
                <button
                  type="button"
                  onClick={() => handleBotAction("create_post")}
                  disabled={actionLoading !== null}
                  className="flex flex-col items-start p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all text-left group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {actionLoading === "create_post" ? "Yozilmoqda..." : "Yangi post yaratish"}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    AI bot nomidan tabiiy insoniy post chiqaradi
                  </span>
                </button>

                {/* 2. Internet Grounded Post */}
                <button
                  type="button"
                  onClick={() => handleBotAction("create_post_search")}
                  disabled={actionLoading !== null}
                  className="flex flex-col items-start p-4 rounded-xl border border-blue-200/80 dark:border-blue-900/50 hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/30 transition-all text-left group cursor-pointer bg-blue-50/10"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                    <Globe className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{actionLoading === "create_post_search" ? "Qidirilmoqda..." : "Internet tahlilli post"}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/70 text-blue-700 dark:text-blue-300 font-semibold uppercase">Google</span>
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Internetdan eng so'nggi faktlar va trendlar asosida yozadi
                  </span>
                </button>

                {/* 3. Organic Comment */}
                <button
                  type="button"
                  onClick={() => handleBotAction("create_comment")}
                  disabled={actionLoading !== null}
                  className="flex flex-col items-start p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all text-left group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {actionLoading === "create_comment" ? "Yozilmoqda..." : "Tabiiy izoh qoldirish"}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Mavjud postga tabiiy fikr yozadi
                  </span>
                </button>

                {/* 4. Deep Reasoning Comment */}
                <button
                  type="button"
                  onClick={() => handleBotAction("create_deep_comment")}
                  disabled={actionLoading !== null}
                  className="flex flex-col items-start p-4 rounded-xl border border-purple-200/80 dark:border-purple-900/50 hover:border-purple-500 hover:bg-purple-50/40 dark:hover:bg-purple-950/30 transition-all text-left group cursor-pointer bg-purple-50/10"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                    <Brain className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{actionLoading === "create_deep_comment" ? "Tahlil qilinmoqda..." : "Chuqur tahliliy izoh"}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/70 text-purple-700 dark:text-purple-300 font-semibold uppercase">Smart</span>
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Post mohiyatini o'rganib, ekspert darajasida mulohaza bildiradi
                  </span>
                </button>

                {/* 5. Create Profile */}
                <button
                  type="button"
                  onClick={() => handleBotAction("create_profile")}
                  disabled={actionLoading !== null}
                  className="flex flex-col items-start p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all text-left group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {actionLoading === "create_profile" ? "Yaratilmoqda..." : "Yangi bot profili"}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Ism, kasb, bio va avatarga ega yangi a'zo
                  </span>
                </button>

                {/* 6. Simulate Activity */}
                <button
                  type="button"
                  onClick={() => handleBotAction("simulate_activity")}
                  disabled={actionLoading !== null}
                  className="flex flex-col items-start p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all text-left group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                    <Heart className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {actionLoading === "simulate_activity" ? "Amalda..." : "Faollikni oshirish"}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Ko'rishlar, like va obunalarni simulyatsiya qilish
                  </span>
                </button>

                {/* 7. Autonomous Tick */}
                <button
                  type="button"
                  onClick={() => handleBotAction("tick")}
                  disabled={actionLoading !== null}
                  className="flex flex-col items-start p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all text-left group cursor-pointer bg-slate-50/50 dark:bg-slate-900/50 col-span-1 sm:col-span-2"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {actionLoading === "tick" ? "Tekshirilmoqda..." : "Avtonom sikl (Tick)"}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Tizim platforma holatini mustaqil baholab, eng to'g'ri tabiiy harakatni bajaradi
                  </span>
                </button>
              </div>
            </div>

            {/* Recent Bot Activities Log */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  So'nggi Bot Harakatlari Jurnali
                </h3>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-96 overflow-y-auto">
                {stats?.recentLogs && stats.recentLogs.length > 0 ? (
                  stats.recentLogs.map((log) => (
                    <div key={log.id} className="p-4 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                        <span className="font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-[10px] w-20 shrink-0">
                          {log.activityType}
                        </span>
                        <span className="text-slate-600 dark:text-slate-300 truncate">
                          {log.details || "Amal bajarildi"}
                        </span>
                      </div>
                      <span className="text-slate-400 dark:text-slate-500 shrink-0 ml-4">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Hali bot faoliyatlari jurnali mavjud emas.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: USERS (Real vs Bots Differentiation) */}
        {/* ========================================================================= */}
        {activeTab === "users" && (
          <div className="space-y-6">
            {/* Filter and Search Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Filter Tabs (Clean text with count) */}
              <div className="flex items-center gap-2">
                {[
                  { id: "all", label: "Barchasi" },
                  { id: "real", label: "Haqiqiy foydalanuvchilar" },
                  { id: "bots", label: "Botlar" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setUserFilter(f.id as UserFilter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      userFilter === f.id
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                        : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Ism, handle yoki kasb bo'yicha..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Foydalanuvchi</th>
                      <th className="py-3 px-4 font-semibold">Turi</th>
                      <th className="py-3 px-4 font-semibold">Kasbi / Rol</th>
                      <th className="py-3 px-4 font-semibold">Postlar</th>
                      <th className="py-3 px-4 font-semibold">Qo'shilgan sana</th>
                      <th className="py-3 px-4 font-semibold text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {isUsersLoading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          Yuklanmoqda...
                        </td>
                      </tr>
                    ) : usersList.length > 0 ? (
                      usersList.map((u) => (
                        <tr
                          key={u.id}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <UserAvatar
                                avatarUrl={u.avatarUrl}
                                name={u.name}
                                size="sm"
                              />
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-white">
                                  {u.name}
                                </p>
                                <p className="text-[11px] text-slate-400">@{u.handle}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {/* Subtle minimal text with dot - NO BADGES */}
                            <div className="flex items-center gap-1.5 font-medium text-[11px]">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  u.isBot ? "bg-indigo-500" : "bg-emerald-500"
                                }`}
                              />
                              <span
                                className={
                                  u.isBot
                                    ? "text-indigo-600 dark:text-indigo-400"
                                    : "text-emerald-600 dark:text-emerald-400"
                                }
                              >
                                {u.isBot ? "AI Bot" : "Haqiqiy foydalanuvchi"}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                            {u.role || "—"}
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-semibold">
                            {u.postsCount}
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {u.isBot && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditBot(u)}
                                  className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                                  title="Profilni tahrirlash"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}
                              <Link
                                href={localePath(`/dashboard/profile?handle=${u.handle}`)}
                                target="_blank"
                                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                title="Profilni ochish"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                                title="O'chirish"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          Hech qanday foydalanuvchi topilmadi.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: POSTS */}
        {/* ========================================================================= */}
        {activeTab === "posts" && (
          <div className="space-y-6">
            {/* Filter and Search Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {[
                  { id: "all", label: "Barcha postlar" },
                  { id: "real", label: "Haqiqiy foydalanuvchilar" },
                  { id: "bots", label: "Bot postlari" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setPostFilter(f.id as PostFilter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      postFilter === f.id
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                        : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={postSearch}
                  onChange={(e) => setPostSearch(e.target.value)}
                  placeholder="Sarlavha yoki matn bo'yicha..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Posts List */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {isPostsLoading ? (
                  <div className="p-12 text-center text-xs text-slate-400">Yuklanmoqda...</div>
                ) : postsList.length > 0 ? (
                  postsList.map((p) => (
                    <div
                      key={p.id}
                      className="p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {p.author.name}
                            </span>
                            <span className="text-slate-400">@{p.author.handle}</span>
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <span
                              className={`text-[11px] font-medium ${
                                p.author.isBot
                                  ? "text-indigo-600 dark:text-indigo-400"
                                  : "text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              {p.author.isBot ? "AI Bot" : "Haqiqiy"}
                            </span>
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <span className="text-slate-400">
                              {new Date(p.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          {p.title && (
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                              {p.title}
                            </h4>
                          )}

                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                            {p.content}
                          </p>

                          {/* Stats counter */}
                          <div className="flex items-center gap-4 pt-1 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5" />
                              {p.viewsCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="w-3.5 h-3.5" />
                              {p.likesCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3.5 h-3.5" />
                              {p.commentsCount}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setEditingPost(p)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Tahrirlash"
                          >
                            <Edit2 className="w-4 h-4 text-indigo-500" />
                          </button>
                          <Link
                            href={localePath(`/dashboard/posts/${p.id}`)}
                            target="_blank"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Saytda ko'rish"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeletePost(p.id)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 hover:border-red-300 dark:hover:border-red-800 transition-colors cursor-pointer"
                            title="O'chirish"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-xs text-slate-400">Postlar topilmadi.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: SETTINGS */}
        {/* ========================================================================= */}
        {activeTab === "settings" && (
          <div className="max-w-2xl bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Bot Tizimi Global Sozlamalari
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Kunlik limitlar, xavfsizlik va sun'iy intellekt qoidalari
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kunlik maksimal harakatlar limiti (Postlar + Izohlar)
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={dailyLimitInput}
                  onChange={(e) => setDailyLimitInput(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Tavsiya etilgan: 20 dan 50 tagacha (spam ko'rinishining oldini olish uchun)
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Sun'iy Intellekt Modeli:</span>
                  <strong className="text-slate-900 dark:text-white font-mono">
                    Google Gemini 2.5/3.5 Flash
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Tungi Sukunat Rejimi:</span>
                  <strong className="text-slate-900 dark:text-white">
                    01:00 — 07:00 (Toshkent vaqti)
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Xavfsizlik:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    O'zbek tili Anti-Robot filtri faol
                  </strong>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingSettings}
                className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                {isSavingSettings ? "Saqlanmoqda..." : "Sozlamalarni saqlash"}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Edit Bot Profile Modal */}
      {editingBot && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
        >
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Bot Profilini Tahrirlash
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Ism, username, kasb, rasm va personani yangilang
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingBot(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBot} className="p-5 space-y-4">
              {/* Avatar Preview & Randomizer */}
              <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <UserAvatar avatarUrl={editBotAvatarUrl} name={editBotName} size="lg" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Profil rasmi
                  </p>
                  <button
                    type="button"
                    onClick={handleRandomAvatar}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-xs"
                  >
                    <Dice5 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Tasodifiy yangi avatar</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ism Familiya
                  </label>
                  <input
                    type="text"
                    required
                    value={editBotName}
                    onChange={(e) => setEditBotName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Username (@handle)
                  </label>
                  <input
                    type="text"
                    required
                    value={editBotHandle}
                    onChange={(e) => setEditBotHandle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kasbi / Roli
                </label>
                <input
                  type="text"
                  required
                  value={editBotRole}
                  onChange={(e) => setEditBotRole(e.target.value)}
                  placeholder="masalan: Full-Stack Dasturchi"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bio (Tarjimai hol)
                </label>
                <textarea
                  value={editBotBio}
                  onChange={(e) => setEditBotBio(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Botning Xarakteri / Yozish uslubi (Persona)
                </label>
                <textarea
                  value={editBotPersona}
                  onChange={(e) => setEditBotPersona(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingBot(null)}
                  disabled={isSavingBot}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isSavingBot}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  {isSavingBot && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSavingBot ? "Saqlanmoqda..." : "Saqlash"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Post Modal in Admin */}
      {editingPost && (
        <EditPostModal
          isOpen={Boolean(editingPost)}
          onClose={() => setEditingPost(null)}
          postId={editingPost.id}
          initialTitle={editingPost.title}
          initialContent={editingPost.content}
          onSuccess={() => {
            setEditingPost(null);
            fetchPosts();
            fetchOverview();
          }}
        />
      )}
    </div>
  );
}
