import {
  getRedis,
  pingRedis,
  reportRedisFailure,
} from "$lib/server/auth/session-store.js";

type MemoryEntry = { readonly expiresAt?: number; readonly raw: string };

// ponytail: per-process fallback, written only while Redis is down or after a
// failed Redis write. Values there are lost on restart and not shared across
// replicas; Redis is the durable store. A full map drops expired entries, then
// the oldest half, so an outage cannot grow it without bound.
const MEMORY_MAX_ENTRIES = 1_000;
const memory = new Map<string, MemoryEntry>();

function readMemory(key: string): string | undefined {
  const entry = memory.get(key);
  if (entry?.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
    memory.delete(key);
    return undefined;
  }
  return entry?.raw;
}

function sweepMemory(): void {
  const now = Date.now();
  for (const [key, entry] of memory) {
    if (entry.expiresAt !== undefined && entry.expiresAt <= now) {
      memory.delete(key);
    }
  }

  if (memory.size >= MEMORY_MAX_ENTRIES) {
    const oldest = [...memory.keys()].slice(
      0,
      Math.floor(MEMORY_MAX_ENTRIES / 2)
    );
    for (const key of oldest) memory.delete(key);
  }
}

function writeMemory(key: string, raw: string, expiresAt?: number): void {
  if (memory.size >= MEMORY_MAX_ENTRIES && !memory.has(key)) sweepMemory();
  memory.set(key, { expiresAt, raw });
}

/** Read a JSON value (unvalidated: callers parse it with their own schema). */
export async function getJson(key: string): Promise<unknown> {
  let raw: string | null | undefined;

  if (await pingRedis()) {
    try {
      raw = await getRedis().get(key);
    } catch (cause) {
      reportRedisFailure(cause);
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

  if (await pingRedis()) {
    try {
      await (ttlSeconds === undefined
        ? getRedis().set(key, raw)
        : getRedis().set(key, raw, "EX", ttlSeconds));
      // An outage copy must not resurface as a stale value later.
      memory.delete(key);
      return;
    } catch (cause) {
      reportRedisFailure(cause);
    }
  }

  // Keep the change for this process until Redis is back.
  writeMemory(
    key,
    raw,
    ttlSeconds === undefined ? undefined : Date.now() + ttlSeconds * 1000
  );
}

export async function deleteKey(key: string): Promise<void> {
  memory.delete(key);

  if (await pingRedis()) {
    try {
      await getRedis().del(key);
    } catch (cause) {
      reportRedisFailure(cause);
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
    } catch (cause) {
      // Count in memory for this process instead.
      reportRedisFailure(cause);
    }
  }

  const count = Number(readMemory(key) ?? 0) + 1;
  writeMemory(
    key,
    String(count),
    memory.get(key)?.expiresAt ?? Date.now() + windowSeconds * 1000
  );
  return count;
}

/** Read a counter written by incrementCounter; 0 when absent or expired. */
export async function readCounter(key: string): Promise<number> {
  if (await pingRedis()) {
    try {
      return Number((await getRedis().get(key)) ?? 0);
    } catch (cause) {
      // Fall through to the in-memory count.
      reportRedisFailure(cause);
    }
  }
  return Number(readMemory(key) ?? 0);
}
