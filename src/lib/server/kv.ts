import { getRedis, pingRedis } from "$lib/server/auth/session-store.js";

type MemoryEntry = { readonly expiresAt?: number; readonly raw: string };

// ponytail: per-process fallback while Redis is down; values written there are
// lost on restart and not shared across replicas. Redis is the durable store.
// Expired entries are dropped when read, not swept.
const memory = new Map<string, MemoryEntry>();

function readMemory(key: string): string | undefined {
  const entry = memory.get(key);
  if (entry?.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
    memory.delete(key);
    return undefined;
  }
  return entry?.raw;
}

function writeMemory(key: string, raw: string, ttlSeconds?: number): void {
  memory.set(key, {
    expiresAt:
      ttlSeconds === undefined ? undefined : Date.now() + ttlSeconds * 1000,
    raw,
  });
}

/** Read a JSON value (unvalidated: callers parse it with their own schema). */
export async function getJson(key: string): Promise<unknown> {
  let raw: string | null | undefined;

  if (await pingRedis()) {
    try {
      raw = await getRedis().get(key);
    } catch {
      raw = readMemory(key);
    }
  } else {
    raw = readMemory(key);
  }

  if (raw === null || raw === undefined) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** Store a JSON value, expiring after ttlSeconds when given. */
export async function setJson(
  key: string,
  value: unknown,
  ttlSeconds?: number
): Promise<void> {
  const raw = JSON.stringify(value);
  writeMemory(key, raw, ttlSeconds);

  if (await pingRedis()) {
    try {
      await (ttlSeconds === undefined
        ? getRedis().set(key, raw)
        : getRedis().set(key, raw, "EX", ttlSeconds));
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
 * Count an event in a fixed window that starts at the first event; returns the
 * count including this one.
 */
export async function incrementCounter(
  key: string,
  windowSeconds: number
): Promise<number> {
  if (await pingRedis()) {
    try {
      const [[, count]] = (await getRedis()
        .multi()
        .incr(key)
        .expire(key, windowSeconds, "NX")
        .exec()) as [[Error | null, number]];
      return count;
    } catch {
      // Count in memory for this process instead.
    }
  }

  const count = Number(readMemory(key) ?? 0) + 1;
  const entry = memory.get(key);
  memory.set(key, {
    expiresAt: entry?.expiresAt ?? Date.now() + windowSeconds * 1000,
    raw: String(count),
  });
  return count;
}

/** Read a counter written by incrementCounter; 0 when absent or expired. */
export async function readCounter(key: string): Promise<number> {
  if (await pingRedis()) {
    try {
      return Number((await getRedis().get(key)) ?? 0);
    } catch {
      // Fall through to the in-memory count.
    }
  }
  return Number(readMemory(key) ?? 0);
}
