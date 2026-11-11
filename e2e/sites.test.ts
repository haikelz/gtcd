import { expect, test } from "@playwright/test";

const PASSWORD = "correct-horse";

test("the all-sites page lists both sites with their visits and overview links", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("qa@example.com");
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/dashboard?site=1&range=week");
  await page.getByRole("link", { name: "All sites", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/sites\?.*range=week/);

  // The mock answers each site's own Host with its own total.
  const sites = page.getByRole("list", { name: "Sites" });
  const demo = sites.getByRole("listitem").filter({ hasText: "demo.example" });
  const journal = sites
    .getByRole("listitem")
    .filter({ hasText: "journal.example" });
  await expect(demo).toContainText(/2.080/);
  await expect(journal).toContainText(/1.040/);
  await expect(journal).toContainText("0%");
  await expect(
    journal.getByRole("img", { name: "Visit trend for journal.example" })
  ).toBeVisible();

  const link = journal.getByRole("link", {
    name: "journal.example",
    exact: true,
  });
  await expect(link).toHaveAttribute("href", /^\/dashboard\?.*site=2/);
  await expect(link).toHaveAttribute("href", /range=week/);
  await link.click();
  await expect(page).toHaveURL(/\/dashboard\?.*site=2/);
  await expect(page.locator("#dashboard-site")).toHaveValue("2");
});
