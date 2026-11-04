import { loadMessages } from "$lib/i18n/messages";
import type { LayoutLoad } from "./$types";

// The dashboard locale follows the user's preferences, which can differ from
// the cookie locale the root layout saw on this request.
export const load: LayoutLoad = async ({ data }) => ({
  ...data,
  messages: await loadMessages(data.locale),
});
