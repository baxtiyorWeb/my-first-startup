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
} from "@/components/icons";
import { LogOut } from "lucide-react";
import { useShell } from "./shell-context";
import { useAuth } from "@/components/auth/auth-context";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobil pastki navigatsiya"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 h-14 px-4 flex items-center justify-around select-none"
    >
      {/* 1. Home */}
      <Link
        href="/dashboard"
        aria-label="Bosh sahifa"
        className={`flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer transition-colors ${
          pathname === "/dashboard"
            ? "text-slate-950 dark:text-white"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
        }`}
      >
        <HomeIcon size={20} />
      </Link>

      {/* 2. Bookmarks */}
      <Link
        href="/dashboard/bookmarks"
        aria-label="Saqlanganlar"
        className={`flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer transition-colors ${
          pathname === "/dashboard/bookmarks"
            ? "text-slate-950 dark:text-white"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
        }`}
      >
        <BookmarkIcon size={20} />
      </Link>

      {/* 3. Profile */}
      <Link
        href="/dashboard/profile"
        aria-label="Profil"
        className={`flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer transition-colors ${
          pathname === "/dashboard/profile"
            ? "text-slate-950 dark:text-white"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
        }`}
      >
        <UserIcon size={20} />
      </Link>

      {/* 4. Settings */}
      <Link
        href="/dashboard/settings"
        aria-label="Sozlamalar"
        className={`flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer transition-colors ${
          pathname === "/dashboard/settings"
            ? "text-slate-950 dark:text-white"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
        }`}
      >
        <SettingsIcon size={20} />
      </Link>
    </nav>
  );
}

export function MobileDrawer() {
  const router = useRouter();
  const { isMobileOpen, closeMobileNav } = useShell();
  const pathname = usePathname();
  const { session, logout } = useAuth();

  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  if (!isMobileOpen) return null;

  const handleConfirmLogout = () => {
    setIsLogoutDialogOpen(false);
    closeMobileNav();
    logout();
    toast.info("Tizimdan chiqdingiz. Xavfsiz sessiyangiz yakunlandi.");
    router.push("/auth/login");
  };

  const navLinks = [
    { href: "/dashboard", label: "Bosh sahifa", icon: HomeIcon },
    { href: "/dashboard/bookmarks", label: "Saqlanganlar", icon: BookmarkIcon },
    { href: "/dashboard/profile", label: "Profilim", icon: UserIcon },
    { href: "/dashboard/settings", label: "Sozlamalar", icon: SettingsIcon },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-950/60 transition-opacity"
          onClick={closeMobileNav}
          aria-hidden="true"
        />

        {/* Drawer Panel */}
        <div className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-5 flex flex-col shadow-xl select-none animate-in slide-in-from-left duration-200">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center font-bold text-sm">
                F
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Fikr</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">O‘zbekiston tarmog‘i</p>
              </div>
            </div>

            <button
              type="button"
              onClick={closeMobileNav}
              aria-label="Menyuni yopish"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <CloseIcon size={20} />
            </button>
          </div>

          {/* Navigation list */}
          <nav className="flex-1 overflow-y-auto py-3 space-y-1">
            {navLinks.map((item) => {
              const isActive = pathname === item.href;
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileNav}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                    isActive
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-950 dark:text-white font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <IconComponent size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User profile footer in drawer with logout trigger OR Guest sign in */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            {session.isAuthenticated ? (
              <div className="flex items-center justify-between gap-3">
                <Link
                  href="/dashboard/profile"
                  onClick={closeMobileNav}
                  className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-85"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center font-bold text-xs shrink-0 select-none">
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
                      {session.user.name || "Foydalanuvchi"}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {session.user.handle || "@foydalanuvchi"}
                    </span>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() => setIsLogoutDialogOpen(true)}
                  title="Chiqish"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/auth/login"
                onClick={closeMobileNav}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950 text-xs font-semibold shadow-xs"
              >
                <span>Tizimga kirish</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isLogoutDialogOpen}
        onClose={() => setIsLogoutDialogOpen(false)}
        onConfirm={handleConfirmLogout}
        title="Tizimdan chiqmoqchimisiz?"
        description="Joriy sessiyangiz yakunlanadi. Qayta kirish uchun telefon raqamingiz orqali tasdiqlash talab etiladi."
        confirmText="Chiqish"
        cancelText="Qolish"
        variant="warning"
      />
    </>
  );
}
