import { expect, test, type Page } from "@playwright/test";

// Runs in its own suite run, as gtcd caches /me for 30 seconds:
// MOCK_ME_SETTINGS='{"timezone":"ID.Asia/Jakarta","sunday_starts_week":true}'
// pnpm exec playwright test timezone.test.ts. Other runs skip it.
const PASSWORD = "correct-horse";
const MOCK = `http://127.0.0.1:${process.env.TEST_MOCK_PORT ?? 5187}`;
const DAY_MS = 86_400_000;

type LoggedRequest = { readonly path: string; readonly query: string };

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("qa@example.com");
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function upstreamRequests(page: Page): Promise<LoggedRequest[]> {
  return (await page.request.get(`${MOCK}/__requests`)).json();
}

test("a 7-day overview in Jakarta asks GoatCounter for every local day in UTC", async ({
  page,
}) => {
  const me = await (await page.request.get(`${MOCK}/api/v0/me`)).json();
  test.skip(
    me.user.settings.timezone !== "ID.Asia/Jakarta",
    "Needs MOCK_ME_SETTINGS with the Asia/Jakarta timezone."
  );
  await signIn(page);

  const before = (await upstreamRequests(page)).length;
  await page.goto("/dashboard?site=1&range=7d");
  await expect(page.getByRole("region", { name: "Key metrics" })).toContainText(
    /2.080/
  );
  const totals = (await upstreamRequests(page))
    .slice(before)
    .filter((request) => request.path === "/api/v0/stats/total")
    .map((request) => new URLSearchParams(request.query));

  // GoatCounter drops an offset, so local midnight (UTC+7) must arrive as
  // 17:00 UTC the day before, and the period end as 16:59:59 UTC.
  expect(totals.length).toBeGreaterThan(0);
  for (const query of totals) {
    expect(query.get("start")).toMatch(/T17:00:00Z$/);
    expect(query.get("end")).toMatch(/T16:59:59Z$/);
  }
  const [current] = totals;
  expect(
    Date.parse(current.get("end") ?? "") -
      Date.parse(current.get("start") ?? "")
  ).toBe(8 * DAY_MS - 1000);
});

test("the heatmap starts its week on Sunday when GoatCounter does", async ({
  page,
}) => {
  const me = await (await page.request.get(`${MOCK}/api/v0/me`)).json();
  test.skip(
    me.user.settings.sunday_starts_week !== true,
    "Needs MOCK_ME_SETTINGS with sunday_starts_week."
  );
  await signIn(page);

  // The mock answers every period with 3–9 Oct 2026.
  await page.goto("/dashboard?site=1&start=2026-10-03&end=2026-10-09");
  const widget = page.getByRole("region", { name: "Busiest hours" });
  const table = widget.getByRole("table", {
    name: "Average visits by weekday and hour",
  });
  await expect(table.getByRole("rowheader").first()).toHaveText("Sunday");
  await expect(table.getByRole("rowheader").last()).toHaveText("Saturday");
  // Every weekday peaks at 21 visits, so the first row's peak wins.
  await expect(
    widget.getByRole("img", { name: "Busiest hours heatmap" })
  ).toHaveAccessibleDescription(/The busiest hour is Sunday at 17:00\./);
});
