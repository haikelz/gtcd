import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "correct-horse";

// The PWA worker precaches every chunk; keep it out of these flows.
test.use({ serviceWorkers: "block" });

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("qa@example.com");
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("a report downloads its rows on screen as CSV with formulas escaped", async ({
  page,
}) => {
  await signIn(page);
  await page.goto(
    "/dashboard/reports/campaigns/9?start=2026-10-01&end=2026-10-07"
  );
  await expect(page.getByRole("meter")).toHaveCount(2);
  await expect(
    page.getByText('=HYPERLINK("https://example.invalid","x")')
  ).toBeVisible();
  await expect(page.getByText("spring, sale")).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download CSV" }).click(),
  ]);
  const csv = await readFile(await download.path(), "utf8");

  expect(download.suggestedFilename()).toBe(
    "demo.example-campaigns-9-2026-10-01_2026-10-07.csv"
  );
  expect(csv).toBe(
    "\uFEFFCampaign detail,Visits,Share (%)\r\n" +
      '"\'=HYPERLINK(""https://example.invalid"",""x"")",30,75\r\n' +
      '"spring, sale",10,25\r\n'
  );
});
