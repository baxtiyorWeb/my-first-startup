"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface CustomSelectOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: CustomSelectOption<T>[];
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CustomSelect<T extends string = string>({
  value,
  onChange,
  options,
  label,
  placeholder = "Tanlang...",
  className = "",
  disabled = false,
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectId = useId();

  const selectedOption = options.find((opt) => opt.value === value);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val: T) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
        >
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        id={selectId}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="w-full h-10 px-3.5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-left text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center justify-between gap-2 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transform-gpu will-change-transform"
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption?.icon && (
            <span className="shrink-0">{selectedOption.icon}</span>
          )}
          <span className="truncate font-medium">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ease-out ${
            isOpen ? "rotate-180 text-slate-700 dark:text-slate-200" : ""
          }`}
        />
      </button>

      {/* Floating Menu with Hardware-Accelerated Micro-Animation */}
      {isOpen && (
        <div
          role="listbox"
          aria-activedescendant={value}
          className="absolute left-0 right-0 z-50 mt-1.5 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-60 overflow-y-auto overscroll-contain animate-in fade-in-0 zoom-in-95 duration-150 transform-gpu will-change-transform will-change-opacity focus:outline-none"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
                className={`w-full p-2.5 rounded-lg text-left text-xs sm:text-sm flex items-start justify-between gap-2 transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-950 dark:text-white font-semibold"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  {opt.icon && <span className="shrink-0 mt-0.5">{opt.icon}</span>}
                  <div className="min-w-0">
                    <div className="truncate font-medium">{opt.label}</div>
                    {opt.description && (
                      <div className="text-[11px] font-normal text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {opt.description}
                      </div>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <Check className="w-4 h-4 text-slate-900 dark:text-slate-100 shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
