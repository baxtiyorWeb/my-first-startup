"use client";

import React, { useRef } from "react";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (otp: string) => void;
  onComplete?: (otp: string) => void;
  error?: string | null;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function OtpInput({
  length = 4,
  value,
  onChange,
  onComplete,
  error,
  disabled = false,
  autoFocus = false,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  React.useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  // Purely derived digits from controlled prop
  const digits = React.useMemo(() => {
    const arr = value.split("").slice(0, length);
    while (arr.length < length) arr.push("");
    return arr;
  }, [value, length]);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const char = e.target.value.slice(-1);
    if (char && !/^\d$/.test(char)) return; // Only numeric

    const newDigits = [...digits];
    newDigits[index] = char;
    const newOtp = newDigits.join("");
    onChange(newOtp);

    // Auto-advance
    if (char && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.length === length && !newDigits.includes("")) {
      onComplete?.(newOtp);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        // Move back and clear previous
        inputRefs.current[index - 1]?.focus();
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        onChange(newDigits.join(""));
      } else {
        const newDigits = [...digits];
        newDigits[index] = "";
        onChange(newDigits.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;

    const newDigits = pasted.split("");
    while (newDigits.length < length) newDigits.push("");
    const newOtp = newDigits.join("");
    onChange(newOtp);

    const nextIndex = Math.min(pasted.length, length - 1);
    inputRefs.current[nextIndex]?.focus();

    if (pasted.length === length) {
      onComplete?.(newOtp);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-2.5 sm:gap-3.5" role="group" aria-label="4 xonali SMS tasdiqlash kodi">
        {Array.from({ length }).map((_, index) => {
          const isFilled = Boolean(digits[index]);
          return (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digits[index]}
              disabled={disabled}
              onChange={(e) => handleChange(index, e)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              aria-label={`Raqam ${index + 1}`}
              aria-invalid={Boolean(error)}
              className={`w-12 h-13 sm:w-14 sm:h-15 text-center text-xl sm:text-2xl font-bold rounded-xl transition-all select-none focus:outline-none focus:ring-2 ${
                error
                  ? "bg-red-50/50 dark:bg-red-950/30 border-2 border-red-500 text-red-600 dark:text-red-400 focus:ring-red-400 animate-shake"
                  : isFilled
                  ? "bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 text-slate-950 dark:text-white"
                  : "bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-slate-400 focus:ring-slate-400"
              }`}
            />
          );
        })}
      </div>

      {error && (
        <p
          role="alert"
          className="text-xs text-center text-red-600 dark:text-red-400 font-medium animate-in fade-in duration-150"
        >
          {error}
        </p>
      )}
    </div>
  );
}
