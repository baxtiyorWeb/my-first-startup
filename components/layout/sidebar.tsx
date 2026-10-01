"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  HomeIcon,
  BookmarkIcon,
  UserIcon,
  SettingsIcon,
  VerifiedBadgeIcon,
} from "@/components/icons";
import { LogOut, Shield, MapPin, ArrowRight } from "lucide-react";
import {
  useShell,
  SIDEBAR_EXPANDED_WIDTH,
  SIDEBAR_COLLAPSED_WIDTH,
} from "./shell-context";
import { useAuth } from "@/components/auth/auth-context";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/context";
import { UserAvatar } from "@/components/ui/user-avatar";

export function Sidebar() {
  const router = useRouter();
  const { isCollapsed } = useShell();
  const pathname = usePathname();
  const { session, logout } = useAuth();
  const { t, localePath } = useI18n();

  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  // Strip locale for active route check
  const normalizedPath =
    pathname.replace(/^\/(uz|ru|en)(\/|$)/, "/$2").replace(/\/+/g, "/") ||
    "/dashboard";

  const primaryNavItems = [
    { label: t("nav.home"), rawHref: "/dashboard", icon: HomeIcon },
    {
      label: t("nav.bookmarks"),
      rawHref: "/dashboard/bookmarks",
      icon: BookmarkIcon,
    },
  ];

  const isAdminAllowed =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_ENABLE_ADMIN === "true";

  const secondaryNavItems = [
    ...(isCollapsed || !session.isAuthenticated
      ? [{ label: t("nav.profile"), rawHref: "/dashboard/profile", icon: UserIcon }]
      : []),
    {
      label: t("nav.settings"),
      rawHref: "/dashboard/settings",
      icon: SettingsIcon,
    },
    ...(isAdminAllowed
      ? [
          {
            label: "Admin Panel",
            rawHref: "/dashboard/admin",
            icon: Shield,
          },
        ]
      : []),
  ];

  const handleConfirmLogout = () => {
    setIsLogoutDialogOpen(false);
    logout();
    toast.info(t("auth.logoutDialog.successMessage"));
    router.push(localePath("/auth/login"));
  };

  return (
    <>
      <aside
        aria-label="Asosiy navigatsiya"
        className="hidden md:flex flex-col fixed top-0 left-0 bottom-0 z-30 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ease-out select-none"
        style={{
          width: isCollapsed
            ? `${SIDEBAR_COLLAPSED_WIDTH}px`
            : `${SIDEBAR_EXPANDED_WIDTH}px`,
        }}
      >
        {/* Brand / Logo Header */}
        <div className="h-14 flex items-center px-3.5 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <Link
            href={localePath("/dashboard")}
            className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded-md p-1 transition-colors cursor-pointer"
          >
            {/* Logo Mark */}
            <div className="w-8 h-8 shrink-0 rounded-lg overflow-hidden flex items-center justify-center transition-transform group-hover:scale-105">
              <Image
                src="/logo.png"
                alt="The Go-getters"
                width={32}
                height={32}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            {/* Brand Name & Tagline */}
            <div
              className={`flex flex-col transition-all duration-200 overflow-hidden whitespace-nowrap min-w-0 ${
                isCollapsed
                  ? "opacity-0 w-0 pointer-events-none"
                  : "opacity-100 flex-1 max-w-[150px]"
              }`}
            >
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-50 leading-tight truncate">
                {t("common.brandName")}
              </span>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
                {t("common.brandTagline")}
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2.5 flex flex-col justify-between scrollbar-none">
          {/* Top Primary Navigation */}
          <div className="space-y-1">
            {primaryNavItems.map((item) => {
              const isActive =
                item.rawHref === "/dashboard"
                  ? normalizedPath === "/dashboard" || normalizedPath === "/"
                  : normalizedPath.startsWith(item.rawHref);
              const IconComponent = item.icon;

              return (
                <div key={item.rawHref} className="relative group">
                  <Link
                    href={localePath(item.rawHref)}
                    className={`flex items-center gap-3 px-2.5 py-2 text-xs transition-colors cursor-pointer focus-visible:outline-none rounded-md ${
                      isActive
                        ? "text-slate-900 dark:text-slate-100 font-bold bg-slate-100/70 dark:bg-slate-800/50"
                        : "text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-800/30"
                    }`}
                    aria-label={item.label}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <div className="relative shrink-0 flex items-center justify-center w-5 h-5">
                      <IconComponent size={18} />
                    </div>

                    <span
                      className={`flex-1 transition-all duration-200 overflow-hidden whitespace-nowrap ${
                        isCollapsed
                          ? "opacity-0 w-0 pointer-events-none"
                          : "opacity-100 w-auto"
                      }`}
                    >
                      {item.label}
                    </span>
                  </Link>

                  {isCollapsed && (
                    <div
                      role="tooltip"
                      className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 z-50 pointer-events-none px-2 py-1 rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-md"
                    >
                      {item.label}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Middle: User Profile Summary Card (Expanded mode & authenticated) */}
          {!isCollapsed && session.isAuthenticated && (
            <div className="my-auto py-2">
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs overflow-hidden transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700">
                {/* Mini Cover Photo / Banner */}
                <div className="relative h-14 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  {session.user.coverPhotoUrl ? (
                    <img
                      src={session.user.coverPhotoUrl}
                      alt={session.user.name || "Cover"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-cyan-950/40" />
                  )}
                </div>

                {/* Profile Content */}
                <div className="px-2.5 pt-0 pb-2.5">
                  {/* Overlapping Avatar & Intent Badge */}
                  <div className="-mt-5 mb-1.5 flex items-end justify-between gap-1.5">
                    <Link
                      href={localePath("/dashboard/profile")}
                      className="inline-block rounded-full ring-2 ring-white dark:ring-slate-900 shadow-sm transition-transform hover:scale-105 shrink-0"
                    >
                      <UserAvatar
                        name={session.user.name}
                        avatarUrl={session.user.avatarUrl}
                        size="md"
                      />
                    </Link>

                    {/* Intent badge if present */}
                    {session.user.intent && session.user.intent !== "none" && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 truncate max-w-[125px]">
                        {session.user.intent === "looking_for_cofounder" && t("intents.badge_cofounder")}
                        {session.user.intent === "open_to_work" && t("intents.badge_open_to_work")}
                        {session.user.intent === "raising_funds" && t("intents.badge_raising")}
                        {session.user.intent === "open_to_advisory" && t("intents.badge_advisory")}
                      </span>
                    )}
                  </div>

                  {/* Name & Handle */}
                  <Link
                    href={localePath("/dashboard/profile")}
                    className="group block"
                  >
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {session.user.name}
                      </span>
                      {session.user.verified && (
                        <VerifiedBadgeIcon size={13} className="shrink-0 text-slate-900 dark:text-slate-100" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {session.user.handle}
                    </p>
                  </Link>

                  {/* Role */}
                  {session.user.role && (
                    <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate mt-1">
                      {session.user.role}
                    </p>
                  )}

                  {/* Location */}
                  {session.user.location && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 mt-1 truncate">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{session.user.location}</span>
                    </div>
                  )}

                  {/* Stats Grid: Posts, Followers, Following */}
                  <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800/80 border-t border-slate-100 dark:border-slate-800/80 mt-2.5 pt-2 text-center">
                    <Link
                      href={localePath("/dashboard/profile")}
                      className="hover:opacity-80 transition-opacity"
                    >
                      <span className="block text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums leading-none">
                        {session.user.stats?.postsCount ?? 0}
                      </span>
                      <span className="block text-[9px] text-slate-500 dark:text-slate-400 mt-1 font-medium truncate">
                        {t("profile.stats.thoughts")}
                      </span>
                    </Link>
                    <Link
                      href={localePath("/dashboard/profile")}
                      className="hover:opacity-80 transition-opacity"
                    >
                      <span className="block text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums leading-none">
                        {session.user.stats?.followersCount ?? 0}
                      </span>
                      <span className="block text-[9px] text-slate-500 dark:text-slate-400 mt-1 font-medium truncate">
                        {t("profile.stats.followers")}
                      </span>
                    </Link>
                    <Link
                      href={localePath("/dashboard/profile")}
                      className="hover:opacity-80 transition-opacity"
                    >
                      <span className="block text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums leading-none">
                        {session.user.stats?.followingCount ?? 0}
                      </span>
                      <span className="block text-[9px] text-slate-500 dark:text-slate-400 mt-1 font-medium truncate">
                        {t("profile.stats.following")}
                      </span>
                    </Link>
                  </div>

                  {/* View full profile link */}
                  <Link
                    href={localePath("/dashboard/profile")}
                    className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors group"
                  >
                    <span>{t("nav.profile")}</span>
                    <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Secondary Navigation & Logout */}
          <div className="space-y-1.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            {/* Secondary Nav Links */}
            <div className="space-y-1">
              {secondaryNavItems.map((item) => {
                const isActive = normalizedPath.startsWith(item.rawHref);
                const IconComponent = item.icon;

                return (
                  <div key={item.rawHref} className="relative group">
                    <Link
                      href={localePath(item.rawHref)}
                      className={`flex items-center gap-3 px-2.5 py-2 text-xs transition-colors cursor-pointer focus-visible:outline-none rounded-md ${
                        isActive
                          ? "text-slate-900 dark:text-slate-100 font-bold bg-slate-100/70 dark:bg-slate-800/50"
                          : "text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-800/30"
                      }`}
                      aria-label={item.label}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <div className="relative shrink-0 flex items-center justify-center w-5 h-5">
                        <IconComponent size={18} />
                      </div>

                      <span
                        className={`flex-1 transition-all duration-200 overflow-hidden whitespace-nowrap ${
                          isCollapsed
                            ? "opacity-0 w-0 pointer-events-none"
                            : "opacity-100 w-auto"
                        }`}
                      >
                        {item.label}
                      </span>
                    </Link>

                    {isCollapsed && (
                      <div
                        role="tooltip"
                        className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 z-50 pointer-events-none px-2 py-1 rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium whitespace-nowrap shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                      >
                        {item.label}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Logout OR Guest sign in button */}
            <div className="pt-1">
              {session.isAuthenticated ? (
                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => setIsLogoutDialogOpen(true)}
                    title={t("nav.logout")}
                    className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-xs font-medium text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50/60 dark:hover:bg-red-950/30 transition-colors cursor-pointer ${
                      isCollapsed ? "justify-center p-2" : ""
                    }`}
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span>{t("nav.logout")}</span>}
                  </button>

                  {isCollapsed && (
                    <div
                      role="tooltip"
                      className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 z-50 pointer-events-none px-2 py-1 rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium whitespace-nowrap shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                    >
                      {t("nav.logout")}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href={localePath("/auth/login")}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 text-xs font-semibold transition-all shadow-xs ${
                    isCollapsed ? "p-2" : ""
                  }`}
                  title={t("nav.login")}
                >
                  <LogOut className="w-3.5 h-3.5 rotate-180" />
                  {!isCollapsed && <span>{t("nav.login")}</span>}
                </Link>
              )}
            </div>
          </div>
        </div>
      </aside>

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
