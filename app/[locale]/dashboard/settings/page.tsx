"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";
import { toast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/context";
import { LOCALES, LOCALES_META } from "@/lib/i18n/config";
import { apiClient } from "@/lib/api/client";
import { uploadFile } from "@/lib/api/upload";
import {
  User,
  Shield,
  Lock,
  Bell,
  Monitor,
  ArrowLeft,
  Check,
  Loader2,
  Globe,
  MapPin,
  Image as ImageIcon,
  Smartphone,
  Eye,
  EyeOff,
  UserX,
  Download,
  LogOut,
  KeyRound,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  ChevronRight,
  Sun,
  Moon,
  Laptop,
  Share2,
  MessageSquare,
  Heart,
  UserPlus,
  AtSign,
  Mail,
  Camera,
  Dice5,
} from "lucide-react";
import { useTheme } from "@/components/theme/theme-context";
import { generateRandomAvatar } from "@/lib/avatar";

function GithubIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function LinkedinIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function TwitterIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    </svg>
  );
}

type SettingsTab = "account" | "privacy" | "security" | "notifications" | "system";

export default function SettingsPage() {
  const { session, isLoaded, updateCurrentUser, logout } = useAuth();
  const { theme: appTheme, setTheme: setAppTheme } = useTheme();
  const { t, locale, switchLocale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const currentTab = (searchParams.get("tab") as SettingsTab) || null;

  // Form states - Account & Profile
  const [name, setName] = useState(session.user.name || "");
  const [handle] = useState(session.user.handle.replace(/^@/, "") || "");
  const [role, setRole] = useState(session.user.role || "");
  const [bio, setBio] = useState(session.user.bio || "");
  const [location, setLocation] = useState(session.user.location || "");
  const [avatarUrl, setAvatarUrl] = useState(session.user.avatarUrl || "");
  const [coverPhotoUrl, setCoverPhotoUrl] = useState(session.user.coverPhotoUrl || "");

  // Social Links
  const [github, setGithub] = useState(session.user.socialLinks?.github || "");
  const [linkedin, setLinkedin] = useState(session.user.socialLinks?.linkedin || "");
  const [twitter, setTwitter] = useState(session.user.socialLinks?.twitter || "");
  const [website, setWebsite] = useState(session.user.socialLinks?.website || session.user.website || "");

  // Privacy states
  const [isPrivate, setIsPrivate] = useState(Boolean(session.user.isPrivate));
  const [dmPermission, setDmPermission] = useState<"everyone" | "followed" | "nobody">(
    session.user.dmPermission || "everyone"
  );
  const [showOnlineStatus, setShowOnlineStatus] = useState(
    session.user.showOnlineStatus !== false
  );
  const [blockedUsers, setBlockedUsers] = useState<
    Array<{ id: string; name: string; handle: string; avatarUrl?: string }>
  >([]);
  const [loadingBlocks, setLoadingBlocks] = useState(false);

  // Security states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(Boolean(session.user.twoFactorEnabled));
  const [twoFactorType, setTwoFactorType] = useState<"authenticator" | "sms">(
    session.user.twoFactorType || "authenticator"
  );
  const [activeSessions, setActiveSessions] = useState<
    Array<{
      id: string;
      deviceName: string;
      browser: string;
      ipAddress: string;
      location: string;
      isCurrent: boolean;
      lastActiveAt: string;
    }>
  >([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Notifications states
  const [notifyLikes, setNotifyLikes] = useState(true);
  const [notifyComments, setNotifyComments] = useState(true);
  const [notifyShares, setNotifyShares] = useState(true);
  const [notifyFollows, setNotifyFollows] = useState(true);
  const [notifyMentions, setNotifyMentions] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailDigest, setEmailDigest] = useState(true);
  const [emailSecurity, setEmailSecurity] = useState(true);

  // System & Theme states
  const [theme, setTheme] = useState<"dark" | "light" | "system">(() => {
    return (session.user.theme as "dark" | "light" | "system") || "system";
  });

  const [alphabet, setAlphabet] = useState<string>(() => {
    if (typeof window === "undefined") return "latin";
    try {
      const saved = localStorage.getItem("gogetters_alphabet") || localStorage.getItem("fikr_alphabet");
      return saved === "cyrillic" || saved === "latin" ? saved : "latin";
    } catch {
      return "latin";
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Modal confirm dialogs
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // File upload refs & loading states
  const settingsCoverRef = useRef<HTMLInputElement>(null);
  const settingsAvatarRef = useRef<HTMLInputElement>(null);
  const [isUploadingSettingsCover, setIsUploadingSettingsCover] = useState(false);
  const [isUploadingSettingsAvatar, setIsUploadingSettingsAvatar] = useState(false);

  const handleSettingsCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Rasm hajmi 10MB dan oshmasligi kerak");
      return;
    }
    setIsUploadingSettingsCover(true);
    try {
      const res = await uploadFile(file, "covers");
      setCoverPhotoUrl(res.url);
      await updateCurrentUser({ coverPhotoUrl: res.url });
      toast.success("Muqova rasmi yuklandi");
    } catch {
      toast.error("Muqova rasmini yuklashda xatolik");
    } finally {
      setIsUploadingSettingsCover(false);
      if (settingsCoverRef.current) settingsCoverRef.current.value = "";
    }
  };

  const handleSettingsAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Rasm hajmi 10MB dan oshmasligi kerak");
      return;
    }
    setIsUploadingSettingsAvatar(true);
    try {
      const res = await uploadFile(file, "avatars");
      setAvatarUrl(res.url);
      await updateCurrentUser({ avatarUrl: res.url });
      toast.success("Profil rasmi yuklandi");
    } catch {
      toast.error("Profil rasmini yuklashda xatolik");
    } finally {
      setIsUploadingSettingsAvatar(false);
      if (settingsAvatarRef.current) settingsAvatarRef.current.value = "";
    }
  };

  const handleSettingsRandomAvatar = async () => {
    const newAvatar = generateRandomAvatar();
    setAvatarUrl(newAvatar);
    try {
      await updateCurrentUser({ avatarUrl: newAvatar });
      toast.success("Tasodifiy avatar o‘rnatildi");
    } catch {
      toast.error("Avatarni saqlashda xatolik");
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarUrl("");
    try {
      await updateCurrentUser({ avatarUrl: "" });
      toast.success("Profil rasmi olib tashlandi");
    } catch {
      toast.error("Rasmni o'chirishda xatolik");
    }
  };

  const handleRemoveCover = async () => {
    setCoverPhotoUrl("");
    try {
      await updateCurrentUser({ coverPhotoUrl: "" });
      toast.success("Muqova rasmi olib tashlandi");
    } catch {
      toast.error("Muqovani o'chirishda xatolik");
    }
  };

  // Sync state when session is ready
  useEffect(() => {
    if (session.user.id) {
      setName(session.user.name || "");
      setRole(session.user.role || "");
      setBio(session.user.bio || "");
      setLocation(session.user.location || "");
      setAvatarUrl(session.user.avatarUrl || "");
      setCoverPhotoUrl(session.user.coverPhotoUrl || "");
      setGithub(session.user.socialLinks?.github || "");
      setLinkedin(session.user.socialLinks?.linkedin || "");
      setTwitter(session.user.socialLinks?.twitter || "");
      setWebsite(session.user.socialLinks?.website || session.user.website || "");
      setIsPrivate(Boolean(session.user.isPrivate));
      setDmPermission(session.user.dmPermission || "everyone");
      setShowOnlineStatus(session.user.showOnlineStatus !== false);
      setTwoFactorEnabled(Boolean(session.user.twoFactorEnabled));
      setTwoFactorType(session.user.twoFactorType || "authenticator");
    }
  }, [session.user]);

  // Load blocklist when on Privacy tab
  useEffect(() => {
    if (currentTab === "privacy") {
      setLoadingBlocks(true);
      apiClient<{ blockedUsers: any[] }>("/api/settings/blocks")
        .then((res) => setBlockedUsers(res.data.blockedUsers || []))
        .catch(() => {})
        .finally(() => setLoadingBlocks(false));
    }
  }, [currentTab]);

  // Load active sessions when on Security tab
  useEffect(() => {
    if (currentTab === "security") {
      setLoadingSessions(true);
      apiClient<{ sessions: any[] }>("/api/settings/sessions")
        .then((res) => setActiveSessions(res.data.sessions || []))
        .catch(() => {})
        .finally(() => setLoadingSessions(false));
    }
  }, [currentTab]);

  // Load notification settings when on Notifications tab
  useEffect(() => {
    if (currentTab === "notifications") {
      apiClient<{ settings: any }>("/api/settings/notifications")
        .then((res) => {
          if (res.data?.settings) {
            const s = res.data.settings;
            setNotifyLikes(s.notifyLikes ?? true);
            setNotifyComments(s.notifyComments ?? true);
            setNotifyShares(s.notifyShares ?? true);
            setNotifyFollows(s.notifyFollows ?? true);
            setNotifyMentions(s.notifyMentions ?? true);
            setPushEnabled(s.pushEnabled ?? true);
            setEmailDigest(s.emailDigest ?? true);
            setEmailSecurity(s.emailSecurity ?? true);
          }
        })
        .catch(() => {});
    }
  }, [currentTab]);

  const selectTab = (tab: SettingsTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`);
  };

  const backToMenu = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tab");
    router.push(`${pathname}?${params.toString()}`);
  };

  // Submit Profile & Account
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t("settings.nameRequired"));
      return;
    }

    setIsSubmitting(true);
    try {
      await updateCurrentUser({
        name: name.trim(),
        role: role.trim(),
        bio: bio.trim(),
        location: location.trim(),
        avatarUrl: avatarUrl.trim(),
        coverPhotoUrl: coverPhotoUrl.trim(),
        socialLinks: {
          github: github.trim(),
          linkedin: linkedin.trim(),
          twitter: twitter.trim(),
          website: website.trim(),
        },
        website: website.trim(),
      });

      setSavedSuccess(true);
      toast.success("Hisob ma'lumotlari saqlandi");
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      toast.error(t("settings.errorSaved"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Privacy Settings
  const handleSavePrivacy = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateCurrentUser({
        isPrivate,
        dmPermission,
        showOnlineStatus,
      });

      toast.success("Maxfiylik sozlamalari yangilandi");
    } catch {
      toast.error("Xatolik yuz berdi");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Unblock user
  const handleUnblockUser = async (userId: string) => {
    try {
      await apiClient(`/api/settings/blocks?userId=${userId}`, { method: "DELETE" });
      setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success("Foydalanuvchi blokdan chiqarildi");
    } catch {
      toast.error("Amalni bajarib bo'lmadi");
    }
  };

  // Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Yangi parollar mos kelmadi");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak");
      return;
    }

    setIsChangingPassword(true);
    try {
      await apiClient("/api/settings/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      toast.success("Parol muvaffaqiyatli o'zgartirildi");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Eski parol noto'g'ri");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Save 2FA setting
  const handleToggle2FA = async (enabled: boolean, type: "authenticator" | "sms") => {
    setTwoFactorEnabled(enabled);
    setTwoFactorType(type);
    try {
      await updateCurrentUser({
        twoFactorEnabled: enabled,
        twoFactorType: type,
      });
      toast.success(enabled ? "Ikki bosqichli autentifikatsiya yoqildi" : "2FA o'chirildi");
    } catch {
      toast.error("Sozlamani saqlashda xatolik");
    }
  };

  // Terminate Session
  const handleTerminateSession = async (sessionId?: string) => {
    try {
      const url = sessionId
        ? `/api/settings/sessions?sessionId=${sessionId}`
        : "/api/settings/sessions";
      await apiClient(url, { method: "DELETE" });
      if (sessionId) {
        setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId));
        toast.success("Seans yakunlandi");
      } else {
        setActiveSessions((prev) => prev.filter((s) => s.isCurrent));
        toast.success("Barcha boshqa seanslardan chiqildi");
      }
    } catch {
      toast.error("Seansni yakunlashda xatolik");
    }
  };

  // Save Notification settings
  const handleSaveNotifications = async () => {
    setIsSubmitting(true);
    try {
      await apiClient("/api/settings/notifications", {
        method: "PATCH",
        body: JSON.stringify({
          notifyLikes,
          notifyComments,
          notifyShares,
          notifyFollows,
          notifyMentions,
          pushEnabled,
          emailDigest,
          emailSecurity,
        }),
      });
      toast.success("Bildirishnoma sozlamalari saqlandi");
    } catch {
      toast.error("Xatolik yuz berdi");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Theme switch
  const handleThemeChange = (newTheme: "dark" | "light" | "system") => {
    setTheme(newTheme);
    if (newTheme === "system") {
      const prefersDark =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      setAppTheme(prefersDark ? "dark" : "light");
    } else {
      setAppTheme(newTheme);
    }
    updateCurrentUser({ theme: newTheme }).catch(() => {});
    toast.success("Mavzu yangilandi");
  };

  // GDPR Data Export
  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/settings/export");
      if (!response.ok) throw new Error("Eksport xatoligi");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gogetters-archive-${session.user.handle.replace(/^@/, "")}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Ma'lumotlar arxiv sifatida ko'chirib olindi");
    } catch {
      toast.error("Arxiv yuklab olishda xatolik");
    } finally {
      setIsExporting(false);
    }
  };

  // Account Deactivate
  const handleDeactivate = async () => {
    try {
      await apiClient("/api/settings/account", {
        method: "POST",
        body: JSON.stringify({ action: "deactivate" }),
      });
      toast.success("Hisobingiz vaqtincha muzlatildi");
      logout();
    } catch {
      toast.error("Xatolik yuz berdi");
    }
  };

  // Account Delete
  const handleDeleteAccount = async () => {
    try {
      await apiClient("/api/settings/account", { method: "DELETE" });
      toast.success("Hisobingiz butunlay o'chirildi");
      logout();
    } catch {
      toast.error("Hisobni o'chirishda xatolik");
    }
  };

  if (!isLoaded) {
    return (
      <div className="space-y-4 w-full animate-pulse">
        <div className="h-10 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-64 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800" />
      </div>
    );
  }

  const menuItems = [
    {
      id: "account",
      title: "1. Hisob va Profil sozlamalari",
      desc: "Ism, muqova rasmi, ijtimoiy tarmoqlar (GitHub, LinkedIn) va joylashuv",
      icon: User,
      badge: "Profil",
    },
    {
      id: "privacy",
      title: "2. Maxfiylik (Privacy)",
      desc: "Profil ko'rinuvchanligi, DM huquqlari, online indikator, qora ro'yxat",
      icon: Eye,
      badge: "Himoya",
    },
    {
      id: "security",
      title: "3. Xavfsizlik (Security)",
      desc: "Parolni o'zgartirish, 2FA autentifikatsiya, faol seanslar, hisobni o'chirish",
      icon: Lock,
      badge: "Parol & 2FA",
    },
    {
      id: "notifications",
      title: "4. Bildirishnomalar",
      desc: "Push & Veb xabarnomalar (layklar, izohlar), email dayjestlar",
      icon: Bell,
      badge: "Xabarnoma",
    },
    {
      id: "system",
      title: "5. Interfeys va Tizim",
      desc: "Tungi/Kunduzgi rejim (Theme), alifbo, GDPR ma'lumotlarni eksport qilish",
      icon: Monitor,
      badge: "GDPR & Mavzu",
    },
  ];

  return (
    <div className="space-y-5 w-full pb-12">
      {/* Top Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-50">
            {t("settings.title")}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tizim, xavfsizlik va profil sozlamalarini boshqaring
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MOBILE LAYOUT: Full-Screen Dedicated Page per Tab Navigation */}
      {/* ------------------------------------------------------------- */}

      {/* Mobile Hub Menu Page (When no tab parameter is selected) */}
      <div className="block md:hidden">
        {!currentTab ? (
          <div className="space-y-3">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Sozlama bo'limini tanlang:
            </p>
            {menuItems.map((item) => {
              const IconComp = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => selectTab(item.id as SettingsTab)}
                  className="w-full text-left p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs hover:border-slate-400 dark:hover:border-slate-700 transition-all flex items-center justify-between group active:scale-[0.99]"
                >
                  <div className="flex items-start gap-3.5 pr-2">
                    <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-slate-100 dark:group-hover:text-slate-900 transition-colors shrink-0">
                      <IconComp size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {item.title}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-400 shrink-0" />
                </button>
              );
            })}
          </div>
        ) : (
          /* Mobile Dedicated Sub-Page */
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
            <button
              onClick={backToMenu}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Sozlamalarga qaytish</span>
            </button>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5">
              {renderTabContent(currentTab)}
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* DESKTOP LAYOUT: Clean Sidebar + Right Panel Navigation       */}
      {/* ------------------------------------------------------------- */}
      <div className="hidden md:grid md:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar Navigation */}
        <div className="md:col-span-4 lg:col-span-3 space-y-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 shadow-2xs sticky top-20">
          {menuItems.map((item) => {
            const IconComp = item.icon;
            const isSelected = (currentTab || "account") === item.id;
            return (
              <button
                key={item.id}
                onClick={() => selectTab(item.id as SettingsTab)}
                className={`w-full text-left p-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <IconComp size={16} />
                  <span>{item.title}</span>
                </div>
                <ChevronRight
                  size={14}
                  className={isSelected ? "opacity-100" : "opacity-40"}
                />
              </button>
            );
          })}
        </div>

        {/* Right Main Content Panel */}
        <div className="md:col-span-8 lg:col-span-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs">
          {renderTabContent(currentTab || "account")}
        </div>
      </div>

      {/* MODALS */}

      {/* Deactivate Account Modal */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <AlertTriangle size={24} />
              <h3 className="text-base font-bold">Hisobni vaqtincha muzlatish</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Hisobingiz vaqtincha muzlatiladi. Boshqa foydalanuvchilar sizning profillingizni ko'ra olishmaydi. Qayta kiringiz bilan hisob faollashadi.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowDeactivateModal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleDeactivate}
                className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
              >
                Muzlatishni tasdiqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <Trash2 size={24} />
              <h3 className="text-base font-bold">Hisobni butunlay o'chirish</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Diqqat! Ushbu amal qaytarilmas. Barcha postlaringiz, izohlaringiz va shaxsiy ma'lumotlaringiz o'chib ketadi.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleDeleteAccount}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
              >
                O'chirishni tasdiqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  /* ------------------------------------------------------------- */
  /* TAB CONTENT RENDERERS                                         */
  /* ------------------------------------------------------------- */

  function renderTabContent(tab: SettingsTab) {
    switch (tab) {
      case "account":
        return (
          <form onSubmit={handleSaveAccount} className="space-y-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <User size={16} />
                <span>1. Hisob va Profil sozlamalari (Kengaytirilgan)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Profil ma'lumotlari, muqova rasmi va ijtimoiy tarmoqlar
              </p>
            </div>

            {/* Profile Avatar & Cover Photo section */}
            <div className="space-y-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Muqova rasmi va Profil rasmi
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    O'zingizga mos profil va muqova rasmini yuklang yoki tasodifiy avatar yarating
                  </p>
                </div>
              </div>

              {/* Cover photo preview banner */}
              <div className="relative h-32 sm:h-36 w-full rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 group">
                {coverPhotoUrl ? (
                  <img
                    src={coverPhotoUrl}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-xs text-slate-400 gap-1 select-none">
                    <ImageIcon size={20} className="opacity-50" />
                    <span className="text-[11px]">Muqova rasmi yuklanmagan</span>
                  </div>
                )}

                {/* Banner Actions Overlay */}
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                  <button
                    type="button"
                    disabled={isUploadingSettingsCover}
                    onClick={() => settingsCoverRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {isUploadingSettingsCover ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Camera size={13} />
                    )}
                    <span>{coverPhotoUrl ? "Muqovani almashtirish" : "Muqova yuklash"}</span>
                  </button>

                  {coverPhotoUrl && (
                    <button
                      type="button"
                      disabled={isUploadingSettingsCover}
                      onClick={handleRemoveCover}
                      title="Muqova rasmini olib tashlash"
                      className="p-1.5 rounded-lg bg-black/60 hover:bg-rose-600 backdrop-blur-md text-white/80 hover:text-white transition-all cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                {/* Avatar preview overlap */}
                <div className="absolute bottom-2.5 left-3.5 w-14 h-14 rounded-full border-2 border-white dark:border-slate-900 bg-slate-900 dark:bg-slate-100 overflow-hidden shadow-md">
                  <img
                    src={avatarUrl || session.user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${handle}`}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Hidden file inputs */}
              <input
                ref={settingsCoverRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleSettingsCoverUpload}
                className="hidden"
              />
              <input
                ref={settingsAvatarRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleSettingsAvatarUpload}
                className="hidden"
              />

              {/* Avatar management actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mr-1">
                  Profil rasmi:
                </span>
                <button
                  type="button"
                  disabled={isUploadingSettingsAvatar}
                  onClick={() => settingsAvatarRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                >
                  {isUploadingSettingsAvatar ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Camera size={13} />
                  )}
                  <span>Fayldan yuklash</span>
                </button>

                <button
                  type="button"
                  onClick={handleSettingsRandomAvatar}
                  className="px-3 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/60 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Dice5 size={13} />
                  <span>Tasodifiy avatar</span>
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 size={12} />
                    <span>O'chirish</span>
                  </button>
                )}
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("settings.fullName")}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Taxallus (Username)
                </label>
                <input
                  type="text"
                  value={`@${handle}`}
                  disabled
                  readOnly
                  className="w-full h-8 px-2.5 text-xs bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-md text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Rol / Kasb (Role)
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Senior Frontend Developer"
                  className="w-full h-8 px-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <MapPin size={12} />
                  <span>Joylashuv (Shahar / Davlat)</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Toshkent, O'zbekiston"
                  className="w-full h-8 px-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bio (Shaxsiy tavsif)
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                placeholder="O'zingiz haqingizda qisqacha yozing..."
                className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 resize-none"
              />
            </div>

            {/* Social Media Links */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Ijtimoiy tarmoq integratsiyasi (Social Links)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <GithubIcon size={13} />
                    <span>GitHub URL</span>
                  </label>
                  <input
                    type="text"
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    placeholder="https://github.com/username yoki @username"
                    className="w-full h-8 px-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <LinkedinIcon size={13} />
                    <span>LinkedIn URL</span>
                  </label>
                  <input
                    type="text"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full h-8 px-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <TwitterIcon size={13} />
                    <span>Twitter / X URL</span>
                  </label>
                  <input
                    type="text"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value)}
                    placeholder="https://twitter.com/username yoki @username"
                    className="w-full h-8 px-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <Globe size={13} />
                    <span>Shaxsiy veb-sayt URL</span>
                  </label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://mywebsite.com yoki mywebsite.com"
                    className="w-full h-8 px-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold transition-all cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Saqlanmoqda...</span>
                  </>
                ) : (
                  <span>O'zgarishlarni saqlash</span>
                )}
              </button>
              {savedSuccess && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <Check size={14} />
                  <span>Saqlandi!</span>
                </span>
              )}
            </div>
          </form>
        );

      case "privacy":
        return (
          <form onSubmit={handleSavePrivacy} className="space-y-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Eye size={16} />
                <span>2. Maxfiylik sozlamalari (Privacy)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Profil ko'rinuvchanligi, DM ruxsatlari va qora ro'yxat
              </p>
            </div>

            {/* Profile Visibility */}
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Profil ko'rinuvchanligi (Public / Private)
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPrivate(false)}
                  className={`p-3 rounded-lg border text-xs text-left cursor-pointer transition-all ${
                    !isPrivate
                      ? "border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-slate-100 ring-1 ring-slate-900 dark:ring-slate-100"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-0.5">
                    <Globe size={14} />
                    <span>Ommaviy (Public)</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Barcha platforma foydalanuvchilari ko'ra oladi</p>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPrivate(true)}
                  className={`p-3 rounded-lg border text-xs text-left cursor-pointer transition-all ${
                    isPrivate
                      ? "border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-slate-100 ring-1 ring-slate-900 dark:ring-slate-100"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-0.5">
                    <EyeOff size={14} />
                    <span>Yopiq (Private)</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Faqat siz tasdiqlagan obunachilar ko'ra oladi</p>
                </button>
              </div>
            </div>

            {/* DM Permission */}
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Xabar yuborish huquqi (Direct Message - DM)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: "everyone", label: "Hamma", hint: "Barcha foydalanuvchilar" },
                  { id: "followed", label: "Faqat kuzatilganlar", hint: "Siz kuzatayotganlar" },
                  { id: "nobody", label: "Hech kim", hint: "Xabarlar yopilgan" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDmPermission(opt.id as any)}
                    className={`p-2.5 rounded-lg border text-xs text-left cursor-pointer transition-all ${
                      dmPermission === opt.id
                        ? "border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-slate-100 ring-1 ring-slate-900 dark:ring-slate-100"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <div className="font-semibold">{opt.label}</div>
                    <div className="text-[10px] text-slate-400">{opt.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Online Status Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Faollik holati (Online Indicator)
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Platformada onlayn ekanligingizni ko'rsatuvchi yashil indikatorni yoqish
                </p>
              </div>
              <input
                type="checkbox"
                checked={showOnlineStatus}
                onChange={(e) => setShowOnlineStatus(e.target.checked)}
                className="h-4 w-4 rounded text-slate-900 focus:ring-slate-400 cursor-pointer"
              />
            </div>

            {/* Blocked Users List */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block flex items-center gap-1.5">
                <UserX size={15} />
                <span>Qora ro'yxat (Bloklangan foydalanuvchilar)</span>
              </span>

              {loadingBlocks ? (
                <div className="text-xs text-slate-400 animate-pulse">Yuklanmoqda...</div>
              ) : blockedUsers.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Bloklangan foydalanuvchilar yo'q.</p>
              ) : (
                <div className="space-y-2">
                  {blockedUsers.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={u.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.handle}`}
                          alt={u.name}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{u.name}</div>
                          <div className="text-[10px] text-slate-400">@{u.handle}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUnblockUser(u.id)}
                        className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-[11px]"
                      >
                        Blokdan chiqarish
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Saqlanmoqda...</span>
                  </>
                ) : (
                  <span>Maxfiylikni saqlash</span>
                )}
              </button>
            </div>
          </form>
        );

      case "security":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Lock size={16} />
                <span>3. Xavfsizlik sozlamalari (Security)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Parolni o'zgartirish, 2FA, faol seanslar va hisobni boshqarish
              </p>
            </div>

            {/* Change Password */}
            <form onSubmit={handleChangePassword} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block flex items-center gap-1.5">
                <KeyRound size={15} />
                <span>Parolni o'zgartirish</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Eski parol
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full h-8 px-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Yangi parol
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full h-8 px-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Yangi parolni tasdiqlash
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full h-8 px-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isChangingPassword ? "O'zgartirilmoqda..." : "Parolni yangilash"}
                </button>
              </div>
            </form>

            {/* 2FA Section */}
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block flex items-center gap-1.5">
                    <ShieldCheck size={15} />
                    <span>Ikki bosqichli autentifikatsiya (2FA)</span>
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Google Authenticator yoki SMS orqali qo'shimcha xavfsizlik qatlami
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={twoFactorEnabled}
                  onChange={(e) => handleToggle2FA(e.target.checked, twoFactorType)}
                  className="h-4 w-4 rounded text-slate-900 focus:ring-slate-400 cursor-pointer"
                />
              </div>

              {twoFactorEnabled && (
                <div className="pt-2 flex items-center gap-3 border-t border-slate-200 dark:border-slate-700">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Usul:
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="2faType"
                      checked={twoFactorType === "authenticator"}
                      onChange={() => handleToggle2FA(true, "authenticator")}
                    />
                    <span>Google Authenticator</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="2faType"
                      checked={twoFactorType === "sms"}
                      onChange={() => handleToggle2FA(true, "sms")}
                    />
                    <span>SMS kodi</span>
                  </label>
                </div>
              )}
            </div>

            {/* Active Sessions */}
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Smartphone size={15} />
                  <span>Faol seanslar (Active Sessions)</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleTerminateSession()}
                  className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  Barcha boshqa qurilmalardan chiqish
                </button>
              </div>

              {loadingSessions ? (
                <div className="text-xs text-slate-400 animate-pulse">Seanslar yuklanmoqda...</div>
              ) : activeSessions.length === 0 ? (
                <div className="text-xs text-slate-400">Ayni vaqtda 1 ta faol seans mavjud.</div>
              ) : (
                <div className="space-y-2">
                  {activeSessions.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <span>{s.deviceName}</span>
                          {s.isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                              Hozirgi seans
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {s.browser} • {s.location} ({s.ipAddress})
                        </div>
                      </div>

                      {!s.isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleTerminateSession(s.id)}
                          className="px-2 py-1 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 text-[11px] font-semibold"
                        >
                          Chiqarish
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Account Management: Deactivate & Delete */}
            <div className="p-4 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20 space-y-3">
              <span className="text-xs font-bold text-rose-700 dark:text-rose-400 block">
                Hisobni boshqarish
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Hisobingizni vaqtincha muzlatib qo'yishingiz yoki platformadan butunlay o'chirib tashlashingiz mumkin.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDeactivateModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Hisobni vaqtincha muzlatish
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Hisobni butunlay o'chirish
                </button>
              </div>
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Bell size={16} />
                <span>4. Bildirishnomalar (Notifications)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Push, Veb va Email bildirishnomalarini alohida sozlang
              </p>
            </div>

            {/* Push & Web */}
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Push va Veb xabarnomalar
              </span>

              <div className="space-y-2 text-xs">
                <label className="flex items-center justify-between cursor-pointer p-1">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Heart size={14} className="text-rose-500" />
                    <span>Layklar (Likes)</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={notifyLikes}
                    onChange={(e) => setNotifyLikes(e.target.checked)}
                    className="h-4 w-4 rounded text-slate-900 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <MessageSquare size={14} className="text-blue-500" />
                    <span>Izohlar va Javoblar (Comments)</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={notifyComments}
                    onChange={(e) => setNotifyComments(e.target.checked)}
                    className="h-4 w-4 rounded text-slate-900 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Share2 size={14} className="text-emerald-500" />
                    <span>Ulashishlar (Shares)</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={notifyShares}
                    onChange={(e) => setNotifyShares(e.target.checked)}
                    className="h-4 w-4 rounded text-slate-900 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <UserPlus size={14} className="text-purple-500" />
                    <span>Yangi obunachilar (Followers)</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={notifyFollows}
                    onChange={(e) => setNotifyFollows(e.target.checked)}
                    className="h-4 w-4 rounded text-slate-900 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <AtSign size={14} className="text-amber-500" />
                    <span>Eslatib o'tishlar (Mentions)</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={notifyMentions}
                    onChange={(e) => setNotifyMentions(e.target.checked)}
                    className="h-4 w-4 rounded text-slate-900 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Email Notifications */}
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block flex items-center gap-1.5">
                <Mail size={15} />
                <span>Email xabarnomalar</span>
              </span>

              <div className="space-y-2 text-xs">
                <label className="flex items-center justify-between cursor-pointer p-1">
                  <span className="text-slate-700 dark:text-slate-300">
                    Haftalik dayjestlar (Top muammolar va startaplar)
                  </span>
                  <input
                    type="checkbox"
                    checked={emailDigest}
                    onChange={(e) => setEmailDigest(e.target.checked)}
                    className="h-4 w-4 rounded text-slate-900 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1">
                  <span className="text-slate-700 dark:text-slate-300">
                    Muhim xavfsizlik ogohlantirishlari va kirishlar
                  </span>
                  <input
                    type="checkbox"
                    checked={emailSecurity}
                    onChange={(e) => setEmailSecurity(e.target.checked)}
                    className="h-4 w-4 rounded text-slate-900 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={handleSaveNotifications}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Saqlanmoqda...</span>
                  </>
                ) : (
                  <span>Bildirishnomalarni saqlash</span>
                )}
              </button>
            </div>
          </div>
        );

      case "system":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Monitor size={16} />
                <span>5. Interfeys va Tizim (Interface & System)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mavzu rejimlari, til/alifbo va GDPR ma'lumotlarni eksport qilish
              </p>
            </div>

            {/* Theme Selector */}
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Mavzu rejimi (Theme)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { id: "light", label: "Kunduzgi (Light)", icon: Sun },
                  { id: "dark", label: "Tungi (Dark)", icon: Moon },
                  { id: "system", label: "Tizim sozlamalari (System)", icon: Laptop },
                ].map((th) => {
                  const IconComp = th.icon;
                  const isSel = theme === th.id;
                  return (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => handleThemeChange(th.id as any)}
                      className={`p-3 rounded-lg border text-xs cursor-pointer flex items-center gap-2.5 transition-all ${
                        isSel
                          ? "border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-900 font-semibold text-slate-950 dark:text-white ring-1 ring-slate-900 dark:ring-slate-100 shadow-xs"
                          : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <IconComp size={16} />
                      <span>{th.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language & Alphabet */}
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-4">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Platforma Tili va Alifbosi
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {LOCALES.map((loc) => {
                  const meta = LOCALES_META[loc];
                  const isSelected = locale === loc;
                  return (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => switchLocale(loc)}
                      className={`p-3 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all ${
                        isSelected
                          ? "border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-900 font-semibold text-slate-950 dark:text-white ring-1 ring-slate-900 dark:ring-slate-100"
                          : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{meta.flag}</span>
                        <span>{meta.nativeName}</span>
                      </div>
                      {isSelected && <Check size={14} />}
                    </button>
                  );
                })}
              </div>

              {/* Uzbek Alphabet */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  {t("settings.alphabetLabel")}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["latin", "cyrillic"].map((alph) => (
                    <button
                      key={alph}
                      type="button"
                      onClick={() => {
                        setAlphabet(alph);
                        localStorage.setItem("gogetters_alphabet", alph);
                        toast.success("Alifbo tanlandi");
                      }}
                      className={`p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                        alphabet === alph
                          ? "border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-slate-100"
                          : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {alph === "latin" ? t("settings.alphabetLatin") : t("settings.alphabetCyrillic")}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* GDPR Data Export */}
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block flex items-center gap-1.5">
                <Download size={15} />
                <span>Ma'lumotlarni eksport qilish (GDPR Archive)</span>
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Platformadagi barcha postlaringiz, izohlaringiz, muammolaringiz va profillaringizni arxiv JSON fayli ko'rinishida yuklab oling.
              </p>

              <div>
                <button
                  type="button"
                  onClick={handleExportData}
                  disabled={isExporting}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Eksport qilinmoqda...</span>
                    </>
                  ) : (
                    <>
                      <Download size={13} />
                      <span>Arxivni yuklab olish (JSON)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
    }
  }
}
