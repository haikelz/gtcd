import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "correct-horse";

// The PWA worker precaches every chunk; keep it out of the network checks.
test.use({ serviceWorkers: "block" });

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("qa@example.com");
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("a page downloads only the active language catalog", async ({ page }) => {
  const scripts: Promise<string>[] = [];
  page.on("response", (response) => {
    if (response.url().endsWith(".js")) scripts.push(response.text());
  });

  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await page.waitForLoadState("networkidle");

  const sources = await Promise.all(scripts);
  // common.reportLoadFailed in English, common.retry in Indonesian.
  expect(sources.some((source) => source.includes("could not load"))).toBe(
    true
  );
  expect(sources.some((source) => source.includes("Coba lagi"))).toBe(false);
});

// Reports for 2041 make GoatCounter answer 429, which pauses every queued
// upstream request in the server; playwright.config.ts runs these last.
const pausesUpstream = { tag: "@pauses-upstream" };

for (const report of ["browsers", "pages"]) {
  test(
    `a rate-limited ${report} report streams a skeleton, then a translated error with Retry`,
    pausesUpstream,
    async ({ page }) => {
      test.setTimeout(60_000);
      await signIn(page);

      // The streamed response stays open until the report settles, so check the
      // skeleton in the first chunk instead of waiting for the load event.
      await page.goto(`/dashboard/${report}?start=2041-01-01&end=2041-01-07`, {
        waitUntil: "commit",
      });
      await expect(
        page.getByRole("status").filter({ hasText: "Loading report" })
      ).toHaveCount(1);
      await expect(
        page.getByText("GoatCounter is limiting requests right now.", {
          exact: false,
        })
      ).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
      await expect(page.getByText(/Rate limit exceeded|\(429\)/)).toHaveCount(
        0
      );
    }
  );
}

test("referrers merge GoatCounter's per-scheme rows and leave direct visits unlinked", async ({
  page,
}) => {
  await signIn(page);

  await page.goto("/dashboard/referrers");
  const chart = page.getByRole("list", { name: "Breakdown chart" });
  // The mock splits google.com into plain (600) and campaign (380) rows.
  await expect(chart.getByText("google.com", { exact: true })).toHaveCount(1);
  await expect(
    chart.getByRole("button", { name: /^Explore google\.com: 980 visits/ })
  ).toBeVisible();
  // Direct visits come without an id, so there is no detail page to open.
  await expect(chart.getByText("Unknown", { exact: true })).toBeVisible();
  await expect(
    chart.getByRole("button", { name: /^Explore Unknown/ })
  ).toHaveCount(0);
});

test("the paths report streams its list", async ({ page }) => {
  await signIn(page);

  // The list can arrive before a browser check runs, so read the first HTML
  // instead: a streamed page renders its skeleton there.
  const html = await (await page.request.get("/dashboard/paths")).text();
  expect(html).toContain("Loading report");

  await page.goto("/dashboard/paths");
  await expect(
    page.getByRole("list", { name: "Tracked paths" }).getByRole("link").first()
  ).toBeVisible();
});

test("failed overview KPIs offer a Retry", pausesUpstream, async ({ page }) => {
  await signIn(page);

  await page.goto("/dashboard?start=2041-01-01&end=2041-01-07");
  const kpis = page.getByRole("region", { name: "Key metrics" });
  await expect(
    kpis.getByText("GoatCounter is limiting requests right now.", {
      exact: false,
    })
  ).toBeVisible({ timeout: 30_000 });
  await expect(kpis.getByRole("button", { name: "Retry" })).toBeVisible();
});

test("an empty report offers a next step", async ({ page }) => {
  await signIn(page);

  await page.goto("/dashboard/browsers?filter=no-such-path");
  const clear = page.getByRole("link", { name: "Clear filter" });
  await expect(clear).toBeVisible();
  await expect(clear).not.toHaveAttribute("href", /filter=/);
});

test("error toasts stay until dismissed", async ({ page }) => {
  await signIn(page);
  await page.route("**/logout", (route) => route.fulfill({ status: 503 }));

  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  const toast = page.getByRole("alert").filter({
    hasText: "Unable to sign out.",
  });
  await expect(toast).toBeVisible();
  await page.waitForTimeout(6_000);
  await expect(toast).toBeVisible();

  await toast.getByRole("button", { name: "Dismiss notification" }).click();
  await expect(toast).toHaveCount(0);
});

test("other toasts pause while hovered", async ({ page }) => {
  test.setTimeout(45_000);
  await signIn(page);
  await page.goto("/dashboard/settings?site=1");
  // The toast needs the enhanced form, so let the page hydrate first.
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Send test visit" }).click();
  const toast = page.getByText(/^Test visit sent/);
  await toast.hover();
  await page.waitForTimeout(6_000);
  await expect(toast).toBeVisible();

  await page.mouse.move(0, 0);
  await expect(toast).toHaveCount(0, { timeout: 8_000 });
});
