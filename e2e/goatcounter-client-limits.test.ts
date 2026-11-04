import { createServer as createHttpServer } from "node:http";
import { expect, test } from "@playwright/test";
import { createServer } from "vite";

test("GoatCounter writes are not replayed, a 429 pauses every request, and a hung upstream fails within the budget", async () => {
  test.setTimeout(60_000);
  const keys = [
    "GOATCOUNTER_URL",
    "GOATCOUNTER_API_KEY",
    "GOATCOUNTER_VHOST",
    "REDIS_URL",
  ] as const;
  const previous = keys.map((key) => process.env[key]);
  const arrivals = new Map<string, number[]>();
  const upstream = createHttpServer((req, res) => {
    const path = req.url ?? "/";
    const times = [...(arrivals.get(path) ?? []), Date.now()];
    arrivals.set(path, times);
    if (path === "/hang") return;

    res.setHeader("Content-Type", "application/json");
    if (path === "/write-unavailable") res.statusCode = 503;
    if (path === "/write-limited" && times.length === 1) {
      res.statusCode = 429;
      res.setHeader("Retry-After", new Date(Date.now() + 3_000).toUTCString());
    }
    if (path === "/write-long-limit") {
      res.statusCode = 429;
      res.setHeader("Retry-After", "3600");
    }
    res.end(
      JSON.stringify(
        res.statusCode === 200 ? { count: times.length } : { error: "Denied" }
      )
    );
  });
  await new Promise<void>((resolve) =>
    upstream.listen(0, "127.0.0.1", resolve)
  );
  const address = upstream.address();
  if (!address || typeof address === "string")
    throw new Error("Missing test port");
  process.env.GOATCOUNTER_URL = `http://127.0.0.1:${address.port}`;
  process.env.GOATCOUNTER_API_KEY = "test-only";
  process.env.GOATCOUNTER_VHOST = "stats.example.invalid";
  // No shared cache: every read reaches the upstream.
  process.env.REDIS_URL = "redis://127.0.0.1:1";
  const server = await createServer({ server: { middlewareMode: true } });
  try {
    const client = await server.ssrLoadModule(
      "/src/lib/server/goatcounter/client.ts"
    );

    // A failed write may already have run upstream, so it is sent once.
    await expect(
      client.gcFetch("/write-unavailable", { method: "POST" })
    ).rejects.toThrow("Denied");
    expect(arrivals.get("/write-unavailable")).toHaveLength(1);

    // A 429 with an HTTP-date Retry-After holds the retry and other requests.
    const write = client.gcFetch("/write-limited", { method: "POST" });
    await expect
      .poll(() => arrivals.get("/write-limited")?.length ?? 0)
      .toBe(1);
    const read = client.gcFetch("/after-limit");
    expect(await write).toEqual({ count: 2 });
    expect(await read).toEqual({ count: 1 });
    const [limitedAt = 0, retriedAt = 0] = arrivals.get("/write-limited") ?? [];
    const [readAt = 0] = arrivals.get("/after-limit") ?? [];
    expect(retriedAt - limitedAt).toBeGreaterThanOrEqual(1_500);
    expect(readAt - limitedAt).toBeGreaterThanOrEqual(1_500);

    // A request that times out is not retried.
    const started = Date.now();
    await expect(client.gcFetch("/hang")).rejects.toThrow();
    expect(arrivals.get("/hang")).toHaveLength(1);
    expect(Date.now() - started).toBeLessThan(20_000);

    // A pause longer than the budget fails now instead of holding the page.
    const limitedFor = Date.now();
    await expect(
      client.gcFetch("/write-long-limit", { method: "POST" })
    ).rejects.toThrow("Retry budget exhausted");
    await expect(client.gcFetch("/after-long-limit")).rejects.toThrow(
      "Retry later"
    );
    expect(Date.now() - limitedFor).toBeLessThan(2_000);
    expect(arrivals.get("/write-long-limit")).toHaveLength(1);
    expect(arrivals.has("/after-long-limit")).toBe(false);
  } finally {
    const sessions = await server.ssrLoadModule(
      "/src/lib/server/auth/session-store.ts"
    );
    sessions.getRedis().disconnect();
    await server.close();
    upstream.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      upstream.close((error) => (error ? reject(error) : resolve()))
    );
    keys.forEach((key, i) => {
      if (previous[i] === undefined) delete process.env[key];
      else process.env[key] = previous[i];
    });
  }
});
