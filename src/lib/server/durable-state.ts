import { getRedis, pingRedis } from "$lib/server/auth/session-store.js";

export class DurableStateUnavailable extends Error {
  constructor() {
    super(
      "Storage is unavailable. Could not confirm your changes. Please retry."
    );
    this.name = "DurableStateUnavailable";
  }
}

async function connection() {
  if (!(await pingRedis())) throw new DurableStateUnavailable();
  return getRedis();
}

export async function readDurableJson(key: string): Promise<unknown> {
  try {
    const raw = await (await connection()).get(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch (cause) {
    if (cause instanceof SyntaxError) throw cause;
    throw new DurableStateUnavailable();
  }
}

/** Compare-and-swap avoids lost updates without WATCH on a shared connection. */
export async function updateDurableJson<T>(
  key: string,
  update: (current: unknown) => T,
  ttlSeconds?: number
): Promise<T> {
  const redis = await connection();
  for (let attempt = 0; attempt < 20; attempt++) {
    let raw: string | null;
    try {
      raw = await redis.get(key);
    } catch {
      throw new DurableStateUnavailable();
    }
    const next = update(raw === null ? undefined : JSON.parse(raw));
    try {
      const saved = await redis.eval(
        `local current = redis.call('GET', KEYS[1])
         if (current or '') ~= ARGV[1] then return 0 end
         if ARGV[3] == '' then
           redis.call('SET', KEYS[1], ARGV[2])
         else
           redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
         end
         return 1`,
        1,
        key,
        raw ?? "",
        JSON.stringify(next),
        ttlSeconds === undefined ? "" : String(ttlSeconds)
      );
      if (saved === 1) return next;
    } catch {
      throw new DurableStateUnavailable();
    }
  }
  throw new Error("Storage is busy. Please retry your change.");
}
