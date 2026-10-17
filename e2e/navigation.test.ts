import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("report navigation preserves authentication and logout avoids dashboard reloads", async ({
  page,
  request,
}) => {
  expect((await request.get("/api/stats/browsers/1")).status()).toBe(401);
  const fixture = readFileSync("e2e/mock-goatcounter.mjs", "utf8");
  const password = fixture.match(/const PASSWORD = ("[^"]+");/);
  if (!password) throw new Error("Missing mock login fixture");
  await page.goto("/login");
  await page.getByLabel("Email").fill("navigation@example.com");
  await page
    .getByLabel("Password", { exact: true })
    .fill(JSON.parse(password[1]));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.locator("body")).toHaveAttribute(
    "data-sveltekit-preload-data",
    "tap"
  );
  await expect(page.locator("body")).toHaveAttribute(
    "data-sveltekit-preload-code",
    "hover"
  );
  expect((await page.request.get("/api/stats/browsers/1")).status()).toBe(200);
  expect((await page.request.get("/api/stats/unknown/1")).status()).toBe(400);
  await page.waitForLoadState("networkidle");

  await page.route("**/logout", (route) => route.fulfill({ status: 503 }));
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByText("Unable to sign out. Check your connection and try again.", {
      exact: true,
    })
  ).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true })
  ).toBeEnabled();
  await page.unroute("**/logout");

  const dashboardReloads: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.pathname.startsWith("/dashboard") &&
      url.pathname.endsWith("/__data.json")
    )
      dashboardReloads.push(url.pathname);
  });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(dashboardReloads).toEqual([]);
  expect((await page.request.get("/api/stats/browsers/1")).status()).toBe(401);
});
