"use client";

import React, { useEffect } from "react";
import { AlertTriangle, Trash2, Info } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "default";
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Tasdiqlash",
  cancelText = "Bekor qilish",
  variant = "default",
  isLoading = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isLoading]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (variant) {
      case "danger":
        return <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      default:
        return <Info className="w-5 h-5 text-slate-700 dark:text-slate-300" />;
    }
  };

  const getConfirmButtonClasses = () => {
    switch (variant) {
      case "danger":
        return "bg-red-600 hover:bg-red-700 text-white focus:ring-red-400";
      case "warning":
        return "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-400";
      default:
        return "bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 focus:ring-slate-400";
    }
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        onClick={isLoading ? undefined : onClose}
        className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      />

      {/* Modal Surface */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 z-10 animate-in zoom-in-95 duration-150">
        <div className="flex items-start gap-4">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              variant === "danger"
                ? "bg-red-50 dark:bg-red-950/40"
                : variant === "warning"
                ? "bg-amber-50 dark:bg-amber-950/40"
                : "bg-slate-100 dark:bg-slate-800"
            }`}
          >
            {getIcon()}
          </div>

          <div className="space-y-1.5 flex-1 min-w-0">
            <h2
              id="confirm-dialog-title"
              className="text-base font-semibold text-slate-950 dark:text-white"
            >
              {title}
            </h2>
            <p
              id="confirm-dialog-description"
              className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed"
            >
              {description}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50 ${getConfirmButtonClasses()}`}
          >
            {isLoading ? "Bajarilmoqda..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
