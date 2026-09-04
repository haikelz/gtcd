import type { Cookies } from "@sveltejs/kit";
import { randomBytes } from "crypto";
import { createSession, deleteSession, getSession } from "./session-store.js";

const COOKIE_NAME = "dashboard_session";

export interface SessionUser {
  email: string;
}

export function generateSessionId(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Decide the cookie `secure` flag from the real client-facing protocol.
 * Hardcoding `secure: true` silently breaks login on plain-HTTP deployments
 * (e.g. local Docker), while hardcoding `false` weakens production. Reverse
 * proxies are trusted here: spoofing X-Forwarded-Proto only changes the flag
 * on the attacker's own session cookie, which gains them nothing.
 */
export function shouldUseSecureCookies(headers: Headers, url: URL): boolean {
  const override = process.env.COOKIE_SECURE?.toLowerCase();

  if (override === "true") return true;
  if (override === "false") return false;

  const forwardedProto = headers.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.split(",")[0].trim() === "https";
  }

  return url.protocol === "https:";
}

export async function createDashboardSession(
  cookies: Cookies,
  email: string,
  secure: boolean,
): Promise<void> {
  const sessionId = generateSessionId();

  await createSession(sessionId, email);

  cookies.set(COOKIE_NAME, sessionId, {
    path: "/",
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function getDashboardSession(
  cookies: Cookies,
): Promise<SessionUser | null> {
  const sessionId = cookies.get(COOKIE_NAME);
  if (!sessionId) return null;

  const session = await getSession(sessionId);
  if (!session) {
    cookies.delete(COOKIE_NAME, { path: "/" });
    return null;
  }

  return { email: session.email };
}

export async function destroyDashboardSession(cookies: Cookies): Promise<void> {
  const sessionId = cookies.get(COOKIE_NAME);
  if (sessionId) {
    await deleteSession(sessionId);
  }
  cookies.delete(COOKIE_NAME, { path: "/" });
}
