import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer as createNetServer, type AddressInfo } from "node:net";
import { expect, request, test, type Page } from "@playwright/test";
import Redis from "ioredis";
import { createServer } from "vite";
import { testRedisUrl } from "./test-redis";

const PASSWORD = "correct-horse";
const MOCK_URL = `http://127.0.0.1:${process.env.TEST_MOCK_PORT ?? 5187}`;

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

function actionHeaders(page: Page) {
  return {
    accept: "application/json",
    origin: new URL(page.url()).origin,
    "x-sveltekit-action": "true",
  };
}

async function auditEntries(redis: Redis, actor: string, since: number) {
  return (await redis.zrangebyscore("audit-log", since, "+inf"))
    .map((member) => JSON.parse(member))
    .filter((entry) => entry.actor === actor);
}

async function freePort(): Promise<number> {
  const server = createNetServer().listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;
  server.close();
  await once(server, "close");
  return port;
}

test("bodies over 512 KiB are refused except a signed-in native import", async () => {
  test.setTimeout(60_000);
  // Its own server: the shared one keeps adapter-node's 512K default, which
  // would refuse these bodies before gtcd's own limit is reached.
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const app = spawn(process.execPath, ["build"], {
    env: {
      ...process.env,
      BODY_SIZE_LIMIT: "10M",
      GOATCOUNTER_ADMIN_URL: MOCK_URL,
      GOATCOUNTER_API_KEY: "e2e",
      GOATCOUNTER_URL: MOCK_URL,
      GTCD_ADMIN_EMAILS: "qa@example.com",
      ORIGIN: origin,
      PORT: String(port),
      REDIS_URL: testRedisUrl(),
    },
    stdio: "ignore",
  });
  const api = await request.newContext({ baseURL: origin });
  const form = { "content-type": "application/x-www-form-urlencoded", origin };
  const large = Buffer.alloc(600 * 1024, "a");
  try {
    await expect
      .poll(() =>
        fetch(`${origin}/login`)
          .then((response) => response.status)
          .catch(() => 0)
      )
      .toBe(200);

    expect(
      (await api.post("/login?/login", { data: large, headers: form })).status()
    ).toBe(413);
    expect(
      (
        await api.post("/dashboard/admin/imports", {
          data: large,
          headers: form,
        })
      ).status()
    ).toBe(413);
    const chunked = await fetch(`${origin}/login?/login`, {
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("email=a&password=b"));
          controller.close();
        },
      }),
      duplex: "half",
      headers: form,
      method: "POST",
    });
    expect(chunked.status).toBe(413);

    const signedIn = await api.post("/login?/login", {
      form: { email: "qa@example.com", password: PASSWORD },
      headers: { origin },
    });
    expect(await signedIn.json()).toMatchObject({
      location: "/dashboard",
      type: "redirect",
    });
    expect(
      (
        await api.post("/dashboard/customize?/saveDisplay", {
          data: large,
          headers: form,
        })
      ).status()
    ).toBe(413);

    // qa@example.com has no GoatCounter session, so the action parses the
    // upload and then asks for a new sign-in.
    const imported = await api.post("/dashboard/admin/imports", {
      headers: {
        accept: "application/json",
        origin,
        "x-sveltekit-action": "true",
      },
      multipart: {
        csv: {
          buffer: Buffer.alloc(1024 * 1024, "a"),
          mimeType: "text/csv",
          name: "hits.csv",
        },
      },
    });
    expect(imported.status()).not.toBe(413);
    expect(await imported.json()).toMatchObject({
      status: 401,
      type: "failure",
    });
  } finally {
    await api.dispose();
    app.kill("SIGKILL");
    await once(app, "exit");
  }
});

test("the retired stats API route is gone", async ({ page }) => {
  await signIn(page, `stats-api-${randomUUID()}@example.invalid`);

  expect((await page.request.get("/api/stats/browsers/1")).status()).toBe(404);
});

test("a Redis outage is logged once, not once per failed request", async () => {
  const vite = await createServer({ server: { middlewareMode: true } });
  const original = console.error;
  const logged: unknown[][] = [];
  try {
    const hooks = await vite.ssrLoadModule("/src/hooks.server.ts");
    const durable = await vite.ssrLoadModule(
      "/src/lib/server/durable-state.ts"
    );
    const sessions = await vite.ssrLoadModule(
      "/src/lib/server/auth/session-store.ts"
    );
    const event = { route: { id: "/dashboard" }, url: new URL("http://x/") };
    console.error = (...args: unknown[]) => logged.push(args);

    sessions.reportRedisFailure(new Error("connection refused"));
    sessions.reportRedisFailure(new Error("connection refused"));
    for (const error of [
      new durable.DurableStateUnavailable(),
      new durable.DurableStateUnavailable(),
      new Error("boom"),
    ]) {
      hooks.handleError({ error, event, message: "", status: 500 });
    }
  } finally {
    console.error = original;
    await vite.close();
  }

  expect(logged.map((args) => String(args[0]))).toEqual([
    "redis unavailable:",
    "unexpected error on /dashboard:",
  ]);
});
