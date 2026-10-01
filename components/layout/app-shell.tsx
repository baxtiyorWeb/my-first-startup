"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";
import { useI18n } from "@/lib/i18n/context";
import {
  ShellProvider,
  useShell,
  SIDEBAR_EXPANDED_WIDTH,
  SIDEBAR_COLLAPSED_WIDTH,
  CONTENT_MAX_WIDTH,
} from "./shell-context";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { Footer } from "./footer";
import { MobileBottomNav } from "./mobile-nav";
import { MessagesProvider, useMessages } from "@/components/messages/messages-context";

interface AppShellProps {
  children: React.ReactNode;
  headerTitle?: string;
  headerSubtitle?: string;
}

function ShellLayoutInner({
  children,
  headerTitle,
  headerSubtitle,
}: AppShellProps) {
  const { isCollapsed } = useShell();
  const { session, isLoaded } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || "";
  const { localePath } = useI18n();
  const { activeConversationId } = useMessages();

  const isMessagesPage = pathname.includes("/dashboard/messages");

  const isAuthRequired =
    pathname.endsWith("/dashboard/create") ||
    pathname.endsWith("/dashboard/settings");

  useEffect(() => {
    if (!isLoaded) return;
    if (!session.isAuthenticated && isAuthRequired) {
      router.replace(localePath(`/auth/login?redirect=${encodeURIComponent(pathname)}`));
    }
  }, [session, isLoaded, router, pathname, isAuthRequired, localePath]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-6 h-6 border-2 border-slate-900 dark:border-slate-100 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session.isAuthenticated && isAuthRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-6 h-6 border-2 border-slate-900 dark:border-slate-100 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased ${
        isMessagesPage ? "h-[100dvh] overflow-hidden" : ""
      }`}
    >
      {/* Desktop Fixed Navigation */}
      <Sidebar />

      {/* Main App Container: dynamically adjusts margin to match sidebar width smoothly */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-[margin-left] duration-250 ease-out ${
          isMessagesPage
            ? activeConversationId
              ? "pb-0 h-[100dvh] overflow-hidden"
              : "pb-[58px] md:pb-0 h-[100dvh] overflow-hidden"
            : "pb-[58px] md:pb-0"
        }`}
        style={{
          marginLeft: "var(--sidebar-offset, 0px)",
        }}
      >
        <style jsx>{`
          div {
            --sidebar-offset: 0px;
          }
          @media (min-width: 768px) {
            div {
              --sidebar-offset: ${isCollapsed
                ? `${SIDEBAR_COLLAPSED_WIDTH}px`
                : `${SIDEBAR_EXPANDED_WIDTH}px`};
            }
          }
        `}</style>

        {/* Dynamic Top Header: expands & collapses in sync with sidebar */}
        <Header title={headerTitle} subtitle={headerSubtitle} />

        {/* Main Content Area: comfortable reading width & identical symmetrical margins */}
        <main
          id="main-content"
          tabIndex={-1}
          className={`flex-1 w-full focus:outline-none ${
            isMessagesPage
              ? "p-0 min-h-0 overflow-hidden flex flex-col"
              : "px-4 sm:px-6 lg:px-8 py-5 sm:py-6"
          }`}
        >
          <div
            className={`w-full ${
              isMessagesPage
                ? "h-full flex-1 min-h-0"
                : "mx-auto transition-[max-width] duration-200 ease-out"
            }`}
            style={isMessagesPage ? undefined : { maxWidth: `var(--content-max-width, ${CONTENT_MAX_WIDTH}px)` }}
          >
            {children}
          </div>
        </main>

        {/* Dynamic Footer: Hidden on messages page to prevent unwanted double scroll */}
        {!isMessagesPage && <Footer />}
      </div>

      {/* Mobile Bottom Navigation (Authenticated): Hidden when inside chat detail */}
      {session.isAuthenticated && (!isMessagesPage || !activeConversationId) && <MobileBottomNav />}

      {/* Guest Conversion Banner (Threads/Twitter style) */}
      {!session.isAuthenticated && (
        <aside
          aria-label="Ro‘yxatdan o‘tish taklifi"
          className="fixed bottom-0 md:bottom-4 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:max-w-2xl z-50 bg-slate-950/95 dark:bg-white/95 text-white dark:text-black py-2.5 px-4 md:rounded-2xl shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 border-t md:border border-white/[0.1] dark:border-black/[0.1] select-none"
        >
          <div className="flex flex-col min-w-0">
            <span className="text-xs sm:text-sm font-bold tracking-tight truncate">
              The Go-getters tarmog‘iga xush kelibsiz!
            </span>
            <span className="text-[11px] opacity-75 truncate">
              Fikr bildirish va jamoa tuzish uchun hisob oching.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => router.push(localePath("/auth/login"))}
              className="px-3 py-1.5 rounded-full text-xs font-semibold opacity-85 hover:opacity-100 transition-opacity cursor-pointer"
            >
              Kirish
            </button>
            <button
              onClick={() => router.push(localePath("/auth/register"))}
              className="px-3.5 py-1.5 rounded-full bg-white dark:bg-black text-black dark:text-white text-xs font-bold shadow-xs hover:opacity-95 active:scale-95 transition-all cursor-pointer"
            >
              Ro‘yxatdan o‘tish
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}

export function AppShell({
  children,
  headerTitle,
  headerSubtitle,
}: AppShellProps) {
  return (
    <ShellProvider>
      <MessagesProvider>
        <ShellLayoutInner headerTitle={headerTitle} headerSubtitle={headerSubtitle}>
          {children}
        </ShellLayoutInner>
      </MessagesProvider>
    </ShellProvider>
  );
}
