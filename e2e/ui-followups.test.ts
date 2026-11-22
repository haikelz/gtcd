import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "correct-horse";
// The mock answers every period with 3–9 Oct 2026; the peak day has 430.
const PERIOD = "start=2026-10-03&end=2026-10-09";

async function signIn(page: Page, email = "qa@example.com") {
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

/** WCAG relative luminance of a computed `rgb()`/`rgba()` colour. */
function luminance(color: string): number {
  const [r, g, b] = (color.match(/[\d.]+/g) ?? []).slice(0, 3).map((part) => {
    const channel = Number(part) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

test("a focused primary button shows a solid ring clear of its fill in both themes", async ({
  page,
}) => {
  await signIn(page);
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await page.goto("/dashboard/settings?site=1");
    const save = page.getByRole("button", { name: "Save changes" }).first();
    await page.locator("#main-content").focus();
    await page.keyboard.press("Tab");
    await expect(save).toBeFocused();

    const style = await save.evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        fill: computed.backgroundColor,
        offset: parseFloat(computed.outlineOffset),
        ring: computed.outlineColor,
        style: computed.outlineStyle,
        surface: getComputedStyle(document.body).backgroundColor,
        width: parseFloat(computed.outlineWidth),
      };
    });
    expect(style.style).toBe("solid");
    expect(style.width).toBeGreaterThanOrEqual(2);
    // The offset gap keeps the ring off the orange fill it would match.
    expect(style.offset).toBeGreaterThanOrEqual(2);
    expect(contrast(style.ring, style.surface)).toBeGreaterThanOrEqual(3);
    expect(style.fill).not.toBe(style.surface);
  }
});

test("badges render as pills", async ({ page }) => {
  await signIn(page);
  await page.goto("/dashboard/settings?site=1");
  const badge = page.locator('[data-slot="badge"]').first();
  await expect(badge).toBeVisible();

  const { height, radius } = await badge.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    radius: parseFloat(getComputedStyle(element).borderTopLeftRadius),
  }));
  expect(radius).toBeGreaterThanOrEqual(height / 2);
});

test("audience links confirm rotation and revocation, toast each result and keep focus", async ({
  page,
}) => {
  const label = `Followup ${randomUUID().slice(0, 8)}`;
  await signIn(page);
  await page.goto("/dashboard/settings?site=2");
  const audience = page.locator('[aria-labelledby="audience-heading"]');
  await audience.getByLabel("Audience name").fill(label);
  await audience
    .getByRole("button", { name: "Create audience link", exact: true })
    .click();
  const row = audience.locator(`div[aria-label="${label}"]`);
  const field = row.getByRole("textbox", { name: label, exact: true });
  const id = await row.locator('input[name="id"]').first().inputValue();
  const url = await field.inputValue();

  try {
    await expect(page.getByText("Audience link created.")).toBeVisible();

    // Declining the confirmation leaves the live URL untouched.
    const declined = page.waitForEvent("dialog").then(async (dialog) => {
      expect(dialog.type()).toBe("confirm");
      expect(dialog.message()).toContain(label);
      await dialog.dismiss();
    });
    await row.getByRole("button", { name: "Rotate audience link" }).click();
    await declined;
    await expect(field).toHaveValue(url);

    page.once("dialog", (dialog) => dialog.accept());
    await row.getByRole("button", { name: "Rotate audience link" }).click();
    await expect(page.getByText("Audience link rotated.")).toBeVisible();
    await expect(field).not.toHaveValue(url);

    page.once("dialog", (dialog) => dialog.accept());
    await row.getByRole("button", { name: "Revoke audience link" }).click();
    await expect(page.getByText("Audience link revoked.")).toBeVisible();
    await expect(row).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Audience links" })
    ).toBeFocused();
  } finally {
    await page.request.post("/dashboard/settings?/revokeShareLink&site=2", {
      form: { id },
      headers: actionHeaders(page),
    });
  }
});

test("share-link failures show in the card that sent them, with Retry only for 503", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/dashboard/settings?site=2");
  const audience = page.locator('[aria-labelledby="audience-heading"]');
  const publicCard = page.locator('[aria-labelledby="public-link-heading"]');
  const createForm = audience.locator("form").first();

  // A real validation failure: no shared metric.
  await audience.getByLabel("Audience name").fill("No metrics");
  await audience.getByRole("checkbox", { name: "Visits" }).click();
  await audience
    .getByRole("button", { name: "Create audience link", exact: true })
    .click();
  await expect(createForm.getByRole("alert")).toContainText(
    "Choose a valid audience name"
  );
  await expect(publicCard.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Retry" })).toHaveCount(0);

  // Storage outages are the one failure Retry can fix.
  await page.route(
    (url) => url.search.includes("createShareLink"),
    (route) =>
      route.fulfill({
        contentType: "application/json",
        json: {
          type: "failure",
          status: 503,
          data: JSON.stringify([
            { field: 1, message: 2, scope: 3 },
            "share",
            "Share storage is unavailable.",
            "audience",
          ]),
        },
      })
  );
  await audience.getByLabel("Audience name").fill("Outage");
  await audience
    .getByRole("button", { name: "Create audience link", exact: true })
    .click();
  await expect(createForm.getByRole("alert")).toHaveText(
    "Share storage is unavailable."
  );
  await expect(createForm.getByRole("link", { name: "Retry" })).toBeVisible();
  await expect(publicCard.getByRole("link", { name: "Retry" })).toHaveCount(0);
});

test("a taken hostname is described under its field", async ({ page }) => {
  await signIn(page);
  await page.goto("/dashboard/settings?site=1");
  // The mock accepts every hostname, so the update answers as GoatCounter
  // would for one in use.
  await page.route(
    (url) =>
      url.pathname === "/dashboard/settings" && url.search.includes("update"),
    (route) =>
      route.request().method() === "POST"
        ? route.fulfill({
            contentType: "application/json",
            json: {
              type: "failure",
              status: 400,
              data: JSON.stringify([
                { field: 1, message: 2 },
                "cname",
                "Hostname: already in use by another site",
              ]),
            },
          })
        : route.continue()
  );
  await page.getByRole("button", { name: "Save changes" }).first().click();

  const hostname = page.locator("#settings-cname");
  await expect(hostname).toHaveAttribute("aria-invalid", "true");
  await expect(hostname).toHaveAccessibleDescription(
    "Hostname: already in use by another site"
  );
});

test("deleting a goal, a note or a channel hands focus to its list", async ({
  page,
}) => {
  const suffix = randomUUID().slice(0, 8);
  await signIn(page);

  await page.goto("/dashboard/goals?site=1");
  const manage = page.getByRole("region", { name: "Manage goals" });
  await manage.getByLabel("Name", { exact: true }).fill(`Focus ${suffix}`);
  await manage.getByLabel("Event name or page path").fill(`focus-${suffix}`);
  await manage.getByRole("button", { name: "Add goal" }).click();
  await expect(manage.getByRole("status")).toHaveText("Goal added.");
  await manage.getByRole("button", { name: `Delete Focus ${suffix}` }).click();
  await expect(manage.getByRole("status")).toHaveText("Goal deleted.");
  await expect(
    page.getByRole("heading", { name: "Manage goals" })
  ).toBeFocused();

  await page.goto(`/dashboard?site=1&${PERIOD}`);
  const notes = page
    .getByRole("region", { name: "Traffic over time" })
    .getByRole("region", { name: "Notes" });
  await notes.getByLabel("Date").fill("2026-10-04");
  await notes.getByLabel("Note", { exact: true }).fill(`Focus ${suffix}`);
  await notes.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByText("Note added.")).toBeVisible();
  await notes
    .getByRole("button", { name: `Delete note: Focus ${suffix}` })
    .click();
  await expect(page.getByText("Note deleted.")).toBeVisible();
  await expect(notes.getByRole("heading", { name: "Notes" })).toBeFocused();

  await page.goto("/dashboard/settings/notifications?site=1");
  await page.getByLabel("Channel type").selectOption("webhook");
  await page.getByLabel("Name", { exact: true }).fill(`Focus ${suffix}`);
  await page
    .getByLabel("Webhook URL")
    .fill(`http://localhost:9/focus-${suffix}`);
  await page.getByRole("button", { name: "Add channel" }).click();
  const remove = page
    .getByRole("listitem")
    .filter({ hasText: `Focus ${suffix}` })
    .getByRole("button", { name: /Delete/ });
  try {
    await expect(page.getByText("Channel added.")).toBeVisible();
    // The add form remounts with its defaults; focus starts it again.
    await expect(page.getByLabel("Channel type")).toBeFocused();
    await remove.click();
    await expect(page.getByText("Channel deleted.")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Channels", exact: true })
    ).toBeFocused();
  } finally {
    if (await remove.count()) await remove.click();
  }
});

test("clearing the path filter returns focus to the filter input", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/dashboard/browsers?site=1&filter=blog");
  await page.getByRole("button", { name: "Clear filter" }).click();
  await expect(page).not.toHaveURL(/filter=/);
  await expect(page.locator("#filter-paths")).toBeFocused();
});

test("Indonesian names the unknown row, and fewer numbers keeps the traffic table as shares", async ({
  page,
}) => {
  // A user of its own: display preferences are stored per email.
  const email = `followups-${randomUUID().slice(0, 8)}@example.com`;
  await signIn(page, email);
  const saved = await page.request.post("/dashboard/customize?/saveDisplay", {
    form: { fewerNumbers: "on", locale: "id" },
    headers: actionHeaders(page),
  });
  expect(await saved.json()).toMatchObject({ type: "success" });

  try {
    await page.goto(`/dashboard/referrers?site=1&${PERIOD}`);
    const chart = page.getByRole("list", { name: "Grafik rincian" });
    await expect(
      chart.getByText("Tidak diketahui", { exact: true })
    ).toBeVisible();
    await expect(chart.getByText("Unknown", { exact: true })).toHaveCount(0);

    await page.goto(`/dashboard?site=1&${PERIOD}&group=day`);
    const table = page.getByRole("table", {
      name: /persentase dari periode tersibuk/,
    });
    // 3 Oct has 180 visits of the 430 peak.
    await expect(
      table.getByRole("row").nth(1).getByRole("cell").nth(1)
    ).toHaveText("42%");
    await expect(table.getByRole("cell", { name: "100%" })).toHaveCount(1);
  } finally {
    await page.request.post("/dashboard/customize?/saveDisplay", {
      form: { locale: "follow" },
      headers: actionHeaders(page),
    });
  }
});
