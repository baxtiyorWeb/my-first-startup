"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  MenuIcon,
  SearchIcon,
  PlusIcon,
  UserIcon,
  SettingsIcon,
  BookmarkIcon,
} from "@/components/icons";
import { LogOut, ChevronDown, Shield } from "lucide-react";
import { useShell } from "./shell-context";
import { SearchModal } from "@/components/search/search-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/components/auth/auth-context";
import { toast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/context";
import { UserAvatar } from "@/components/ui/user-avatar";
import { NotificationBell } from "@/components/notifications/notification-bell";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const router = useRouter();
  const { isCollapsed, toggleSidebar, toggleMobileNav } = useShell();
  const pathname = usePathname();
  const { session, logout } = useAuth();
  const { t, localePath } = useI18n();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close user dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isUserMenuOpen]);

  // Global hotkey Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Strip locale prefix from pathname for route matching
  const normalizedPath =
    pathname.replace(/^\/(uz|ru|en)(\/|$)/, "/$2").replace(/\/+/g, "/") ||
    "/dashboard";

  const getRouteMeta = () => {
    if (normalizedPath === "/dashboard" || normalizedPath === "/") {
      return { title: t("nav.home"), subtitle: t("nav.feedSubtitle") };
    }
    if (normalizedPath.startsWith("/dashboard/bookmarks")) {
      return {
        title: t("nav.bookmarks"),
        subtitle: t("nav.bookmarksSubtitle"),
      };
    }
    if (normalizedPath.startsWith("/dashboard/create")) {
      return {
        title: t("create.pageTitle"),
        subtitle: t("create.pageSubtitle"),
      };
    }
    if (normalizedPath.startsWith("/dashboard/profile")) {
      return { title: t("nav.profile"), subtitle: t("nav.profileSubtitle") };
    }
    if (normalizedPath.startsWith("/dashboard/settings")) {
      return { title: t("nav.settings"), subtitle: t("nav.settingsSubtitle") };
    }
    if (normalizedPath.startsWith("/dashboard/notifications")) {
      return { title: t("nav.notifications") || "Bildirishnomalar", subtitle: "Barcha bildirishnomalar" };
    }
    if (normalizedPath.startsWith("/dashboard/messages")) {
      return { title: t("nav.messages") || "Xabarlar", subtitle: "Shaxsiy suhbatlar va xabarlar" };
    }
    return { title: t("common.brandName"), subtitle: t("common.brandTagline") };
  };

  const currentRouteMeta = getRouteMeta();
  const displayTitle = title || currentRouteMeta.title;
  const displaySubtitle =
    subtitle ||
    (normalizedPath.startsWith("/dashboard/profile")
      ? session.user.handle || t("nav.profileSubtitle")
      : currentRouteMeta.subtitle);

  const handleBurgerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      toggleMobileNav();
    } else {
      toggleSidebar();
    }
  };

  const handleConfirmLogout = () => {
    setIsLogoutDialogOpen(false);
    logout();
    toast.info(t("auth.logoutDialog.successMessage"));
    router.push(localePath("/auth/login"));
  };

  return (
    <>
      <header
        data-node-id="11:4"
        data-name="Yuqori panel"
        className="sticky top-0 z-20 h-[64px] sm:h-[68px] w-full bg-white/95 dark:bg-[#000000]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#2f3336] transition-colors select-none"
        role="banner"
      >
        <div className="h-full px-2.5 sm:px-5 lg:px-7 flex items-center justify-between gap-1.5 sm:gap-4 max-w-full">
          {/* Left: Burger button + Page Title */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 min-w-0">
            {/* Desktop Burger button for sidebar toggle */}
            <button
              type="button"
              onClick={handleBurgerClick}
              aria-label={
                isCollapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")
              }
              className="hidden md:flex p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-[#16181c] active:scale-95 cursor-pointer focus-visible:outline-none transition-all shrink-0 touch-manipulation"
            >
              <MenuIcon
                size={20}
                className="text-slate-800 dark:text-slate-100 stroke-slate-800 dark:stroke-slate-100"
              />
            </button>

            {/* Mobile Brand Logo & Name */}
            <Link
              href={localePath("/dashboard")}
              className="flex items-center gap-2 md:hidden shrink-0 group"
              title={t("common.brandName")}
            >
              <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                <Image
                  src="/logo.png"
                  alt="The Go-getters"
                  width={32}
                  height={32}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
            </Link>

            {/* Page Title - Desktop only */}
            <div className="hidden md:flex flex-col min-w-0">
              <h1 className="text-sm lg:text-[15px] font-bold text-slate-900 dark:text-white tracking-tight truncate leading-tight">
                {displayTitle}
              </h1>
              {displaySubtitle && (
                <span className="hidden xl:inline-block text-[11px] font-normal text-slate-500 dark:text-[#8b98a5] truncate max-w-[220px]">
                  • {displaySubtitle}
                </span>
              )}
            </div>
          </div>

          {/* Center: Spotlight Search Bar (Figma node 11:268 - max-w-[652px]) */}
          <div className="flex-1 min-w-0 max-w-[652px] mx-1.5 sm:mx-3">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="relative w-full h-[42px] sm:h-[44px] px-3 sm:px-4 rounded-[22px] bg-slate-100 dark:bg-[#000000] hover:bg-slate-200/70 dark:hover:bg-[#16181c] border border-slate-200/80 dark:border-[#2f3336] hover:border-slate-300 dark:hover:border-[#3e4144] text-xs text-slate-500 dark:text-[#cfd9de] shadow-2xs flex items-center justify-between gap-2 transition-all cursor-pointer group active:scale-[0.99]"
              title={`${t("common.search")} (Ctrl+K)`}
            >
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-4 h-4 shrink-0 text-slate-400 dark:text-[#71767b] group-hover:text-[#1d9bf0] transition-colors flex items-center justify-center">
                  <SearchIcon size={16} />
                </div>
                <span className="hidden sm:inline text-[13px] text-slate-500 dark:text-[#cfd9de] truncate font-normal">
                  Qidirish... (mavzu, muallif, post...)
                </span>
                <span className="inline sm:hidden text-[11px] text-slate-500 dark:text-[#cfd9de] truncate font-normal">
                  {t("search.headerPlaceholderShort") || "Qidirish..."}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <kbd className="hidden sm:inline-flex h-[24px] items-center gap-1 rounded-[7px] border border-slate-200 dark:border-[#2f3336] bg-white dark:bg-[#202327] px-2 font-mono text-[11px] font-medium text-slate-500 dark:text-[#cfd9de] shadow-2xs">
                  <span>Ctrl + K</span>
                </kbd>
              </div>
            </button>
          </div>

          {/* Right: Actions + Profile Dropdown (Figma node 11:4) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Primary Create Studio Button */}
            {!normalizedPath.startsWith("/dashboard/create") && (
              <Link
                href={localePath("/dashboard/create")}
                className="hidden md:inline-flex items-center gap-1.5 h-[40px] px-3.5 sm:px-4 rounded-[11px] bg-[#1d9bf0] hover:bg-[#1a8cd8] active:scale-95 text-white text-[13px] font-semibold cursor-pointer transition-all shadow-xs"
                title="Kontent yozish"
              >
                <PlusIcon
                  size={15}
                  className="stroke-[2.5] stroke-white no-gradient"
                />
                <span>Kontent yozish</span>
              </Link>
            )}

            {/* Notification Bell Dropdown (Figma node 11:278) */}
            <NotificationBell />

            {/* User Profile Dropdown Menu OR Guest Sign In - HIDDEN ON MOBILE (available in bottom nav) */}
            {session.isAuthenticated ? (
              <div className="hidden sm:block relative shrink-0" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-[13px] hover:bg-slate-100 dark:hover:bg-[#16181c] border border-transparent hover:border-slate-200 dark:hover:border-[#2f3336] cursor-pointer focus-visible:outline-none transition-colors active:scale-95"
                  aria-label={t("nav.userMenu")}
                  aria-expanded={isUserMenuOpen}
                >
                  <UserAvatar
                    name={session.user.name}
                    avatarUrl={session.user.avatarUrl}
                    size="sm"
                  />
                  <span className="hidden md:inline-block text-xs font-semibold text-slate-800 dark:text-[#e7e9ea] max-w-[100px] truncate">
                    {session.user.name
                      ? session.user.name.split(" ")[0]
                      : t("nav.guestUser")}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-slate-400 dark:text-[#71767b] transition-transform duration-150 ${isUserMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#000000] rounded-[15px] border border-slate-200 dark:border-[#2f3336] shadow-xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100 text-xs">
                    {/* User details header */}
                    <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-[#2f3336] flex items-center gap-2.5">
                      <UserAvatar
                        name={session.user.name}
                        avatarUrl={session.user.avatarUrl}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">
                          {session.user.name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-[#8b98a5] truncate">
                          {session.user.handle}
                        </p>
                      </div>
                    </div>

                    <div className="py-1">
                      <Link
                        href={localePath("/dashboard/profile")}
                        onClick={() => setIsUserMenuOpen(false)}
                        className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-[#cfd9de] hover:bg-slate-50 dark:hover:bg-[#202327] flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <UserIcon size={14} className="text-slate-500" />
                        <span>{t("nav.profile")}</span>
                      </Link>

                      <Link
                        href={localePath("/dashboard/bookmarks")}
                        onClick={() => setIsUserMenuOpen(false)}
                        className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-[#cfd9de] hover:bg-slate-50 dark:hover:bg-[#202327] flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <BookmarkIcon size={14} className="text-slate-500" />
                        <span>{t("nav.bookmarks")}</span>
                      </Link>

                      <Link
                        href={localePath("/dashboard/settings")}
                        onClick={() => setIsUserMenuOpen(false)}
                        className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-[#cfd9de] hover:bg-slate-50 dark:hover:bg-[#202327] flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <SettingsIcon size={14} className="text-slate-500" />
                        <span>{t("nav.settings")}</span>
                      </Link>

                      {((session.user?.role || "").toUpperCase() === "ADMIN" ||
                        (session.user?.role || "").toUpperCase() === "SUPER_ADMIN") && (
                        <Link
                          href={localePath("/dashboard/admin")}
                          onClick={() => setIsUserMenuOpen(false)}
                          className="w-full px-3.5 py-2 text-left text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-2.5 transition-colors cursor-pointer font-semibold border-t border-slate-100 dark:border-[#2f3336]/50 mt-1 pt-2"
                        >
                          <Shield size={14} className="text-blue-600 dark:text-blue-400" />
                          <span>Admin Panel</span>
                        </Link>
                      )}
                    </div>

                    {/* Logout Action */}
                    <div className="pt-1 border-t border-slate-100 dark:border-[#2f3336]">
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsLogoutDialogOpen(true);
                        }}
                        className="w-full px-3.5 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>{t("nav.logout")}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href={localePath("/auth/login")}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white text-xs font-semibold transition-all shadow-xs cursor-pointer shrink-0"
              >
                <span>{t("nav.login")}</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Global Spotlight Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

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
