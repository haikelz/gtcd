import { building } from "$app/environment";
import { isLocale } from "$lib/dashboard-layout.js";
import {
  LOCALE_COOKIE,
  localeFromAcceptLanguage,
  translate,
} from "$lib/i18n/index.js";
import { getDashboardSession } from "$lib/server/auth/session.js";
import { closeRedis } from "$lib/server/auth/session-store.js";
import {
  startReportScheduler,
  stopReportScheduler,
} from "$lib/server/email-reports.js";
import { DurableStateUnavailable } from "$lib/server/durable-state.js";
import {
  startChannelScheduler,
  stopChannelScheduler,
} from "$lib/server/notification-channels.js";
import { markScriptsForRocketLoader } from "$lib/server/rocket-loader.js";
import type {
  Handle,
  HandleServerError,
  RequestEvent,
  ServerInit,
} from "@sveltejs/kit";

export const handleError: HandleServerError = ({ error, event, status }) => {
  // Replacing SvelteKit's default handler also replaced its log line. A Redis
  // outage fails every durable request; reportRedisFailure logs it once.
  if (status !== 404 && !(error instanceof DurableStateUnavailable)) {
    console.error(
      `unexpected error on ${event.route.id ?? event.url.pathname}:`,
      error
    );
  }

  return {
    message:
      error instanceof DurableStateUnavailable
        ? error.message
        : "An unexpected error occurred. Please retry.",
  };
};

export const init: ServerInit = () => {
  if (building) return;

  startReportScheduler();
  startChannelScheduler();
  // adapter-node emits this after SIGTERM/SIGINT once in-flight requests have
  // finished. scripts/start.mjs holds the hard timeout.
  process.once("sveltekit:shutdown", async () => {
    await Promise.all([stopReportScheduler(), stopChannelScheduler()]);
    await closeRedis();
    process.exit(0);
  });
};

const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  // This installation has no public product pages, including its login page.
  "X-Robots-Tag": "noindex, nofollow",
};

// adapter-node's BODY_SIZE_LIMIT (10M in the Dockerfile) fits native imports
// of up to 8 MiB; every other request, signed in or not, gets 512 KiB.
const MAX_BODY_BYTES = 512 * 1024;

function refuseLargeBody({
  locals,
  request,
  url,
}: RequestEvent): Response | null {
  const declared = request.headers.get("content-length");
  // A chunked body has no length to check before it is read.
  if (declared === null ? !request.body : Number(declared) <= MAX_BODY_BYTES)
    return null;
  if (
    request.method === "POST" &&
    url.pathname === "/dashboard/admin/imports" &&
    locals.user
  )
    return null;

  // Read and drop the body, as Node does after adapter-node's own 413, so
  // the connection stays usable without the body ever being held in memory.
  request.body?.pipeTo(new WritableStream()).catch(() => {});
  return new Response(translate(locals.locale, "common.bodyTooLarge"), {
    headers: { "content-type": "text/plain; charset=utf-8" },
    status: 413,
  });
}

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.user = await getDashboardSession(event.cookies);

  // The dashboard layout refines this with the user's effective locale and
  // remembers it in the cookie, so login and error pages match next time.
  const savedLocale = event.cookies.get(LOCALE_COOKIE);
  event.locals.locale = isLocale(savedLocale)
    ? savedLocale
    : localeFromAcceptLanguage(event.request.headers.get("accept-language"));

  const resolved =
    refuseLargeBody(event) ??
    (await resolve(event, {
      transformPageChunk: ({ html }) =>
        html.replace(
          '<html lang="en">',
          `<html lang="${event.locals.locale}">`
        ),
    }));

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
