import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { createServer } from "vite";

test("share tokens expire, rotate, revoke, and reject malformed stored links", async () => {
  const previousRedisUrl = process.env.REDIS_URL;
  process.env.REDIS_URL = "redis://127.0.0.1:1";
  const server = await createServer({ server: { middlewareMode: true } });
  const originalNow = Date.now;
  try {
    const store = await server.ssrLoadModule("/src/lib/server/share-store.ts");
    const kv = await server.ssrLoadModule("/src/lib/server/kv.ts");
    const now = originalNow();
    Date.now = () => now;

    for (const days of [1, 7, 30]) {
      const link = await store.createShareLink(991, { expiryDays: days });
      expect(Date.parse(link.expiresAt) - now).toBe(days * 86_400_000);
      expect(await store.resolveShareToken(link.token)).toBe(991);
    }
    const link = await store.createShareLink(991);
    expect(Date.parse(link.expiresAt) - now).toBe(7 * 86_400_000);
    await expect(
      store.createShareLink(991, { expiryDays: 2 })
    ).rejects.toThrow();
    expect(await store.resolveShareToken(link.token)).toBe(991);

    Date.now = () => Date.parse(link.expiresAt);
    expect(await store.resolveShareToken(link.token)).toBeNull();
    expect(await store.getShareLink(991)).toBeNull();
    Date.now = () => now;

    const replacement = await store.createShareLink(991);
    expect(await store.resolveShareToken(link.token)).toBeNull();
    await store.revokeShareLink(991);
    expect(await store.resolveShareToken(replacement.token)).toBeNull();
    for (const token of ["bad", "../private", "A".repeat(32)]) {
      expect(await store.resolveShareToken(token)).toBeNull();
    }

    // Existing durable records receive seven days from their original creation.
    const token = "L".repeat(32);
    await kv.setJson(`share-link:token:${token}`, { siteId: 992 });
    await kv.setJson("share-link:site:992", {
      createdAt: new Date(now).toISOString(),
      token,
    });
    expect(await store.resolveShareToken(token)).toBe(992);
    Date.now = () => now + 7 * 86_400_000;
    expect(await store.resolveShareToken(token)).toBeNull();
    Date.now = () => now;
    for (const expiresAt of [
      "invalid",
      false,
      0,
      "",
      new Date(now).toISOString(),
    ]) {
      await kv.setJson("share-link:site:992", {
        createdAt: new Date(now).toISOString(),
        expiresAt,
        token,
      });
      expect(await store.resolveShareToken(token)).toBeNull();
    }

    const permanent = await store.createShareLink(993, { expiryDays: "never" });
    expect(permanent.expiresAt).toBeNull();
    Date.now = () => now + 10 * 365 * 86_400_000;
    expect(await store.getShareLink(993)).toEqual(permanent);
    expect(await store.resolveShareToken(permanent.token)).toBe(993);

    const rotated = await store.createShareLink(993, { expiryDays: "never" });
    expect(await store.resolveShareToken(permanent.token)).toBeNull();
    expect(await store.resolveShareToken(rotated.token)).toBe(993);
    await store.revokeShareLink(993);
    expect(await store.resolveShareToken(rotated.token)).toBeNull();

    const permanentToExpire = await store.createShareLink(993, {
      expiryDays: "never",
    });
    const expiring = await store.createShareLink(993, { expiryDays: 1 });
    expect(await store.resolveShareToken(permanentToExpire.token)).toBeNull();
    Date.now = () => Date.parse(expiring.expiresAt);
    expect(await store.resolveShareToken(expiring.token)).toBeNull();
  } finally {
    Date.now = originalNow;
    await server.close();
    if (previousRedisUrl === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = previousRedisUrl;
  }
});

test("sharing controls default to seven days and preserve rotation and revocation", async ({
  page,
  playwright,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("qa@example.com");
  const fixture = readFileSync("e2e/mock-goatcounter.mjs", "utf8");
  const password = fixture.match(/const PASSWORD = ("[^"]+");/);
  if (!password) throw new Error("Missing mock login fixture");
  await page
    .getByLabel("Password", { exact: true })
    .fill(JSON.parse(password[1]));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/dashboard/settings");
  await expect(
    page.getByRole("radio", { name: "7 days", exact: true })
  ).toBeChecked();
  await expect(
    page.getByRole("radio", { name: "Never expires", exact: true })
  ).not.toBeChecked();
  await page.locator('[aria-labelledby="public-link-heading"]').screenshot({
    path: ".amp/in/artifacts/share-default-desktop.png",
  });
  await page.getByRole("radio", { name: "30 days", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("radio", { name: "Never expires", exact: true })
  ).toBeChecked();
  await page.getByRole("radio", { name: "1 day", exact: true }).check();
  await page.getByRole("button", { name: "Create public link" }).click();
  const field = page.locator("#public-link");
  await expect(field).toBeVisible();
  const url = await field.inputValue();
  await expect(page.getByText(/^Expires .* UTC$/)).toBeVisible();
  await page
    .locator('[aria-labelledby="public-link-heading"]')
    .screenshot({ path: ".amp/in/artifacts/share-expiry-settings.png" });

  const publicClient = await playwright.request.newContext();
  try {
    const shared = await publicClient.get(url);
    expect(shared.status()).toBe(200);
    expect(shared.headers()["cache-control"]).toBe("private, no-store");
    expect(shared.headers()["referrer-policy"]).toBe("no-referrer");
    expect(shared.headers()["x-robots-tag"]).toBe("noindex, nofollow");
    const invalid = await page.request.post(
      "/dashboard/settings?/createShareLink&site=1",
      {
        form: { expiryDays: "2" },
        headers: {
          accept: "application/json",
          origin: new URL(page.url()).origin,
          "x-sveltekit-action": "true",
        },
      }
    );
    expect(await invalid.json()).toMatchObject({
      type: "failure",
      status: 400,
    });
    expect((await publicClient.get(url)).status()).toBe(200);
    await page
      .getByRole("radio", { name: "Never expires", exact: true })
      .check();
    await page.getByRole("button", { name: "New link", exact: true }).click();
    await expect(field).not.toHaveValue(url);
    expect((await publicClient.get(url)).status()).toBe(404);
    const rotated = await field.inputValue();
    await expect(
      page.getByText(
        "Never expires. Revoke or replace this link to stop access.",
        { exact: true }
      )
    ).toBeVisible();
    expect((await publicClient.get(rotated)).status()).toBe(200);
    await page.reload();
    await expect(field).toHaveValue(rotated);
    await page
      .getByRole("radio", { name: "Never expires", exact: true })
      .check();
    await page.locator('[aria-labelledby="public-link-heading"]').screenshot({
      path: ".amp/in/artifacts/share-never-desktop.png",
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(field).toHaveValue(rotated);
    await page
      .getByRole("radio", { name: "Never expires", exact: true })
      .check();
    await page.locator('[aria-labelledby="public-link-heading"]').screenshot({
      path: ".amp/in/artifacts/share-never-mobile.png",
    });
    await page.getByRole("button", { name: "Revoke", exact: true }).click();
    await expect(field).toHaveCount(0);
    expect((await publicClient.get(rotated)).status()).toBe(404);
    const missing = await publicClient.get("/share/malformed");
    expect(missing.status()).toBe(404);
    expect(missing.headers()["cache-control"]).toBe("private, no-store");
    expect(missing.headers()["referrer-policy"]).toBe("no-referrer");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.getByText("Link expires after")).toBeVisible();
    await page.locator('[aria-labelledby="public-link-heading"]').screenshot({
      path: ".amp/in/artifacts/share-expiry-settings-mobile.png",
    });
  } finally {
    await publicClient.dispose();
  }
});
