import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import Redis from "ioredis";
import { createServer } from "vite";
import { testRedisUrl } from "./test-redis";

const PASSWORD = "correct-horse";
const MOCK_URL = `http://127.0.0.1:${process.env.TEST_MOCK_PORT ?? 5187}`;
const REDIS_URL = testRedisUrl();

type LoginSecurity = {
  readonly forwardedFor: string | null;
  readonly prefChecks: number;
  readonly totpAttempts: number;
};

async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/** What the mock GoatCounter saw for this email; see mock-goatcounter.mjs. */
async function upstream(email: string): Promise<LoginSecurity> {
  const response = await fetch(
    `${MOCK_URL}/__login-security?email=${encodeURIComponent(email)}`
  );
  return (await response.json()) as LoginSecurity;
}

test("GoatCounter's login throttle reports unavailability without counting failures", async ({
  page,
}) => {
  const email = `throttled-${randomUUID()}@example.com`;

  // Five recorded failures would lock the sixth attempt out.
  for (let attempt = 0; attempt < 6; attempt++) {
    await signIn(page, email);
    await expect(
      page.getByText("GoatCounter is currently unavailable.", { exact: false })
    ).toBeVisible();
  }
  await expect(page.getByText("Too many sign-in attempts.")).toHaveCount(0);
});

test("login forwards only a valid client address to GoatCounter", async () => {
  const previous = process.env.GOATCOUNTER_URL;
  process.env.GOATCOUNTER_URL = MOCK_URL;
  const vite = await createServer({ server: { middlewareMode: true } });
  const email = `forwarded-${randomUUID()}@example.com`;
  try {
    const auth = await vite.ssrLoadModule(
      "/src/lib/server/goatcounter/auth.ts"
    );

    await auth.authenticateWithGoatCounter(email, "wrong", "203.0.113.7");
    expect((await upstream(email)).forwardedFor).toBe("203.0.113.7");

    await auth.authenticateWithGoatCounter(email, "wrong", "203.0.113.7\r\nX");
    expect((await upstream(email)).forwardedFor).toBeNull();

    await auth.authenticateWithGoatCounter(email, "wrong", null);
    expect((await upstream(email)).forwardedFor).toBeNull();
  } finally {
    await vite.close();
    if (previous === undefined) delete process.env.GOATCOUNTER_URL;
    else process.env.GOATCOUNTER_URL = previous;
  }
});

test("parallel TOTP submissions cannot exceed the attempt cap", async ({
  page,
}) => {
  const email = `race-mfa-${randomUUID()}@example.com`;
  await signIn(page, email);
  await expect(
    page.getByRole("heading", { name: "Two-factor authentication" })
  ).toBeVisible();

  const origin = new URL(page.url()).origin;
  const responses = await Promise.all(
    Array.from({ length: 10 }, () =>
      page.request.post("/login?/totp", {
        form: { code: "000000" },
        headers: { origin, "x-sveltekit-action": "true" },
      })
    )
  );
  const bodies = await Promise.all(
    responses.map((response) => response.text())
  );

  expect((await upstream(email)).totpAttempts).toBeLessThanOrEqual(5);
  expect(
    bodies.filter((body) => body.includes("That code is not valid.")).length
  ).toBeLessThanOrEqual(4);
});

test("a user removed in GoatCounter loses the gtcd session", async ({
  page,
}) => {
  const email = `revoked-${randomUUID()}@native.example`;

  await signIn(page, email);
  // The first request after login asks GoatCounter, which rejects the user.
  await expect
    .poll(async () => (await upstream(email)).prefChecks)
    .toBeGreaterThan(0);
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  expect(
    (await page.context().cookies()).some(
      (cookie) => cookie.name === "dashboard_session"
    )
  ).toBe(false);
});

test("an active account is re-checked at most every five minutes", async ({
  page,
}) => {
  const email = `active-${randomUUID()}@native.example`;

  await signIn(page, email);
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/dashboard/settings");
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/dashboard$/);
  expect((await upstream(email)).prefChecks).toBe(1);
});

test("a GoatCounter outage keeps the gtcd session", async ({ page }) => {
  const email = `outage-${randomUUID()}@native.example`;

  await signIn(page, email);
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/dashboard$/);
  expect((await upstream(email)).prefChecks).toBe(1);
});

test("report owners absent from gtcd for 90 days stop receiving reports", async () => {
  test.setTimeout(60_000);
  // A database of its own: the scheduler walks every subscriber and shares
  // one lease, so other suites' subscribers must not take part.
  const database = new URL(REDIS_URL);
  database.pathname = "/14";
  const settings = {
    GOATCOUNTER_API_KEY: "e2e",
    GOATCOUNTER_URL: MOCK_URL,
    REDIS_URL: database.href,
    SMTP_FROM: "e2e@example.invalid",
    SMTP_HOST: "127.0.0.1",
    // Nothing listens here: an attempted delivery records lastError.
    SMTP_PASSWORD: "",
    SMTP_PORT: "1",
    SMTP_SECURE: "false",
    SMTP_USER: "",
  };
  const previous = Object.fromEntries(
    Object.keys(settings).map((key) => [key, process.env[key]])
  );
  Object.assign(process.env, settings);
  const redis = new Redis(database.href);
  const vite = await createServer({ server: { middlewareMode: true } });
  const recent = `recent-${randomUUID()}@example.invalid`;
  const stale = `stale-${randomUUID()}@example.invalid`;
  const unseen = `unseen-${randomUUID()}@example.invalid`;
  try {
    const reports = await vite.ssrLoadModule(
      "/src/lib/server/email-reports.ts"
    );
    for (const email of [recent, stale, unseen]) {
      await reports.updateSubscription(email, "daily", 1);
    }
    await redis.set(`last-login:${recent}`, JSON.stringify(Date.now()));
    await redis.set(
      `last-login:${stale}`,
      JSON.stringify(Date.now() - 91 * 24 * 60 * 60_000)
    );

    await reports.sendDueReports(new Date("2040-04-03T09:00:00Z"));

    // Delivery was attempted (lastError set) for every owner but the stale one.
    expect((await reports.getSubscription(stale)).lastError).toBeNull();
    expect((await reports.getSubscription(recent)).lastError).not.toBeNull();
    expect((await reports.getSubscription(unseen)).lastError).not.toBeNull();
    expect(Number(await redis.get(`last-login:${unseen}`))).toBeGreaterThan(0);
  } finally {
    const jobs = await vite.ssrLoadModule("/src/lib/server/delivery-jobs.ts");
    const state = await vite.ssrLoadModule("/src/lib/server/durable-state.ts");
    const emails = [recent, stale, unseen];
    await state.updateDurableJson(
      "email-report:subscribers",
      (value: string[] = []) => value.filter((entry) => !emails.includes(entry))
    );
    for (const email of emails) {
      const hash = jobs.deliveryIdentity(email);
      await redis.del(
        `email-report:${email}`,
        `email-report:jobs:${hash}`,
        `email-report:active:summary:${hash}`,
        `last-login:${email}`
      );
    }
    const sessions = await vite.ssrLoadModule(
      "/src/lib/server/auth/session-store.ts"
    );
    sessions.getRedis().disconnect();
    redis.disconnect();
    await vite.close();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
