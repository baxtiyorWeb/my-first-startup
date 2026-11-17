import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

export const SITE_CONFIG = {
  name: "Geters",
  shortName: "Geters",
  slogan: {
    uz: "Intiluvchan insonlar, dasturchilar va yangi startaplar tarmog'i",
    ru: "Сообщество разработчиков, стартапов и амбициозных профессионалов",
    en: "Developer ecosystem, startup founders and ambitious tech innovators",
  },
  description: {
    uz: "Dasturlash tillari, zamonaviy texnologiyalar, IT lug'ati, cheat sheetlar va dasturchilar uchun nufuzli bilim markazi.",
    ru: "Центр знаний для программистов: языки разработки, современные технологии, IT-глоссарий, шпаргалки и подготовка к собеседованиям.",
    en: "Comprehensive knowledge hub for developers: programming languages, modern frameworks, IT glossary, developer cheat sheets, and technical interview guides.",
  },
  url:
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://geters.uz",
  social: {
    twitter: "@geters_uz",
    telegram: "https://t.me/geters_uz",
    github: "https://github.com/geters-uz",
  },
  keywords: {
    uz: [
      "dasturlash",
      "dasturlash tillari",
      "dasturlashni o'rganish",
      "javascript o'zbekcha",
      "python o'zbekcha",
      "react darslari",
      "nextjs darslari",
      "sql buyruqlari",
      "docker nima",
      "git buyruqlari cheatsheet",
      "frontend dasturlash",
      "backend dasturlash",
      "dasturchilar tarmogi",
      "startaplar uzbekistan",
      "it lug'at",
      "texnik intervyu savollari",
    ],
    ru: [
      "программирование",
      "языки программирования",
      "обучение разработке",
      "шпаргалки по git",
      "docker команды",
      "react руководство",
      "next.js 16 уроки",
      "вопросы для собеседования frontend",
      "вопросы для собеседования backend",
      "it глоссарий",
      "структуры данных и алгоритмы",
    ],
    en: [
      "programming",
      "learn to code",
      "developer cheatsheets",
      "git cheatsheet",
      "docker cheat sheet",
      "sql cheat sheet",
      "tech interview questions",
      "software engineering glossary",
      "frontend roadmap",
      "backend roadmap",
      "system design",
    ],
  },
};

export function getCanonicalUrl(path: string, locale: Locale = DEFAULT_LOCALE): string {
  const cleanBase = SITE_CONFIG.url.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBase}/${locale}${cleanPath === "/" ? "" : cleanPath}`;
}

export function getLanguageAlternates(path: string): Record<string, string> {
  const cleanBase = SITE_CONFIG.url.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const suffix = cleanPath === "/" ? "" : cleanPath;

  return {
    "x-default": `${cleanBase}/uz${suffix}`,
    uz: `${cleanBase}/uz${suffix}`,
    ru: `${cleanBase}/ru${suffix}`,
    en: `${cleanBase}/en${suffix}`,
  };
}
