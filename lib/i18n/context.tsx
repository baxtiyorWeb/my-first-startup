"use client";

import React, { createContext, useContext, useMemo, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link, { type LinkProps } from "next/link";
import { Locale, DEFAULT_LOCALE, LOCALES, isValidLocale } from "./config";
import { dictionaries, getDictionary, type TranslationDictionary } from "./dictionaries";
import { formatRelativeTime as formatRelativeTimeI18n } from "./format-date";

export interface I18nContextType {
  locale: Locale;
  dict: TranslationDictionary;
  t: (path: string, fallback?: string) => string;
  switchLocale: (newLocale: Locale) => void;
  localePath: (path: string, targetLocale?: Locale) => string;
  formatRelativeTime: (date: string | Date | null | undefined) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

/**
 * Resolve nested object property by dot-notation (e.g. "nav.home")
 */
function resolvePath(obj: Record<string, any>, path: string): string | undefined {
  const parts = path.split(".");
  let current: any = obj;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return typeof current === "string" ? current : undefined;
}

/**
 * Build localized path (e.g. "/dashboard" -> "/ru/dashboard")
 */
export function getLocalePath(path: string, targetLocale: Locale): string {
  if (!path || path.startsWith("http") || path.startsWith("//") || path.startsWith("mailto:") || path.startsWith("#")) {
    return path;
  }

  // Remove leading query/hash if needed, parse pathname
  const [pathnamePart, queryPart] = path.split("?");
  const querySuffix = queryPart ? `?${queryPart}` : "";

  // Check if pathname already starts with one of the locales
  const segments = pathnamePart.split("/").filter(Boolean);
  if (segments.length > 0 && isValidLocale(segments[0])) {
    segments[0] = targetLocale;
    return `/${segments.join("/")}${querySuffix}`;
  }

  // Otherwise prepend targetLocale
  const cleanPath = pathnamePart.startsWith("/") ? pathnamePart : `/${pathnamePart}`;
  if (cleanPath === "/") {
    return `/${targetLocale}${querySuffix}`;
  }
  return `/${targetLocale}${cleanPath}${querySuffix}`;
}

export function I18nProvider({
  locale: initialLocale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const locale: Locale = isValidLocale(initialLocale) ? initialLocale : DEFAULT_LOCALE;
  const dict = useMemo(() => getDictionary(locale), [locale]);

  // Sync document lang & cookie & localStorage
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
    try {
      localStorage.setItem("fikr_locale", locale);
      document.cookie = `fikr_locale=${locale}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // Ignore
    }
  }, [locale]);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const val = resolvePath(dict as any, key);
      if (val !== undefined) return val;

      // Fallback to default locale (uz) if missing in current
      if (locale !== DEFAULT_LOCALE) {
        const defaultVal = resolvePath(dictionaries[DEFAULT_LOCALE] as any, key);
        if (defaultVal !== undefined) return defaultVal;
      }

      return fallback ?? key;
    },
    [dict, locale]
  );

  const localePath = useCallback(
    (path: string, targetLocale?: Locale) => {
      return getLocalePath(path, targetLocale || locale);
    },
    [locale]
  );

  const switchLocale = useCallback(
    (newLocale: Locale) => {
      if (newLocale === locale) return;

      try {
        localStorage.setItem("fikr_locale", newLocale);
        document.cookie = `fikr_locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
      } catch {
        // Ignore
      }

      // Compute new path with new locale prefix
      const targetUrl = getLocalePath(pathname, newLocale);
      router.push(targetUrl);
    },
    [locale, pathname, router]
  );

  const formatRelativeTime = useCallback(
    (date: string | Date | null | undefined) => {
      return formatRelativeTimeI18n(date, locale);
    },
    [locale]
  );

  const value = useMemo<I18nContextType>(
    () => ({
      locale,
      dict,
      t,
      switchLocale,
      localePath,
      formatRelativeTime,
    }),
    [locale, dict, t, switchLocale, localePath, formatRelativeTime]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    // Graceful fallback outside provider
    const defaultDict = getDictionary(DEFAULT_LOCALE);
    return {
      locale: DEFAULT_LOCALE,
      dict: defaultDict,
      t: (key: string, fallback?: string) => resolvePath(defaultDict as any, key) ?? fallback ?? key,
      switchLocale: () => {},
      localePath: (path: string) => getLocalePath(path, DEFAULT_LOCALE),
      formatRelativeTime: (date) => formatRelativeTimeI18n(date, DEFAULT_LOCALE),
    };
  }
  return context;
}

export function useTranslation() {
  const { t, locale, dict } = useI18n();
  return { t, locale, dict };
}

/**
 * Drop-in replacement for Next.js Link that automatically resolves locale prefix
 */
export function LocalizedLink({
  href,
  children,
  ...rest
}: LinkProps & { children: React.ReactNode; className?: string; [key: string]: any }) {
  const { localePath } = useI18n();
  const localizedHref = typeof href === "string" ? localePath(href) : href;

  return (
    <Link href={localizedHref} {...rest}>
      {children}
    </Link>
  );
}
