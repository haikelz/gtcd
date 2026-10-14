import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "correct-horse";

/** Fail the test on console errors, which include CSP violations. */
function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  return errors;
}

async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("password login opens the overview", async ({ page }) => {
  const errors = trackErrors(page);

  await signIn(page, "qa@example.com");

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("main")).toContainText(/2.080/);
  expect(errors).toEqual([]);
});

test("TOTP accounts finish login with a code", async ({ page }) => {
  const errors = trackErrors(page);

  await signIn(page, "mfa@example.com");
  await expect(
    page.getByRole("heading", { name: "Two-factor authentication" })
  ).toBeVisible();

  await page.getByLabel("Authentication code").fill("000000");
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByText("That code is not valid.")).toBeVisible();

  await page.getByLabel("Authentication code").fill("123456");
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  expect(errors).toEqual([]);
});

test("repeated wrong passwords hit the rate limit", async ({ page }) => {
  for (let i = 0; i < 5; i++) {
    await signIn(page, "limited@example.com", "wrong");
    await expect(page.getByText("Invalid email or password")).toBeVisible();
  }

  await signIn(page, "limited@example.com");
  await expect(page.getByText("Too many sign-in attempts.")).toBeVisible();
});

test("every script opts out of Cloudflare Rocket Loader", async ({
  request,
}) => {
  const html = await (await request.get("/login")).text();
  const scripts = html.match(/<script\b[^>]*>/g) ?? [];

  expect(scripts.length).toBeGreaterThan(0);
  for (const tag of scripts) expect(tag).toContain('data-cfasync="false"');
});

test("login links to GoatCounter's password reset", async ({ page }) => {
  await page.goto("/login");
  await expect(
    page.getByRole("link", { name: "Forgot password?" })
  ).toHaveAttribute("href", "http://localhost:5187/user/forgot");
});
