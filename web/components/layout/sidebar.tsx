"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Compass,
  Video,
  BookOpen,
  Flame,
  Bookmark,
  Layers,
  PenTool,
  Folder,
  BarChart3,
  HardDrive,
  Bell,
  Shield,
  Download,
  LogOut,
  ChevronRight,
  Settings,
  User,
} from "lucide-react";
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
import { usePwaInstall } from "@/components/pwa";
import { api } from "@/lib/api";

export function Sidebar() {
  const router = useRouter();
  const { isCollapsed } = useShell();
  const pathname = usePathname();
  const { session, logout } = useAuth();
  const { t, localePath, locale } = useI18n();
  const { promptInstall, isInstalled } = usePwaInstall();

  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] =
    useState<number>(0);
  const [storageInfo, setStorageInfo] = useState({
    displayString: "3.2 GB / 10 GB",
    percentage: 32,
    percentageFormatted: "32%",
  });

  useEffect(() => {
    let isMounted = true;
    fetch("/api/media/storage")
      .then((res) => res.json())
      .then((res) => {
        if (isMounted && res.success && res.data) {
          setStorageInfo({
            displayString: res.data.displayString,
            percentage: res.data.percentage,
            percentageFormatted: res.data.percentageFormatted,
          });
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!session.isAuthenticated) return;
    const fetchCount = async () => {
      try {
        const count = await api.notifications.getUnreadCount();
        setUnreadNotificationsCount(count);
      } catch {}
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [session.isAuthenticated]);

  // Strip locale for active route check
  const normalizedPath =
    pathname.replace(/^\/(uz|ru|en)(\/|$)/, "/$2").replace(/\/+/g, "/") ||
    "/dashboard";

  // Primary Navigation items — Media, Tutorials, News & Knowledge
  const primaryNavItems: Array<{
    label: string;
    rawHref: string;
    icon: React.ElementType;
    badge: number;
    pill?: string;
  }> = [
    { label: "Media Portal", rawHref: "/", icon: Compass, badge: 0 },
    { label: "Maqolalar", rawHref: "/articles", icon: BookOpen, badge: 0 },
    { label: "Video darsliklar", rawHref: "/videos", icon: Video, badge: 0 },
    { label: "Yangiliklar", rawHref: "/news", icon: Flame, badge: 0 },
    { label: "Bilimlar Bazasi", rawHref: "/hub", icon: Layers, badge: 0 },
    { label: "Muhokamalar", rawHref: "/dashboard", icon: Home, badge: 0 },
    { label: "Shorts", rawHref: "/dashboard/shorts", icon: Video, badge: 0 },
    { label: "Saqlanganlar", rawHref: "/dashboard/bookmarks", icon: Bookmark, badge: 0 },
    {
      label: "Xabarnomalar",
      rawHref: "/dashboard/notifications",
      icon: Bell,
      badge: unreadNotificationsCount,
    },
    { label: "Tariflar", rawHref: "/dashboard/pricing", icon: Shield, badge: 0 },
  ];

  // Creator Studio navigation items — SEO CMS Publishing
  const creatorStudioItems: Array<{
    label: string;
    rawHref: string;
    icon: React.ElementType;
    pill?: string;
  }> = [
    { label: "SEO Studio (Yozish)", rawHref: "/dashboard/create", icon: PenTool, pill: "SEO" },
    { label: "Mening kontentim", rawHref: "/dashboard/profile", icon: Folder },
    { label: "Statistika", rawHref: "/dashboard/profile?tab=stats", icon: BarChart3 },
  ];

  const userRole = (session.user?.role || "").toUpperCase();
  const isAdminUser = userRole === "ADMIN" || userRole === "SUPER_ADMIN";
  const isAdminAllowed =
    isAdminUser &&
    (process.env.NODE_ENV !== "production" ||
      process.env.NEXT_PUBLIC_ENABLE_ADMIN === "true" ||
      process.env.NEXT_PUBLIC_ENABLE_ADMIN_PANEL === "true");

  const secondaryNavItems = [
    { label: t("nav.profile"), rawHref: "/dashboard/profile", icon: User },
    { label: t("nav.settings"), rawHref: "/dashboard/settings", icon: Settings },
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
        data-node-id="11:3"
        data-name="Yon menyu"
        aria-label="Asosiy navigatsiya"
        className="hidden md:flex flex-col fixed top-0 left-0 bottom-0 z-30 bg-white dark:bg-[#0b0c13] border-r border-slate-200 dark:border-[#24252f] transition-all duration-300 ease-out select-none"
        style={{
          width: isCollapsed
            ? `${SIDEBAR_COLLAPSED_WIDTH}px`
            : `${SIDEBAR_EXPANDED_WIDTH}px`,
        }}
      >
        {/* 1. Brand / Logo Header (Figma nodes 11:152, 11:153, 11:154) */}
        <div className="h-[68px] flex items-center px-4 border-b border-slate-200 dark:border-[#24252f] shrink-0">
          <Link
            href={localePath("/dashboard")}
            className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded-md p-1 transition-colors cursor-pointer min-w-0"
          >
            {/* Logo Mark */}
            <div className="w-[38px] h-[38px] shrink-0 rounded-[12px] overflow-hidden flex items-center justify-center transition-transform group-hover:scale-105 bg-slate-900">
              <Image
                src="/logo.png"
                alt="Geters logotipi"
                width={38}
                height={38}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            {/* Brand Name & Tagline */}
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden whitespace-nowrap min-w-0">
                <span className="text-[20px] font-bold tracking-tight text-slate-900 dark:text-white leading-tight truncate font-['Inter:Bold']">
                  Geters
                </span>
                <span className="text-[10px] font-normal text-slate-500 dark:text-[#c8c9db] truncate font-['Inter:Regular']">
                  Bilim. Yangilik. Imkoniyat.
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* 2. Navigation Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2.5 flex flex-col justify-between scrollbar-none">
          <div className="space-y-4">
            {/* Asosiy navigatsiya */}
            <div className="space-y-1">
              {primaryNavItems.map((item) => {
                const isActive =
                  item.rawHref === "/"
                    ? normalizedPath === "/"
                    : item.rawHref === "/dashboard"
                    ? normalizedPath === "/dashboard"
                    : normalizedPath.startsWith(item.rawHref);
                const IconComponent = item.icon;

                return (
                  <div key={item.rawHref} className="relative group">
                    <Link
                      href={localePath(item.rawHref)}
                      className={`h-[44px] flex items-center gap-3 px-3 rounded-[12px] text-[14px] transition-colors cursor-pointer focus-visible:outline-none ${
                        isActive
                          ? "bg-blue-50 dark:bg-[#162038] text-blue-600 dark:text-[#3995ff] font-semibold border border-blue-200/80 dark:border-[#23355d]"
                          : "text-slate-600 dark:text-[#d4d7e7] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#14151f] font-medium"
                      } ${isCollapsed ? "justify-center px-0" : ""}`}
                      aria-label={item.label}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <div className="relative shrink-0 flex items-center justify-center size-[20px]">
                        <IconComponent size={18} />
                        {item.badge > 0 && isCollapsed && (
                          <span className="absolute -top-1.5 -right-1.5 min-w-3.5 h-3.5 px-0.5 rounded-full bg-[#3995ff] text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-[#0b0c13] shadow-2xs">
                            {item.badge > 9 ? "9+" : item.badge}
                          </span>
                        )}
                      </div>

                      {!isCollapsed && (
                        <span className="flex-1 overflow-hidden whitespace-nowrap flex items-center justify-between min-w-0">
                          <span className="truncate">{item.label}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.pill && (
                              <span className="px-2 py-0.5 rounded-[11px] bg-[#3995ff] text-white text-[10px] font-bold leading-none">
                                {item.pill}
                              </span>
                            )}
                            {item.badge > 0 && (
                              <span className="min-w-4 h-4 px-1 rounded-full bg-[#3995ff] text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-2xs">
                                {item.badge > 9 ? "9+" : item.badge}
                              </span>
                            )}
                          </div>
                        </span>
                      )}
                    </Link>

                    {isCollapsed && (
                      <div
                        role="tooltip"
                        className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 z-50 pointer-events-none px-2.5 py-1 rounded-md bg-slate-900 dark:bg-[#101117] border border-slate-700 dark:border-[#24252f] text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg"
                      >
                        {item.label}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Ajratuvchi chiziq (Figma node 11:219) */}
            <div className="h-px bg-slate-200 dark:bg-[#24252f] mx-2" />

            {/* Creator Studio Section (Figma node 11:218) */}
            <div className="space-y-1">
              {!isCollapsed && (
                <p className="px-3 py-1 text-[11px] font-semibold tracking-wider text-slate-400 dark:text-[#8e95ab] uppercase font-['Inter:Regular']">
                  Creator Studio
                </p>
              )}
              {creatorStudioItems.map((item) => {
                const isActive = normalizedPath.startsWith(item.rawHref);
                const IconComponent = item.icon;

                return (
                  <div key={item.rawHref} className="relative group">
                    <Link
                      href={localePath(item.rawHref)}
                      className={`h-[42px] flex items-center gap-3 px-3 rounded-[12px] text-[13px] sm:text-[14px] transition-colors cursor-pointer focus-visible:outline-none ${
                        isActive
                          ? "bg-blue-50 dark:bg-[#162038] text-blue-600 dark:text-[#3995ff] font-semibold border border-blue-200/80 dark:border-[#23355d]"
                          : "text-slate-600 dark:text-[#d4d7e7] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#14151f] font-medium"
                      } ${isCollapsed ? "justify-center px-0" : ""}`}
                      aria-label={item.label}
                    >
                      <div className="relative shrink-0 flex items-center justify-center size-[20px]">
                        <IconComponent size={17} />
                      </div>

                      {!isCollapsed && (
                        <span className="flex-1 overflow-hidden whitespace-nowrap flex items-center justify-between min-w-0">
                          <span className="truncate">{item.label}</span>
                          {item.pill && (
                            <span className="px-2 py-0.5 rounded-[11px] bg-[#1c2b45] text-[#3995ff] border border-[#2a3f65] text-[10px] font-bold leading-none">
                              {item.pill}
                            </span>
                          )}
                        </span>
                      )}
                    </Link>

                    {isCollapsed && (
                      <div
                        role="tooltip"
                        className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 z-50 pointer-events-none px-2.5 py-1 rounded-md bg-slate-900 dark:bg-[#101117] border border-slate-700 dark:border-[#24252f] text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg"
                      >
                        {item.label}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Kontent saqlash hajmi (Storage widget - Figma node 11:252) */}
            {!isCollapsed ? (
              <div
                data-node-id="11:252"
                data-name="Kontent saqlash hajmi"
                className="mx-1 bg-slate-100/90 dark:bg-[#14161e] border border-slate-200 dark:border-[#222430] rounded-[14px] p-3 space-y-2 select-none shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <HardDrive size={15} className="text-[#3995ff] shrink-0" />
                  <span className="text-[12px] font-semibold text-slate-800 dark:text-white truncate">
                    Kontent yuklash
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-[#c7cadd]">
                  <span>{storageInfo.displayString}</span>
                  <span className="font-semibold text-[#3995ff]">
                    {storageInfo.percentageFormatted}
                  </span>
                </div>
                <div className="h-[6px] w-full bg-slate-200 dark:bg-[#353744] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#3995ff] rounded-full transition-all duration-300"
                    style={{ width: `${storageInfo.percentage}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex justify-center group relative">
                <div className="size-9 rounded-xl bg-slate-100 dark:bg-[#14161e] border border-slate-200 dark:border-[#222430] flex items-center justify-center text-[#3995ff] cursor-pointer">
                  <HardDrive size={16} />
                </div>
                <div
                  role="tooltip"
                  className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 z-50 pointer-events-none px-2.5 py-1 rounded-md bg-slate-900 dark:bg-[#101117] border border-slate-700 dark:border-[#24252f] text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg"
                >
                  Kontent yuklash: {storageInfo.displayString} ({storageInfo.percentageFormatted})
                </div>
              </div>
            )}
          </div>

          {/* 3. Bottom Secondary Navigation & User Profile (Figma node 11:259, 11:262) */}
          <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-[#24252f]">
            {/* Install App button (hidden once app is installed) */}
            {!isInstalled && (
              <div className="relative group">
                <button
                  type="button"
                  onClick={promptInstall}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-blue-600 dark:text-[#3995ff] hover:bg-blue-50/80 dark:hover:bg-[#14161e] rounded-[12px] transition-colors cursor-pointer focus-visible:outline-none ${
                    isCollapsed ? "justify-center px-0" : ""
                  }`}
                  aria-label="Ilovani telefon yoki kompyuterga o‘rnatish"
                >
                  <div className="relative shrink-0 flex items-center justify-center size-[20px]">
                    <Download size={17} />
                  </div>

                  {!isCollapsed && (
                    <span className="flex-1 text-left truncate">
                      {locale === "ru"
                        ? "Установить приложение"
                        : locale === "en"
                        ? "Install App"
                        : "Ilovani o‘rnatish"}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* User profile card (Figma node 11:262) */}
            <div>
              {session.isAuthenticated ? (
                <div
                  className={`flex items-center justify-between p-2 rounded-[13px] bg-slate-50 dark:bg-[#14161e] border border-slate-200/80 dark:border-[#222430] transition-colors ${
                    isCollapsed ? "justify-center p-1.5" : ""
                  }`}
                >
                  <Link
                    href={localePath("/dashboard/profile")}
                    className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-90 transition-opacity"
                    aria-label={t("nav.profile")}
                  >
                    <UserAvatar
                      name={session.user.name}
                      avatarUrl={session.user.avatarUrl}
                      size="sm"
                    />
                    {!isCollapsed && (
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                          {session.user.name || "baxtiyor"}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-[#bfc4d8] truncate">
                          {session.user.role || "Creator"}
                        </span>
                      </div>
                    )}
                  </Link>

                  {!isCollapsed && (
                    <button
                      type="button"
                      onClick={() => setIsLogoutDialogOpen(true)}
                      title={t("nav.logout")}
                      className="p-1 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer shrink-0"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <Link
                  href={localePath("/auth/login")}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-[12px] bg-[#3995ff] hover:bg-[#2884ee] text-white text-xs font-semibold transition-all shadow-xs ${
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
