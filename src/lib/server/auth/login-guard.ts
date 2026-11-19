import type { TotpChallenge } from "$lib/server/goatcounter/totp-form.js";
import {
  deleteKey,
  getJson,
  incrementCounter,
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

/**
 * Count one attempt before GoatCounter sees it. The counters are atomic, so
 * parallel tries cannot all pass a check that read the count before any
 * failure landed. False, with the attempt given back, once this email or IP
 * failed too often in the current window. A wrong password or code keeps the
 * count; every other outcome releases or clears it.
 */
export async function claimLoginAttempt(
  email: string,
  ip: string | null
): Promise<boolean> {
  const keys = limitKeys(email, ip);
  const byEmail = await incrementCounter(keys.email, WINDOW_SECONDS);
  const byIp = keys.ip ? await incrementCounter(keys.ip, WINDOW_SECONDS) : 0;
  if (byEmail <= MAX_FAILURES_PER_EMAIL && byIp <= MAX_FAILURES_PER_IP) {
    return true;
  }

  await releaseLoginAttempt(email, ip);
  return false;
}

async function release(key: string): Promise<void> {
  // A success that cleared the key meanwhile must not leave it below zero.
  if ((await incrementCounter(key, WINDOW_SECONDS, -1)) < 0) {
    await deleteKey(key);
  }
}

/** Give back an attempt that was not a wrong password or code. */
export async function releaseLoginAttempt(
  email: string,
  ip: string | null
): Promise<void> {
  const keys = limitKeys(email, ip);
  await release(keys.email);
  if (keys.ip) await release(keys.ip);
}

/** After a sign-in: forget the email's failures, give back the IP's try. */
export async function clearLoginFailures(
  email: string,
  ip: string | null
): Promise<void> {
  const keys = limitKeys(email, ip);
  await deleteKey(keys.email);
  if (keys.ip) await release(keys.ip);
}

function isPendingMfa(value: unknown): value is PendingMfa {
  const pending = value as PendingMfa | undefined;
  return (
    typeof pending?.email === "string" &&
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

/**
 * Reserve one code attempt before GoatCounter sees the code. The counter is
 * atomic, so parallel submissions cannot all read a fresh challenge. Returns
 * the attempts left after this one; negative once the challenge is used up.
 */
export async function claimMfaAttempt(id: string): Promise<number> {
  const attempt = await incrementCounter(`mfa-attempts:${id}`, MFA_TTL_SECONDS);
  return MAX_MFA_ATTEMPTS - attempt;
}

/** Give back an attempt GoatCounter never judged (it was unavailable). */
export async function releaseMfaAttempt(id: string): Promise<void> {
  await incrementCounter(`mfa-attempts:${id}`, MFA_TTL_SECONDS, -1);
}

export async function clearMfa(cookies: Cookies, id?: string): Promise<void> {
  const current = id ?? cookies.get(MFA_COOKIE);
  if (current) await deleteKey(`mfa:${current}`);
  cookies.delete(MFA_COOKIE, { path: "/login" });
}
