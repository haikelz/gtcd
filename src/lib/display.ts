import { page } from "$app/state";
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

/** A count with the user's thousands separator. */
export function formatCount(value: number): string {
  return formatNumber(value, displayPreferences().numberSeparator);
}
