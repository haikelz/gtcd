import { getDashboardSession } from "$lib/server/auth/session.js";
import type { Handle } from "@sveltejs/kit";

const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": [
    "default-src 'self'",
    // SvelteKit hydration and the app.html theme bootstrap are inline scripts.
    "script-src 'self' 'unsafe-inline'",
    // SVG charts use inline style attributes for geometry.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; "),
};

export const handle: Handle = async ({ event, resolve }) => {
  // Validate session on every request
  event.locals.user = await getDashboardSession(event.cookies);

  const response = await resolve(event);

  for (const [header, value] of Object.entries(securityHeaders)) {
    response.headers.set(header, value);
  }

  if (event.locals.user) {
    response.headers.set("Cache-Control", "private, no-store");
  }

  if (event.url.protocol === "https:") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000");
  }

  return response;
};
