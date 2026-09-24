export const LOCALES = ["uz", "ru", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "uz";

export interface LocaleMeta {
  code: Locale;
  label: string;
  nativeName: string;
  flag: string;
  shortLabel: string;
}

export const LOCALES_META: Record<Locale, LocaleMeta> = {
  uz: {
    code: "uz",
    label: "O‘zbekcha",
    nativeName: "O‘zbekcha",
    flag: "🇺🇿",
    shortLabel: "UZ",
  },
  ru: {
    code: "ru",
    label: "Русский",
    nativeName: "Русский",
    flag: "🇷🇺",
    shortLabel: "RU",
  },
  en: {
    code: "en",
    label: "English",
    nativeName: "English",
    flag: "🇬🇧",
    shortLabel: "EN",
  },
};

export function isValidLocale(locale: string): locale is Locale {
  return LOCALES.includes(locale as Locale);
}
