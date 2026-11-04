import { building } from "$app/environment";
import Redis, { ReplyError } from "ioredis";

let redis: Redis | null = null;
// Set by a PONG, cleared by a failed command. A "ready" socket alone does not
// prove Redis answers: a black-holed host keeps the connection open.
let redisConfirmed = false;
let lastRedisFailureAt = 0;
let redisProbe: Promise<boolean> | null = null;

const REDIS_RETRY_COOLDOWN_MS = 5_000;
// No command may hang a request; a timed-out command reports Redis down.
const REDIS_COMMAND_TIMEOUT_MS = 2_000;

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
    commandTimeout: REDIS_COMMAND_TIMEOUT_MS,
    enableOfflineQueue: false,
    // Keep retrying in the background with bounded backoff so a recovered
    // Redis is picked up again instead of being abandoned until process restart.
    retryStrategy: (attempt) =>
      Math.min(1000 * 2 ** Math.min(attempt, 4), 10_000),
  });

  client.on("error", () => {
    // Connection errors are surfaced through command rejections; swallow the
    // event so an unavailable Redis degrades to the in-memory store silently.
  });

  redis = client;
  return redis;
}

/**
 * Record a failed Redis command so later callers fail fast for the cooldown.
 * Error replies (for example OOM under `noeviction`) prove Redis is reachable
 * and fail only that command.
 */
export function reportRedisFailure(cause: unknown): void {
  if (cause instanceof ReplyError) return;

  redisConfirmed = false;
  lastRedisFailureAt = Date.now();
}

async function probeRedis(client: Redis): Promise<boolean> {
  try {
    // lazyConnect + no offline queue: a command before the first connect
    // fails instantly, which would mark Redis down for the cooldown.
    if (client.status === "wait") await client.connect();
    if ((await client.ping()) === "PONG") {
      redisConfirmed = true;
      lastRedisFailureAt = 0;
      return true;
    }
  } catch {
    // Reported below.
  }

  reportRedisFailure(undefined);
  return false;
}

/**
 * Report whether Redis is usable. A ready connection that last answered is
 * trusted without a round trip. After a failure, callers fail fast for the
 * cooldown, which also gives the client's background reconnects room to
 * succeed; then one shared PING probes again. `maxWaitMs` bounds how long a
 * caller waits for that probe. A wait that times out starts the cooldown; a
 * probe that succeeds later clears it.
 */
export async function pingRedis(maxWaitMs = 1_000): Promise<boolean> {
  const client = getRedis();

  // The writable check matches ioredis's own: after disconnect() the status
  // stays "ready" until the socket closes, but commands already fail.
  if (redisConfirmed && client.status === "ready" && client.stream.writable) {
    return true;
  }
  if (Date.now() - lastRedisFailureAt < REDIS_RETRY_COOLDOWN_MS) return false;

  redisProbe ??= probeRedis(client).finally(() => {
    redisProbe = null;
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), maxWaitMs);
  });
  const result = await Promise.race([redisProbe, timeout]);
  clearTimeout(timer);

  // A finished probe has recorded its own result.
  if (result !== "timeout") return result;
  reportRedisFailure(undefined);
  return false;
}

/** Close the shared client on shutdown; QUIT lets pending replies finish. */
export async function closeRedis(): Promise<void> {
  const client = redis;
  if (!client) return;
  if (client.status !== "ready") return client.disconnect();

  await client.quit().catch(() => client.disconnect());
}

export async function createSession(
  sessionId: string,
  email: string
): Promise<void> {
  if (await pingRedis()) {
    try {
      const data = JSON.stringify({ email });
      await getRedis().setex(
        `${SESSION_PREFIX}${sessionId}`,
        SESSION_MAX_AGE_SEC,
        data
      );
      return;
    } catch (cause) {
      reportRedisFailure(cause);
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
  if (await pingRedis()) {
    try {
      const data = await getRedis().get(`${SESSION_PREFIX}${sessionId}`);
      if (data) {
        return JSON.parse(data) as { email: string };
      }
      // Not in Redis: the session may have been created in memory while Redis
      // was still connecting or down, so check the fallback before failing.
    } catch (cause) {
      reportRedisFailure(cause);
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

/**
 * Delete a session from memory and Redis. Returns false when the Redis delete
 * could not be confirmed: the Redis copy may still authenticate once Redis
 * recovers, so callers must not report a completed logout.
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  memorySessions.delete(sessionId);

  if (!(await pingRedis())) return false;
  try {
    await getRedis().del(`${SESSION_PREFIX}${sessionId}`);
    return true;
  } catch (cause) {
    reportRedisFailure(cause);
    return false;
  }
}
