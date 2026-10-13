import type { TotpChallenge } from "$lib/server/goatcounter/totp-form.js";
import {
  deleteKey,
  getJson,
  incrementCounter,
  readCounter,
  setJson,
} from "$lib/server/kv.js";
import type { Cookies } from "@sveltejs/kit";
import { generateSessionId } from "./session.js";

const WINDOW_SECONDS = 15 * 60;
const MAX_FAILURES_PER_EMAIL = 5;
const MAX_FAILURES_PER_IP = 20;

const MFA_COOKIE = "gtcd_mfa";
const MFA_TTL_SECONDS = 5 * 60;
const MAX_MFA_ATTEMPTS = 5;

type PendingMfa = {
  readonly attempts: number;
  readonly challenge: TotpChallenge;
  readonly email: string;
  readonly expiresAt: number;
};

/**
 * The client IP, only when ADDRESS_HEADER tells adapter-node which proxy
 * header to trust. Without it every request carries the proxy's address, and
 * an IP limit would lock all users out together.
 */
export function clientIp(getClientAddress: () => string): string | null {
  if (!process.env.ADDRESS_HEADER) return null;
  try {
    return getClientAddress();
  } catch {
    return null;
  }
}

function limitKeys(email: string, ip: string | null) {
  return {
    email: `login-fail:email:${email.toLowerCase()}`,
    ip: ip ? `login-fail:ip:${ip}` : null,
  };
}

/** True when this email or IP failed too often in the current window. */
export async function isLoginLimited(
  email: string,
  ip: string | null
): Promise<boolean> {
  const keys = limitKeys(email, ip);
  if ((await readCounter(keys.email)) >= MAX_FAILURES_PER_EMAIL) return true;
  return (
    keys.ip !== null && (await readCounter(keys.ip)) >= MAX_FAILURES_PER_IP
  );
}

export async function recordLoginFailure(
  email: string,
  ip: string | null
): Promise<void> {
  const keys = limitKeys(email, ip);
  await incrementCounter(keys.email, WINDOW_SECONDS);
  if (keys.ip) await incrementCounter(keys.ip, WINDOW_SECONDS);
}

export async function clearLoginFailures(email: string): Promise<void> {
  await deleteKey(limitKeys(email, null).email);
}

function isPendingMfa(value: unknown): value is PendingMfa {
  const pending = value as PendingMfa | undefined;
  return (
    typeof pending?.email === "string" &&
    typeof pending.attempts === "number" &&
    typeof pending.expiresAt === "number" &&
    typeof pending.challenge?.loginMac === "string" &&
    typeof pending.challenge.loginToken === "string"
  );
}

/** Park GoatCounter's TOTP challenge server-side until the user sends a code. */
export async function startMfa(
  cookies: Cookies,
  email: string,
  challenge: TotpChallenge,
  secure: boolean
): Promise<void> {
  const id = generateSessionId();
  const pending: PendingMfa = {
    attempts: 0,
    challenge,
    email,
    expiresAt: Date.now() + MFA_TTL_SECONDS * 1000,
  };

  await setJson(`mfa:${id}`, pending, MFA_TTL_SECONDS);
  cookies.set(MFA_COOKIE, id, {
    httpOnly: true,
    maxAge: MFA_TTL_SECONDS,
    path: "/login",
    sameSite: "lax",
    secure,
  });
}

export async function getPendingMfa(
  cookies: Cookies
): Promise<{ id: string; pending: PendingMfa } | null> {
  const id = cookies.get(MFA_COOKIE);
  if (!id || !/^[a-f0-9]{64}$/.test(id)) return null;

  const pending = await getJson(`mfa:${id}`);
  if (!isPendingMfa(pending) || pending.expiresAt <= Date.now()) return null;
  return { id, pending };
}

/** Count a wrong code; false once the challenge has no attempts left. */
export async function recordMfaFailure(
  cookies: Cookies,
  id: string,
  pending: PendingMfa
): Promise<boolean> {
  const attempts = pending.attempts + 1;
  if (attempts >= MAX_MFA_ATTEMPTS) {
    await clearMfa(cookies, id);
    return false;
  }

  const ttlSeconds = Math.ceil((pending.expiresAt - Date.now()) / 1000);
  if (ttlSeconds <= 0) {
    await clearMfa(cookies, id);
    return false;
  }

  await setJson(`mfa:${id}`, { ...pending, attempts }, ttlSeconds);
  return true;
}

export async function clearMfa(cookies: Cookies, id?: string): Promise<void> {
  const current = id ?? cookies.get(MFA_COOKIE);
  if (current) await deleteKey(`mfa:${current}`);
  cookies.delete(MFA_COOKIE, { path: "/login" });
}
