import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

function head(html: string): string {
  const match = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
  if (!match) throw new Error("Missing server-rendered head");
  return match[1];
}

test("private routes and shared reports stay out of search metadata", async ({
  page,
  request,
}) => {
  const sensitiveQuery =
    "?token=metadata-secret-probe&password=metadata-password-probe";
  for (const path of [
    "/",
    "/login",
    "/dashboard",
    "/dashboard/admin/users",
    "/api/stats/browsers/1",
    "/share/not-a-valid-token",
  ]) {
    const response = await request.get(path + sensitiveQuery, {
      maxRedirects: 0,
    });
    expect(response.headers()["x-robots-tag"], path).toBe("noindex, nofollow");
  }
  const login = head(
    await (await request.get("/login" + sensitiveQuery)).text()
  );
  expect(login).toMatch(/name="robots"[^>]*content="noindex, nofollow"/);
  expect(login).not.toContain("application/ld+json");
  expect(login).not.toContain("metadata-secret-probe");
  expect(login).not.toContain("metadata-password-probe");

  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Allow: /");
  expect(robots).not.toContain("Disallow:");
  expect(robots).not.toContain("Sitemap:");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("http://www.sitemaps.org/schemas/sitemap/0.9");
  expect(sitemap).not.toContain("<loc>");

  const fixture = readFileSync("e2e/mock-goatcounter.mjs", "utf8").match(
    /const PASSWORD = ("[^"]+");/
  );
  if (!fixture) throw new Error("Missing mock login fixture");
  await page.goto("/login");
  await page.getByLabel("Email").fill("qa@example.com");
  await page
    .getByLabel("Password", { exact: true })
    .fill(JSON.parse(fixture[1]));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  for (const path of [
    "/dashboard",
    "/dashboard/settings",
    "/dashboard/admin/users",
  ]) {
    const response = await page.request.get(path + sensitiveQuery);
    expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow");
    const metadata = head(await response.text());
    expect(metadata).toMatch(/name="robots"[^>]*content="noindex, nofollow"/);
    expect(metadata).not.toContain("application/ld+json");
    expect(metadata).not.toContain("metadata-secret-probe");
    expect(metadata).not.toContain("metadata-password-probe");
    expect(metadata).not.toContain("qa@example.com");
  }

  // Sharing workflow tests rotate site 1's link in parallel. Keep this
  // metadata-only fixture on site 2 so neither test revokes the other's URL.
  const shareSettings = "/dashboard/settings?site=2";
  const actionHeaders = {
    accept: "application/json",
    origin: new URL(page.url()).origin,
    "x-sveltekit-action": "true",
  };
  const created = await page.request.post(
    "/dashboard/settings?/createShareLink&site=2",
    { form: { expiryDays: "7" }, headers: actionHeaders }
  );
  expect(await created.json()).toMatchObject({ type: "success" });
  await page.goto(shareSettings);
  await expect(page.locator("#public-link")).toBeVisible();
  const sharedUrl = await page.locator("#public-link").inputValue();
  const token = new URL(sharedUrl).pathname.split("/").at(-1);
  expect(token).toBeTruthy();
  const shared = await request.get(sharedUrl);
  expect(shared.status()).toBe(200);
  expect(shared.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  expect(shared.headers()["referrer-policy"]).toBe("no-referrer");
  const metadata = head(await shared.text());
  expect(metadata).toContain("Shared analytics");
  expect(metadata).not.toContain(token);
  expect(metadata).not.toContain('rel="canonical"');
  expect(metadata).not.toContain('property="og:url"');
  expect(metadata).not.toContain("application/ld+json");
  expect(metadata).not.toContain("qa@example.com");
  expect(metadata).not.toContain("demo.example");
  expect(metadata).not.toContain("journal.example");
  await page.goto(sharedUrl);
  await expect(page).toHaveTitle("Shared analytics — gtcd");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "Shared analytics — gtcd"
  );
});
