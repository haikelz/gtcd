import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import Redis from "ioredis";
import { createServer } from "vite";
import { testRedisUrl } from "./test-redis";

const PASSWORD = "correct-horse";
const DAY_MS = 86_400_000;

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("admin actions appear in the audit log, newest first", async ({
  page,
}) => {
  const label = `Audit ${randomUUID().slice(0, 8)}`;
  await signIn(page, "qa@example.com");
  await page.goto("/dashboard/settings?site=2");
  const audience = page.locator('[aria-labelledby="audience-heading"]');
  await audience.getByLabel("Audience name").fill(label);
  await audience
    .getByRole("button", { name: "Create audience link", exact: true })
    .click();
  const link = audience.locator(`div[aria-label="${label}"]`);
  await expect(link).toBeVisible();
  await link
    .getByRole("button", { name: "Revoke audience link", exact: true })
    .click();
  await expect(link).toHaveCount(0);

  await page.getByRole("link", { name: "Audit log" }).click();
  await expect(page).toHaveURL(/\/dashboard\/audit/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Audit log");
  const created = page.getByRole("row").filter({ hasText: label });
  await expect(created).toHaveCount(1);
  await expect(created).toContainText("qa@example.com");
  await expect(created).toContainText("Created share link");
  await expect(created).toContainText("journal.example");
  await expect(created).toContainText("Succeeded");
  await expect(
    page.getByRole("columnheader", { name: "Time (UTC)" })
  ).toBeVisible();

  // The revocation came later, so it is listed above the creation.
  const rows = page.getByRole("row");
  const texts = await rows.allTextContents();
  const createdAt = texts.findIndex((text) => text.includes(label));
  const revokedAt = texts.findIndex(
    (text, index) =>
      index < createdAt &&
      text.includes("Revoked share link") &&
      text.includes("journal.example")
  );
  expect(revokedAt).toBeGreaterThan(0);
});

test("non-admins cannot open the audit log or notification channels", async ({
  page,
}) => {
  await signIn(page, `viewer-${randomUUID()}@example.invalid`);
  await expect(page.getByRole("link", { name: "Audit log" })).toHaveCount(0);
  for (const path of [
    "/dashboard/audit",
    "/dashboard/settings/notifications",
  ]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(403);
    await expect(
      page.getByText("Administrator access is required.")
    ).toBeVisible();
  }
  const response = await page.request.post(
    "/dashboard/settings/notifications?/add",
    {
      form: {
        alerts: "on",
        direction: "either",
        label: "Viewer",
        minimum: "100",
        threshold: "50",
        type: "webhook",
        url: "https://example.com/hook",
      },
      headers: {
        accept: "application/json",
        origin: new URL(page.url()).origin,
        "x-sveltekit-action": "true",
      },
    }
  );
  expect(response.status()).toBe(403);
  expect(await response.json()).toMatchObject({ type: "error" });
});

test("audit recording is bounded and never fails the action when Redis is down", async () => {
  test.setTimeout(60_000);
  const previous = process.env.REDIS_URL;
  const actor = `bounds-${randomUUID()}@example.invalid`;
  const originalNow = Date.now;
  const base = originalNow() - 89 * DAY_MS;
  const redis = new Redis(testRedisUrl());

  // Each server connects on first use, with REDIS_URL as set at that time.
  const down = await createServer({ server: { middlewareMode: true } });
  const up = await createServer({ server: { middlewareMode: true } });
  try {
    process.env.REDIS_URL = "redis://127.0.0.1:1";
    const unavailable = await down.ssrLoadModule(
      "/src/lib/server/audit-log.ts"
    );
    await expect(
      unavailable.recordAudit({
        action: "site.update",
        actor,
        outcome: "success",
        site: 1,
        target: "outage",
      })
    ).resolves.toBeUndefined();
    await expect(unavailable.readAudit(0, 10)).rejects.toThrow(
      "Storage is unavailable"
    );

    process.env.REDIS_URL = testRedisUrl();
    const audit = await up.ssrLoadModule("/src/lib/server/audit-log.ts");
    Date.now = () => originalNow() - 91 * DAY_MS;
    await audit.recordAudit({
      action: "test.expired",
      actor,
      outcome: "success",
      site: null,
      target: "expired",
    });
    // Synthetic entries sit 89 days back, below anything parallel tests add.
    for (let index = 0; index < 2_005; index++) {
      Date.now = () => base + index;
      await audit.recordAudit({
        action: "test.bounds",
        actor,
        outcome: "failure",
        site: null,
        target: `entry ${index}\nwith a newline`,
      });
    }
    Date.now = originalNow;
    await audit.recordAudit({
      action: "Not An Action",
      actor: actor.toUpperCase(),
      outcome: "success",
      site: 1,
      target: "fresh",
    });

    expect(await redis.zcard("audit-log")).toBeLessThanOrEqual(2_000);
    expect(
      await redis.zcount("audit-log", "-inf", originalNow() - 90 * DAY_MS)
    ).toBe(0);
    const kept = await redis.zrangebyscore("audit-log", base, base + 2_005);
    expect(kept.length).toBeGreaterThan(1_900);
    const oldest = JSON.parse(kept[0]);
    expect(oldest.target).toMatch(/^entry \d+ with a newline$/);
    expect(Number(oldest.target.split(" ")[1])).toBeGreaterThanOrEqual(5);

    const { entries, total } = await audit.readAudit(0, 50);
    expect(total).toBeLessThanOrEqual(2_000);
    expect(entries).toHaveLength(50);
    const times = entries.map((entry: { at: string }) => Date.parse(entry.at));
    expect([...times].sort((a, b) => b - a)).toEqual(times);
    const fresh = entries.find(
      (entry: { target: string }) => entry.target === "fresh"
    );
    expect(fresh).toMatchObject({ action: "unknown", actor, site: 1 });
  } finally {
    Date.now = originalNow;
    await redis.zremrangebyscore("audit-log", "-inf", base + 2_005);
    await redis.quit();
    for (const server of [down, up]) {
      const sessions = await server.ssrLoadModule(
        "/src/lib/server/auth/session-store.ts"
      );
      sessions.getRedis().disconnect();
      await server.close();
    }
    if (previous === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = previous;
  }
});
