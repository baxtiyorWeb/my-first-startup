"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  HomeIcon,
  BookmarkIcon,
  UserIcon,
  SettingsIcon,
} from "@/components/icons";
import { LogOut } from "lucide-react";
import { useShell, SIDEBAR_EXPANDED_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from "./shell-context";
import { useAuth } from "@/components/auth/auth-context";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/context";
import { LanguageSwitcher } from "./language-switcher";

export function Sidebar() {
  const router = useRouter();
  const { isCollapsed } = useShell();
  const pathname = usePathname();
  const { session, logout } = useAuth();
  const { t, localePath } = useI18n();

  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  // Strip locale for active route check
  const normalizedPath = pathname.replace(/^\/(uz|ru|en)(\/|$)/, "/$2").replace(/\/+/g, "/") || "/dashboard";

  const primaryNavItems = [
    { label: t("nav.home"), rawHref: "/dashboard", icon: HomeIcon },
    { label: t("nav.bookmarks"), rawHref: "/dashboard/bookmarks", icon: BookmarkIcon },
  ];

  const secondaryNavItems = [
    { label: t("nav.profile"), rawHref: "/dashboard/profile", icon: UserIcon },
    { label: t("nav.settings"), rawHref: "/dashboard/settings", icon: SettingsIcon },
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
          width: isCollapsed ? `${SIDEBAR_COLLAPSED_WIDTH}px` : `${SIDEBAR_EXPANDED_WIDTH}px`,
        }}
      >
        {/* Brand / Logo Header */}
        <div className="h-14 flex items-center px-3.5 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <Link
            href={localePath("/dashboard")}
            className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded-md p-1 transition-colors cursor-pointer"
          >
            {/* Logo Mark */}
            <div className="w-8 h-8 shrink-0 rounded-md bg-slate-900 dark:bg-slate-100 flex items-center justify-center text-white dark:text-slate-900 font-bold text-base tracking-wider transition-transform group-hover:scale-105">
              F
            </div>
            {/* Brand Name & Tagline */}
            <div
              className={`flex flex-col transition-all duration-200 overflow-hidden whitespace-nowrap ${
                isCollapsed ? "opacity-0 w-0 pointer-events-none" : "opacity-100 w-auto"
              }`}
            >
              <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50 leading-tight">
                {t("common.brandName")}
              </span>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
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
                    className={`flex items-center gap-3 px-2.5 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                      isActive
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-950 dark:text-white font-semibold"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                    aria-label={item.label}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <div className="relative shrink-0 flex items-center justify-center w-5 h-5">
                      <IconComponent
                        size={18}
                        className={
                          isActive
                            ? "text-slate-950 dark:text-white"
                            : "text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors"
                        }
                      />
                    </div>

                    <span
                      className={`flex-1 transition-all duration-200 overflow-hidden whitespace-nowrap ${
                        isCollapsed ? "opacity-0 w-0 pointer-events-none" : "opacity-100 w-auto"
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

          {/* Bottom Secondary Navigation & Language Switcher & User identity */}
          <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            {/* Secondary Nav Links */}
            <div className="space-y-1">
              {secondaryNavItems.map((item) => {
                const isActive = normalizedPath.startsWith(item.rawHref);
                const IconComponent = item.icon;

                return (
                  <div key={item.rawHref} className="relative group">
                    <Link
                      href={localePath(item.rawHref)}
                      className={`flex items-center gap-3 px-2.5 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                        isActive
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-950 dark:text-white font-semibold"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                      aria-label={item.label}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <div className="relative shrink-0 flex items-center justify-center w-5 h-5">
                        <IconComponent
                          size={18}
                          className={
                            isActive
                              ? "text-slate-950 dark:text-white"
                              : "text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors"
                          }
                        />
                      </div>

                      <span
                        className={`flex-1 transition-all duration-200 overflow-hidden whitespace-nowrap ${
                          isCollapsed ? "opacity-0 w-0 pointer-events-none" : "opacity-100 w-auto"
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

            {/* Language Selector in Sidebar */}
            <div className={`px-1 ${isCollapsed ? "flex justify-center" : ""}`}>
              <LanguageSwitcher variant={isCollapsed ? "compact" : "segmented"} />
            </div>

            {/* User card + quick logout OR Guest sign in button */}
            <div className="pt-1">
              {session.isAuthenticated ? (
                <div
                  className={`flex items-center justify-between p-1.5 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800/80 transition-colors ${
                    isCollapsed ? "justify-center p-1" : ""
                  }`}
                >
                  <Link
                    href={localePath("/dashboard/profile")}
                    className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-85 transition-opacity"
                    aria-label={t("nav.profile")}
                  >
                    <div className="w-7 h-7 shrink-0 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center font-bold text-[11px] select-none">
                      {session.user.name
                        ? session.user.name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                        : "F"}
                    </div>
                    {!isCollapsed && (
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {session.user.name || t("nav.guestUser")}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {session.user.handle || "@user"}
                        </span>
                      </div>
                    )}
                  </Link>

                  {!isCollapsed && (
                    <button
                      type="button"
                      onClick={() => setIsLogoutDialogOpen(true)}
                      title={t("nav.logout")}
                      className="p-1 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
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
