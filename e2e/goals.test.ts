import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "correct-horse";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("an admin adds a goal and sees its visitors, conversion rate and change", async ({
  page,
}) => {
  await signIn(page, "qa@example.com");
  await page.goto("/dashboard?site=1&range=week");
  await page.getByRole("link", { name: "Goals", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/goals\?.*range=week/);

  const manage = page.getByRole("region", { name: "Manage goals" });
  const report = page.getByRole("region", { name: "Goal conversions" });

  async function addGoal(name: string, kind: string, path: string) {
    await manage.getByLabel("Name", { exact: true }).fill(name);
    await manage.getByLabel("Type", { exact: true }).selectOption(kind);
    await manage.getByLabel("Event name or page path").fill(path);
    await manage.getByRole("button", { name: "Add goal" }).click();
    await expect(manage.getByRole("status")).toHaveText("Goal added.");
  }

  try {
    // The mock serves /blog with 700 of 2,080 visitors in both periods.
    await addGoal("Read the journal", "page", "blog/");
    const journal = report.getByRole("row", { name: /Read the journal/ });
    await expect(journal.getByRole("rowheader")).toContainText("/blog");
    await expect(journal.getByRole("cell").nth(0)).toHaveText("700");
    await expect(journal.getByRole("cell").nth(1)).toHaveText("33.7%");
    await expect(journal.getByRole("cell").nth(2)).toHaveText(
      "Change compared to previous period: 0%"
    );
    await expect(report).toContainText(
      /goal visitors divided by 2.080 visitors/
    );

    // A path GoatCounter has not recorded yet counts 0, not an error.
    await addGoal("Upgrade clicked", "event", "upgrade-click");
    const upgrade = report.getByRole("row", { name: /Upgrade clicked/ });
    await expect(upgrade.getByRole("cell").nth(0)).toHaveText("0");
    await expect(upgrade.getByRole("cell").nth(1)).toHaveText("0%");

    await manage.getByLabel("Name for upgrade-click").fill("Upgraded");
    await manage
      .getByRole("listitem")
      .filter({ has: page.getByLabel("Name for upgrade-click") })
      .getByRole("button", { name: "Save name" })
      .click();
    await expect(manage.getByRole("status")).toHaveText("Goal renamed.");
    await expect(report.getByRole("row", { name: /Upgraded/ })).toBeVisible();
  } finally {
    for (const name of ["Read the journal", "Upgraded", "Upgrade clicked"]) {
      const remove = manage.getByRole("button", { name: `Delete ${name}` });
      if (await remove.count()) {
        await remove.click();
        await expect(remove).toHaveCount(0);
      }
    }
  }
});

test("a non-admin sees goals but cannot add one", async ({ page }) => {
  await signIn(page, "viewer@example.com");
  await page.goto("/dashboard/goals?site=1");

  await expect(
    page.getByRole("heading", { name: "Goals", level: 1 })
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "Manage goals" })).toHaveCount(
    0
  );
  await expect(
    page.getByText("Only admins can add, rename or delete goals.")
  ).toBeVisible();

  const denied = await page.request.post("/dashboard/goals?/create&site=1", {
    form: { kind: "page", name: "Viewer goal", path: "/docs" },
    headers: {
      accept: "application/json",
      origin: new URL(page.url()).origin,
      "x-sveltekit-action": "true",
    },
  });
  expect(denied.status()).toBe(403);

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Goals", level: 1 })
  ).toBeVisible();
  await expect(page.getByText("Viewer goal")).toHaveCount(0);
});
