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

test("the Pages CSV has the columns the list shows, without shares", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/dashboard/pages?start=2026-10-01&end=2026-10-07");
  // The mock answers the previous period alike: every page changed 0%.
  await expect(
    page.getByTitle("Change compared to previous period")
  ).toHaveCount(3);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download CSV" }).click(),
  ]);
  const csv = await readFile(await download.path(), "utf8");

  expect(csv).toBe(
    "\uFEFFPath,Title,Visits,Change (%)\r\n" +
      "/,Home,980,0\r\n" +
      "/blog,Journal,700,0\r\n" +
      "/docs,Docs,400,0\r\n"
  );
});

test("Ctrl/Cmd+K opens the command menu from anywhere and Enter goes to the match", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/dashboard/campaigns?range=month");
  const dialog = page.getByRole("dialog", { name: "Command menu" });
  const filter = page.getByPlaceholder("Filter paths");

  // Typing in a text field does not keep the shortcut from opening it.
  await filter.focus();
  await page.keyboard.press("ControlOrMeta+k");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  // A Mac takes only Cmd+K, so Ctrl+K keeps its text-editing meaning; other
  // systems take only Ctrl+K. Had the other modifier opened the menu, the
  // next press would close it again.
  await filter.focus();
  await page.keyboard.press(
    process.platform === "darwin" ? "Control+k" : "Meta+k"
  );
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

test("custom ranges stop at one year, in the toolbar and on the server", async ({
  page,
}) => {
  await signIn(page);
  // A year back across 29 February spans 367 days and still loads.
  const leap = await page.goto(
    "/dashboard/pages?start=2023-11-18&end=2024-11-18"
  );
  expect(leap?.status()).toBe(200);

  const tooLong = await page.goto(
    "/dashboard/pages?start=2024-01-01&end=2025-06-01"
  );
  expect(tooLong?.status()).toBe(400);
  await expect(
    page.getByText("Choose a range of at most one year.")
  ).toBeVisible();

  await page.goto("/dashboard/pages?start=2026-10-01&end=2026-10-07");
  await page.getByLabel("Start date").fill("2024-01-01");
  await expect(page.getByLabel("End date")).toHaveAccessibleDescription(
    "Choose a range of at most one year."
  );
  await expect(page.getByRole("button", { name: "Apply" })).toBeDisabled();
});
