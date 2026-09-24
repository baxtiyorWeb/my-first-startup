import { formatRelativeTime as formatRelativeTimeI18n } from "./i18n/format-date";
import type { Locale } from "./i18n/config";

/**
 * Format relative time in Uzbek, Russian, or English
 */
export function formatRelativeTime(
  dateInput: string | Date | null | undefined,
  locale?: string
): string {
  return formatRelativeTimeI18n(dateInput, (locale as Locale) || "uz");
}
