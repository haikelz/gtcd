import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import { expect, test } from "@playwright/test";
import Redis from "ioredis";
import { createServer } from "vite";

test("diagnostics guards anonymous and non-admin loads before reading scheduler state", async () => {
  const previousAdmin = process.env.GTCD_ADMIN_EMAILS;
  const previousRedis = process.env.REDIS_URL;
  process.env.GTCD_ADMIN_EMAILS = "diagnostics-admin@example.invalid";
  process.env.REDIS_URL =
    process.env.TEST_REDIS_URL ?? "redis://127.0.0.1:6379";
  const server = await createServer({ server: { middlewareMode: true } });
  try {
    const route = await server.ssrLoadModule(
      "/src/routes/dashboard/diagnostics/+page.server.ts"
    );
    for (const user of [null, { email: "viewer@example.invalid" }]) {
      expect(() => route.load({ locals: { user }, setHeaders() {} })).toThrow(
        expect.objectContaining({ status: 403 })
      );
    }
    const headers: Record<string, string> = {};
    const result = route.load({
      locals: { user: { email: "diagnostics-admin@example.invalid" } },
      setHeaders(value: Record<string, string>) {
        Object.assign(headers, value);
      },
    });
    expect(headers["cache-control"]).toBe("no-store");
    expect(await result.redis).toMatchObject({ status: "up" });
    const scheduler = await result.scheduler;
    expect(scheduler.unavailable).toBe(false);
    expect(Object.keys(scheduler.diagnostics).sort()).toEqual([
      "failed",
      "lastRunAt",
      "lastSuccessAt",
      "pending",
    ]);
    expect(result.client.counters).toHaveProperty("upstreamAttempts");
    const sessions = await server.ssrLoadModule(
      "/src/lib/server/auth/session-store.ts"
    );
    sessions.getRedis().disconnect();
    const unavailable = route.load({
      locals: { user: { email: "diagnostics-admin@example.invalid" } },
      setHeaders() {},
    });
    expect(await unavailable.scheduler).toEqual({
      diagnostics: null,
      unavailable: true,
    });
    expect(unavailable.client.counters).toHaveProperty("memoryHits");
  } finally {
    await server.close();
    if (previousAdmin === undefined) delete process.env.GTCD_ADMIN_EMAILS;
    else process.env.GTCD_ADMIN_EMAILS = previousAdmin;
    if (previousRedis === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = previousRedis;
  }
});

test("client observations count memory/shared hits, deduplication, misses and 429 retries without request data", async () => {
  const names = [
    "REDIS_URL",
    "GOATCOUNTER_URL",
    "GOATCOUNTER_API_KEY",
    "GOATCOUNTER_VHOST",
  ] as const;
  const previous = names.map((name) => process.env[name]);
  const isolatedRedis = new Redis(
    process.env.TEST_REDIS_URL ?? "redis://127.0.0.1:6379"
  );
  let attempts = 0;
  let finishProbe: (() => void) | undefined;
  const upstream = createHttpServer((request, response) => {
    if (request.url === "/api/v0/me") {
      finishProbe = () => {
        finishProbe = undefined;
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify({ ok: true }));
      };
      return;
    }
    attempts++;
    response.setHeader("Content-Type", "application/json");
    if (attempts === 1) response.statusCode = 429;
    response.end(
      JSON.stringify(attempts === 1 ? { error: "Limited" } : { ok: true })
    );
  });
  await new Promise<void>((resolve) =>
    upstream.listen(0, "127.0.0.1", resolve)
  );
  const address = upstream.address();
  if (!address || typeof address === "string")
    throw new Error("Missing test port");
  process.env.REDIS_URL =
    process.env.TEST_REDIS_URL ?? "redis://127.0.0.1:6379";
  process.env.GOATCOUNTER_URL = `http://127.0.0.1:${address.port}`;
  process.env.GOATCOUNTER_API_KEY = "diagnostics-test-token";
  process.env.GOATCOUNTER_VHOST = "stats.example.invalid";
  const path = `/diagnostics-${randomUUID()}`;
  const sharedKey = `gc-cache:stats.example.invalid::${process.env.GOATCOUNTER_URL}${path}`;
  const first = await createServer({ server: { middlewareMode: true } });
  const second = await createServer({ server: { middlewareMode: true } });
  try {
    const a = await first.ssrLoadModule(
      "/src/lib/server/goatcounter/client.ts"
    );
    const b = await second.ssrLoadModule(
      "/src/lib/server/goatcounter/client.ts"
    );
    expect(a.getUpstreamObservation()).toEqual({
      status: "unknown",
      observedAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
    });
    await Promise.all([a.gcFetch(path), a.gcFetch(path)]);
    await a.gcFetch(path);
    await b.gcFetch(path);
    expect(a.getClientDiagnostics().counters).toEqual({
      memoryHits: 1,
      sharedHits: 0,
      misses: 1,
      inflightDeduplications: 1,
      upstreamAttempts: 2,
      rateLimited: 1,
      backoffs: 1,
      retries: 1,
    });
    expect(b.getClientDiagnostics().counters).toMatchObject({
      sharedHits: 1,
      upstreamAttempts: 0,
    });
    expect(a.getUpstreamObservation()).toMatchObject({
      status: "up",
      lastSuccessAt: expect.any(Number),
      lastFailureAt: expect.any(Number),
    });
    expect(JSON.stringify(a.getClientDiagnostics())).not.toContain(path);
    expect(JSON.stringify(a.getClientDiagnostics())).not.toContain(
      "diagnostics-test-token"
    );
    const health = await second.ssrLoadModule(
      "/src/routes/api/health/+server.ts"
    );
    const started = performance.now();
    const response = await health.GET();
    expect(performance.now() - started).toBeLessThan(1500);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("unknown");
    expect(body.goatcounter).toBe("unknown");
    expect(body).not.toHaveProperty("scheduler");
    expect(body.dependencies.redis).toHaveProperty("observedAt");
    await expect.poll(() => Boolean(finishProbe)).toBe(true);
    finishProbe?.();
    await expect.poll(() => b.getUpstreamStatus()).toBe("up");
  } finally {
    finishProbe?.();
    await isolatedRedis.del(sharedKey);
    isolatedRedis.disconnect();
    for (const server of [first, second]) {
      const sessions = await server.ssrLoadModule(
        "/src/lib/server/auth/session-store.ts"
      );
      sessions.getRedis().disconnect();
      await server.close();
    }
    await new Promise<void>((resolve, reject) =>
      upstream.close((error) => (error ? reject(error) : resolve()))
    );
    names.forEach((name, index) => {
      const value = previous[index];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    });
  }
});

test("admin diagnostics renders translated operational sections and refreshes", async ({
  page,
  request,
  browser,
}) => {
  const anonymous = await request.get("/dashboard/diagnostics", {
    maxRedirects: 0,
  });
  expect(anonymous.status()).toBe(302);
  expect(anonymous.headers().location).toBe("/login");
  const password = readFileSync("e2e/mock-goatcounter.mjs", "utf8").match(
    /const PASSWORD = ("[^"]+");/
  );
  if (!password) throw new Error("Missing mock password");
  await page.goto("/login");
  await page.getByLabel("Email").fill("qa@example.com");
  await page
    .getByLabel("Password", { exact: true })
    .fill(JSON.parse(password[1]));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/dashboard/diagnostics");
  await expect(
    page.getByRole("heading", { name: "Diagnostics", exact: true })
  ).toBeVisible();
  await expect(
    page.getByText("Process-local counters since", { exact: false })
  ).toBeVisible();
  await expect(
    page.getByText("Memory cache hits", { exact: true })
  ).toBeVisible();
  await expect(
    page.getByText("Email scheduler", { exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Refresh observations" }).click();
  await expect(
    page.getByRole("button", { name: "Refresh observations" })
  ).toBeEnabled();

  const isolatedRedis = new Redis(
    process.env.TEST_REDIS_URL ?? "redis://127.0.0.1:6379"
  );
  const sessionId = randomUUID();
  const viewer = await browser.newContext();
  try {
    await isolatedRedis.set(
      `session:${sessionId}`,
      JSON.stringify({ email: "diagnostics-viewer@example.invalid" }),
      "EX",
      60
    );
    await viewer.addCookies([
      {
        name: "dashboard_session",
        value: sessionId,
        domain: new URL(page.url()).hostname,
        path: "/",
        secure: false,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    const viewerPage = await viewer.newPage();
    await viewerPage.goto(new URL("/dashboard", page.url()).href);
    await expect(
      viewerPage.getByRole("heading", { name: "Traffic overview", exact: true })
    ).toBeVisible();
    await expect(
      viewerPage.getByRole("link", { name: "Diagnostics", exact: true })
    ).toHaveCount(0);
    const denied = await viewer.request.get(
      new URL("/dashboard/diagnostics", page.url()).href
    );
    expect(denied.status()).toBe(403);
    expect(await denied.text()).not.toContain("Memory cache hits");
  } finally {
    await isolatedRedis.del(`session:${sessionId}`);
    isolatedRedis.disconnect();
    await viewer.close();
  }
});
