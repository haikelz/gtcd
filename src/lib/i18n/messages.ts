import type { Locale } from "$lib/dashboard-layout";
import type { MessageKey, MessageParams } from "./index";

export type Messages = Readonly<Record<MessageKey, string>>;

/**
 * One locale's catalog. The dynamic imports keep each language in its own
 * chunk, so the browser downloads only the active one.
 */
export async function loadMessages(locale: Locale): Promise<Messages> {
  const catalog = locale === "id" ? await import("./id") : await import("./en");

  return catalog.default;
}

/** Fill {param} placeholders; unknown placeholders stay as written. */
export function fillMessage(template: string, params?: MessageParams): string {
  if (!params) return template;

  return template.replace(/\{(\w+)\}/g, (match: string, name: string) =>
    name in params ? String(params[name]) : match
  );
}
