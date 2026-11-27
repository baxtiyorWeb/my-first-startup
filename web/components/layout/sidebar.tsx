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
  Check,
  Sparkles,
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
    useState<number>(3);

  useEffect(() => {
    if (!session.isAuthenticated) return;
    const fetchCount = async () => {
      try {
        const count = await api.notifications.getUnreadCount();
        setUnreadNotificationsCount(count > 0 ? count : 3);
      } catch {
        // Fallback default
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
  const avatarInitial = displayName.charAt(0).toLowerCase() || "b";

  return (
    <>
      <aside
        data-name="Yon menyu"
        aria-label="Asosiy navigatsiya"
        className="hidden md:flex flex-col fixed top-0 left-0 bottom-0 z-30 bg-[#0a0d14] text-white border-r border-white/[0.08] transition-all duration-300 ease-out select-none"
        style={{
          width: isCollapsed
            ? `${SIDEBAR_COLLAPSED_WIDTH}px`
            : `${SIDEBAR_EXPANDED_WIDTH}px`,
        }}
      >
        {/* 1. Brand / Logo Header */}
        <div className="h-[68px] flex items-center justify-between px-3.5 border-b border-white/[0.06] shrink-0">
          <Link
            href={localePath("/dashboard")}
            className="flex items-center gap-2.5 min-w-0 group focus-visible:outline-none"
          >
            {/* Logo Mark */}
            <div className="w-[34px] h-[34px] shrink-0 rounded-xl overflow-hidden flex items-center justify-center bg-slate-950 border border-teal-500/20 shadow-xs group-hover:scale-105 transition-transform">
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
                <span className="text-[17px] font-extrabold tracking-tight text-white leading-tight font-['Inter:Bold'] truncate">
                  Geters
                </span>
                <span className="text-[10px] text-zinc-400 font-normal truncate">
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
              className="size-7 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/80 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-1"
              title="Menyuni yopish"
              aria-label="Menyuni yopish"
            >
              <ChevronsLeft className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleSidebar}
              className="size-7 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/80 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 mx-auto"
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
                  className={`bg-[#131620] hover:bg-[#181c28] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-2 flex items-center transition-all cursor-pointer group ${
                    isCollapsed ? "justify-center p-1.5" : "justify-between gap-2.5"
                  }`}
                  aria-label="Profilga o‘tish"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Avatar circle with green verified checkmark */}
                    <div className="relative shrink-0">
                      {session.user?.avatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={session.user.avatarUrl}
                          alt={displayName}
                          className="size-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="size-9 rounded-full bg-[#9333ea] text-white font-bold text-sm flex items-center justify-center select-none shadow-sm">
                          {avatarInitial}
                        </div>
                      )}
                      {/* Verified Badge */}
                      <div className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-[#00ba7c] ring-2 ring-[#131620] flex items-center justify-center text-black">
                        <Check size={9} strokeWidth={3.5} />
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="flex flex-col min-w-0">
                        <span className="text-[13.5px] font-bold text-white group-hover:text-[#2dd4bf] transition-colors truncate leading-tight">
                          {displayName}
                        </span>
                        <span className="text-[11.5px] text-zinc-400 truncate leading-tight mt-0.5">
                          {displayHandle}
                        </span>
                      </div>
                    )}
                  </div>

                  {!isCollapsed && (
                    <ChevronRight
                      size={16}
                      className="text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0"
                    />
                  )}
                </Link>
              ) : (
                <Link
                  href={localePath("/auth/login")}
                  className={`bg-[#131620] hover:bg-[#181c28] border border-white/[0.06] rounded-2xl p-2 flex items-center transition-all cursor-pointer group ${
                    isCollapsed ? "justify-center p-1.5" : "justify-between gap-2.5"
                  }`}
                  aria-label="Kirish"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-9 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0">
                      <User size={18} />
                    </div>
                    {!isCollapsed && (
                      <div className="flex flex-col min-w-0">
                        <span className="text-[13.5px] font-bold text-white group-hover:text-[#2dd4bf] transition-colors truncate leading-tight">
                          Kirish
                        </span>
                        <span className="text-[11px] text-zinc-400 truncate leading-tight mt-0.5">
                          Hamjamiyatga qo‘shiling
                        </span>
                      </div>
                    )}
                  </div>
                  {!isCollapsed && (
                    <ChevronRight
                      size={16}
                      className="text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0"
                    />
                  )}
                </Link>
              )}
            </div>

            {/* ASOSIY bo'limi */}
            <div className="space-y-1">
              {!isCollapsed && (
                <h4 className="text-[11px] font-bold text-zinc-500 tracking-wider uppercase px-2.5 mb-1.5">
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
                          ? "bg-[#0c272c] text-[#2dd4bf] font-semibold border border-[#14b8a6]/40 shadow-xs"
                          : "text-zinc-300 hover:text-white hover:bg-white/[0.04] font-medium border border-transparent"
                      } ${isCollapsed ? "justify-center px-0" : ""}`}
                      aria-label={item.label}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <div className="relative shrink-0 flex items-center justify-center size-[20px]">
                        <IconComponent
                          size={18}
                          className={isActive ? "text-[#2dd4bf]" : "text-zinc-400 group-hover:text-white"}
                        />
                      </div>

                      {!isCollapsed && (
                        <span className="flex-1 overflow-hidden whitespace-nowrap flex items-center justify-between min-w-0">
                          <span className="truncate">{item.label}</span>
                          {item.badge > 0 && (
                            <span className="min-w-4 h-4 px-1.5 rounded-md bg-[#00ba7c] text-slate-950 text-[10px] font-extrabold flex items-center justify-center leading-none shadow-xs">
                              {item.badge > 9 ? "9+" : item.badge}
                            </span>
                          )}
                        </span>
                      )}
                    </Link>

                    {isCollapsed && (
                      <div
                        role="tooltip"
                        className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 z-50 pointer-events-none px-2.5 py-1 rounded-md bg-black border border-white/10 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg"
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
                  <h4 className="text-[11px] font-bold text-zinc-500 tracking-wider uppercase">
                    Kategoriyalar
                  </h4>
                  <Link
                    href={localePath("/dashboard")}
                    className="p-0.5 rounded text-zinc-400 hover:text-white transition-colors"
                    title="Kategoriya qo‘shish"
                    aria-label="Kategoriya qo‘shish"
                  >
                    <Plus size={15} />
                  </Link>
                </div>
              ) : (
                <div className="h-px bg-white/[0.06] my-2 mx-1" />
              )}

              {CATEGORIES.map((cat) => {
                const isCatActive = pathname.includes(`hl=${cat.tag}`);
                return (
                  <div key={cat.id} className="relative group">
                    <Link
                      href={localePath(`/dashboard?hl=${cat.tag}`)}
                      className={`h-[38px] px-2.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/[0.04] flex items-center gap-2.5 text-[13px] text-zinc-200 transition-colors group cursor-pointer ${
                        isCatActive ? "ring-1 ring-teal-500/40 bg-zinc-800/90 text-white" : ""
                      } ${isCollapsed ? "justify-center px-0" : ""}`}
                    >
                      <span
                        className={`size-5 rounded-md ${cat.badgeBg} ${cat.badgeText} border ${cat.badgeBorder} flex items-center justify-center font-bold text-[11px] font-mono shrink-0`}
                      >
                        #
                      </span>
                      {!isCollapsed && (
                        <span className="font-medium truncate group-hover:text-white transition-colors">
                          {cat.name}
                        </span>
                      )}
                    </Link>

                    {isCollapsed && (
                      <div
                        role="tooltip"
                        className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 z-50 pointer-events-none px-2.5 py-1 rounded-md bg-black border border-white/10 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg"
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
                  className={`h-[38px] px-2.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/[0.04] flex items-center gap-2.5 text-[13px] text-zinc-300 hover:text-white transition-colors cursor-pointer ${
                    isCollapsed ? "justify-center px-0" : ""
                  }`}
                >
                  <span className="size-5 rounded-md bg-zinc-800 text-zinc-400 flex items-center justify-center font-bold text-[10px] shrink-0 tracking-widest">
                    •••
                  </span>
                  {!isCollapsed && <span className="font-medium truncate">Barchasi</span>}
                </Link>

                {isCollapsed && (
                  <div
                    role="tooltip"
                    className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 z-50 pointer-events-none px-2.5 py-1 rounded-md bg-black border border-white/10 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg"
                  >
                    Barchasi
                  </div>
                )}
              </div>
            </div>

            {/* Geters Plus Promo Card */}
            {!isCollapsed ? (
              <div className="relative rounded-2xl p-4 overflow-hidden border border-white/[0.08] bg-gradient-to-br from-[#131622] via-[#0f121a] to-[#0a0d13] text-white shadow-lg my-2">
                {/* Radial glow background */}
                <div className="absolute -right-3 -top-3 size-28 rounded-full bg-purple-600/20 blur-xl pointer-events-none" />

                {/* 3D Rocket Illustration */}
                <div className="absolute right-2.5 top-2.5 pointer-events-none select-none">
                  <div className="relative size-14 flex items-center justify-center">
                    <div className="absolute inset-0 bg-purple-500/20 blur-md rounded-full" />
                    <svg
                      width="46"
                      height="46"
                      viewBox="0 0 48 48"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="drop-shadow-[0_4px_14px_rgba(168,85,247,0.6)]"
                    >
                      <defs>
                        <linearGradient
                          id="rocketBody"
                          x1="12"
                          y1="36"
                          x2="36"
                          y2="12"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#9333ea" />
                          <stop offset="0.5" stopColor="#a855f7" />
                          <stop offset="1" stopColor="#c084fc" />
                        </linearGradient>
                        <linearGradient
                          id="rocketFins"
                          x1="8"
                          y1="40"
                          x2="20"
                          y2="28"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#7e22ce" />
                          <stop offset="1" stopColor="#9333ea" />
                        </linearGradient>
                        <linearGradient
                          id="rocketFlame"
                          x1="12"
                          y1="36"
                          x2="4"
                          y2="44"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#38bdf8" />
                          <stop offset="0.7" stopColor="#818cf8" />
                          <stop offset="1" stopColor="#c084fc" />
                        </linearGradient>
                      </defs>
                      {/* Exhaust Flame */}
                      <path
                        d="M14 34 L7 41 C5.5 42.5 5 44.5 7 43.5 C9 42.5 11.5 39.5 13 37 Z"
                        fill="url(#rocketFlame)"
                        opacity="0.9"
                      />
                      {/* Left Fin */}
                      <path
                        d="M14 26 L9 34 C8 36 10 38 12.5 37 L21 33 Z"
                        fill="url(#rocketFins)"
                      />
                      {/* Right Fin */}
                      <path
                        d="M22 18 L30 22 C32 23 34 25 33 27 L25 25 Z"
                        fill="url(#rocketFins)"
                      />
                      {/* Rocket Body */}
                      <path
                        d="M19 33 C17 31 16 28 17 24 C20 16 30 11 37 9 C38 8 39 9 38 10 C36 17 31 27 23 30 C20 32 19 33 19 33 Z"
                        fill="url(#rocketBody)"
                      />
                      {/* Portal Window */}
                      <circle
                        cx="28"
                        cy="18"
                        r="3.2"
                        fill="#0b0e14"
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>
                </div>

                {/* Card Content */}
                <div className="relative z-10 pr-12">
                  <h3 className="text-[15px] font-bold text-white tracking-tight">
                    Geters Plus
                  </h3>
                  <p className="text-[11.5px] text-zinc-400 leading-snug mt-1 max-w-[150px]">
                    Ko‘proq imkoniyatlar, reklamasiz tajriba.
                  </p>
                </div>

                {/* Action CTA */}
                <Link
                  href={localePath("/dashboard/pricing")}
                  className="mt-3.5 w-full h-[36px] rounded-xl bg-[#2dd4bf] hover:bg-[#14b8a6] text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-teal-500/20 active:scale-98 transition-all cursor-pointer"
                >
                  <Sparkles className="size-3.5 text-slate-950" />
                  <span>Tez orada</span>
                </Link>
              </div>
            ) : (
              <div className="relative group flex justify-center py-1">
                <Link
                  href={localePath("/dashboard/pricing")}
                  className="size-9 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-400 flex items-center justify-center hover:bg-purple-900/50 transition-colors"
                >
                  <Sparkles size={16} />
                </Link>
                <div
                  role="tooltip"
                  className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 z-50 pointer-events-none px-2.5 py-1 rounded-md bg-black border border-white/10 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg"
                >
                  Geters Plus
                </div>
              </div>
            )}
          </div>

          {/* 3. Bottom Footer Links: Sozlamalar & Yordam */}
          <div
            className={`pt-3 border-t border-white/[0.08] ${
              isCollapsed
                ? "flex flex-col items-center gap-2"
                : "flex items-center justify-between px-1"
            }`}
          >
            <div className="relative group">
              <Link
                href={localePath("/dashboard/settings")}
                className={`flex items-center gap-1.5 text-[12px] font-medium text-zinc-400 hover:text-white transition-colors py-1.5 px-2 rounded-lg hover:bg-white/[0.04] ${
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
                  className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 z-50 pointer-events-none px-2.5 py-1 rounded-md bg-black border border-white/10 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg"
                >
                  Sozlamalar
                </div>
              )}
            </div>

            <div className="relative group">
              <Link
                href={localePath("/help")}
                className={`flex items-center gap-1.5 text-[12px] font-medium text-zinc-400 hover:text-white transition-colors py-1.5 px-2 rounded-lg hover:bg-white/[0.04] ${
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
                  className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 z-50 pointer-events-none px-2.5 py-1 rounded-md bg-black border border-white/10 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg"
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
