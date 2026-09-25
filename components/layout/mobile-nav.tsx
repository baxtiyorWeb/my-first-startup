"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  HomeIcon,
  UserIcon,
  BookmarkIcon,
  SettingsIcon,
  CloseIcon,
  PlusIcon,
} from "@/components/icons";
import { LogOut } from "lucide-react";
import { useShell } from "./shell-context";
import { useAuth } from "@/components/auth/auth-context";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/context";
import { LanguageSwitcher } from "./language-switcher";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { t, localePath } = useI18n();

  const normalizedPath = pathname.replace(/^\/(uz|ru|en)(\/|$)/, "/$2").replace(/\/+/g, "/") || "/dashboard";

  return (
    <nav
      aria-label="Mobil pastki navigatsiya"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 h-14 px-2 grid grid-cols-5 items-center select-none shadow-lg"
    >
      {/* 1. Home */}
      <Link
        href={localePath("/dashboard")}
        aria-label={t("nav.home")}
        className="flex items-center justify-center py-2 cursor-pointer"
      >
        <HomeIcon size={22} />
      </Link>

      {/* 2. Bookmarks */}
      <Link
        href={localePath("/dashboard/bookmarks")}
        aria-label={t("nav.bookmarks")}
        className="flex items-center justify-center py-2 cursor-pointer"
      >
        <BookmarkIcon size={22} />
      </Link>

      {/* 3. Create Thought Prominent Action */}
      <Link
        href={localePath("/dashboard/create")}
        aria-label={t("nav.createThought")}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 text-slate-950 font-bold active:scale-95 transition-transform mx-auto"
      >
        <PlusIcon size={22} className="stroke-[2.5] stroke-slate-950 no-gradient" />
      </Link>

      {/* 4. Profile */}
      <Link
        href={localePath("/dashboard/profile")}
        aria-label={t("nav.profile")}
        className="flex items-center justify-center py-2 cursor-pointer"
      >
        <UserIcon size={22} />
      </Link>

      {/* 5. Settings */}
      <Link
        href={localePath("/dashboard/settings")}
        aria-label={t("nav.settings")}
        className="flex items-center justify-center py-2 cursor-pointer"
      >
        <SettingsIcon size={22} />
      </Link>
    </nav>
  );
}

export function MobileDrawer() {
  const router = useRouter();
  const { isMobileOpen, closeMobileNav } = useShell();
  const pathname = usePathname();
  const { session, logout } = useAuth();
  const { t, localePath } = useI18n();

  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  if (!isMobileOpen) return null;

  const normalizedPath = pathname.replace(/^\/(uz|ru|en)(\/|$)/, "/$2").replace(/\/+/g, "/") || "/dashboard";

  const handleConfirmLogout = () => {
    setIsLogoutDialogOpen(false);
    closeMobileNav();
    logout();
    toast.info(t("auth.logoutDialog.successMessage"));
    router.push(localePath("/auth/login"));
  };

  const navLinks = [
    { label: t("nav.home"), rawHref: "/dashboard", icon: HomeIcon },
    { label: t("nav.createThought"), rawHref: "/dashboard/create", icon: PlusIcon },
    { label: t("nav.bookmarks"), rawHref: "/dashboard/bookmarks", icon: BookmarkIcon },
    { label: t("nav.profile"), rawHref: "/dashboard/profile", icon: UserIcon },
    { label: t("nav.settings"), rawHref: "/dashboard/settings", icon: SettingsIcon },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={closeMobileNav}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-out"
        role="dialog"
        aria-modal="true"
        aria-label="Mobil navigatsiya menyusi"
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <Link
              href={localePath("/dashboard")}
              onClick={closeMobileNav}
              className="flex items-center gap-2.5"
            >
              <div className="w-7 h-7 rounded-md bg-slate-900 dark:bg-slate-100 flex items-center justify-center text-white dark:text-slate-900 font-bold text-sm">
                F
              </div>
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {t("common.brandName")}
              </span>
            </Link>

            <button
              type="button"
              onClick={closeMobileNav}
              aria-label={t("common.close")}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <CloseIcon size={18} />
            </button>
          </div>

          {/* Language Switcher Segment in Drawer */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
              Til / Язык / Language
            </span>
            <LanguageSwitcher variant="segmented" />
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 pt-2">
            {navLinks.map((item) => {
              const isActive =
                item.rawHref === "/dashboard"
                  ? normalizedPath === "/dashboard" || normalizedPath === "/"
                  : normalizedPath.startsWith(item.rawHref);
              const IconComponent = item.icon;

              return (
                <Link
                  key={item.rawHref}
                  href={localePath(item.rawHref)}
                  onClick={closeMobileNav}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-950 dark:text-white font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <IconComponent size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Area */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
          {session.isAuthenticated ? (
            <div className="space-y-2">
              <Link
                href={localePath("/dashboard/profile")}
                onClick={closeMobileNav}
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center font-bold text-xs">
                  {session.user.name
                    ? session.user.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                    : "F"}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {session.user.name || t("nav.guestUser")}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {session.user.handle}
                  </span>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setIsLogoutDialogOpen(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{t("nav.logout")}</span>
              </button>
            </div>
          ) : (
            <Link
              href={localePath("/auth/login")}
              onClick={closeMobileNav}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 text-xs font-semibold transition-all shadow-xs"
            >
              <span>{t("nav.login")}</span>
            </Link>
          )}
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isLogoutDialogOpen}
        onClose={() => setIsLogoutDialogOpen(false)}
        onConfirm={handleConfirmLogout}
        title={t("auth.logoutDialog.title")}
        description={t("auth.logoutDialog.description")}
        confirmText={t("auth.logoutDialog.confirm")}
        cancelText={t("auth.logoutDialog.cancel")}
        variant="warning"
      />
    </>
  );
}
