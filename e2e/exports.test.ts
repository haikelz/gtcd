import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { expect, test } from "@playwright/test";

test("exports handle stable GoatCounter, refresh completion, and download the correct archive", async ({
  page,
}) => {
  const password = readFileSync("e2e/mock-goatcounter.mjs", "utf8").match(
    /const PASSWORD = ("[^"]+");/
  );
  if (!password) throw new Error("Missing mock password");
  await page.goto("/login");
  await page.getByLabel("Email").fill("qa@example.com");
  await page
    .getByLabel("Password", { exact: true })
    .fill(JSON.parse(password[1]));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/dashboard/exports?site=1");

  const modern = process.env.MOCK_MODERN_EXPORTS === "true";
  if (!modern) {
    // A forged request must fail usefully even when the legacy UI disables JSON.
    const unsupported = await page.request.post(
      "/dashboard/exports?site=1&/create",
      {
        headers: { Origin: new URL(page.url()).origin },
        form: { format: "json", startFromDay: "" },
        maxRedirects: 0,
      }
    );
    expect(unsupported.status()).toBe(200);
    expect(await unsupported.json()).toMatchObject({
      type: "failure",
      status: 400,
    });
    expect(await unsupported.text()).toContain("does not support JSON exports");
    await expect(page.getByRole("radio", { name: /^JSON/ })).toBeDisabled();
    await page.screenshot({
      path: ".amp/in/artifacts/exports-legacy.png",
      fullPage: true,
    });
  }

  await page.getByRole("button", { name: "Create export" }).click();
  await expect(page).toHaveURL(/export=\d+/);
  await expect(
    page.getByText("Preparing export", { exact: true })
  ).toBeVisible();
  const exportId = new URL(page.url()).searchParams.get("export");
  await page.getByRole("link", { name: "Refresh status" }).click();
  await expect(page.getByRole("link", { name: "Download CSV" })).toBeVisible();
  await page.screenshot({
    path: ".amp/in/artifacts/exports-csv-ready.png",
    fullPage: true,
  });
  const csv = await page.request.get(`/api/admin/exports/${exportId}?site=1`);
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-disposition"]).toContain(".csv.gz");
  expect(gunzipSync(await csv.body()).toString()).toContain("/blog,Journal");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Download CSV" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe(
    `goatcounter-export-${exportId}.csv.gz`
  );
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error("CSV download was not saved");
  expect(gunzipSync(readFileSync(downloadPath)).toString()).toContain(
    "/blog,Journal"
  );
  expect(
    (await page.request.get(`/api/admin/exports/${exportId}?site=2`)).status()
  ).toBe(404);

  if (modern) {
    await page.goto("/dashboard/exports?site=1");
    await page.getByRole("radio", { name: /^JSON/ }).check();
    await page.getByRole("button", { name: "Create export" }).click();
    await expect(page).toHaveURL(/site=1&export=\d+/);
    await page.getByRole("link", { name: "Refresh status" }).click();
    await expect(
      page.getByRole("link", { name: "Download JSON" })
    ).toBeVisible();
    await page.screenshot({
      path: ".amp/in/artifacts/exports-json-ready.png",
      fullPage: true,
    });
    const jsonId = new URL(page.url()).searchParams.get("export");
    const json = await page.request.get(`/api/admin/exports/${jsonId}?site=1`);
    expect(json.status()).toBe(200);
    expect(json.headers()["content-type"]).toContain("application/zip");
    expect(json.headers()["content-disposition"]).toContain(".json.zip");
    expect((await json.body()).subarray(0, 2).toString()).toBe("PK");
  }

  await page.goto("/dashboard/exports?site=1");
  await page.getByLabel("Start after hit ID", { exact: false }).fill("999");
  await page.getByRole("button", { name: "Create export" }).click();
  await expect(page.getByText("Export failed", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Fixture export failed", { exact: true })
  ).toBeVisible();
});
