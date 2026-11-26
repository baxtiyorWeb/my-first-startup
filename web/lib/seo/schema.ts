import { SITE_CONFIG, getCanonicalUrl } from "./config";
import type { Locale } from "@/lib/i18n/config";

export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_CONFIG.name,
    alternateName: SITE_CONFIG.shortName,
    url: SITE_CONFIG.url,
    logo: `${SITE_CONFIG.url}/logo.png`,
    sameAs: [
      SITE_CONFIG.social.telegram,
      SITE_CONFIG.social.github,
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "support@geters.uz",
      availableLanguage: ["Uzbek", "Russian", "English"],
    },
  };
}

export function generateWebSiteSchema(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_CONFIG.name,
    alternateName: SITE_CONFIG.shortName,
    url: getCanonicalUrl("", locale),
    description: SITE_CONFIG.description[locale],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_CONFIG.url}/${locale}/hub?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    inLanguage: locale,
  };
}

export interface BreadcrumbItem {
  name: string;
  item: string;
}

export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.item,
    })),
  };
}

export interface FAQItem {
  question: string;
  answer: string;
}

export function generateFAQSchema(faqs: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export interface TechArticleOptions {
  headline: string;
  description: string;
  url: string;
  imageUrl?: string;
  datePublished?: string;
  dateModified?: string;
  authorName?: string;
  authorUrl?: string;
  keywords?: string[];
  articleBody?: string;
  wordCount?: number;
  articleSection?: string;
  locale: Locale;
}

export function generateTechArticleSchema(options: TechArticleOptions) {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: options.headline,
    description: options.description,
    url: options.url,
    inLanguage: options.locale,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": options.url,
    },
    ...(options.imageUrl ? { image: [options.imageUrl] } : {}),
    author: options.authorUrl
      ? {
          "@type": "Person",
          name: options.authorName || SITE_CONFIG.name,
          url: options.authorUrl,
        }
      : {
          "@type": "Organization",
          name: options.authorName || SITE_CONFIG.name,
          url: SITE_CONFIG.url,
        },
    publisher: {
      "@type": "Organization",
      name: SITE_CONFIG.name,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_CONFIG.url}/logo.png`,
      },
    },
    datePublished: options.datePublished || "2026-01-01T00:00:00Z",
    dateModified: options.dateModified || new Date().toISOString(),
    ...(options.articleSection ? { articleSection: options.articleSection } : {}),
    ...(options.wordCount ? { wordCount: options.wordCount } : {}),
    keywords: options.keywords?.join(", "),
    ...(options.articleBody ? { articleBody: options.articleBody } : {}),
  };
}

export function generateNewsArticleSchema(options: TechArticleOptions) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: options.headline,
    description: options.description,
    url: options.url,
    inLanguage: options.locale,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": options.url,
    },
    image: [options.imageUrl || `${SITE_CONFIG.url}/logo.png`],
    author: options.authorUrl
      ? {
          "@type": "Person",
          name: options.authorName || SITE_CONFIG.name,
          url: options.authorUrl,
        }
      : {
          "@type": "Organization",
          name: options.authorName || SITE_CONFIG.name,
          url: SITE_CONFIG.url,
        },
    publisher: {
      "@type": "Organization",
      name: SITE_CONFIG.name,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_CONFIG.url}/logo.png`,
      },
    },
    datePublished: options.datePublished || new Date().toISOString(),
    dateModified: options.dateModified || new Date().toISOString(),
    ...(options.articleSection ? { articleSection: options.articleSection } : {}),
    keywords: options.keywords?.join(", "),
  };
}

export interface VideoChapterClip {
  title: string;
  startOffset: number;
  endOffset?: number;
  url?: string;
}

export interface VideoObjectOptions {
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  durationIso?: string;
  embedUrl?: string;
  contentUrl?: string;
  pageUrl: string;
  authorName?: string;
  authorUrl?: string;
  interactionCount?: number;
  clips?: VideoChapterClip[];
  locale: Locale;
}

export function generateVideoObjectSchema(options: VideoObjectOptions) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: options.name,
    description: options.description,
    thumbnailUrl: [options.thumbnailUrl],
    uploadDate: options.uploadDate,
    inLanguage: options.locale,
    ...(options.durationIso ? { duration: options.durationIso } : {}),
    ...(options.embedUrl ? { embedUrl: options.embedUrl } : {}),
    ...(options.contentUrl ? { contentUrl: options.contentUrl } : {}),
    url: options.pageUrl,
    publisher: {
      "@type": "Organization",
      name: SITE_CONFIG.name,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_CONFIG.url}/logo.png`,
      },
    },
    ...(options.authorName
      ? {
          author: {
            "@type": "Person",
            name: options.authorName,
            ...(options.authorUrl ? { url: options.authorUrl } : {}),
          },
        }
      : {}),
    ...(typeof options.interactionCount === "number"
      ? {
          interactionStatistic: {
            "@type": "InteractionCounter",
            interactionType: { "@type": "WatchAction" },
            userInteractionCount: options.interactionCount,
          },
        }
      : {}),
    ...(options.clips && options.clips.length > 0
      ? {
          hasPart: options.clips.map((clip) => ({
            "@type": "Clip",
            name: clip.title,
            startOffset: clip.startOffset,
            ...(typeof clip.endOffset === "number" ? { endOffset: clip.endOffset } : {}),
            url: clip.url || `${options.pageUrl}?t=${clip.startOffset}`,
          })),
        }
      : {}),
  };
}

export function generatePersonSchema(options: {
  name: string;
  handle: string;
  description: string;
  url: string;
  imageUrl?: string;
  jobTitle?: string;
  sameAs?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: options.name,
      alternateName: options.handle,
      description: options.description,
      url: options.url,
      ...(options.imageUrl ? { image: options.imageUrl } : {}),
      ...(options.jobTitle ? { jobTitle: options.jobTitle } : {}),
      ...(options.sameAs && options.sameAs.length > 0 ? { sameAs: options.sameAs } : {}),
    },
  };
}

export function generateItemListSchema(options: {
  name: string;
  url: string;
  items: Array<{ name: string; url: string }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: options.name,
    url: options.url,
    numberOfItems: options.items.length,
    itemListElement: options.items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      url: item.url,
    })),
  };
}

export interface DefinedTermOptions {
  name: string;
  description: string;
  url: string;
  inDefinedTermSetUrl: string;
  termCode?: string;
}

export function generateDefinedTermSchema(options: DefinedTermOptions) {
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: options.name,
    description: options.description,
    url: options.url,
    termCode: options.termCode || options.name.toLowerCase().replace(/\s+/g, "-"),
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: "Dasturlash va IT Atamalar Lug'ati",
      url: options.inDefinedTermSetUrl,
    },
  };
}
