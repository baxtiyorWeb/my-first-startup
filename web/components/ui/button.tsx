"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export type AppButtonVariant = "primary" | "secondary" | "outline" | "danger" | "ghost";
export type AppButtonSize = "sm" | "md" | "lg";

interface AppButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  isLoading?: boolean;
  isFullWidth?: boolean;
  leftIcon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<AppButtonVariant, string> = {
  primary:
    "bg-[#1d9bf0] hover:bg-[#1a8cd8] active:bg-[#1577b8] text-[#0f1419] border border-transparent",
  secondary:
    "bg-[#f7f9f9] dark:bg-[#16181c] hover:bg-[#eff3f4] dark:hover:bg-[#202327] text-[#0f1419] dark:text-[#e7e9ea] border border-[#cfd9de] dark:border-[#2f3336]",
  outline:
    "bg-white dark:bg-[#000000] hover:bg-[#f7f9f9] dark:hover:bg-[#16181c] text-[#0f1419] dark:text-[#e7e9ea] border border-[#cfd9de] dark:border-[#3e4144]",
  danger:
    "bg-[#c4170f] hover:bg-[#a81620] text-white border border-transparent",
  ghost:
    "bg-transparent hover:bg-[#eff3f4] dark:hover:bg-[#16181c] text-[#536471] dark:text-[#cfd9de] border border-transparent",
};

const SIZE_CLASSES: Record<AppButtonSize, string> = {
  sm: "h-[34px] px-3 text-xs gap-1.5",
  md: "h-[40px] px-4 text-[13.5px] gap-2",
  lg: "h-[48px] px-5 text-[15px] gap-2",
};

/**
 * Unified Geters Button (mirrors mobile `AppButton`).
 */
export function AppButton({
  variant = "primary",
  size = "md",
  isLoading = false,
  isFullWidth = false,
  leftIcon,
  disabled,
  className = "",
  children,
  type = "button",
  ...props
}: AppButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center rounded-full font-semibold transition-all active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer select-none ${
        VARIANT_CLASSES[variant]
      } ${SIZE_CLASSES[size]} ${isFullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        <>
          {leftIcon && <span className="shrink-0 flex items-center">{leftIcon}</span>}
          <span className="truncate">{children}</span>
        </>
      )}
    </button>
  );
}
