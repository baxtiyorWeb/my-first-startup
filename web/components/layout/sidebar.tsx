"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Bookmark,
  Bell,
  Shield,
  User,
  ShieldAlert,
  Plus,
  Settings,
  HelpCircle,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  Users,
} from "lucide-react";
import {
  useShell,
  SIDEBAR_EXPANDED_WIDTH,
  SIDEBAR_COLLAPSED_WIDTH,
} from "./shell-context";
import { useAuth } from "@/components/auth/auth-context";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UserAvatar } from "@/components/ui/user-avatar";
import { toast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/context";
import { api } from "@/lib/api";

interface CategoryItem {
  id: string;
  name: string;
  tag: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

const CATEGORIES: CategoryItem[] = [
  {
    id: "startups",
    name: "Startups",
    tag: "Startups",
    badgeBg: "bg-purple-950/70",
    badgeText: "text-purple-400",
    badgeBorder: "border-purple-500/30",
  },
  {
    id: "ai",
    name: "AI",
    tag: "AI",
    badgeBg: "bg-emerald-950/70",
    badgeText: "text-emerald-400",
    badgeBorder: "border-emerald-500/30",
  },
  {
    id: "backend",
    name: "Backend",
    tag: "Backend",
    badgeBg: "bg-sky-950/70",
    badgeText: "text-sky-400",
    badgeBorder: "border-sky-500/30",
  },
  {
    id: "devops",
    name: "DevOps",
    tag: "DevOps",
    badgeBg: "bg-amber-950/70",
    badgeText: "text-amber-400",
    badgeBorder: "border-amber-500/30",
  },
];

export function Sidebar() {
  const router = useRouter();
  const { isCollapsed, toggleSidebar } = useShell();
  const pathname = usePathname();
  const { session, logout } = useAuth();
  const { t, localePath } = useI18n();

  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] =
    useState<number>(0);

  useEffect(() => {
    if (!session.isAuthenticated) return;
    const fetchCount = async () => {
      try {
        const count = await api.notifications.getUnreadCount();
        setUnreadNotificationsCount(count > 0 ? count : 0);
      } catch {
        // Ignore transient network errors
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [session.isAuthenticated]);

  // Strip locale for active route check
  const normalizedPath =
    pathname.replace(/^\/(uz|ru|en)(\/|$)/, "/$2").replace(/\/+/g, "/") ||
    "/dashboard";

  const userRole = (session.user?.role || "").toUpperCase();
  const isAdminUser = userRole === "ADMIN" || userRole === "SUPER_ADMIN";
  const isAdminAllowed =
    isAdminUser &&
    (process.env.NODE_ENV !== "production" ||
      process.env.NEXT_PUBLIC_ENABLE_ADMIN === "true" ||
      process.env.NEXT_PUBLIC_ENABLE_ADMIN_PANEL === "true");

  const primaryNavItems = [
    {
      label: "Muhokamalar",
      rawHref: "/dashboard",
      icon: Home,
      badge: 0,
    },
    {
      label: "Guruh",
      rawHref: "/dashboard/community",
      icon: Users,
      badge: 0,
    },
    {
      label: "Saqlanganlar",
      rawHref: "/dashboard/bookmarks",
      icon: Bookmark,
      badge: 0,
    },
    {
      label: "Xabarnomalar",
      rawHref: "/dashboard/notifications",
      icon: Bell,
      badge: unreadNotificationsCount,
    },
    {
      label: "Tariflar",
      rawHref: "/dashboard/pricing",
      icon: Shield,
      badge: 0,
    },
    {
      label: "Profil",
      rawHref: "/dashboard/profile",
      icon: User,
      badge: 0,
    },
    ...(isAdminAllowed
      ? [
          {
            label: "Admin Panel",
            rawHref: "/dashboard/admin",
            icon: ShieldAlert,
            badge: 0,
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

  const displayName = session.user?.name || "Baxtiyor Q.";
  const rawHandle = (
    session.user?.handle ||
    (session.user?.name
      ? session.user.name.toLowerCase().replace(/\s+/g, "")
      : "baxtiyor")
  ).trim();

  // Agar foydalanuvchi '@' belgisini qo'shib o'tgan bo'lsa, qayta qo'shmaymiz;
  // agar qo'shmasdan o'tgan bo'lsa, '@' belgisini qo'shamiz.
  const displayHandle = rawHandle.startsWith("@")
    ? `@${rawHandle.replace(/^@+/, "")}`
    : `@${rawHandle}`;

  return (
    <>
      <aside
        data-name="Yon menyu"
        aria-label="Asosiy navigatsiya"
        className="hidden md:flex flex-col fixed top-0 left-0 bottom-0 z-30 bg-white dark:bg-[#0a0d14] text-[#0f1419] dark:text-[#e7e9ea] border-r border-[#cfd9de] dark:border-[#2f3336] transition-all duration-300 ease-out select-none"
        style={{
          width: isCollapsed
            ? `${SIDEBAR_COLLAPSED_WIDTH}px`
            : `${SIDEBAR_EXPANDED_WIDTH}px`,
        }}
      >
        {/* 1. Brand / Logo Header */}
        <div className="h-[68px] flex items-center justify-between px-3.5 border-b border-[#cfd9de] dark:border-[#2f3336] shrink-0">
          <Link
            href={localePath("/dashboard")}
            className="flex items-center gap-2.5 min-w-0 group focus-visible:outline-none"
          >
            {/* Logo Mark */}
            <div className="w-[34px] h-[34px] shrink-0 rounded-xl overflow-hidden flex items-center justify-center bg-[#000000] border border-[#cfd9de] dark:border-[#2f3336] group-hover:scale-105 transition-transform">
              <Image
                src="/logo.png"
                alt="Geters logotipi"
                width={34}
                height={34}
                className="w-full h-full object-contain"
                priority
              />
            </div>

            {/* Brand Name & Tagline */}
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden whitespace-nowrap min-w-0">
                <span className="text-[17px] font-extrabold tracking-tight text-[#0f1419] dark:text-[#e7e9ea] leading-tight truncate">
                  Geters
                </span>
                <span className="text-[10px] text-[#536471] dark:text-[#71767b] font-normal truncate">
                  Bilim. Yangilik. Imkoniyat.
                </span>
              </div>
            )}
          </Link>

          {/* Collapse / Expand Toggle Button */}
          {!isCollapsed ? (
            <button
              type="button"
              onClick={toggleSidebar}
              className="size-7 rounded-lg bg-[#f7f9f9] dark:bg-[#16181c] hover:bg-[#eff3f4] dark:hover:bg-[#202327] text-[#536471] dark:text-[#71767b] hover:text-[#0f1419] dark:hover:text-[#e7e9ea] border border-[#cfd9de]/70 dark:border-[#2f3336] flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-1"
              title="Menyuni yopish"
              aria-label="Menyuni yopish"
            >
              <ChevronsLeft className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleSidebar}
              className="size-7 rounded-lg bg-[#f7f9f9] dark:bg-[#16181c] hover:bg-[#eff3f4] dark:hover:bg-[#202327] text-[#536471] dark:text-[#71767b] hover:text-[#0f1419] dark:hover:text-[#e7e9ea] border border-[#cfd9de]/70 dark:border-[#2f3336] flex items-center justify-center transition-colors cursor-pointer shrink-0 mx-auto"
              title="Menyuni ochish"
              aria-label="Menyuni ochish"
            >
              <ChevronsRight className="size-4" />
            </button>
          )}
        </div>

        {/* 2. Scrollable Sidebar Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 flex flex-col justify-between scrollbar-none space-y-4">
          <div className="space-y-4">
            {/* User Profile Card */}
            <div>
              {session.isAuthenticated ? (
                <Link
                  href={localePath("/dashboard/profile")}
                  className={`bg-[#f7f9f9] dark:bg-[#16181c] hover:bg-[#eff3f4] dark:hover:bg-[#202327] border border-[#cfd9de] dark:border-[#2f3336] rounded-2xl p-2 flex items-center transition-all cursor-pointer group ${
                    isCollapsed ? "justify-center p-1.5" : "justify-between gap-2.5"
                  }`}
                  aria-label="Profilga o‘tish"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <UserAvatar
                      name={displayName}
                      avatarUrl={session.user?.avatarUrl}
                      size="md"
                      isVerified={Boolean(session.user?.verified)}
                    />

                    {!isCollapsed && (
                      <div className="flex flex-col min-w-0">
                        <span className="text-[13.5px] font-bold text-[#0f1419] dark:text-[#e7e9ea] group-hover:text-[#2dd4bf] transition-colors truncate leading-tight">
                          {displayName}
                        </span>
                        <span className="text-[11.5px] text-[#536471] dark:text-[#71767b] truncate leading-tight mt-0.5">
                          {displayHandle}
                        </span>
                      </div>
                    )}
                  </div>

                  {!isCollapsed && (
                    <ChevronRight
                      size={16}
                      className="text-[#8b98a5] dark:text-[#71767b] group-hover:text-[#0f1419] dark:group-hover:text-[#e7e9ea] transition-colors shrink-0"
                    />
                  )}
                </Link>
              ) : (
                <Link
                  href={localePath("/auth/login")}
                  className={`bg-[#f7f9f9] dark:bg-[#16181c] hover:bg-[#eff3f4] dark:hover:bg-[#202327] border border-[#cfd9de] dark:border-[#2f3336] rounded-2xl p-2 flex items-center transition-all cursor-pointer group ${
                    isCollapsed ? "justify-center p-1.5" : "justify-between gap-2.5"
                  }`}
                  aria-label="Kirish"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-9 rounded-full bg-[#eff3f4] dark:bg-[#202327] text-[#536471] dark:text-[#71767b] flex items-center justify-center shrink-0">
                      <User size={18} />
                    </div>
                    {!isCollapsed && (
                      <div className="flex flex-col min-w-0">
                        <span className="text-[13.5px] font-bold text-[#0f1419] dark:text-[#e7e9ea] group-hover:text-[#2dd4bf] transition-colors truncate leading-tight">
                          Kirish
                        </span>
                        <span className="text-[11px] text-[#536471] dark:text-[#71767b] truncate leading-tight mt-0.5">
                          Hamjamiyatga qo‘shiling
                        </span>
                      </div>
                    )}
                  </div>
                  {!isCollapsed && (
                    <ChevronRight
                      size={16}
                      className="text-[#8b98a5] dark:text-[#71767b] group-hover:text-[#0f1419] dark:group-hover:text-[#e7e9ea] transition-colors shrink-0"
                    />
                  )}
                </Link>
              )}
            </div>

            {/* ASOSIY bo'limi */}
            <div className="space-y-1">
              {!isCollapsed && (
                <h4 className="text-[11px] font-bold text-[#8b98a5] dark:text-[#71767b] tracking-wider uppercase px-2.5 mb-1.5">
                  Asosiy
                </h4>
              )}

              {primaryNavItems.map((item) => {
                const isActive =
                  item.rawHref === "/dashboard"
                    ? normalizedPath === "/dashboard"
                    : normalizedPath.startsWith(item.rawHref);
                const IconComponent = item.icon;

                return (
                  <div key={item.rawHref} className="relative group">
                    <Link
                      href={localePath(item.rawHref)}
                      className={`h-[42px] flex items-center gap-3 px-3 rounded-xl text-[13.5px] transition-all cursor-pointer focus-visible:outline-none ${
                        isActive
                          ? "bg-[#e6faf7] dark:bg-[#0c272c] text-[#2dd4bf] font-semibold border border-[#2dd4bf]/30"
                          : "text-[#536471] dark:text-[#cfd9de] hover:text-[#0f1419] dark:hover:text-[#e7e9ea] hover:bg-[#f7f9f9] dark:hover:bg-[#16181c] font-medium border border-transparent"
                      } ${isCollapsed ? "justify-center px-0" : ""}`}
                      aria-label={item.label}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <div className="relative shrink-0 flex items-center justify-center size-[20px]">
                        <IconComponent
                          size={18}
                          className={
                            isActive
                              ? "text-[#2dd4bf]"
                              : "text-[#536471] dark:text-[#71767b] group-hover:text-[#0f1419] dark:group-hover:text-[#e7e9ea]"
                          }
                        />
                      </div>

                      {!isCollapsed && (
                        <span className="flex-1 overflow-hidden whitespace-nowrap flex items-center justify-between min-w-0">
                          <span className="truncate">{item.label}</span>
                          {item.badge > 0 && (
                            <span className="min-w-4 h-4 px-1.5 rounded-full bg-[#2dd4bf] text-[#0f1419] text-[10px] font-bold flex items-center justify-center leading-none">
                              {item.badge > 9 ? "9+" : item.badge}
                            </span>
                          )}
                        </span>
                      )}
                    </Link>

                    {isCollapsed && (
                      <div
                        role="tooltip"
                        className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 z-50 pointer-events-none px-2.5 py-1 rounded-lg bg-[#0f1419] dark:bg-[#16181c] border border-[#2f3336] text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg"
                      >
                        {item.label}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* KATEGORIYALAR bo'limi */}
            <div className="space-y-1.5 pt-1">
              {!isCollapsed ? (
                <div className="flex items-center justify-between px-2.5 mb-1.5">
                  <h4 className="text-[11px] font-bold text-[#8b98a5] dark:text-[#71767b] tracking-wider uppercase">
                    Kategoriyalar
                  </h4>
                  <Link
                    href={localePath("/dashboard")}
                    className="p-0.5 rounded text-[#8b98a5] dark:text-[#71767b] hover:text-[#0f1419] dark:hover:text-[#e7e9ea] transition-colors"
                    title="Kategoriya qo‘shish"
                    aria-label="Kategoriya qo‘shish"
                  >
                    <Plus size={15} />
                  </Link>
                </div>
              ) : (
                <div className="h-px bg-[#cfd9de] dark:bg-[#2f3336] my-2 mx-1" />
              )}

              {CATEGORIES.map((cat) => {
                const isCatActive = pathname.includes(`hl=${cat.tag}`);
                return (
                  <div key={cat.id} className="relative group">
                    <Link
                      href={localePath(`/dashboard?hl=${cat.tag}`)}
                      className={`h-[38px] px-2.5 rounded-xl bg-[#f7f9f9] dark:bg-[#16181c] hover:bg-[#eff3f4] dark:hover:bg-[#202327] border border-[#cfd9de]/70 dark:border-[#2f3336] flex items-center gap-2.5 text-[13px] text-[#0f1419] dark:text-[#e7e9ea] transition-colors group cursor-pointer ${
                        isCatActive ? "ring-1 ring-[#2dd4bf]/50 border-[#2dd4bf]/40" : ""
                      } ${isCollapsed ? "justify-center px-0" : ""}`}
                    >
                      <span
                        className="size-5 rounded-md bg-[#e6faf7] dark:bg-[#0c272c] text-[#2dd4bf] border border-[#2dd4bf]/25 flex items-center justify-center font-bold text-[11px] font-mono shrink-0"
                      >
                        #
                      </span>
                      {!isCollapsed && (
                        <span className="font-medium truncate group-hover:text-[#2dd4bf] transition-colors">
                          {cat.name}
                        </span>
                      )}
                    </Link>

                    {isCollapsed && (
                      <div
                        role="tooltip"
                        className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 z-50 pointer-events-none px-2.5 py-1 rounded-lg bg-[#0f1419] dark:bg-[#16181c] border border-[#2f3336] text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg"
                      >
                        #{cat.name}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Barchasi */}
              <div className="relative group">
                <Link
                  href={localePath("/dashboard")}
                  className={`h-[38px] px-2.5 rounded-xl bg-[#f7f9f9] dark:bg-[#16181c] hover:bg-[#eff3f4] dark:hover:bg-[#202327] border border-[#cfd9de]/70 dark:border-[#2f3336] flex items-center gap-2.5 text-[13px] text-[#536471] dark:text-[#cfd9de] hover:text-[#0f1419] dark:hover:text-[#e7e9ea] transition-colors cursor-pointer ${
                    isCollapsed ? "justify-center px-0" : ""
                  }`}
                >
                  <span className="size-5 rounded-md bg-[#eff3f4] dark:bg-[#202327] text-[#536471] dark:text-[#71767b] flex items-center justify-center font-bold text-[10px] shrink-0 tracking-widest">
                    •••
                  </span>
                  {!isCollapsed && <span className="font-medium truncate">Barchasi</span>}
                </Link>

                {isCollapsed && (
                  <div
                    role="tooltip"
                    className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 z-50 pointer-events-none px-2.5 py-1 rounded-lg bg-[#0f1419] dark:bg-[#16181c] border border-[#2f3336] text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg"
                  >
                    Barchasi
                  </div>
                )}
              </div>
            </div>

            {/* Geters Plus Promo Card — Clean Unified Surface */}
            {!isCollapsed ? (
              <div className="rounded-2xl p-4 border border-[#cfd9de] dark:border-[#2f3336] bg-[#f7f9f9] dark:bg-[#16181c] my-2">
                <div className="flex items-center gap-2">
                  <span className="size-7 rounded-lg bg-[#e6faf7] dark:bg-[#0c272c] text-[#2dd4bf] flex items-center justify-center shrink-0">
                    <Sparkles className="size-4" />
                  </span>
                  <h3 className="text-[14.5px] font-bold text-[#0f1419] dark:text-[#e7e9ea] tracking-tight">
                    Geters Plus
                  </h3>
                </div>
                <p className="text-[11.5px] text-[#536471] dark:text-[#71767b] leading-snug mt-2">
                  Ko‘proq imkoniyatlar, tasdiqlangan nishon va reklamasiz tajriba.
                </p>

                <Link
                  href={localePath("/dashboard/pricing")}
                  className="mt-3 w-full h-[36px] rounded-full bg-[#2dd4bf] hover:bg-[#14b8a6] text-[#0f1419] font-bold text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Sparkles className="size-3.5" />
                  <span>Tariflarni ko‘rish</span>
                </Link>
              </div>
            ) : (
              <div className="relative group flex justify-center py-1">
                <Link
                  href={localePath("/dashboard/pricing")}
                  className="size-9 rounded-xl bg-[#e6faf7] dark:bg-[#0c272c] border border-[#2dd4bf]/30 text-[#2dd4bf] flex items-center justify-center hover:bg-[#ccf5ef] dark:hover:bg-[#2dd4bf]/20 transition-colors"
                >
                  <Sparkles size={16} />
                </Link>
                <div
                  role="tooltip"
                  className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 z-50 pointer-events-none px-2.5 py-1 rounded-lg bg-[#0f1419] dark:bg-[#16181c] border border-[#2f3336] text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg"
                >
                  Geters Plus
                </div>
              </div>
            )}
          </div>

          {/* 3. Bottom Footer Links: Sozlamalar & Yordam */}
          <div
            className={`pt-3 border-t border-[#cfd9de] dark:border-[#2f3336] ${
              isCollapsed
                ? "flex flex-col items-center gap-2"
                : "flex items-center justify-between px-1"
            }`}
          >
            <div className="relative group">
              <Link
                href={localePath("/dashboard/settings")}
                className={`flex items-center gap-1.5 text-[12px] font-medium text-[#536471] dark:text-[#71767b] hover:text-[#0f1419] dark:hover:text-[#e7e9ea] transition-colors py-1.5 px-2 rounded-lg hover:bg-[#f7f9f9] dark:hover:bg-[#16181c] ${
                  isCollapsed ? "justify-center p-2" : ""
                }`}
                aria-label="Sozlamalar"
              >
                <Settings className="size-4 shrink-0" />
                {!isCollapsed && <span>Sozlamalar</span>}
              </Link>
              {isCollapsed && (
                <div
                  role="tooltip"
                  className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 z-50 pointer-events-none px-2.5 py-1 rounded-lg bg-[#0f1419] dark:bg-[#16181c] border border-[#2f3336] text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg"
                >
                  Sozlamalar
                </div>
              )}
            </div>

            <div className="relative group">
              <Link
                href={localePath("/help")}
                className={`flex items-center gap-1.5 text-[12px] font-medium text-[#536471] dark:text-[#71767b] hover:text-[#0f1419] dark:hover:text-[#e7e9ea] transition-colors py-1.5 px-2 rounded-lg hover:bg-[#f7f9f9] dark:hover:bg-[#16181c] ${
                  isCollapsed ? "justify-center p-2" : ""
                }`}
                aria-label="Yordam"
              >
                <HelpCircle className="size-4 shrink-0" />
                {!isCollapsed && <span>Yordam</span>}
              </Link>
              {isCollapsed && (
                <div
                  role="tooltip"
                  className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 z-50 pointer-events-none px-2.5 py-1 rounded-lg bg-[#0f1419] dark:bg-[#16181c] border border-[#2f3336] text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg"
                >
                  Yordam
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Logout Confirmation Dialog (if triggered) */}
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
