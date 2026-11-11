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

test("Ctrl/Cmd+K opens the command menu and Enter goes to the match", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/dashboard/campaigns?range=month");
  const dialog = page.getByRole("dialog", { name: "Command menu" });

  // Typing in a text field keeps the shortcut.
  await page.getByPlaceholder("Filter paths").focus();
  await page.keyboard.press("ControlOrMeta+k");
  await expect(dialog).toHaveCount(0);

  await page.locator("#main-content").focus();
  await page.keyboard.press("ControlOrMeta+k");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("combobox")).toBeFocused();
  await page.keyboard.type("browsers");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/dashboard\/browsers\?(.+&)?range=month/);
  await expect(dialog).toBeHidden();

  // The header button opens it too, and Escape hands focus back.
  const trigger = page.getByRole("button", {
    name: "Search reports and actions",
  });
  await trigger.click();
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("option", { name: "Last year" })
  ).toHaveAttribute("href", /\/dashboard\/browsers\?(.+&)?range=year/);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("the campaign link builder tags the page URL", async ({ page }) => {
  await signIn(page);
  await page.goto("/dashboard/campaigns");

  const toggle = page.getByRole("button", { name: "Build a campaign link" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page
    .getByRole("textbox", { name: "Page URL" })
    .fill("https://example.com/pricing?plan=pro&utm_source=old#faq");
  await expect(
    page.getByText("Enter the page URL, source and campaign to get the link.")
  ).toBeVisible();
  await page.getByRole("textbox", { name: /^Source/ }).fill("newsletter");
  await page.getByRole("textbox", { name: /^Medium/ }).fill("email");
  await page.getByRole("textbox", { name: /^Campaign/ }).fill("spring sale");

  await expect(page.getByRole("textbox", { name: "Tagged link" })).toHaveValue(
    "https://example.com/pricing?plan=pro&utm_source=newsletter&utm_medium=email&utm_campaign=spring%20sale#faq"
  );
});
