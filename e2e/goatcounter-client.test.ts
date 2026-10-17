import { createServer as createHttpServer } from "node:http";
import { expect, test } from "@playwright/test";
import { createServer } from "vite";

test("GoatCounter shares reads, bounds health probes, and retries only transient errors", async () => {
  const keys = [
    "GOATCOUNTER_URL",
    "GOATCOUNTER_API_KEY",
    "GOATCOUNTER_VHOST",
    "REDIS_URL",
  ] as const;
  const previous = keys.map((key) => process.env[key]);
  const originalNow = Date.now;
  let clockOffset = 0;
  let healthFails = false;
  const requests = new Map<string, number>();
  const upstream = createHttpServer((req, res) => {
    const path = req.url ?? "/";
    const count = (requests.get(path) ?? 0) + 1;
    requests.set(path, count);
    res.setHeader("Content-Type", "application/json");
    if (path === "/forbidden") res.statusCode = 403;
    if (path === "/api/v0/me" && healthFails) res.statusCode = 403;
    if (["/400", "/401", "/404"].includes(path))
      res.statusCode = Number(path.slice(1));
    if (path === "/timeout" && count === 1) res.statusCode = 408;
    if (path === "/unavailable" && count === 1) res.statusCode = 503;
    if (path === "/limited" && count === 1) {
      res.statusCode = 429;
      res.setHeader("Retry-After", "1");
    }
    res.end(
      JSON.stringify(res.statusCode === 200 ? { count } : { error: "Denied" })
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
  process.env.REDIS_URL = "redis://127.0.0.1:1";
  const server = await createServer({ server: { middlewareMode: true } });
  try {
    const client = await server.ssrLoadModule(
      "/src/lib/server/goatcounter/client.ts"
    );
    const reads = await Promise.all(
      Array.from({ length: 10 }, () => client.gcFetch("/cached"))
    );
    expect(reads).toEqual(Array.from({ length: 10 }, () => ({ count: 1 })));
    await client.gcFetch("/cached");
    expect(requests.get("/cached")).toBe(1);

    for (let i = 0; i < 10; i++) client.refreshUpstreamStatus();
    await expect.poll(() => requests.get("/api/v0/me")).toBeGreaterThan(0);
    // A second batch after the first response must also respect the cooldown.
    await new Promise((resolve) => setTimeout(resolve, 350));
    for (let i = 0; i < 10; i++) client.refreshUpstreamStatus();
    await new Promise((resolve) => setTimeout(resolve, 600));
    // Wait for all baseline requests too, so the local upstream closes cleanly.
    await new Promise((resolve) => setTimeout(resolve, 5_500));
    const healthRequests = requests.get("/api/v0/me");

    const started = performance.now();
    await expect(client.gcFetch("/forbidden")).rejects.toThrow("Denied");
    const forbiddenMs = Math.round(performance.now() - started);
    console.log(
      JSON.stringify({
        healthRequests,
        forbiddenRequests: requests.get("/forbidden"),
        forbiddenMs,
      })
    );
    expect.soft(healthRequests).toBe(1);
    expect.soft(requests.get("/forbidden")).toBe(1);

    for (const status of [400, 401, 404]) {
      await expect(client.gcFetch(`/${status}`)).rejects.toThrow("Denied");
      expect(requests.get(`/${status}`)).toBe(1);
    }
    expect(await client.gcFetch("/timeout")).toEqual({ count: 2 });
    expect(await client.gcFetch("/unavailable")).toEqual({ count: 2 });
    expect(await client.gcFetch("/limited")).toEqual({ count: 2 });
    expect(client.getUpstreamStatus()).toBe("up");

    // Advancing the clock exercises expiry/recovery without a minute-long test.
    Date.now = () => originalNow() + clockOffset;
    clockOffset = 61_000;
    healthFails = true;
    client.refreshUpstreamStatus();
    await expect.poll(() => client.getUpstreamStatus()).toBe("down");
    for (let i = 0; i < 10; i++) client.refreshUpstreamStatus();
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(requests.get("/api/v0/me")).toBe(2);

    clockOffset = 122_000;
    healthFails = false;
    client.refreshUpstreamStatus();
    await expect.poll(() => client.getUpstreamStatus()).toBe("up");
    expect(requests.get("/api/v0/me")).toBe(3);
  } finally {
    Date.now = originalNow;
    await server.close();
    await new Promise<void>((resolve, reject) =>
      upstream.close((error) => (error ? reject(error) : resolve()))
    );
    keys.forEach((key, i) => {
      if (previous[i] === undefined) delete process.env[key];
      else process.env[key] = previous[i];
    });
  }
});
