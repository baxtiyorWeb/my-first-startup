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
  datePublished?: string;
  dateModified?: string;
  authorName?: string;
  keywords?: string[];
  articleBody?: string;
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
    author: {
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
    keywords: options.keywords?.join(", "),
    ...(options.articleBody ? { articleBody: options.articleBody } : {}),
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
