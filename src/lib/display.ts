import { page } from "$app/state";
import { type Locale, VIEW_PARAMS } from "$lib/dashboard-layout";
import type { MessageKey, MessageParams } from "$lib/i18n";
import { fillMessage, type Messages } from "$lib/i18n/messages";
import {
  DEFAULT_DISPLAY_PREFERENCES,
  type DisplayPreferences,
  formatNumber,
} from "$lib/preferences";

/**
 * The viewer's GoatCounter display preferences for the current request.
 * Reads request-scoped page data, so it is safe during SSR.
 */
export function displayPreferences(): DisplayPreferences {
  return page.data.preferences ?? DEFAULT_DISPLAY_PREFERENCES;
}

/** GoatCounter "fewer numbers": hide absolute counts, keep shapes and shares. */
export function numbersHidden(): boolean {
  return displayPreferences().fewerNumbers;
}

/** A count with the user's thousands separator. */
export function formatCount(value: number): string {
  return formatNumber(value, displayPreferences().numberSeparator);
}

/** The interface language for the current request. */
export function currentLocale(): Locale {
  return page.data.preferences?.locale ?? page.data.locale ?? "en";
}

/**
 * A UI message in the current locale. The layouts load only that locale's
 * catalog into page data (see $lib/i18n/messages).
 */
export function t(key: MessageKey, params?: MessageParams): string {
  const messages: Partial<Messages> = page.data.messages ?? {};

  return fillMessage(messages[key] ?? key, params);
}

/**
 * An in-dashboard URL that keeps the selected site, which the server reads
 * from `?site=` and otherwise replaces with the user's default site. With
 * `view`, it also keeps the report period, filter and grouping. `href` may be
 * relative, such as a form action like "?/update"; parameters it already
 * sets win.
 */
export function dashboardHref(
  href: string,
  { view = false }: { readonly view?: boolean } = {}
): string {
  const url = new URL(href, page.url);

  if (view) {
    for (const key of VIEW_PARAMS) {
      const value = page.url.searchParams.get(key);
      if (value && !url.searchParams.has(key)) url.searchParams.set(key, value);
    }
  }
  if (page.data.site && !url.searchParams.has("site")) {
    url.searchParams.set("site", String(page.data.site.id));
  }

  return `${url.pathname}${url.search}`;
}
