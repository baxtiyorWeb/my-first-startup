export type SeoCheckStatus = "good" | "warning" | "error";

export interface SeoCheckItem {
  id: string;
  label: string;
  message: string;
  status: SeoCheckStatus;
  weight: number;
}

export interface SeoAnalysisResult {
  score: number;
  grade: "A+" | "A" | "B" | "C" | "D";
  checks: SeoCheckItem[];
  wordCount: number;
  headingsCount: number;
  internalLinksCount: number;
}

export interface AnalyzeSeoInput {
  contentKind: "article" | "video" | "news" | "thought";
  title: string;
  slug: string;
  seoTitle?: string;
  seoDescription?: string;
  focusKeyword?: string;
  htmlContent: string;
  coverImageUrl?: string;
  coverImageAlt?: string;
  videoUrl?: string;
  chaptersCount?: number;
}

function stripTags(html: string): string {
  return (html || "")
    .replace(/<\/(p|div|h[1-6]|li|blockquote|tr|pre)>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Real-time Technical & On-Page SEO Audit Engine for Authors & Editors.
 */
export function analyzeSeoReadiness(input: AnalyzeSeoInput): SeoAnalysisResult {
  const effectiveTitle = (input.seoTitle || input.title || "").trim();
  const effectiveDesc = (input.seoDescription || "").trim();
  const keyword = (input.focusKeyword || "").trim().toLowerCase();
  const plainText = stripTags(input.htmlContent);
  const lowerPlain = plainText.toLowerCase();
  const words = plainText ? plainText.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;

  const h2h3Matches = input.htmlContent.match(/<h[23]\b[^>]*>/gi) || [];
  const headingsCount = h2h3Matches.length;

  const linkMatches = input.htmlContent.match(/href\s*=\s*["']([^"']+)["']/gi) || [];
  const internalLinksCount = linkMatches.filter((m) =>
    /\/(uz|ru|en)?\/?(hub|glossary|cheatsheets|interview-prep|articles|videos|news)\//i.test(m) ||
    m.includes("geters.uz")
  ).length;

  const checks: SeoCheckItem[] = [];

  // 1. Title length (SERP pixel width ~50-65 chars)
  if (effectiveTitle.length >= 35 && effectiveTitle.length <= 68) {
    checks.push({
      id: "title-len",
      label: "SEO Sarlavha (Title)",
      message: `A'lo uzunlik: ${effectiveTitle.length} belgi (Google'da to'liq ko'rinadi).`,
      status: "good",
      weight: 15,
    });
  } else if (effectiveTitle.length >= 15) {
    checks.push({
      id: "title-len",
      label: "SEO Sarlavha (Title)",
      message:
        effectiveTitle.length < 35
          ? `Qisqaroq (${effectiveTitle.length} belgi). Ideal: 40-65 belgi.`
          : `Uzunroq (${effectiveTitle.length} belgi). Google ~65 belgidan keyin kesib qo'yadi.`,
      status: "warning",
      weight: 15,
    });
  } else {
    checks.push({
      id: "title-len",
      label: "SEO Sarlavha (Title)",
      message: "Sarlavha juda qisqa yoki bo'sh.",
      status: "error",
      weight: 15,
    });
  }

  // 2. Meta Description (120-160 chars)
  if (effectiveDesc.length >= 115 && effectiveDesc.length <= 165) {
    checks.push({
      id: "meta-desc",
      label: "Meta Description",
      message: `Ideal uzunlik (${effectiveDesc.length} belgi) — yuqori CTR beradi.`,
      status: "good",
      weight: 15,
    });
  } else if (effectiveDesc.length >= 50) {
    checks.push({
      id: "meta-desc",
      label: "Meta Description",
      message: `Hozir ${effectiveDesc.length} belgi. Tavsiya: 120-160 belgi oralig'ida jozibador ta'rif yozing.`,
      status: "warning",
      weight: 15,
    });
  } else {
    checks.push({
      id: "meta-desc",
      label: "Meta Description",
      message: "Meta description kiritilmagan — Google tasodifiy matn oladi.",
      status: "error",
      weight: 15,
    });
  }

  // 3. Semantic URL Slug
  if (input.slug && input.slug.length >= 5 && input.slug.length <= 85 && /^[a-z0-9-]+$/.test(input.slug)) {
    checks.push({
      id: "slug",
      label: "Semantic URL Slug",
      message: `Toza URL: /${input.slug}`,
      status: "good",
      weight: 10,
    });
  } else {
    checks.push({
      id: "slug",
      label: "Semantic URL Slug",
      message: "URL slug to'g'ri shakllanmagan yoki juda uzun.",
      status: "warning",
      weight: 10,
    });
  }

  // 4. Focus Keyword Optimization
  if (keyword.length >= 2) {
    const inTitle = effectiveTitle.toLowerCase().includes(keyword);
    const inFirstParagraph = lowerPlain.slice(0, 350).includes(keyword);
    if (inTitle && inFirstParagraph) {
      checks.push({
        id: "keyword",
        label: "Kalit so'z (Focus Keyword)",
        message: `"${input.focusKeyword}" sarlavhada ham, kirish qismida ham mavjud.`,
        status: "good",
        weight: 15,
      });
    } else {
      checks.push({
        id: "keyword",
        label: "Kalit so'z (Focus Keyword)",
        message: `Kalit so'zni (${input.focusKeyword}) sarlavha va birinchi abzatsga kiriting.`,
        status: "warning",
        weight: 15,
      });
    }
  } else {
    checks.push({
      id: "keyword",
      label: "Kalit so'z (Focus Keyword)",
      message: "Asosiy qidiruv kalit so'zini (masalan: 'nextjs nima') kiriting.",
      status: "warning",
      weight: 15,
    });
  }

  // 5. Content Depth & Readability
  const targetWords = input.contentKind === "article" ? 300 : input.contentKind === "news" ? 150 : 120;
  if (wordCount >= targetWords) {
    checks.push({
      id: "depth",
      label: "Kontent hajmi va chuqurligi",
      message: `${wordCount} ta so'z — Google uchun yetarlicha chuqur material.`,
      status: "good",
      weight: 15,
    });
  } else if (wordCount >= Math.floor(targetWords * 0.5)) {
    checks.push({
      id: "depth",
      label: "Kontent hajmi va chuqurligi",
      message: `Hozir ${wordCount} ta so'z. Kuchli o'rinlar uchun kamida ${targetWords}+ so'z tavsiya etiladi.`,
      status: "warning",
      weight: 15,
    });
  } else {
    checks.push({
      id: "depth",
      label: "Kontent hajmi va chuqurligi",
      message: `Matn juda qisqa (${wordCount} so'z). Thin-content xavfini kamaytirish uchun kengaytiring.`,
      status: "error",
      weight: 15,
    });
  }

  // 6. Heading Hierarchy (H2/H3)
  if (headingsCount >= 2 || input.contentKind === "thought") {
    checks.push({
      id: "headings",
      label: "H2/H3 Tuzilmasi (Mundarija)",
      message: `${headingsCount} ta ichki sarlavha topildi — skanerlash va Snippetlar uchun zo'r.`,
      status: "good",
      weight: 10,
    });
  } else {
    checks.push({
      id: "headings",
      label: "H2/H3 Tuzilmasi (Mundarija)",
      message: "Kamida 2 ta H2 yoki H3 kichik sarlavha qo'shing (avtomatik Mundarija chiqadi).",
      status: headingsCount === 1 ? "warning" : "error",
      weight: 10,
    });
  }

  // 7. Image SEO (Cover + Alt Text)
  if (input.coverImageUrl && input.coverImageAlt && input.coverImageAlt.trim().length >= 5) {
    checks.push({
      id: "image-seo",
      label: "Muqova va Alt-matn",
      message: "Muqova rasm va SEO Alt-tavsifi to'ldirilgan.",
      status: "good",
      weight: 10,
    });
  } else if (input.coverImageUrl) {
    checks.push({
      id: "image-seo",
      label: "Muqova va Alt-matn",
      message: "Rasm bor, lekin Image SEO uchun Alt-matn yozing.",
      status: "warning",
      weight: 10,
    });
  } else {
    checks.push({
      id: "image-seo",
      label: "Muqova va Alt-matn",
      message: "Muqova qo'shing (yo'qsa dinamik /og muqova ishlatiladi, lekin shaxsiy rasm afzal).",
      status: "warning",
      weight: 10,
    });
  }

  // 8. Internal Linking or Video Key Moments
  if (input.contentKind === "video") {
    if ((input.chaptersCount || 0) >= 2 && input.videoUrl) {
      checks.push({
        id: "video-seo",
        label: "Video SEO (Key Moments)",
        message: `${input.chaptersCount} ta Timestamp qo'shildi — Google video bo'limlarini chiqaradi.`,
        status: "good",
        weight: 10,
      });
    } else {
      checks.push({
        id: "video-seo",
        label: "Video SEO (Key Moments)",
        message: "Kamida 2 ta vaqt kodi (00:00 Kirish, ...) qo'shsangiz Google Key Moments chiqadi.",
        status: input.videoUrl ? "warning" : "error",
        weight: 10,
      });
    }
  } else {
    if (internalLinksCount >= 1) {
      checks.push({
        id: "internal-links",
        label: "Ichki bog'lanish (Topic Cluster)",
        message: `${internalLinksCount} ta ichki havola mavjud (/hub, /glossary yoki maqolalarga).`,
        status: "good",
        weight: 10,
      });
    } else {
      checks.push({
        id: "internal-links",
        label: "Ichki bog'lanish (Topic Cluster)",
        message: "Matn ichida /hub/... yoki /glossary/... sahifalariga kamida 1 ta ichki havola bering.",
        status: "warning",
        weight: 10,
      });
    }
  }

  let earned = 0;
  let total = 0;
  for (const c of checks) {
    total += c.weight;
    if (c.status === "good") earned += c.weight;
    else if (c.status === "warning") earned += Math.round(c.weight * 0.5);
  }

  const score = total > 0 ? Math.round((earned / total) * 100) : 0;
  const grade =
    score >= 90 ? "A+" : score >= 75 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D";

  return {
    score,
    grade,
    checks,
    wordCount,
    headingsCount,
    internalLinksCount,
  };
}
