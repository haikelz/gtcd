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
