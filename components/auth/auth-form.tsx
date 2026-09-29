"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, Sparkles, RefreshCw, AlertCircle, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

interface AuthFormProps {
  mode: "login" | "register";
}

export function AuthForm({ mode }: AuthFormProps) {
  const { t, localePath, locale } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

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
        } else if (err === "auth_internal_error") {
          setError(
            locale === "ru"
              ? "Произошла внутренняя ошибка авторизации. Пожалуйста, попробуйте снова."
              : locale === "en"
              ? "Internal authentication error. Please try again."
              : "Autentifikatsiyada ichki xatolik yuz berdi. Qaytadan urinib ko‘ring."
          );
        } else {
          setError(
            locale === "ru"
              ? "Произошла ошибка при входе"
              : locale === "en"
              ? "An error occurred during authentication"
              : "Tizimga kirishda xatolik yuz berdi"
          );
        }
      }
    }
  }, [locale]);

  const handleGoogleClick = () => {
    setIsRedirecting(true);
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
      <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 sm:p-8 backdrop-blur-sm space-y-6">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-400 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="font-medium leading-relaxed">{error}</p>
          </div>
        )}

        {/* Google OAuth Button */}
        <a
          href={`/api/auth/google?locale=${locale}&mode=${mode}`}
          onClick={handleGoogleClick}
          className="w-full py-4 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-900 dark:text-white font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-3 cursor-pointer group active:scale-[0.99] hover:border-slate-300 dark:hover:border-slate-600"
        >
          {isRedirecting ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin text-slate-500" />
              <span>{locale === "ru" ? "Перенаправление..." : locale === "en" ? "Redirecting..." : "Yo‘naltirilmoqda..."}</span>
            </>
          ) : (
            <>
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
              <ArrowRight className="w-4 h-4 ml-auto text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </a>

        {/* Informative Hint */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed">
          <p>{t("auth.googleHint")}</p>
        </div>

        {/* Security badge */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>The Go-getters — xavfsiz va tezkor autentifikatsiya</span>
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
