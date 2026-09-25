"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useSyncExternalStore,
} from "react";

export const SIDEBAR_EXPANDED_WIDTH = 240;
export const SIDEBAR_COLLAPSED_WIDTH = 68;
export const HEADER_HEIGHT = 56;
export const CONTENT_MAX_WIDTH = 940; // Central max-width in pixels across the whole dashboard

const STORAGE_KEY = "gogetters_sidebar_collapsed";

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("resize", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("resize", listener);
  };
}

let cachedValue: boolean | null = null;

function getSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  if (cachedValue !== null) return cachedValue;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      cachedValue = saved === "true";
      return cachedValue;
    }
    if (window.innerWidth < 1024 && window.innerWidth >= 768) {
      cachedValue = true;
      return true;
    }
  } catch {
    // Fallback if localStorage is disabled
  }
  cachedValue = false;
  return false;
}

function getServerSnapshot(): boolean {
  return false;
}

interface ShellContextType {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  setCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  toggleMobileNav: () => void;
  closeMobileNav: () => void;
  sidebarWidth: number;
}

const ShellContext = createContext<ShellContextType | undefined>(undefined);

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const isCollapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    const current = getSnapshot();
    const next = !current;
    cachedValue = next;
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // ignore
    }
    notify();
  }, []);

  const setCollapsed = useCallback((val: boolean) => {
    cachedValue = val;
    try {
      localStorage.setItem(STORAGE_KEY, String(val));
    } catch {
      // ignore
    }
    notify();
  }, []);

  const toggleMobileNav = useCallback(() => {
    setIsMobileOpen((prev) => !prev);
  }, []);

  const closeMobileNav = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  const sidebarWidth = isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;

  return (
    <ShellContext.Provider
      value={{
        isCollapsed,
        toggleSidebar,
        setCollapsed,
        isMobileOpen,
        toggleMobileNav,
        closeMobileNav,
        sidebarWidth,
      }}
    >
      {children}
    </ShellContext.Provider>
  );
}

export function useShell() {
  const context = useContext(ShellContext);
  if (!context) {
    throw new Error("useShell must be used within a ShellProvider");
  }
  return context;
}
