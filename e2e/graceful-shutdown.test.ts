import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer, type Server } from "node:http";
import { expect, test } from "@playwright/test";
import Redis from "ioredis";
import { testRedisUrl } from "./test-redis";

async function listen(server: Server): Promise<number> {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Missing test port");
  return address.port;
}

async function freePort(): Promise<number> {
  const probe = createServer();
  const port = await listen(probe);
  probe.close();
  return port;
}

test("SIGTERM lets an in-flight streamed page finish, then exits cleanly", async () => {
  test.setTimeout(60_000);
  const sessionId = randomUUID();
  const email = `shutdown-${randomUUID()}@example.invalid`;
  const redis = new Redis(testRedisUrl());
  let terminate = () => {};
  // The overview streams this widget; it answers only after SIGTERM was sent.
  const upstream = createServer(async (req, res) => {
    if (req.url?.startsWith("/api/v0/stats/hits")) {
      terminate();
      await new Promise((resolve) => setTimeout(resolve, 1_500));
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          hits: [
            {
              count: 10,
              event: false,
              max: 10,
              path: "/shutdown-drain-marker",
              path_id: 1,
              stats: [],
              title: "Drain marker",
            },
          ],
          more: false,
          total: 10,
        })
      );
      return;
    }
    const response = await fetch(
      `http://127.0.0.1:${process.env.TEST_MOCK_PORT ?? 5187}${req.url}`,
      { redirect: "manual" }
    );
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  });
  const upstreamPort = await listen(upstream);
  const port = await freePort();
  await redis.set(`session:${sessionId}`, JSON.stringify({ email }), "EX", 600);
  const app = spawn(process.execPath, ["scripts/start.mjs"], {
    env: {
      ...process.env,
      GOATCOUNTER_API_KEY: "e2e",
      GOATCOUNTER_URL: `http://127.0.0.1:${upstreamPort}`,
      ORIGIN: `http://127.0.0.1:${port}`,
      PORT: String(port),
      REDIS_URL: testRedisUrl(),
      SMTP_HOST: "",
    },
    stdio: ["ignore", "ignore", "pipe"],
  });
  let stderr = "";
  app.stderr.on("data", (chunk) => (stderr += chunk));
  const exited = once(app, "exit");
  let signalledAt = 0;
  terminate = () => {
    if (signalledAt) return;
    signalledAt = Date.now();
    app.kill("SIGTERM");
  };
  try {
    await expect
      .poll(async () =>
        fetch(`http://127.0.0.1:${port}/login`)
          .then((r) => r.status)
          .catch(() => 0)
      )
      .toBe(200);

    const response = await fetch(`http://127.0.0.1:${port}/dashboard`, {
      headers: { cookie: `dashboard_session=${sessionId}` },
    });
    const body = await response.text();
    expect(response.status).toBe(200);
    expect(signalledAt).toBeGreaterThan(0);
    expect(body).toContain("shutdown-drain-marker");

    const [code] = await exited;
    expect(code, stderr).toBe(0);
    expect(Date.now() - signalledAt).toBeLessThan(10_000);
  } finally {
    app.kill("SIGKILL");
    upstream.closeAllConnections();
    upstream.close();
    await redis.del(`session:${sessionId}`, `dashboard-layout:${email}`);
    redis.disconnect();
  }
});
