import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { measureDelivery } from "../scripts/check-delivery.mjs";

type BrowserMetrics = { cls: number; longTasks: number; longTaskMs: number };

declare global {
  interface Window {
    __gtcdPerf?: BrowserMetrics;
  }
}

test("authenticated dashboard performance", async ({
  browser,
  page,
  request,
}, testInfo) => {
  const fixture = readFileSync("e2e/mock-goatcounter.mjs", "utf8");
  const password = fixture.match(/const PASSWORD = ("[^"]+");/);
  if (!password) throw new Error("Missing mock login fixture");
  await page.goto("/login");
  await page.getByLabel("Email").fill("performance@example.com");
  await page
    .getByLabel("Password", { exact: true })
    .fill(JSON.parse(password[1]));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("main")).toContainText(/2.080/);
  await page.waitForLoadState("networkidle");

  const context = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    storageState: await page.context().storageState(),
    serviceWorkers: "block",
    viewport: { width: 1440, height: 900 },
  });
  try {
    const report = await context.newPage();
    await report.addInitScript(() => {
      const metrics = { cls: 0, longTasks: 0, longTaskMs: 0 };
      window.__gtcdPerf = metrics;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!("hadRecentInput" in entry) || entry.hadRecentInput) continue;
          if ("value" in entry && typeof entry.value === "number")
            metrics.cls += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          metrics.longTasks++;
          metrics.longTaskMs += entry.duration;
        }
      }).observe({ type: "longtask", buffered: true });
    });
    async function upstreamRequests(): Promise<number> {
      const response = await request.get("http://127.0.0.1:5197/__metrics");
      const counts: Record<string, number> = await response.json();
      return Object.entries(counts)
        .filter(([path]) => path.startsWith("/api/v0/stats/"))
        .reduce((total, [, count]) => total + count, 0);
    }
    const before = await upstreamRequests();
    const start = performance.now();
    const documentResponse = await report.goto(
      "/dashboard?start=2026-09-01&end=2026-09-07"
    );
    await expect(report.getByRole("main")).toContainText(/2.080/);
    await report.waitForLoadState("networkidle");
    const readyMs = Math.round(performance.now() - start);
    const cold = await report.evaluate(() => {
      const navigation = performance.getEntriesByType(
        "navigation"
      )[0] as PerformanceNavigationTiming;
      const resources = performance.getEntriesByType(
        "resource"
      ) as PerformanceResourceTiming[];
      const metrics = window.__gtcdPerf;
      if (!metrics) throw new Error("Performance observers were not installed");
      return {
        ttfbMs: Math.round(navigation.responseStart - navigation.requestStart),
        fcpMs:
          performance.getEntriesByName("first-contentful-paint")[0]
            ?.startTime ?? null,
        scriptBytes: resources
          .filter((entry) => new URL(entry.name).pathname.endsWith(".js"))
          .reduce((total, entry) => total + entry.encodedBodySize, 0),
        scriptRequests: resources.filter((entry) =>
          new URL(entry.name).pathname.endsWith(".js")
        ).length,
        ...metrics,
      };
    });
    const coldUpstream = (await upstreamRequests()) - before;
    const hoverBefore = await upstreamRequests();
    await report.locator('a[href*="/dashboard/browsers"]').first().hover();
    // Hover preloads are delayed; observe a bounded idle window deliberately.
    await report.waitForTimeout(1_000);
    const hoverUpstream = (await upstreamRequests()) - hoverBefore;

    const navigationStart = performance.now();
    await report.locator('a[href*="/dashboard/browsers"]').first().click();
    await expect(report).toHaveURL(/\/dashboard\/browsers/);
    await report.waitForLoadState("networkidle");
    const reportNavigationMs = Math.round(performance.now() - navigationStart);
    const periodStart = performance.now();
    await report.getByLabel("Last month", { exact: true }).click();
    await expect(report).toHaveURL(/range=month/);
    await report.waitForLoadState("networkidle");
    const periodChangeMs = Math.round(performance.now() - periodStart);

    const repeatBefore = await upstreamRequests();
    await report.getByLabel("Last week", { exact: true }).click();
    await report.waitForLoadState("networkidle");
    await report.getByLabel("Last month", { exact: true }).click();
    await report.waitForLoadState("networkidle");
    const repeatUpstream = (await upstreamRequests()) - repeatBefore;

    const cookie = (await context.cookies())
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");
    const delivery = await measureDelivery(
      new URL(
        "/dashboard?start=2026-08-01&end=2026-08-07",
        testInfo.project.use.baseURL
      ).href,
      cookie
    );

    const metrics = {
      environment:
        "local Chromium; cold browser, authenticated fixture; no network/CPU throttling",
      cold: {
        ...cold,
        readyMs,
        upstreamRequests: coldUpstream,
        contentEncoding:
          documentResponse?.headers()["content-encoding"] ?? null,
      },
      hoverUpstream,
      reportNavigationMs,
      periodChangeMs,
      repeatUpstream,
      delivery,
    };
    mkdirSync(".amp/in/artifacts", { recursive: true });
    writeFileSync(
      ".amp/in/artifacts/dashboard-performance.json",
      JSON.stringify(metrics, null, 2)
    );
    await testInfo.attach("dashboard-performance", {
      body: JSON.stringify(metrics, null, 2),
      contentType: "application/json",
    });
    console.log(JSON.stringify(metrics));
    expect(cold.scriptBytes).toBeGreaterThan(0);
    // Fixture budgets, not production SLAs or absolute timing assertions.
    expect(cold.scriptBytes).toBeLessThan(200_000);
    expect(cold.cls).toBeLessThan(0.1);
    expect(hoverUpstream).toBe(0);
    expect(repeatUpstream).toBe(0);
    expect(delivery.asset?.status).toBe(200);
    expect(delivery.asset?.encoding).toBe("br");
    expect(
      delivery.html.totalMs - (delivery.html.firstChunkMs ?? 0)
    ).toBeGreaterThan(100);
  } finally {
    await context.close();
  }
});
