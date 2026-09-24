"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { CheckIcon, CloseIcon } from "@/components/icons";

export type ToastType = "default" | "success" | "info" | "error";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let globalShowToast: ((message: string, type?: ToastType, duration?: number) => void) | null = null;

export const toast = {
  success: (msg: string, duration?: number) => {
    if (globalShowToast) globalShowToast(msg, "success", duration);
  },
  info: (msg: string, duration?: number) => {
    if (globalShowToast) globalShowToast(msg, "info", duration);
  },
  error: (msg: string, duration?: number) => {
    if (globalShowToast) globalShowToast(msg, "error", duration);
  },
  default: (msg: string, duration?: number) => {
    if (globalShowToast) globalShowToast(msg, "default", duration);
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "default", duration = 3200) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-4), { id, message, type, duration }]);
    },
    []
  );

  useEffect(() => {
    globalShowToast = showToast;
    return () => {
      globalShowToast = null;
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      {/* Toast viewport */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-[calc(100vw-2.5rem)]"
      >
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(item.id);
    }, item.duration || 3200);
    return () => clearTimeout(timer);
  }, [item, onDismiss]);

  return (
    <div
      role="status"
      className="pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-slate-50 dark:text-slate-900 text-xs font-medium border border-slate-800 dark:border-slate-200 shadow-md animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <div className="flex items-center gap-2 min-w-0">
        {item.type === "success" && (
          <span className="w-4 h-4 rounded-full bg-slate-800 dark:bg-slate-200 flex items-center justify-center shrink-0">
            <CheckIcon size={12} className="text-slate-100 dark:text-slate-900" />
          </span>
        )}
        <span className="truncate">{item.message}</span>
      </div>

      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Xabarni yopish"
        className="p-1 rounded text-slate-400 dark:text-slate-500 hover:text-white dark:hover:text-black cursor-pointer transition-colors"
      >
        <CloseIcon size={14} />
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
