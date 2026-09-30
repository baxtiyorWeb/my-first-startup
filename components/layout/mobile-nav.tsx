"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  HomeIcon,
  UserIcon,
  SearchIcon,
  SettingsIcon,
  CloseIcon,
  PlusIcon,
} from "@/components/icons";
import { LogOut, Bookmark, Bell, Plus } from "lucide-react";
import { useShell } from "./shell-context";
import { useAuth } from "@/components/auth/auth-context";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/context";
import { UserAvatar } from "@/components/ui/user-avatar";

export function MobileBottomNav() {
  const { session } = useAuth();
  const { t, localePath } = useI18n();
  const pathname = usePathname();

  const normalizedPath =
    pathname.replace(/^\/(uz|ru|en)(\/|$)/, "/$2").replace(/\/+/g, "/") ||
    "/dashboard";

  const isHome = normalizedPath === "/dashboard" || normalizedPath === "/";
  const isSearch = normalizedPath.startsWith("/dashboard/search");
  const isNotifications = normalizedPath.startsWith("/dashboard/notifications");
  const isProfile = normalizedPath.startsWith("/dashboard/profile");

  const tabCls = (active: boolean) =>
    `relative flex flex-col items-center justify-center gap-0.5 py-2 px-1 min-w-0 flex-1 cursor-pointer transition-colors ${
      active
        ? "text-slate-950 dark:text-white font-bold"
        : "text-slate-500 dark:text-zinc-500 font-medium"
    }`;

  return (
    <nav
      aria-label="Mobil pastki navigatsiya"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-black/95 backdrop-blur-md border-t border-slate-200 dark:border-white/[0.08] h-[58px] flex items-stretch select-none"
    >
      {/* 1. Home */}
      <Link
        href={localePath("/dashboard")}
        aria-label={t("nav.home")}
        aria-current={isHome ? "page" : undefined}
        className={tabCls(isHome)}
      >
        <span className={`transition-transform ${isHome ? "scale-110" : ""}`}>
          <HomeIcon size={22} />
        </span>
        <span className="text-[9px] font-semibold tracking-tight leading-none truncate">
          {t("nav.home")}
        </span>
        {isHome && (
          <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-slate-950 dark:bg-white" />
        )}
      </Link>

      {/* 2. Search */}
      <Link
        href={localePath("/dashboard/search")}
        aria-label={t("nav.search")}
        aria-current={isSearch ? "page" : undefined}
        className={tabCls(isSearch)}
      >
        <span className={`transition-transform ${isSearch ? "scale-110" : ""}`}>
          <SearchIcon size={22} />
        </span>
        <span className="text-[9px] font-semibold tracking-tight leading-none truncate">
          {t("nav.search")}
        </span>
        {isSearch && (
          <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-slate-950 dark:bg-white" />
        )}
      </Link>

      {/* 3. Create — Center FAB */}
      <div className="flex items-center justify-center flex-1">
        <Link
          href={localePath("/dashboard/create")}
          aria-label={t("nav.createThought")}
          className="flex items-center justify-center w-11 h-11 rounded-full bg-slate-950 dark:bg-white text-white dark:text-black shadow-md shadow-black/20 dark:shadow-white/10 active:scale-95 transition-transform"
        >
          <PlusIcon size={20} className="stroke-[2.5]" />
        </Link>
      </div>

      {/* 4. Notifications */}
      <Link
        href={localePath("/dashboard/notifications")}
        aria-label={t("nav.notifications")}
        aria-current={isNotifications ? "page" : undefined}
        className={tabCls(isNotifications)}
      >
        <span className={`transition-transform ${isNotifications ? "scale-110" : ""}`}>
          <Bell size={21} />
        </span>
        <span className="text-[9px] font-semibold tracking-tight leading-none truncate">
          {t("nav.notifications")}
        </span>
        {isNotifications && (
          <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-slate-950 dark:bg-white" />
        )}
      </Link>

      {/* 5. Profile */}
      <Link
        href={localePath("/dashboard/profile")}
        aria-label={t("nav.profile")}
        aria-current={isProfile ? "page" : undefined}
        className={tabCls(isProfile)}
      >
        <span className={`transition-transform ${isProfile ? "scale-110" : ""}`}>
          {session.isAuthenticated ? (
            <UserAvatar
              name={session.user.name}
              avatarUrl={session.user.avatarUrl}
              size="xs"
            />
          ) : (
            <UserIcon size={22} />
          )}
        </span>
        <span className="text-[9px] font-semibold tracking-tight leading-none truncate">
          {t("nav.profile")}
        </span>
        {isProfile && (
          <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-slate-950 dark:bg-white" />
        )}
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
    { label: t("nav.search"), rawHref: "/dashboard/search", icon: SearchIcon },
    { label: t("nav.createThought"), rawHref: "/dashboard/create", icon: Plus },
    { label: t("nav.bookmarks"), rawHref: "/dashboard/bookmarks", icon: Bookmark },
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
        className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white dark:bg-black border-r border-slate-200 dark:border-white/[0.08] p-4 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-out"
        role="dialog"
        aria-modal="true"
        aria-label="Mobil navigatsiya menyusi"
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/[0.08]">
            <Link
              href={localePath("/dashboard")}
              onClick={closeMobileNav}
              className="flex items-center gap-2.5"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs">
                GG
              </div>
              <span className="text-sm font-bold tracking-tight text-slate-950 dark:text-white">
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

          {/* Navigation Links */}
          <nav className="space-y-1 pt-1">
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
                      ? "bg-slate-100 dark:bg-white/[0.08] text-slate-950 dark:text-white font-bold"
                      : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:text-slate-950 dark:hover:text-white"
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
        <div className="pt-3 border-t border-slate-200 dark:border-white/[0.08]">
          {session.isAuthenticated ? (
            <div className="space-y-2">
              <Link
                href={localePath("/dashboard/profile")}
                onClick={closeMobileNav}
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <UserAvatar
                  name={session.user.name}
                  avatarUrl={session.user.avatarUrl}
                  size="md"
                />
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
