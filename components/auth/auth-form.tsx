"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { useI18n } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

interface AuthFormProps {
  mode: "login" | "register";
}

export function AuthForm({ mode }: AuthFormProps) {
  const { t, localePath, locale } = useI18n();

  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const isLogin = mode === "login";

  /**
   * Read authentication errors returned from OAuth callback.
   * The URL is cleaned after reading the error so refresh doesn't
   * repeatedly display the same message.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const errorCode = url.searchParams.get("error");

    if (!errorCode) return;

    setIsRedirecting(false);

    const messages: Record<string, string> = {
      google_not_configured:
        locale === "ru"
          ? "Google OAuth еще не настроен на сервере."
          : locale === "en"
            ? "Google OAuth is not configured on the server yet."
            : "Google orqali kirish serverda hali sozlanmagan.",

      server_config_error:
        locale === "ru"
          ? "Ошибка конфигурации сервера авторизации."
          : locale === "en"
            ? "Authentication server configuration error."
            : "Autentifikatsiya serveri konfiguratsiyasida xatolik.",

      google_auth_failed:
        locale === "ru"
          ? "Вход через Google был отменен или завершился ошибкой."
          : locale === "en"
            ? "Google sign-in was cancelled or failed."
            : "Google orqali kirish bekor qilindi yoki xatolik yuz berdi.",

      auth_internal_error:
        locale === "ru"
          ? "Произошла внутренняя ошибка авторизации. Попробуйте снова."
          : locale === "en"
            ? "An internal authentication error occurred. Please try again."
            : "Autentifikatsiyada ichki xatolik yuz berdi. Qaytadan urinib ko‘ring.",
    };

    setError(
      messages[errorCode] ??
      (locale === "ru"
        ? "Произошла ошибка при входе."
        : locale === "en"
          ? "An error occurred during authentication."
          : "Tizimga kirishda xatolik yuz berdi.")
    );

    // Remove the error query parameter from the address bar.
    url.searchParams.delete("error");

    window.history.replaceState(
      {},
      document.title,
      `${url.pathname}${url.search}${url.hash}`
    );
  }, [locale]);

  const handleGoogleClick = () => {
    if (isRedirecting) return;

    setError(null);
    setIsRedirecting(true);
  };

  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-[430px] px-4 sm:px-0">
        <div className="mb-7 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
          </div>

          <LanguageSwitcher variant="header" />
        </div>

        {/* Intro */}
        <div className="mb-7">


          <h1 className="text-[30px] font-bold tracking-[-0.035em] text-slate-950 dark:text-white sm:text-[32px]">
            {isLogin
              ? t("auth.loginTitle")
              : t("auth.registerTitle")}
          </h1>

          <p className="mt-2.5 max-w-[380px] text-sm leading-6 text-slate-500 dark:text-slate-400">
            {isLogin
              ? t("auth.loginSubtitle")
              : t("auth.registerSubtitle")}
          </p>
        </div>

        {/* Authentication Card */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_12px_40px_-20px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          {/* Error */}
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

              <div className="min-w-0">
                <p className="font-medium leading-5">{error}</p>

                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="mt-1.5 text-xs font-semibold text-red-700 underline underline-offset-2 hover:text-red-900 dark:text-red-300 dark:hover:text-red-200"
                >
                  {locale === "ru"
                    ? "Закрыть"
                    : locale === "en"
                      ? "Dismiss"
                      : "Yopish"}
                </button>
              </div>
            </div>
          )}

          {/* Google OAuth */}
          <Link
            href={`/api/auth/google?locale=${encodeURIComponent(
              locale
            )}&mode=${mode}`}
            onClick={handleGoogleClick}
            aria-disabled={isRedirecting}
            className={[
              "group relative flex min-h-[52px] w-full items-center justify-center",
              "rounded-xl border border-slate-200 bg-white px-4",
              "text-sm font-semibold text-slate-800",
              "shadow-sm",
              "transition-[background-color,border-color,box-shadow,transform]",
              "duration-200 ease-out",
              "hover:border-slate-300 hover:bg-slate-50 hover:shadow-md",
              "active:scale-[0.985]",
              "focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-slate-400 focus-visible:ring-offset-2",
              "dark:border-slate-700 dark:bg-slate-950",
              "dark:text-slate-100",
              "dark:hover:border-slate-600 dark:hover:bg-slate-900 dark:hover:shadow-black/20",
              "dark:focus-visible:ring-slate-600 dark:focus-visible:ring-offset-slate-900",
              isRedirecting
                ? "pointer-events-none cursor-wait opacity-80"
                : "cursor-pointer",
            ].join(" ")}
          >
            {isRedirecting ? (
              <>
                <Loader2 className="mr-2.5 h-[18px] w-[18px] animate-spin text-slate-500" />

                <span>
                  {locale === "ru"
                    ? "Перенаправление..."
                    : locale === "en"
                      ? "Redirecting..."
                      : "Yo‘naltirilmoqda..."}
                </span>
              </>
            ) : (
              <>
                {/* Google Icon */}
                <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
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
                </span>

                <span className="ml-3">
                  {t("auth.continueWithGoogle")}
                </span>

                <ArrowRight
                  className={[
                    "ml-auto h-4 w-4 text-slate-400",
                    "transition-transform duration-200",
                    "group-hover:translate-x-0.5",
                  ].join(" ")}
                />
              </>
            )}
          </Link>

          {/* OAuth information */}
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3.5 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />

              <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                {t("auth.googleHint")}
              </p>
            </div>
          </div>

          {/* Security footer */}
          <div className="mt-5 flex items-center justify-center gap-2 border-t border-slate-100 pt-5 text-[11px] font-medium text-slate-400 dark:border-slate-800 dark:text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>
              The Go-getters · Secure authentication
            </span>
          </div>
        </section>

        {/* Login / Register switch */}
        <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          {isLogin ? (
            <p>
              {t("auth.dontHaveAccount")}{" "}
              <Link
                href={localePath("/auth/register")}
                className="font-semibold text-slate-950 underline decoration-slate-300 underline-offset-4 transition-colors hover:text-slate-600 hover:decoration-slate-500 dark:text-white dark:decoration-slate-700 dark:hover:text-slate-300"
              >
                {t("nav.register")}
              </Link>
            </p>
          ) : (
            <p>
              {t("auth.haveAccount")}{" "}
              <Link
                href={localePath("/auth/login")}
                className="font-semibold text-slate-950 underline decoration-slate-300 underline-offset-4 transition-colors hover:text-slate-600 hover:decoration-slate-500 dark:text-white dark:decoration-slate-700 dark:hover:text-slate-300"
              >
                {t("nav.login")}
              </Link>
            </p>
          )}
        </div>

        {/* Guest */}
        <div className="mt-5 text-center">
          <Link
            href={localePath("/dashboard")}
            className="group inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <span>
              {t("auth.guestEntry")}
            </span>

            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </main>
  );
}