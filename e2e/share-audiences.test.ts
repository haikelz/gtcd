import { randomInt, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { createServer } from "vite";

test("share mutations fail closed when Redis is unavailable", async () => {
  const previous = process.env.REDIS_URL;
  process.env.REDIS_URL = "redis://127.0.0.1:1";
  const server = await createServer({ server: { middlewareMode: true } });
  try {
    const store = await server.ssrLoadModule("/src/lib/server/share-store.ts");
    await expect(
      store.createShareLink(995, { label: "Unavailable" })
    ).rejects.toThrow("Storage is unavailable");
    await expect(store.revokeShareLink(995)).rejects.toThrow(
      "Storage is unavailable"
    );
    await expect(store.getShareLinks(995)).rejects.toThrow(
      "Storage is unavailable"
    );
  } finally {
    const sessions = await server.ssrLoadModule(
      "/src/lib/server/auth/session-store.ts"
    );
    sessions.getRedis().disconnect();
    await server.close();
    if (previous === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = previous;
  }
});

test("audience grants use atomic site lists and preserve legacy and sibling links", async () => {
  const previous = process.env.REDIS_URL;
  process.env.REDIS_URL =
    process.env.TEST_REDIS_URL ?? "redis://127.0.0.1:6379";
  const server = await createServer({ server: { middlewareMode: true } });
  const site = randomInt(100_000, 999_999);
  try {
    const store = await server.ssrLoadModule("/src/lib/server/share-store.ts");
    const state = await server.ssrLoadModule(
      "/src/lib/server/durable-state.ts"
    );
    const legacyToken = randomUUID().replaceAll("-", "");
    await state.updateDurableJson(`share-link:token:${legacyToken}`, () => ({
      siteId: site,
    }));
    await state.updateDurableJson(`share-link:site:${site}`, () => ({
      token: legacyToken,
      createdAt: new Date().toISOString(),
      expiresAt: null,
    }));
    const links = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        store.createShareLink(site, { label: `Audience ${i}` })
      )
    );
    expect(await store.resolveShareToken(legacyToken)).toBe(site);
    expect(await store.getShareLinks(site)).toHaveLength(11);
    const replacement = await store.createShareLink(site, { id: links[0].id });
    expect(replacement.metrics).toEqual(["total"]);
    expect(replacement.maxRange).toBe("week");
    expect(await store.resolveShareToken(links[0].token)).toBeNull();
    await store.revokeShareLink(site, links[1].id);
    expect(await store.resolveShareToken(links[1].token)).toBeNull();
    expect(await store.resolveShareToken(links[2].token)).toBe(site);
    await expect(
      store.revokeShareLink(site + 1, links[2].id)
    ).rejects.toThrow();
    await expect(
      store.createShareLink(site + 1, { id: links[2].id })
    ).rejects.toThrow();
    for (const options of [
      { label: " " },
      { label: "x".repeat(81) },
      { label: "Bad", metrics: [] },
      { label: "Bad", metrics: ["secret"] },
      { label: "Bad", maxRange: "all" },
    ]) {
      await expect(store.createShareLink(site, options)).rejects.toThrow();
    }
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        store.createShareLink(site, { label: `More ${i}` })
      )
    );
    expect(await store.getShareLinks(site)).toHaveLength(20);
    await expect(
      store.createShareLink(site, { label: "Overflow" })
    ).rejects.toThrow();
    await store.revokeShareLink(site);
    expect(await store.resolveShareToken(legacyToken)).toBeNull();
    expect(await store.resolveShareToken(replacement.token)).toBe(site);
  } finally {
    const sessions = await server.ssrLoadModule(
      "/src/lib/server/auth/session-store.ts"
    );
    sessions.getRedis().disconnect();
    await server.close();
    if (previous === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = previous;
  }
});

test("named links enforce metric and range grants in public HTML and data", async ({
  page,
  request,
}) => {
  // A separate named identity on site 2 never rotates SEO's default link or site 1.
  const label = `Partners ${randomUUID()}`;
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
  await page.goto("/dashboard/settings?site=2");
  const audience = page.locator('[aria-labelledby="audience-heading"]');
  await expect(audience.locator("form").first()).toHaveAttribute(
    "action",
    "?/createShareLink&site=2"
  );
  await audience.getByLabel("Audience name").fill(label);
  await audience
    .getByRole("button", { name: "Create audience link", exact: true })
    .click();
  const field = audience.getByRole("textbox", { name: label, exact: true });
  await expect(field).toBeVisible();
  const url = await field.inputValue();
  const row = audience.locator(`div[aria-label="${label}"]`);
  const id = await row.locator('input[name="id"]').first().inputValue();
  const headers = {
    accept: "application/json",
    origin: new URL(page.url()).origin,
    "x-sveltekit-action": "true",
  };
  try {
    const response = await request.get(url);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain("Traffic over time");
    for (const forbidden of [
      "share-pages",
      "share-browsers",
      "share-referrers",
      "share-locations",
      "path_id",
    ])
      expect(html).not.toContain(forbidden);
    const serialized = await (await request.get(`${url}/__data.json`)).text();
    for (const forbidden of [
      '"hits":',
      '"browsers":',
      '"referrers":',
      '"locations":',
    ])
      expect(serialized).not.toContain(forbidden);
    expect((await request.get(`${url}?range=year`)).status()).toBe(400);
    expect((await request.get(`${url}?range=all`)).status()).toBe(400);
    const crossSite = await page.request.post(
      "/dashboard/settings?/revokeShareLink&site=1",
      { form: { id }, headers }
    );
    expect(await crossSite.json()).toMatchObject({
      type: "failure",
      status: 400,
    });
    const invalid = await page.request.post(
      "/dashboard/settings?/createShareLink&site=2",
      {
        form: { label: "Invalid", maxRange: "year", metrics: "secrets" },
        headers,
      }
    );
    expect(await invalid.json()).toMatchObject({
      type: "failure",
      status: 400,
    });
    await row.getByRole("button", { name: "Rotate audience link" }).click();
    await expect(field).not.toHaveValue(url);
    expect((await request.get(url)).status()).toBe(404);
    const rotated = await field.inputValue();
    expect((await request.get(rotated)).status()).toBe(200);
    await row.getByRole("button", { name: "Revoke audience link" }).click();
    await expect(field).toHaveCount(0);
    expect((await request.get(rotated)).status()).toBe(404);
  } finally {
    await page.request.post("/dashboard/settings?/revokeShareLink&site=2", {
      form: { id },
      headers,
    });
  }
});
