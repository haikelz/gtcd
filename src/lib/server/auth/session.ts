import {
  forgetNativeSession,
  isNativeAccountRevoked,
} from "$lib/server/goatcounter/native-session.js";
import { getJson, setJson } from "$lib/server/kv.js";
import type { Cookies } from "@sveltejs/kit";
import { createHash, randomBytes } from "crypto";
import { createSession, deleteSession, getSession } from "./session-store.js";

const COOKIE_NAME = "dashboard_session";
const ACCOUNT_CHECK_SECONDS = 5 * 60;

export interface SessionUser {
  email: string;
}

export function generateSessionId(): string {
  return randomBytes(32).toString("hex");
}

/** Durable key for the time of a user's last successful gtcd sign-in. */
export function lastLoginKey(email: string): string {
  return `last-login:${email.trim().toLowerCase()}`;
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
  secure: boolean
): Promise<void> {
  const sessionId = generateSessionId();

  await createSession(sessionId, email);
  // Best effort: email reports read this to stop for long-absent users.
  await setJson(lastLoginKey(email), Date.now());

  cookies.set(COOKIE_NAME, sessionId, {
    path: "/",
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

/**
 * GoatCounter owns the account, so removing or locking a user there must end
 * their gtcd session too. Ask GoatCounter at most every five minutes per
 * session. Only its own rejection ends the session; an outage keeps the user
 * signed in and is asked again after the interval.
 * ponytail: a session with no stored GoatCounter login (created before native
 * sessions existed) cannot be checked and lives out its 7 days.
 */
async function isAccountRevoked(
  cookies: Cookies,
  sessionId: string,
  email: string
): Promise<boolean> {
  const hash = createHash("sha256").update(sessionId).digest("hex");
  const key = `session-checked:${hash}`;
  if (await getJson(key)) return false;

  if (await isNativeAccountRevoked(cookies, email)) return true;

  await setJson(key, true, ACCOUNT_CHECK_SECONDS);
  return false;
}

export async function getDashboardSession(
  cookies: Cookies
): Promise<SessionUser | null> {
  const sessionId = cookies.get(COOKIE_NAME);
  if (!sessionId) return null;

  const session = await getSession(sessionId);
  if (!session) {
    cookies.delete(COOKIE_NAME, { path: "/" });
    return null;
  }

  if (await isAccountRevoked(cookies, sessionId, session.email)) {
    await forgetNativeSession(cookies);
    // A failed delete keeps the cookie, so the next request asks again.
    await destroyDashboardSession(cookies);
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
