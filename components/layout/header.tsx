"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MenuIcon, SearchIcon, PlusIcon, UserIcon, SettingsIcon, BookmarkIcon } from "@/components/icons";
import { LogOut } from "lucide-react";
import { useShell } from "./shell-context";
import { SearchModal } from "@/components/search/search-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/components/auth/auth-context";
import { toast } from "@/components/ui/toast";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

const ROUTE_METADATA: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Bosh sahifa", subtitle: "Fikrlar oqimi" },
  "/dashboard/bookmarks": { title: "Saqlanganlar", subtitle: "Tanlangan fikrlar" },
  "/dashboard/create": { title: "Yangi fikr", subtitle: "Fikr va tahlil yozish" },
  "/dashboard/profile": { title: "Profil", subtitle: "Shaxsiy kabinet" },
  "/dashboard/settings": { title: "Sozlamalar", subtitle: "Hisob va ko‘rinish" },
};

export function Header({ title, subtitle }: HeaderProps) {
  const router = useRouter();
  const { isCollapsed, toggleSidebar, toggleMobileNav } = useShell();
  const pathname = usePathname();
  const { session, logout } = useAuth();

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

  const currentRouteMeta = ROUTE_METADATA[pathname] || {
    title: "Bosh sahifa",
    subtitle: "Fikr platformasi",
  };

  const displayTitle = title || currentRouteMeta.title;
  const displaySubtitle =
    subtitle ||
    (pathname === "/dashboard/profile"
      ? session.user.handle || "Shaxsiy kabinet"
      : currentRouteMeta.subtitle);

  const handleBurgerClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      toggleMobileNav();
    } else {
      toggleSidebar();
    }
  };

  const handleConfirmLogout = () => {
    setIsLogoutDialogOpen(false);
    logout();
    toast.info("Tizimdan chiqdingiz. Xavfsiz sessiyangiz yakunlandi.");
    router.push("/auth/login");
  };

  return (
    <>
      <header
        className="sticky top-0 z-20 h-14 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors select-none"
        role="banner"
      >
        <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          {/* Left: Burger button + Page Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBurgerClick}
              aria-label={isCollapsed ? "Sidebar'ni kengaytirish" : "Sidebar'ni yig‘ish"}
              aria-expanded={!isCollapsed}
              className="p-1.5 -ml-1 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors"
            >
              <MenuIcon size={18} />
            </button>

            <div className="flex items-baseline gap-2">
              <h1 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-50 tracking-tight">
                {displayTitle}
              </h1>
              {displaySubtitle && (
                <span className="hidden sm:inline-block text-xs font-normal text-slate-500 dark:text-slate-400">
                  • {displaySubtitle}
                </span>
              )}
            </div>
          </div>

          {/* Right: Quick Search + Quick Action + Profile Dropdown */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Quick Search Button / Input triggering Spotlight SearchModal */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="relative flex items-center justify-between w-9 sm:w-48 lg:w-56 h-8 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200/70 dark:hover:bg-slate-700/60 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-500 dark:text-slate-400 transition-all cursor-pointer"
              title="Fikrlarni qidirish (Ctrl+K)"
            >
              <div className="flex items-center gap-2">
                <SearchIcon size={14} className="shrink-0" />
                <span className="hidden sm:inline text-[11px] truncate">Qidirish...</span>
              </div>
              <kbd className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                ⌘K
              </kbd>
            </button>

            {/* Sole Primary Create Thought Action in the Header */}
            {pathname !== "/dashboard/create" && (
              <Link
                href="/dashboard/create"
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 text-xs font-semibold cursor-pointer transition-all shadow-xs active:scale-[0.98]"
                title="Fikr bildirish"
              >
                <PlusIcon size={14} />
                <span className="hidden sm:inline">Fikr bildirish</span>
              </Link>
            )}

            {/* User Profile Dropdown Menu OR Guest Sign In */}
            {session.isAuthenticated ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors"
                  aria-label="Foydalanuvchi menyusi"
                  aria-expanded={isUserMenuOpen}
                >
                  <div className="w-7 h-7 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-[11px] flex items-center justify-center ring-1 ring-slate-200 dark:ring-slate-800 select-none">
                    {session.user.name
                      ? session.user.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                      : "F"}
                  </div>
                  <span className="hidden md:inline-block text-xs font-medium text-slate-700 dark:text-slate-300">
                    {session.user.name ? session.user.name.split(" ")[0] : "Foydalanuvchi"}
                  </span>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-56 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100 text-xs">
                    {/* User details header */}
                    <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">
                        {session.user.name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {session.user.handle}
                      </p>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/dashboard/profile"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <UserIcon size={14} className="text-slate-500" />
                        <span>Profilim</span>
                      </Link>

                      <Link
                        href="/dashboard/bookmarks"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <BookmarkIcon size={14} className="text-slate-500" />
                        <span>Saqlangan fikrlar</span>
                      </Link>

                      <Link
                        href="/dashboard/settings"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <SettingsIcon size={14} className="text-slate-500" />
                        <span>Sozlamalar</span>
                      </Link>
                    </div>

                    {/* Logout Action */}
                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsLogoutDialogOpen(true);
                        }}
                        className="w-full px-3.5 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Hisobdan chiqish</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold transition-all shadow-2xs cursor-pointer"
              >
                <span>Kirish</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Global Spotlight Search Modal */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isLogoutDialogOpen}
        onClose={() => setIsLogoutDialogOpen(false)}
        onConfirm={handleConfirmLogout}
        title="Tizimdan chiqmoqchimisiz?"
        description="Joriy sessiyangiz yakunlanadi. Qayta kirish uchun telefon raqamingizga yangi SMS-kod yuboriladi."
        confirmText="Chiqish"
        cancelText="Qolish"
        variant="warning"
      />
    </>
  );
}
