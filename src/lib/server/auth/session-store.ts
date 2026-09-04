import { building } from "$app/environment";
import Redis from "ioredis";

let redis: Redis | null = null;
// null = never probed, true = last interaction succeeded, false = last interaction failed.
let redisAvailable: boolean | null = null;
let lastRedisFailureAt = 0;

const REDIS_RETRY_COOLDOWN_MS = 5_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const memorySessions = new Map<string, { email: string; expiresAt: number }>();

const SESSION_PREFIX = "session:";
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days in seconds

export function getRedis(): Redis {
  if (redis) return redis;

  if (building) {
    throw new Error("Redis should not be accessed during build");
  }

  const url = process.env.REDIS_URL || "redis://localhost:6379";
  const client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    enableOfflineQueue: false,
    // Keep retrying in the background with bounded backoff so a recovered
    // Redis is picked up again instead of being abandoned until process restart.
    retryStrategy: (attempt) => Math.min(1000 * 2 ** Math.min(attempt, 4), 10_000),
  });

  client.on("error", () => {
    // Connection errors are surfaced through command rejections; swallow the
    // event so an unavailable Redis degrades to the in-memory store silently.
  });

  redis = client;
  return redis;
}

/**
 * Probe Redis with a cooldown so callers (e.g. health checks and session
 * lookups) fail fast while Redis is down instead of paying a connect timeout
 * on every request. The cooldown also gives the client's background reconnect
 * attempts room to succeed before we probe again. `maxWaitMs` bounds how long
 * a single probe may block; a timed-out probe reports "down" while the
 * underlying attempt keeps running and converges the recorded state.
 */
export async function pingRedis(maxWaitMs = 1_000): Promise<boolean> {
  const now = Date.now();

  if (redisAvailable === false && now - lastRedisFailureAt < REDIS_RETRY_COOLDOWN_MS) {
    return false;
  }

  const attempt = (async () => {
    try {
      const client = getRedis();
      const result = await client.ping();
      redisAvailable = result === "PONG";
      return redisAvailable;
    } catch {
      redisAvailable = false;
      lastRedisFailureAt = Date.now();
      return false;
    }
  })();

  return Promise.race([
    attempt,
    sleep(maxWaitMs).then(() => false),
  ]);
}

export async function createSession(
  sessionId: string,
  email: string,
): Promise<void> {
  const isUp = redisAvailable ?? (await pingRedis());

  if (isUp && redis) {
    try {
      const data = JSON.stringify({ email });
      await redis.setex(
        `${SESSION_PREFIX}${sessionId}`,
        SESSION_MAX_AGE_SEC,
        data,
      );
      return;
    } catch {
      redisAvailable = false;
      lastRedisFailureAt = Date.now();
    }
  }

  // In-memory fallback
  memorySessions.set(sessionId, {
    email,
    expiresAt: Date.now() + SESSION_MAX_AGE_SEC * 1000,
  });
}

export async function getSession(
  sessionId: string,
): Promise<{ email: string } | null> {
  const isUp = redisAvailable ?? (await pingRedis());

  if (isUp && redis) {
    try {
      const data = await redis.get(`${SESSION_PREFIX}${sessionId}`);
      if (data) {
        return JSON.parse(data) as { email: string };
      }
      return null;
    } catch {
      redisAvailable = false;
      lastRedisFailureAt = Date.now();
    }
  }

  // In-memory fallback
  const session = memorySessions.get(sessionId);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    memorySessions.delete(sessionId);
    return null;
  }

  return { email: session.email };
}

export async function deleteSession(sessionId: string): Promise<void> {
  const isUp = redisAvailable ?? (await pingRedis());

  if (isUp && redis) {
    try {
      await redis.del(`${SESSION_PREFIX}${sessionId}`);
    } catch {
      redisAvailable = false;
      lastRedisFailureAt = Date.now();
    }
  }

  memorySessions.delete(sessionId);
}
