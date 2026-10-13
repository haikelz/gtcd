import { deleteKey, incrementCounter, readCounter } from "$lib/server/kv.js";

const WINDOW_SECONDS = 15 * 60;
const MAX_FAILURES_PER_EMAIL = 5;
const MAX_FAILURES_PER_IP = 20;

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
