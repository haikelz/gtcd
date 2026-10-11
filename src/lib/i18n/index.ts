import type { Locale } from "$lib/dashboard-layout";
import en from "./en";
import id from "./id";

/** Cookie that remembers the interface language outside the dashboard. */
export const LOCALE_COOKIE = "gtcd_locale";

export type MessageKey = keyof typeof en;

export type MessageParams = Record<string, string | number>;

const CATALOGS: Record<Locale, Record<MessageKey, string>> = { en, id };

/**
 * A message in the given locale with {param} placeholders filled in. Missing
 * keys fall back to English, then to the key itself.
 */
export function translate(
  locale: Locale,
  key: MessageKey,
  params?: MessageParams
): string {
  const catalog: Partial<Record<string, string>> = CATALOGS[locale];
  const fallback: Partial<Record<string, string>> = CATALOGS.en;
  const template = catalog[key] ?? fallback[key] ?? key;
  if (!params) return template;

  return template.replace(/\{(\w+)\}/g, (match: string, name: string) =>
    name in params ? String(params[name]) : match
  );
}

/** The best gtcd locale for an Accept-Language header. */
export function localeFromAcceptLanguage(header: string | null): Locale {
  const preferred = header?.split(",")[0]?.trim().toLowerCase() ?? "";
  return preferred.startsWith("id") ? "id" : "en";
}
