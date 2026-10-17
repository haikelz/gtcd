import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { once } from "node:events";
import { expect, test } from "@playwright/test";

test("pages stream comparisons and paginate with scoped bounded opaque links", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  let releaseComparison = () => {};
  let blocked = false;
  let failComparison = false;
  const gate = new Promise<void>((resolve) => {
    releaseComparison = resolve;
  });
  const exclusions: number[][] = [];
  const upstream = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname === "/api/v0/stats/hits") {
      const previous = url.searchParams.has("include_paths");
      if (previous && blocked) await gate;
      if (previous && failComparison) {
        res.writeHead(403, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "Comparison unavailable" }));
        return;
      }
      const excluded = (url.searchParams.get("exclude_paths") ?? "")
        .split(",")
        .filter(Boolean)
        .map(Number);
      if (!previous) exclusions.push(excluded);
      const offset = excluded.length;
      const hits = previous
        ? []
        : Array.from({ length: 100 }, (_, i) => ({
            path_id: offset + i + 1,
            path: `/cursor-row-${offset + i + 1}`,
            title: "Cursor fixture",
            count: 10,
            event: false,
            max: 10,
            stats: [],
          }));
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ hits, more: !previous, total: 50000 }));
      return;
    }
    const body = [];
    for await (const chunk of req) body.push(chunk);
    const response = await fetch(
      `http://127.0.0.1:${process.env.TEST_MOCK_PORT ?? 5187}${req.url}`,
      {
        method: req.method,
        redirect: "manual",
        headers: {
          "content-type": req.headers["content-type"] ?? "application/json",
        },
        body: body.length ? Buffer.concat(body) : undefined,
      }
    );
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  });
  upstream.listen(5199, "127.0.0.1");
  await once(upstream, "listening");
  const app = spawn(process.execPath, ["build"], {
    env: {
      ...process.env,
      PORT: "4199",
      ORIGIN: "http://127.0.0.1:4199",
      GOATCOUNTER_URL: "http://127.0.0.1:5199",
      GOATCOUNTER_ADMIN_URL: "http://127.0.0.1:5199",
      GOATCOUNTER_API_KEY: "e2e",
      REDIS_URL: process.env.TEST_REDIS_URL ?? "redis://127.0.0.1:6379",
    },
    stdio: "ignore",
  });
  const page = await browser.newPage();
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  try {
    await expect
      .poll(async () =>
        fetch("http://127.0.0.1:4199/login")
          .then((r) => r.status)
          .catch(() => 0)
      )
      .toBe(200);
    const fixture = readFileSync("e2e/mock-goatcounter.mjs", "utf8");
    const password = fixture.match(/const PASSWORD = ("[^"]+");/);
    if (!password) throw new Error("Missing login fixture");
    await page.goto("http://127.0.0.1:4199/login");
    await page.getByLabel("Email").fill("pages-performance@example.com");
    await page
      .getByLabel("Password", { exact: true })
      .fill(JSON.parse(password[1]));
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/dashboard/);
    blocked = true;
    const report =
      "http://127.0.0.1:4199/dashboard/pages?start=2026-08-01&end=2026-08-07&range=custom&scale=shared";
    await page.goto(report, { waitUntil: "commit" });
    await expect(
      page.getByRole("status").filter({ hasText: "Loading previous-period" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /cursor-row-1\s/ }).first()
    ).toBeVisible();
    blocked = false;
    releaseComparison();
    await expect(
      page.getByText("(new)", { exact: true }).first()
    ).toBeVisible();

    let secondPage = "";
    for (let index = 0; index < 3; index++) {
      const next = page.getByRole("link", { name: "Next", exact: true });
      const href = await next.getAttribute("href");
      expect(href).toMatch(/cursor=[a-f0-9]{48}/);
      expect(href).not.toContain("exclude=");
      expect(href?.length).toBeLessThan(250);
      await next.click();
      await expect(page).toHaveURL(/cursor=/);
      await expect(
        page
          .getByRole("link", {
            name: new RegExp(`cursor-row-${(index + 1) * 100 + 1}\\s`),
          })
          .first()
      ).toBeVisible();
      if (index === 0) secondPage = page.url();
    }
    expect(
      exclusions.some((ids) => ids.length === 300 && new Set(ids).size === 300)
    ).toBe(true);
    await page.getByRole("link", { name: "Previous", exact: true }).click();
    await expect(
      page.getByRole("link", { name: /cursor-row-201\s/ }).first()
    ).toBeVisible();
    await page.goto(`${secondPage}&filter=foreign`);
    await expect(page.getByText(/page link has expired/)).toBeVisible();
    await page.getByRole("link", { name: "Reset pagination" }).click();
    await expect(page).not.toHaveURL(/cursor=/);
    await page.goto(`${report}&cursor=${"0".repeat(48)}`);
    await expect(
      page.getByRole("link", { name: "Reset pagination" })
    ).toBeVisible();

    await page.goto(report);
    for (let index = 0; index < 20; index++) {
      await page.getByRole("link", { name: "Next", exact: true }).click();
      await expect(
        page
          .getByRole("link", {
            name: new RegExp(`cursor-row-${(index + 1) * 100 + 1}\\s`),
          })
          .first()
      ).toBeVisible();
      expect(new URL(page.url()).searchParams.get("scale")).toBe("shared");
    }
    await expect(page.getByText(/Pagination limit reached/)).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Next", exact: true })
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Previous", exact: true })
    ).toBeVisible();

    failComparison = true;
    await page.goto(report.replace("2026-08-01", "2026-07-01"));
    await expect(
      page.getByText(/Previous-period comparisons could not be loaded/)
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /cursor-row-1\s/ }).first()
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Retry", exact: true })
    ).toBeVisible();
    failComparison = false;
    for (let index = 0; index < 33; index++) await page.goto(report);
    await page.goto(secondPage);
    await expect(page.getByText(/page link has expired/)).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Reset pagination" })
    ).toBeVisible();
    expect(browserErrors).toEqual([]);
  } finally {
    releaseComparison();
    app.kill("SIGKILL");
    await once(app, "exit");
    await page.close();
    upstream.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      upstream.close((error) => (error ? reject(error) : resolve()))
    );
  }
});
