import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "correct-horse";
const MOCK = `http://127.0.0.1:${process.env.TEST_MOCK_PORT ?? 5187}`;

type LoggedRequest = {
  readonly host?: string;
  readonly method: string;
  readonly path: string;
};

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("qa@example.com");
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function upstreamRequests(page: Page): Promise<LoggedRequest[]> {
  return (await page.request.get(`${MOCK}/__requests`)).json();
}

/** Run `act`, then return the upstream requests it caused. */
async function requestsDuring(
  page: Page,
  act: () => Promise<void>
): Promise<LoggedRequest[]> {
  const before = (await upstreamRequests(page)).length;
  await act();
  return (await upstreamRequests(page)).slice(before);
}

/** Click `button` and return the form action request it sends. */
async function submitAction(page: Page, button: string) {
  const [request] = await Promise.all([
    page.waitForRequest(
      (request) =>
        request.method() === "POST" &&
        new URL(request.url()).pathname.startsWith("/dashboard/")
    ),
    page.getByRole("button", { name: button, exact: true }).first().click(),
  ]);
  return request;
}

// The mock cannot tell sites apart by Host (Node's fetch drops that header),
// so these checks follow the site through the action URL, the server's
// redirect and site-scoped upstream paths.
test("exports, settings and test visits act on the selected second site", async ({
  page,
}) => {
  await signIn(page);

  await page.goto("/dashboard/exports?site=2");
  const exportRequest = await submitAction(page, "Create export");
  expect(new URL(exportRequest.url()).searchParams.get("site")).toBe("2");
  const exportResponse = await exportRequest.response();
  expect(exportResponse?.headers().location).toMatch(
    /^\/dashboard\/exports\?site=2&export=\d+$/
  );

  await page.goto("/dashboard/settings?site=2");
  const updateRequests = await requestsDuring(page, async () => {
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(/site=2&updated=\d+/);
    await expect(page.getByText("Site settings saved.")).toBeVisible();
  });
  expect(updateRequests).toContainEqual(
    expect.objectContaining({ method: "PATCH", path: "/api/v0/sites/2" })
  );
  await expect(page.getByText("This site cannot be managed here.")).toHaveCount(
    0
  );

  const visitRequest = await submitAction(page, "Send test visit");
  expect(new URL(visitRequest.url()).searchParams.get("site")).toBe("2");
  await expect(page.getByText(/^Test visit sent/)).toBeVisible();
});

test("overview links keep the selected site and period", async ({ page }) => {
  await signIn(page);
  await page.goto("/dashboard?site=2&range=month");

  const browsers = page.getByRole("link", { name: "View browser report" });
  await expect(browsers).toHaveAttribute("href", /site=2/);
  await expect(browsers).toHaveAttribute("href", /range=month/);
  const pageLink = page.locator('a[href^="/dashboard/pages/2?"]').first();
  await expect(pageLink).toHaveAttribute("href", /site=2/);
  await expect(pageLink).toHaveAttribute("href", /range=month/);
  const sidebarLink = page.getByRole("link", { name: "Systems", exact: true });
  await expect(sidebarLink).toHaveAttribute("href", /site=2/);
  await expect(sidebarLink).toHaveAttribute("href", /range=month/);
});
