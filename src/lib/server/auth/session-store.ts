import { building } from "$app/environment";
import Redis from "ioredis";

let redis: Redis | null = null;
let redisAvailable: boolean | null = null;

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
    connectTimeout: 1000,
    enableOfflineQueue: false,
    retryStrategy: () => null,
  });

  client.on("error", () => {
    redisAvailable = false;
    try {
      client.disconnect(false);
    } catch {}
  });

  redis = client;
  return redis;
}

export async function pingRedis(): Promise<boolean> {
  if (redisAvailable === false) return false;

  try {
    const client = getRedis();
    const result = await client.ping();
    redisAvailable = result === "PONG";
    return redisAvailable;
  } catch {
    redisAvailable = false;
    try {
      redis?.disconnect(false);
    } catch {}
    return false;
  }
}

export async function createSession(
  sessionId: string,
  email: string
): Promise<void> {
  const isUp = redisAvailable ?? (await pingRedis());

  if (isUp && redis) {
    try {
      const data = JSON.stringify({ email });
      await redis.setex(
        `${SESSION_PREFIX}${sessionId}`,
        SESSION_MAX_AGE_SEC,
        data
      );
      return;
    } catch {
      redisAvailable = false;
      try {
        redis.disconnect(false);
      } catch {}
    }
  }

  // In-memory fallback
  memorySessions.set(sessionId, {
    email,
    expiresAt: Date.now() + SESSION_MAX_AGE_SEC * 1000,
  });
}

export async function getSession(
  sessionId: string
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
      try {
        redis.disconnect(false);
      } catch {}
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
      try {
        redis.disconnect(false);
      } catch {}
    }
  }

  memorySessions.delete(sessionId);
}
