import { expect, test } from "@playwright/test";

const PASSWORD = "correct-horse";
const TOKEN_SITE_ACCESS =
  "gtcd's API token can't read this site. An admin can fix this from the API token warning in Settings.";

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

test("a site outside the API token's sites names the token, and Settings says how to fix it", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("qa@example.com");
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // The mock's token reaches sites 1 and 2; site 3 answers GoatCounter's 403.
  await page.goto("/dashboard/sites?range=week");
  const noAccess = page
    .getByRole("list", { name: "Sites" })
    .getByRole("listitem")
    .filter({ hasText: "noaccess.example" });
  await expect(noAccess).toContainText(TOKEN_SITE_ACCESS);

  await page.goto("/dashboard?site=3&range=week");
  await expect(page.getByRole("region", { name: "Key metrics" })).toContainText(
    TOKEN_SITE_ACCESS
  );

  await page.goto("/dashboard/settings?site=1");
  const warning = page
    .getByRole("status")
    .filter({ hasText: "gtcd's API token reaches only some sites" });
  await expect(warning).toContainText(
    "Create a token for all sites, including future ones"
  );
  await expect(
    warning.getByRole("link", { name: "Open API tokens" })
  ).toHaveAttribute("href", "/dashboard/admin/tokens");

  // A site created now would be out of the token's reach as well.
  const addSite = page.getByRole("region", { name: "Add a site" });
  await addSite
    .getByLabel("Analytics hostname")
    .fill("new-site.example.invalid");
  await page.getByRole("button", { name: "Create site" }).click();
  await expect(
    page.getByText("Site created. gtcd's API token can't read it yet.")
  ).toBeVisible();
});
