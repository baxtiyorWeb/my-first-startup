"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  Settings,
  Shield,
  FileText,
  HelpCircle,
  Lock,
  LogOut,
  X,
  ChevronRight,
  Sun,
  Moon,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import { useI18n } from "@/lib/i18n/context";
import { useTheme } from "@/components/theme/theme-context";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";

interface ProfileMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileMenuModal({ isOpen, onClose }: ProfileMenuModalProps) {
  const router = useRouter();
  const { session, logout } = useAuth();
  const { t, localePath, locale, switchLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();

  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  if (!isOpen) return null;

  const isAdminAllowed =
    session.user.role === "admin" ||
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_ENABLE_ADMIN === "true";

  const handleConfirmLogout = () => {
    setIsLogoutDialogOpen(false);
    onClose();
    logout();
    toast.info(t("auth.logoutDialog.successMessage"));
    router.push(localePath("/auth/login"));
  };

  const navItems = [
    {
      label: t("nav.bookmarks") || "Saqlanganlar",
      href: "/dashboard/bookmarks",
      icon: Bookmark,
      desc: "Keyinroq o‘qish uchun saqlangan postlar",
    },
    {
      label: t("nav.settings") || "Sozlamalar",
      href: "/dashboard/settings",
      icon: Settings,
      desc: "Profil, maxfiylik va bildirishnomalar",
    },
    ...(isAdminAllowed
      ? [
          {
            label: "Admin panel",
            href: "/dashboard/admin",
            icon: Shield,
            desc: "Platforma tahlili, foydalanuvchilar va botlar",
            badge: "Admin",
          },
        ]
      : []),
    {
      label: "Foydalanish qoidalari",
      href: "/guidelines",
      icon: FileText,
      desc: "Hamjamiyat me’yorlari va etika",
    },
    {
      label: "Yordam markazi",
      href: "/help",
      icon: HelpCircle,
      desc: "Savol-javoblar va qo‘llab-quvvatlash",
    },
    {
      label: "Maxfiylik siyosati",
      href: "/privacy",
      icon: Lock,
      desc: "Ma’lumotlar xavfsizligi",
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal / Bottom-Sheet Container */}
      <div
        className="fixed inset-x-0 bottom-0 sm:inset-0 z-50 flex sm:items-center sm:justify-center p-0 sm:p-4 pointer-events-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-menu-title"
      >
        <div className="w-full sm:max-w-md max-h-[90vh] sm:max-h-[85vh] bg-white dark:bg-[#0A0A0A] border-t sm:border border-slate-200 dark:border-white/[0.08] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col pointer-events-auto overflow-hidden transition-all duration-300">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <h2
                id="profile-menu-title"
                className="text-sm sm:text-base font-bold text-slate-950 dark:text-white tracking-tight"
              >
                Menyu va Sozlamalar
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
              aria-label="Yopish"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* User Quick Identity */}
            {session.isAuthenticated && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar
                    name={session.user.name}
                    avatarUrl={session.user.avatarUrl}
                    size="md"
                  />
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-slate-950 dark:text-white truncate">
                      {session.user.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                      {session.user.handle}
                    </div>
                  </div>
                </div>

                {session.user.role === "admin" && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                    Admin
                  </span>
                )}
              </div>
            )}

            {/* Navigation Options List */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-2 block mb-1">
                Bo‘limlar
              </span>

              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={localePath(item.href)}
                    onClick={onClose}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center text-slate-700 dark:text-zinc-300 group-hover:text-slate-950 dark:group-hover:text-white transition-colors shrink-0">
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-slate-950 dark:group-hover:text-white flex items-center gap-2">
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="px-1.5 py-0.2 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                          {item.desc}
                        </div>
                      </div>
                    </div>
                    <ChevronRight
                      size={15}
                      className="text-slate-400 dark:text-zinc-600 group-hover:translate-x-0.5 transition-transform shrink-0"
                    />
                  </Link>
                );
              })}
            </div>

            {/* Preferences (Theme & Language) */}
            <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-2 block">
                Sozlamalar
              </span>

              {/* Theme Switcher Row */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
                <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 dark:text-zinc-200">
                  {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
                  <span>Mavzu ko‘rinishi</span>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="px-3 py-1 rounded-lg bg-slate-200 dark:bg-white/[0.08] hover:bg-slate-300 dark:hover:bg-white/[0.12] text-xs font-bold text-slate-800 dark:text-white transition-colors cursor-pointer"
                >
                  {theme === "dark" ? "Qorong‘u (Dark)" : "Yorug‘ (Light)"}
                </button>
              </div>

              {/* Language Switcher Row */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
                <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                  Interfeys tili
                </span>
                <div className="flex items-center bg-slate-200 dark:bg-white/[0.06] rounded-lg p-0.5 text-xs font-bold">
                  {(["uz", "ru", "en"] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => switchLocale(l)}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        locale === l
                          ? "bg-white dark:bg-white text-slate-950 dark:text-black shadow-xs"
                          : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Logout Action */}
            {session.isAuthenticated && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsLogoutDialogOpen(true)}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold transition-colors cursor-pointer"
                >
                  <LogOut size={15} />
                  <span>{t("nav.logout") || "Hisobdan chiqish"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isLogoutDialogOpen}
        onClose={() => setIsLogoutDialogOpen(false)}
        onConfirm={handleConfirmLogout}
        title={t("auth.logoutDialog.title")}
        description={t("auth.logoutDialog.description")}
        confirmText={t("auth.logoutDialog.confirm")}
        cancelText={t("auth.logoutDialog.cancel")}
        variant="danger"
      />
    </>
  );
}
