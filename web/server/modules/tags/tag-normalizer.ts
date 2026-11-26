import { AppError } from "../../common/errors";

export interface NormalizedTagParts {
  name: string;
  normalizedName: string;
  slug: string;
}

export interface TagValidationResult {
  valid: boolean;
  reason?: string;
  parts?: NormalizedTagParts;
}

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "j",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "x",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sh",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
  ў: "o",
  қ: "q",
  ғ: "g",
  ҳ: "h",
};

const BLOCKED_TAG_ROOTS = [
  "casino",
  "kazino",
  "1xbet",
  "mostbet",
  "pinup",
  "melbet",
  "betting",
  "gambling",
  "porno",
  "porn",
  "xxx",
  "hentai",
  "escort",
  "narkotik",
  "cocaine",
  "heroin",
  "scam",
  "phishing",
  "qimor",
  "jalab",
  "fohisha",
  "sikish",
  "blyat",
  "suka",
  "nahuy",
  "fuck",
  "bitch",
];

const URL_OR_SPAM_PATTERN =
  /(https?:\/\/|www\.|t\.me\/|telegram\.me\/|bit\.ly\/|@[a-z0-9_]+|\.(com|net|org|ru|uz|io|xyz|top|info)\b)/i;

const EXCESSIVE_REPEAT_PATTERN = /(.)\1{4,}/u;

/**
 * Strips zero-width/control characters, normalizes Unicode to NFC,
 * and standardizes Uzbek/Latin apostrophe variants into ASCII `'`.
 */
export function cleanTagDisplay(raw: string): string {
  return String(raw || "")
    .replace(/[\u200B-\u200D\uFEFF\u0000-\u001F\u007F]/g, "")
    .trim()
    .replace(/^#+/, "")
    .replace(/\s+/g, " ")
    .replace(/[‘’`ʻʼ]/g, "'")
    .normalize("NFC");
}

/**
 * Produces a language-aware canonical key (`normalizedName` and `slug`) handling:
 * - Uzbek apostrophes (`o'zbekiston`, `o‘zbekiston`, `oʻzbekiston`, `ozbekiston`)
 * - Uzbek & Russian Cyrillic transliteration (`Ўзбекистон` -> `ozbekiston`, `дастурлаш` -> `dasturlash`)
 * - Turkish dotted/dotless `İ`/`ı`
 * - Tech symbol disambiguation (`C++` -> `cpp`, `C#` -> `csharp`, `.NET` -> `dotnet`, `Next.js` -> `nextjs`)
 */
export function foldTagKey(raw: string): { normalizedName: string; slug: string } {
  const display = cleanTagDisplay(raw);
  if (!display) return { normalizedName: "", slug: "" };

  const prefolded = display
    .replace(/İ/g, "i")
    .replace(/ı/g, "i")
    .toLowerCase()
    .replace(/c\+\+/g, " cpp ")
    .replace(/c#/g, " csharp ")
    .replace(/f#/g, " fsharp ")
    .replace(/(^|\s)\.net(\s|$)/g, "$1dotnet$2")
    .replace(/([a-z0-9])\.js\b/g, "$1js")
    .replace(/([og])'/g, "$1")
    .replace(/'/g, "");

  let transliterated = "";
  for (const ch of prefolded) {
    transliterated += CYRILLIC_TO_LATIN[ch] ?? ch;
  }

  const normalizedName = transliterated
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  const slug = normalizedName
    .replace(/\s+/g, "-")
    .slice(0, 48)
    .replace(/^-+|-+$/g, "");

  return { normalizedName, slug };
}

export function normalizeSearchQuery(raw: string): string {
  return foldTagKey(raw).normalizedName;
}

/**
 * Validates raw user input and returns canonical normalized forms or rejection reason.
 */
export function validateTagInput(raw: string): TagValidationResult {
  const display = cleanTagDisplay(raw);
  if (display.length < 2) {
    return { valid: false, reason: "Teg kamida 2 ta belgidan iborat bo‘lishi kerak" };
  }
  if (display.length > 40) {
    return { valid: false, reason: "Teg ko‘pi bilan 40 ta belgidan oshmasligi kerak" };
  }
  if (/[<>[\]{}\\]/.test(display)) {
    return { valid: false, reason: "Tegda taqiqlangan belgilar mavjud" };
  }
  if (URL_OR_SPAM_PATTERN.test(display)) {
    return { valid: false, reason: "Teg sifatida havola yoki @username kiritish mumkin emas" };
  }
  if (EXCESSIVE_REPEAT_PATTERN.test(display)) {
    return { valid: false, reason: "Tegda bir xil belgilar ketma-ketligi juda ko‘p" };
  }

  const { normalizedName, slug } = foldTagKey(display);
  const canonicalAlnumCount = normalizedName.replace(/\s+/g, "").length;

  if (canonicalAlnumCount < 2 || normalizedName.length < 2 || slug.length < 2) {
    return { valid: false, reason: "Teg kamida 2 ta harf yoki raqamdan iborat bo‘lishi kerak" };
  }
  if (/^\d+$/.test(slug.replace(/-/g, ""))) {
    return { valid: false, reason: "Teg faqat raqamlardan iborat bo‘lishi mumkin emas" };
  }

  const compactKey = normalizedName.replace(/\s+/g, "");
  for (const blocked of BLOCKED_TAG_ROOTS) {
    if (compactKey === blocked || compactKey.includes(blocked)) {
      return { valid: false, reason: "Ushbu teg hamjamiyat qoidalariga zid deb topildi" };
    }
  }

  return {
    valid: true,
    parts: {
      name: display,
      normalizedName,
      slug,
    },
  };
}

export function assertValidTagInput(raw: string): NormalizedTagParts {
  const res = validateTagInput(raw);
  if (!res.valid || !res.parts) {
    throw AppError.validation(res.reason || "Teg nomi noto‘g‘ri");
  }
  return res.parts;
}
