import { page } from "$app/state";
import type { Locale } from "$lib/dashboard-layout";
import { type MessageKey, type MessageParams, translate } from "$lib/i18n";
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

/** A UI message in the current locale; see $lib/i18n. */
export function t(key: MessageKey, params?: MessageParams): string {
  return translate(currentLocale(), key, params);
}
