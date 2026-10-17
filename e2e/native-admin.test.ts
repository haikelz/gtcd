import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("administration requires a personal native session and never borrows the shared API identity", async ({
  page,
}) => {
  const fixture = readFileSync("e2e/mock-goatcounter.mjs", "utf8").match(
    /const PASSWORD = ("[^"]+");/
  );
  if (!fixture) throw new Error("Missing mock login fixture");
  await page.goto("/login");
  await page.getByLabel("Email").fill("personal@example.com");
  await page
    .getByLabel("Password", { exact: true })
    .fill(JSON.parse(fixture[1]));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // The mock API identifies its shared token owner as qa@example.com, an
  // administrator. That must not elevate this different signed-in account.
  expect((await page.request.get("/dashboard/admin/users")).status()).toBe(403);
  await page.goto("/dashboard/admin/security");
  await expect(
    page.getByText("Your GoatCounter session has expired.", { exact: false })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Change password", exact: true })
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Sign out and reconnect" })
  ).toBeVisible();
  expect(
    (await page.request.get("/dashboard/admin/not-a-section")).status()
  ).toBe(404);
  await page.getByRole("button", { name: "Sign out and reconnect" }).click();
  await expect(page).toHaveURL(/\/login$/);
});
