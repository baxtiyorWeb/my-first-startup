import type { Locale } from "@/lib/i18n/config";

export interface ContentCategoryMeta {
  slug: string;
  label: Record<Locale, string>;
  description: Record<Locale, string>;
}

export const CONTENT_CATEGORIES: ContentCategoryMeta[] = [
  {
    slug: "umumiy",
    label: { uz: "Umumiy IT", ru: "Общее IT", en: "General Tech" },
    description: {
      uz: "Texnologiya, dasturlash madaniyati va muhandislik fikrlash tarzi bo'yicha materiallar.",
      ru: "Материалы о технологиях, культуре разработки и инженерном подходе.",
      en: "Articles on technology, engineering culture, and modern software craft.",
    },
  },
  {
    slug: "frontend",
    label: { uz: "Frontend & UI", ru: "Frontend и UI", en: "Frontend & UI" },
    description: {
      uz: "React, Next.js, TypeScript, CSS arxitekturasi va veb-interfeys unumdorligi.",
      ru: "React, Next.js, TypeScript, архитектура CSS и производительность веб-интерфейсов.",
      en: "React, Next.js, TypeScript, CSS architecture, and web frontend performance.",
    },
  },
  {
    slug: "backend",
    label: { uz: "Backend & DB", ru: "Backend и БД", en: "Backend & DB" },
    description: {
      uz: "Node.js, Python, Go, PostgreSQL, API arxitekturasi va taqsimlangan tizimlar.",
      ru: "Node.js, Python, Go, PostgreSQL, проектирование API и распределенные системы.",
      en: "Node.js, Python, Go, PostgreSQL, API design, and distributed systems.",
    },
  },
  {
    slug: "ai",
    label: { uz: "AI & ML", ru: "AI и ML", en: "AI & ML" },
    description: {
      uz: "Sun'iy intellekt, LLM agentlar, RAG tizimlari va neyrotarmoqlar amaliyoti.",
      ru: "Искусственный интеллект, LLM-агенты, RAG-системы и практика нейросетей.",
      en: "Artificial intelligence, LLM agents, RAG pipelines, and applied machine learning.",
    },
  },
  {
    slug: "devops",
    label: { uz: "DevOps & Cloud", ru: "DevOps и Облако", en: "DevOps & Cloud" },
    description: {
      uz: "Docker, Kubernetes, Linux, CI/CD avtomatizatsiya va server xavfsizligi.",
      ru: "Docker, Kubernetes, Linux, CI/CD-автоматизация и безопасность серверов.",
      en: "Docker, Kubernetes, Linux, CI/CD automation, and cloud infrastructure.",
    },
  },
  {
    slug: "startups",
    label: { uz: "Startap & Mahsulot", ru: "Стартапы и Продукт", en: "Startups & Product" },
    description: {
      uz: "MVP qurish, mahsulot boshqaruvi, metrikalar va IT biznes tahlillari.",
      ru: "Создание MVP, продакт-менеджмент, метрики и аналитика IT-бизнеса.",
      en: "Building MVPs, product management, growth metrics, and tech startup insights.",
    },
  },
  {
    slug: "career",
    label: { uz: "Karyera & Intervyu", ru: "Карьера и Интервью", en: "Career & Interviews" },
    description: {
      uz: "Senior darajaga o'sish, texnik suhbatlar, rezyume va muhandislik menejmenti.",
      ru: "Рост до Senior, технические собеседования, резюме и инженерный менеджмент.",
      en: "Growing to Senior Engineer, technical interviews, resumes, and leadership.",
    },
  },
  {
    slug: "news",
    label: { uz: "Texnologiya Yangiliklari", ru: "Новости технологий", en: "Tech News" },
    description: {
      uz: "Jahon va O'zbekiston IT bozoridagi eng so'nggi relizlar, yangilanishlar va voqealar.",
      ru: "Свежие релизы, обновления фреймворков и главные события IT-индустрии.",
      en: "Latest framework releases, industry updates, and tech ecosystem news.",
    },
  },
];

export function getCategoryMeta(slug?: string | null): ContentCategoryMeta {
  return (
    CONTENT_CATEGORIES.find((c) => c.slug === slug) ||
    CONTENT_CATEGORIES[0]
  );
}

const CYRILLIC_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "x", ц: "ts",
  ч: "ch", ш: "sh", щ: "sh", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya", ў: "o", қ: "q", ғ: "g", ҳ: "h",
};

/**
 * Generates clean, SEO-optimal ASCII slug supporting Uzbek Latin apostrophes & Cyrillic.
 */
export function generateSeoSlug(input: string, maxLength = 88): string {
  if (!input) return "";

  // Normalize Uzbek o' / g' apostrophe variants cleanly so "o'zbekiston" -> "ozbekiston"
  const normalized = input
    .toLowerCase()
    .replace(/([og])[’'`ʻʼ‘]/gi, "$1")
    .replace(/[’'`ʻʼ‘]/g, "");

  let out = "";
  for (const ch of normalized) {
    if (CYRILLIC_MAP[ch] !== undefined) {
      out += CYRILLIC_MAP[ch];
    } else {
      out += ch;
    }
  }

  let slug = out
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  if (slug.length > maxLength) {
    const cut = slug.slice(0, maxLength);
    const lastDash = cut.lastIndexOf("-");
    slug = lastDash > 20 ? cut.slice(0, lastDash) : cut.replace(/-+$/g, "");
  }

  return slug;
}

export function parseTimeToSeconds(timeStr: string): number {
  const clean = (timeStr || "").trim();
  const parts = clean.split(":").map((p) => Number(p));
  if (parts.some((n) => isNaN(n) || n < 0)) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return Number.isFinite(parts[0]) ? Math.max(0, Math.floor(parts[0])) : 0;
}

export function formatSecondsToTime(totalSeconds?: number | null): string {
  if (!totalSeconds || totalSeconds <= 0) return "0:00";
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function formatIsoDuration(totalSeconds?: number | null): string | undefined {
  if (!totalSeconds || totalSeconds <= 0) return undefined;
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  let iso = "PT";
  if (hrs > 0) iso += `${hrs}H`;
  if (mins > 0) iso += `${mins}M`;
  if (secs > 0 || (hrs === 0 && mins === 0)) iso += `${secs}S`;
  return iso;
}

export function extractYouTubeVideoId(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  return match ? match[1] : null;
}

export function extractBunnyIds(url?: string | null): { libraryId?: string; videoId?: string } {
  if (!url) return {};
  const match = url.match(/mediadelivery\.net\/(?:embed|play)\/([^/]+)\/([^/?#]+)/i);
  if (match) {
    return { libraryId: match[1], videoId: match[2] };
  }
  return {};
}

export interface HeadingTocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

/**
 * Extracts H2/H3 headings from sanitized HTML and injects deterministic `id` attributes
 * so server-rendered articles provide a crawlable Table of Contents & deep anchor links.
 */
export function extractHeadingsAndInjectIds(html: string): {
  htmlWithIds: string;
  headings: HeadingTocItem[];
} {
  if (!html) return { htmlWithIds: "", headings: [] };
  const headings: HeadingTocItem[] = [];
  const usedIds = new Map<string, number>();

  const htmlWithIds = html.replace(
    /<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi,
    (_full, lvlStr: string, attrs: string, innerHtml: string) => {
      const level = Number(lvlStr) as 2 | 3;
      const plain = innerHtml
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/\s+/g, " ")
        .trim();

      if (!plain) {
        return `<h${level}${attrs}>${innerHtml}</h${level}>`;
      }

      const baseSlug = generateSeoSlug(plain, 56) || `section-${headings.length + 1}`;
      const count = usedIds.get(baseSlug) || 0;
      usedIds.set(baseSlug, count + 1);
      const id = count === 0 ? baseSlug : `${baseSlug}-${count + 1}`;

      headings.push({ id, text: plain, level });

      // Remove any existing id attribute before injecting ours cleanly
      const cleanAttrs = attrs.replace(/\s+id\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
      return `<h${level}${cleanAttrs} id="${id}">${innerHtml}</h${level}>`;
    }
  );

  return { htmlWithIds, headings };
}
