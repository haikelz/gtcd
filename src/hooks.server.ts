import { building } from "$app/environment";
import { isLocale } from "$lib/dashboard-layout.js";
import { LOCALE_COOKIE, localeFromAcceptLanguage } from "$lib/i18n/index.js";
import { getDashboardSession } from "$lib/server/auth/session.js";
import { startReportScheduler } from "$lib/server/email-reports.js";
import { markScriptsForRocketLoader } from "$lib/server/rocket-loader.js";
import type { Handle, ServerInit } from "@sveltejs/kit";

export const init: ServerInit = () => {
  if (!building) startReportScheduler();
};

const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  // This installation has no public product pages, including its login page.
  "X-Robots-Tag": "noindex, nofollow",
};

export const handle: Handle = async ({ event, resolve }) => {
  // Validate session on every request
  event.locals.user = await getDashboardSession(event.cookies);

  // The dashboard layout refines this with the user's effective locale and
  // remembers it in the cookie, so login and error pages match next time.
  const savedLocale = event.cookies.get(LOCALE_COOKIE);
  event.locals.locale = isLocale(savedLocale)
    ? savedLocale
    : localeFromAcceptLanguage(event.request.headers.get("accept-language"));

  const resolved = await resolve(event, {
    transformPageChunk: ({ html }) =>
      html.replace('<html lang="en">', `<html lang="${event.locals.locale}">`),
  });

  // Rewrite the whole HTML stream, not just transformPageChunk's output, so
  // the scripts SvelteKit streams for unresolved load promises are marked too.
  let response = resolved;
  if (
    resolved.body &&
    resolved.headers.get("content-type")?.startsWith("text/html")
  ) {
    response = new Response(
      resolved.body.pipeThrough(markScriptsForRocketLoader()),
      {
        headers: resolved.headers,
        status: resolved.status,
        statusText: resolved.statusText,
      }
    );
    // The added attributes change the byte count.
    response.headers.delete("content-length");
  }

  for (const [header, value] of Object.entries(securityHeaders)) {
    response.headers.set(header, value);
  }

  const sharedReport = event.url.pathname.startsWith("/share/");
  if (event.locals.user || sharedReport) {
    response.headers.set("Cache-Control", "private, no-store");
  }

  if (sharedReport) {
    response.headers.set("Referrer-Policy", "no-referrer");
  }

  if (event.url.protocol === "https:") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000");
  }

  return response;
};
