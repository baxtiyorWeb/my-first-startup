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
    (message: string, type: ToastType = "default", duration = 4500) => {
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
      {/* Toast viewport: expanded max width and allow full multiline display */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 pointer-events-none max-w-md sm:max-w-xl w-[calc(100vw-2.5rem)]"
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
    }, item.duration || 4500);
    return () => clearTimeout(timer);
  }, [item, onDismiss]);

  return (
    <div
      role="status"
      className="pointer-events-auto flex items-start justify-between gap-3 px-4 py-3 rounded-xl bg-slate-900/95 dark:bg-zinc-900/95 text-slate-50 dark:text-zinc-100 text-xs font-medium border border-slate-800 dark:border-white/10 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        {item.type === "success" && (
          <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
            <CheckIcon size={12} className="text-emerald-400" />
          </span>
        )}
        <span className="break-words leading-relaxed whitespace-normal flex-1">
          {item.message}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Xabarni yopish"
        className="p-1 rounded-lg text-slate-400 hover:text-white dark:hover:text-white hover:bg-slate-800 dark:hover:bg-zinc-800 cursor-pointer transition-colors shrink-0 -mr-1 -mt-0.5"
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
