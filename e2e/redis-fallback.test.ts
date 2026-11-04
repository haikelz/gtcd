import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { testRedisUrl } from "./test-redis";

test("Redis calls skip PING while healthy, unconfirmed logouts report failure, and the memory fallback is bounded", async () => {
  const previous = process.env.REDIS_URL;
  const servers: ViteDevServer[] = [];
  const key = `kv-fallback:${randomUUID()}`;
  const confirmed = randomUUID();
  const unconfirmed = randomUUID();

  // Each server reads REDIS_URL when its first Redis call connects.
  async function modulesFor(redisUrl: string) {
    process.env.REDIS_URL = redisUrl;
    const server = await createServer({ server: { middlewareMode: true } });
    servers.push(server);
    const sessions = await server.ssrLoadModule(
      "/src/lib/server/auth/session-store.ts"
    );
    await sessions.pingRedis();
    return {
      kv: await server.ssrLoadModule("/src/lib/server/kv.ts"),
      sessions,
    };
  }

  try {
    const online = await modulesFor(testRedisUrl());
    const offline = await modulesFor("redis://127.0.0.1:1");

    // A ready connection that answered once is trusted without a PING.
    const redis = online.sessions.getRedis();
    const ping = redis.ping.bind(redis);
    let pings = 0;
    redis.ping = (...args: unknown[]) => {
      pings++;
      return ping(...args);
    };
    for (let i = 0; i < 5; i++) await online.kv.setJson(key, { i }, 60);
    expect(await online.kv.getJson(key)).toEqual({ i: 4 });
    expect(pings).toBe(0);

    await online.sessions.createSession(confirmed, "kv@example.invalid");
    expect(await online.sessions.deleteSession(confirmed)).toBe(true);
    expect(await online.sessions.getSession(confirmed)).toBeNull();

    // Without Redis the delete is unconfirmed, and the Redis copy survives.
    await online.sessions.createSession(unconfirmed, "kv@example.invalid");
    expect(await offline.sessions.deleteSession(unconfirmed)).toBe(false);
    expect(await online.sessions.getSession(unconfirmed)).toEqual({
      email: "kv@example.invalid",
    });
    expect(await online.sessions.deleteSession(unconfirmed)).toBe(true);

    // During the cooldown, checks fail at once instead of waiting on a probe.
    const started = performance.now();
    for (let i = 0; i < 20; i++) {
      expect(await offline.sessions.pingRedis()).toBe(false);
    }
    expect(performance.now() - started).toBeLessThan(200);

    // An outage cannot grow the memory fallback without bound.
    for (let i = 0; i < 1_200; i++) await offline.kv.setJson(`k${i}`, i);
    expect(await offline.kv.getJson("k0")).toBeUndefined();
    expect(await offline.kv.getJson("k1199")).toBe(1199);
  } finally {
    for (const server of servers) {
      const sessions = await server.ssrLoadModule(
        "/src/lib/server/auth/session-store.ts"
      );
      if (sessions.getRedis().status === "ready") {
        await sessions.getRedis().del(key);
      }
      sessions.getRedis().disconnect();
      await server.close();
    }
    if (previous === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = previous;
  }
});
