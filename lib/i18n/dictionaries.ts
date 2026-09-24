import { uz } from "./locales/uz";
import { ru } from "./locales/ru";
import { en } from "./locales/en";
import { Locale, DEFAULT_LOCALE, isValidLocale } from "./config";

export type TranslationDictionary = typeof uz;

export const dictionaries: Record<Locale, TranslationDictionary> = {
  uz,
  ru,
  en,
};

export function getDictionary(locale?: string): TranslationDictionary {
  if (locale && isValidLocale(locale)) {
    return dictionaries[locale];
  }
  return dictionaries[DEFAULT_LOCALE];
}
