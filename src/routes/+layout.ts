import { loadMessages } from "$lib/i18n/messages";
import type { LayoutLoad } from "./$types";

// Only the active locale's catalog reaches the browser; $lib/display reads it.
export const load: LayoutLoad = async ({ data }) => ({
  ...data,
  messages: await loadMessages(data.locale),
});
