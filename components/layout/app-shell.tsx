"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";
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
import { MobileDrawer, MobileBottomNav } from "./mobile-nav";

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
  const pathname = usePathname();

  const isAuthRequired = pathname === "/dashboard/create" || pathname === "/dashboard/settings";

  useEffect(() => {
    if (!isLoaded) return;
    if (!session.isAuthenticated && isAuthRequired) {
      router.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [session, isLoaded, router, pathname, isAuthRequired]);

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased">
      {/* Desktop Fixed Navigation */}
      <Sidebar />

      {/* Mobile Drawer (Accessible modal overlay) */}
      <MobileDrawer />

      {/* Main App Container: dynamically adjusts margin to match sidebar width smoothly */}
      <div
        className="flex-1 flex flex-col min-w-0 transition-[margin-left] duration-250 ease-out pb-16 md:pb-0"
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
          className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-6 focus:outline-none"
        >
          <div
            className="w-full mx-auto transition-[max-width] duration-200 ease-out"
            style={{ maxWidth: `var(--content-max-width, ${CONTENT_MAX_WIDTH}px)` }}
          >
            {children}
          </div>
        </main>

        {/* Dynamic Footer */}
        <Footer />
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
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
      <ShellLayoutInner headerTitle={headerTitle} headerSubtitle={headerSubtitle}>
        {children}
      </ShellLayoutInner>
    </ShellProvider>
  );
}
