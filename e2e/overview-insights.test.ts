import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "correct-horse";
// The mock answers every period with 3–9 Oct 2026 (Saturday to Friday).
const PERIOD = "start=2026-10-03&end=2026-10-09";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

function actionHeaders(page: Page) {
  return {
    accept: "application/json",
    origin: new URL(page.url()).origin,
    "x-sveltekit-action": "true",
  };
}

test("the busiest-hours heatmap shows average visits by weekday and hour", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (error) => errors.push(String(error)));
  await signIn(page, `hours-${randomUUID()}@example.com`);

  await page.goto(`/dashboard?${PERIOD}`);
  const widget = page.getByRole("region", { name: "Busiest hours" });
  const heatmap = widget.getByRole("img", { name: "Busiest hours heatmap" });
  await expect(heatmap).toBeVisible();
  await expect(heatmap).toHaveAccessibleDescription(
    /The busiest hour is Monday at 16:00\./
  );
  await expect(widget).toContainText(
    "Average visits by weekday and hour (UTC)"
  );

  // The screen-reader table carries every cell: Monday 5 Oct, 14:00.
  const table = widget.getByRole("table", {
    name: "Average visits by weekday and hour",
  });
  const monday = table.getByRole("row").filter({
    has: page.getByRole("rowheader", { name: "Monday", exact: true }),
  });
  await expect(monday.getByRole("cell").nth(14)).toHaveText("19");

  await heatmap.focus();
  await expect(
    widget.getByText("Mon 16:00: 21 visits on average")
  ).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(
    widget.getByText("Mon 17:00: 3 visits on average")
  ).toBeVisible();

  // Fewer-numbers mode swaps counts for shares of the busiest hour.
  const display = await page.request.post("/dashboard/customize?/saveDisplay", {
    form: { fewerNumbers: "on", locale: "follow" },
    headers: actionHeaders(page),
  });
  expect(await display.json()).toMatchObject({ type: "success" });
  await page.reload();
  const shares = widget.getByRole("table", {
    name: "Visits by weekday and hour, as a percentage of the busiest hour",
  });
  await expect(
    shares
      .getByRole("row")
      .filter({
        has: page.getByRole("rowheader", { name: "Monday", exact: true }),
      })
      .getByRole("cell")
      .nth(14)
  ).toHaveText("90%");
  await expect(widget.getByText("21 visits")).toHaveCount(0);

  await page.goto("/dashboard/customize");
  await expect(
    page.getByRole("switch", { name: "Busiest hours" })
  ).toBeChecked();
  expect(errors).toEqual([]);
});
