import { getRedis, pingRedis } from "$lib/server/auth/session-store.js";

// ponytail: per-process fallback while Redis is down; values written there are
// lost on restart and not shared across replicas. Redis is the durable store.
const memory = new Map<string, string>();

/** Read a JSON value (unvalidated: callers parse it with their own schema). */
export async function getJson(key: string): Promise<unknown> {
  let raw: string | null | undefined;

  if (await pingRedis()) {
    try {
      raw = await getRedis().get(key);
    } catch {
      raw = memory.get(key);
    }
  } else {
    raw = memory.get(key);
  }

  if (raw === null || raw === undefined) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export async function setJson(key: string, value: unknown): Promise<void> {
  const raw = JSON.stringify(value);
  memory.set(key, raw);

  if (await pingRedis()) {
    try {
      await getRedis().set(key, raw);
    } catch {
      // The in-memory copy keeps the change for this process.
    }
  }
}

export async function deleteKey(key: string): Promise<void> {
  memory.delete(key);

  if (await pingRedis()) {
    try {
      await getRedis().del(key);
    } catch {
      // Nothing durable to remove.
    }
  }
}

/**
 * Take a short-lived lock so only one replica runs a job; false when another
 * process holds it. Without Redis every process runs the job.
 */
export async function acquireLock(
  key: string,
  ttlSeconds: number
): Promise<boolean> {
  if (!(await pingRedis())) return true;

  try {
    const result = await getRedis().set(
      key,
      String(process.pid),
      "EX",
      ttlSeconds,
      "NX"
    );
    return result === "OK";
  } catch {
    return true;
  }
}
