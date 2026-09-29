"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight, ArrowLeft, RefreshCw, Smartphone, Sparkles } from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import { OtpInput } from "@/components/auth/otp-input";
import { toast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

interface AuthFormProps {
  mode: "login" | "register";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { loginWithPhone, verifyOtp, resendOtp } = useAuth();
  const { t, localePath, locale } = useI18n();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [rawPhone, setRawPhone] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Check URL error query parameter (e.g. from Google auth callback redirect)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const err = params.get("error");
      if (err) {
        if (err === "google_auth_failed") {
          setError(
            locale === "ru"
              ? "Вход через Google был отменен или произошла ошибка"
              : locale === "en"
              ? "Google sign-in was cancelled or encountered an error"
              : "Google orqali kirish bekor qilindi yoki xatolik yuz berdi"
          );
        } else if (err === "server_config_error") {
          setError(
            locale === "ru"
              ? "Ошибка конфигурации сервера Google OAuth"
              : locale === "en"
              ? "Server configuration error for Google OAuth"
              : "Serverda Google OAuth sozlamasi topilmadi"
          );
        } else if (err === "token_exchange_failed" || err === "userinfo_failed") {
          setError(
            locale === "ru"
              ? "Не удалось получить данные аккаунта Google"
              : locale === "en"
              ? "Failed to retrieve Google account data"
              : "Google hisobi ma’lumotlarini olishda xatolik yuz berdi"
          );
        }
      }
    }
  }, [locale]);

  // Timer for OTP resend cooldown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === "otp" && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  // Format phone as: 90 123 45 67
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    let val = e.target.value.trim();
    if (val.startsWith("+998")) {
      val = val.slice(4);
    } else if (val.startsWith("998") && val.length > 9) {
      val = val.slice(3);
    }
    const digits = val.replace(/\D/g, "").slice(0, 9);
    setRawPhone(digits);
  };

  const getFormattedPhoneDisplay = () => {
    if (!rawPhone) return "";
    let formatted = "";
    if (rawPhone.length > 0) formatted += rawPhone.slice(0, 2);
    if (rawPhone.length > 2) formatted += " " + rawPhone.slice(2, 5);
    if (rawPhone.length > 5) formatted += " " + rawPhone.slice(5, 7);
    if (rawPhone.length > 7) formatted += " " + rawPhone.slice(7, 9);
    return formatted;
  };

  const fullPhoneNumber = `+998 ${getFormattedPhoneDisplay()}`.trim();

  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (rawPhone.length < 9) {
      setError(t("auth.phoneInvalid"));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await loginWithPhone(fullPhoneNumber);
      setStep("otp");
      setCountdown(60);
      setCanResend(false);
      if (res?.code) {
        toast.success(`Tasdiqlash kodi: ${res.code}`, 10000);
      } else {
        toast.info(`${fullPhoneNumber} ${t("auth.codeSentNotice")}`);
      }
    } catch {
      setError(t("common.errorOccurred"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpValue;
    if (code.length < 4) {
      setError(t("auth.codeInvalid"));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await verifyOtp(code);
      if (res.success) {
        toast.success(t("common.success"));

        if (mode === "login" || res.isOnboarded) {
          router.push(localePath("/dashboard"));
        } else {
          router.push(localePath("/onboarding"));
        }
      } else {
        setError(res.error || t("auth.codeInvalid"));
      }
    } catch {
      setError(t("common.errorOccurred"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await resendOtp();
      setCountdown(60);
      setCanResend(false);
      setOtpValue("");
      if (res?.code) {
        toast.success(`Yangi tasdiqlash kodi: ${res.code}`, 10000);
      } else {
        toast.info(`${fullPhoneNumber} ${t("auth.codeSentNotice")}`);
      }
    } catch {
      setError(t("common.errorOccurred"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Top Language Switcher Bar on Auth Screen */}
      <div className="flex justify-end mb-4">
        <LanguageSwitcher variant="header" />
      </div>

      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          {mode === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-normal leading-relaxed">
          {mode === "login"
            ? t("auth.loginSubtitle")
            : t("auth.registerSubtitle")}
        </p>
      </div>

      {/* Surface Card */}
      <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 sm:p-8 backdrop-blur-sm">
        {step === "phone" ? (
          <div className="space-y-5">
            {/* Google OAuth Button */}
            <a
              href={`/api/auth/google?locale=${locale}&mode=${mode}`}
              className="w-full py-3.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-100 font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-3 cursor-pointer group active:scale-[0.99]"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{t("auth.continueWithGoogle")}</span>
            </a>

            {/* Divider */}
            <div className="relative flex items-center justify-center py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <span className="relative bg-white dark:bg-slate-900 px-3 text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                {t("auth.orWithPhone")}
              </span>
            </div>

            <form onSubmit={handleSendCode} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="phone-input"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
              >
                {t("auth.phoneLabel")}
              </label>

              <div
                className={`relative flex items-center rounded-xl border transition-all ${
                  error
                    ? "border-red-500 ring-2 ring-red-500/20 bg-red-50/20 dark:bg-red-950/20"
                    : "border-slate-300 dark:border-slate-700 focus-within:border-slate-950 dark:focus-within:border-white focus-within:ring-2 focus-within:ring-slate-950/10 dark:focus-within:ring-white/10"
                }`}
              >
                <div className="flex items-center pl-3.5 pr-2 py-3 text-slate-500 dark:text-slate-400 select-none border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 rounded-l-xl">
                  <Smartphone className="w-4 h-4 mr-2 text-slate-400" />
                  <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                    +998
                  </span>
                </div>

                <input
                  id="phone-input"
                  ref={phoneInputRef}
                  type="tel"
                  inputMode="numeric"
                  placeholder={t("auth.phonePlaceholder")}
                  value={getFormattedPhoneDisplay()}
                  onChange={handlePhoneChange}
                  disabled={isLoading}
                  autoFocus
                  className="w-full px-3.5 py-3 text-base sm:text-lg font-medium text-slate-950 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 bg-transparent focus:outline-none"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400 font-medium animate-in fade-in">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || rawPhone.length < 9}
              className="w-full py-3.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group active:scale-[0.99]"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{t("auth.sendingCode")}</span>
                </>
              ) : (
                <>
                  <span>{t("auth.sendCode")}</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {t("auth.enterCode")}
                </span>
                <button
                  type="button"
                  onClick={() => setStep("phone")}
                  className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>{t("auth.changeNumber")}</span>
                </button>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
                  {fullPhoneNumber}
                </span>{" "}
                {t("auth.codeSentNotice")}
              </p>

              {/* 4-digit OTP box */}
              <div className="py-2">
                <OtpInput
                  length={4}
                  value={otpValue}
                  onChange={(val) => {
                    setOtpValue(val);
                    setError(null);
                  }}
                  onComplete={handleVerifyOtp}
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400 font-medium text-center animate-in fade-in">
                  {error}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleVerifyOtp()}
              disabled={isLoading || otpValue.length < 4}
              className="w-full py-3.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group active:scale-[0.99]"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{t("auth.verifying")}</span>
                </>
              ) : (
                <>
                  <span>{t("auth.verifyAndLogin")}</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>

            {/* Resend Cooldown Timer */}
            <div className="text-center pt-1">
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isLoading}
                  className="text-xs font-semibold text-slate-900 dark:text-white hover:underline cursor-pointer transition-colors"
                >
                  {t("auth.resendCode")}
                </button>
              ) : (
                <p className="text-xs text-slate-400 font-mono">
                  {countdown} {t("auth.resendIn")}
                </p>
              )}
            </div>

            {/* Test demo tip */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">
              <p>{t("auth.demoNote")}</p>
            </div>
          </div>
        )}

        {/* Security badge */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>The Go-getters — xavfsiz va maxfiy autentifikatsiya</span>
        </div>
      </div>

      {/* Mode Switch Footer */}
      <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        {mode === "login" ? (
          <p>
            {t("auth.dontHaveAccount")}{" "}
            <Link
              href={localePath("/auth/register")}
              className="font-semibold text-slate-950 dark:text-white hover:underline underline-offset-2"
            >
              {t("nav.register")}
            </Link>
          </p>
        ) : (
          <p>
            {t("auth.haveAccount")}{" "}
            <Link
              href={localePath("/auth/login")}
              className="font-semibold text-slate-950 dark:text-white hover:underline underline-offset-2"
            >
              {t("nav.login")}
            </Link>
          </p>
        )}
      </div>

      {/* Guest Explore link */}
      <div className="mt-4 text-center">
        <Link
          href={localePath("/dashboard")}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>{t("auth.guestEntry")}</span>
        </Link>
      </div>
    </div>
  );
}
