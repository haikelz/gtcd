import { randomInt, randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { createServer } from "vite";
import { testRedisUrl } from "./test-redis";

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

test("admins add and delete chart notes; everyone signed in sees them", async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);
  const text = `Newsletter sent ${randomUUID().slice(0, 8)}`;
  const outside = `Old launch ${randomUUID().slice(0, 8)}`;
  await signIn(page, "qa@example.com");
  await page.goto(`/dashboard?${PERIOD}&group=day`);

  const traffic = page.getByRole("region", { name: "Traffic over time" });
  const notes = traffic.getByRole("region", { name: "Notes" });
  await notes.getByLabel("Date").fill("2026-10-05");
  await notes.getByLabel("Note", { exact: true }).fill(text);
  await notes.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByText("Note added.")).toBeVisible();
  await expect(notes.getByLabel("Note", { exact: true })).toHaveValue("");
  await expect(
    notes.getByRole("listitem").filter({ hasText: text })
  ).toContainText("5 Oct ’26");

  // A note outside the period is stored but not listed or drawn here.
  await notes.getByLabel("Date").fill("2026-09-01");
  await notes.getByLabel("Note", { exact: true }).fill(outside);
  await notes.getByRole("button", { name: "Add note" }).click();
  await expect(notes.getByLabel("Note", { exact: true })).toHaveValue("");
  await expect(notes.getByText(outside)).toHaveCount(0);

  // The chart marks the day and its data table names the note.
  await expect(traffic.locator("svg title", { hasText: text })).toHaveCount(1);
  await traffic.getByRole("radio", { name: "Table" }).click();
  const row = traffic.getByRole("row").filter({ hasText: text });
  await expect(row.getByRole("cell").first()).toHaveText("5 Oct ’26");

  const invalid = await page.request.post(`/dashboard?/addNote&${PERIOD}`, {
    form: { date: "2026-02-30", text: "Bad date" },
    headers: actionHeaders(page),
  });
  expect(await invalid.json()).toMatchObject({ type: "failure", status: 400 });
  const crossSite = await page.request.post(`/dashboard?/addNote&${PERIOD}`, {
    form: { date: "2026-10-05", text: "Forged" },
    headers: { ...actionHeaders(page), origin: "https://evil.example" },
  });
  expect(crossSite.status()).toBe(403);

  const viewer = await browser.newPage({
    baseURL: new URL(page.url()).origin,
  });
  try {
    await signIn(viewer, `notes-viewer-${randomUUID()}@example.com`);
    await viewer.goto(`/dashboard?${PERIOD}`);
    const viewerNotes = viewer
      .getByRole("region", { name: "Traffic over time" })
      .getByRole("region", { name: "Notes" });
    await expect(viewerNotes.getByText(text)).toBeVisible();
    await expect(viewerNotes.getByRole("button")).toHaveCount(0);

    const refused = await viewer.request.post(`/dashboard?/addNote&${PERIOD}`, {
      form: { date: "2026-10-05", text: "Viewer note" },
      headers: actionHeaders(viewer),
    });
    expect(refused.status()).toBe(403);
    const id = await notes
      .getByRole("listitem")
      .filter({ hasText: text })
      .locator('input[name="id"]')
      .inputValue();
    const refusedDelete = await viewer.request.post(
      `/dashboard?/deleteNote&${PERIOD}`,
      { form: { id }, headers: actionHeaders(viewer) }
    );
    expect(refusedDelete.status()).toBe(403);
    await viewer.reload();
    await expect(viewerNotes.getByText(text)).toBeVisible();
    await expect(viewerNotes.getByText("Viewer note")).toHaveCount(0);
  } finally {
    await viewer.close();
  }

  await notes.getByRole("button", { name: `Delete note: ${text}` }).click();
  await expect(page.getByText("Note deleted.")).toBeVisible();
  await expect(notes.getByText(text)).toHaveCount(0);
  await expect(traffic.locator("svg title", { hasText: text })).toHaveCount(0);
});

test("annotation storage caps each site and filters by date", async () => {
  const previousRedisUrl = process.env.REDIS_URL;
  process.env.REDIS_URL = testRedisUrl();
  const server = await createServer({ server: { middlewareMode: true } });
  const siteId = randomInt(1_000_000, 9_999_999);
  try {
    const store = await server.ssrLoadModule("/src/lib/server/annotations.ts");
    const durable = await server.ssrLoadModule(
      "/src/lib/server/durable-state.ts"
    );
    await durable.updateDurableJson(`annotations:site:${siteId}`, () =>
      Array.from({ length: store.MAX_ANNOTATIONS - 1 }, (_, i) => ({
        createdAt: new Date().toISOString(),
        createdBy: "qa@example.com",
        date: "2026-10-01",
        id: randomUUID(),
        text: `Seed ${i}`,
      }))
    );
    const note = { createdBy: "qa@example.com", text: "Deployed v2" };

    const last = await store.addAnnotation(siteId, {
      ...note,
      date: "2026-10-06",
    });
    expect(last).toMatchObject({ date: "2026-10-06", text: "Deployed v2" });
    expect(
      await store.addAnnotation(siteId, { ...note, date: "2026-10-07" })
    ).toBeNull();
    await expect(
      store.addAnnotation(siteId, { ...note, date: "2026-13-01" })
    ).rejects.toThrow(RangeError);
    await expect(
      store.addAnnotation(siteId, { ...note, date: "2026-10-06", text: " " })
    ).rejects.toThrow(RangeError);

    expect(
      await store.listAnnotations(siteId, "2026-10-02", "2026-10-31")
    ).toEqual([last]);
    expect(await store.listAnnotations(siteId)).toHaveLength(
      store.MAX_ANNOTATIONS
    );

    await store.deleteAnnotation(siteId, last.id);
    expect(await store.listAnnotations(siteId, "2026-10-02")).toEqual([]);
  } finally {
    await server.close();
    process.env.REDIS_URL = previousRedisUrl;
  }
});
