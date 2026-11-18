import { Locale, DEFAULT_LOCALE } from "./config";
import { getDictionary } from "./dictionaries";

/**
 * Format relative time in specified locale (e.g. "Hozirgina" / "Только что" / "Just now")
 */
export function formatRelativeTime(
  dateInput: string | Date | null | undefined,
  locale: Locale = DEFAULT_LOCALE
): string {
  if (!dateInput) return "";

  // If it's already a relative phrase (from legacy/seed data), pass through unless recognizable
  if (
    typeof dateInput === "string" &&
    !dateInput.includes("T") &&
    !dateInput.includes(":") &&
    !dateInput.match(/^\d{4}-\d{2}-\d{2}/)
  ) {
    if (dateInput === "Hozirgina") {
      const dict = getDictionary(locale);
      return dict.dates.justNow;
    }
    return dateInput;
  }

  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) {
    return String(dateInput);
  }

  const dict = getDictionary(locale);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) {
    return dict.dates.justNow;
  }
  if (diffMin < 60) {
    if (locale === "en") {
      return `${diffMin} ${diffMin === 1 ? "minute" : "minutes"} ago`;
    }
    return `${diffMin} ${dict.dates.minutesAgo}`;
  }
  if (diffHours < 24) {
    if (locale === "en") {
      return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
    }
    return `${diffHours} ${dict.dates.hoursAgo}`;
  }
  if (diffDays === 1) {
    return dict.dates.yesterday;
  }
  if (diffDays < 7) {
    if (locale === "en") {
      return `${diffDays} days ago`;
    }
    return `${diffDays} ${dict.dates.daysAgo}`;
  }

  const day = date.getDate();
  const month = dict.dates.months[date.getMonth()];
  const year = date.getFullYear();

  if (locale === "en") {
    if (year === now.getFullYear()) {
      return `${month.slice(0, 3)} ${day}`;
    }
    return `${month.slice(0, 3)} ${day}, ${year}`;
  }

  if (locale === "ru") {
    if (year === now.getFullYear()) {
      return `${day} ${month}`;
    }
    return `${day} ${month} ${year} г.`;
  }

  // uz
  if (year === now.getFullYear()) {
    return `${day}-${month}`;
  }
  return `${day}-${month}, ${year}`;
}
