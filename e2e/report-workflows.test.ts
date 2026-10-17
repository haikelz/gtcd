import { readFileSync } from "node:fs";
import { createServer as createSmtpServer } from "node:net";
import { expect, test } from "@playwright/test";
import { createServer } from "vite";

test("saved views retain their site and traffic alerts validate and persist", async ({
  page,
  playwright,
}) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const fixture = readFileSync("e2e/mock-goatcounter.mjs", "utf8");
  const password = fixture.match(/const PASSWORD = ("[^"]+");/);
  if (!password) throw new Error("Missing mock login fixture");
  await page.goto("/login");
  await page.getByLabel("Email").fill("views@example.com");
  await page
    .getByLabel("Password", { exact: true })
    .fill(JSON.parse(password[1]));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/dashboard?site=2&range=month&filter=docs&group=day");
  await page.getByRole("button", { name: "Views", exact: true }).click();
  await page.getByRole("menuitem", { name: "Save current view…" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Journal traffic");
  await page.getByRole("button", { name: "Save view", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\?/);
  await expect(page).toHaveURL(/site=2/);
  await page.goto("/dashboard/customize?site=1");
  const saved = page.getByRole("link", {
    name: "Journal traffic",
    exact: true,
  });
  await expect(saved).toHaveAttribute("href", /site=2/);
  await saved.click();
  await expect(page).toHaveURL(/filter=docs/);
  await expect(page).toHaveURL(/site=2/);
  await expect(page).toHaveURL(/group=day/);

  const comparison = page.getByRole("region", { name: "Period comparison" });
  await expect(
    comparison.getByText("United States", { exact: false })
  ).toBeVisible();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => {
        localStorage.setItem("gtcd_theme", value);
        document.documentElement.classList.toggle("dark", value === "dark");
      }, theme);
      await comparison.screenshot({
        animations: "disabled",
        path: `.amp/in/artifacts/overview-comparison-${width}-${theme}.png`,
      });
    }
  }

  await page.goto("/dashboard/customize?site=2");
  await page.getByLabel("Enable daily traffic alerts").check();
  await page.getByLabel("Minimum change (%)", { exact: true }).fill("60");
  await page.getByLabel("Minimum previous-day pageviews").fill("200");
  await page
    .getByRole("button", { name: "Save traffic alert", exact: true })
    .click();
  await expect(
    page.getByText("Traffic alert saved. Checks start tomorrow.")
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Enable daily traffic alerts")).toBeChecked();
  await expect(
    page.getByLabel("Minimum change (%)", { exact: true })
  ).toHaveValue("60");
  await expect(page.locator("#alert-site")).toHaveValue("2");

  const actionHeaders = {
    accept: "application/json",
    origin: "http://127.0.0.1:4173",
    "x-sveltekit-action": "true",
  };
  for (const fields of [
    { threshold: "0", minimum: "100", siteId: "1" },
    { threshold: "50", minimum: "100", siteId: "999" },
  ]) {
    const response = await page.request.post(
      "/dashboard/customize?/saveTrafficAlert",
      {
        form: { enabled: "on", direction: "either", ...fields },
        headers: actionHeaders,
      }
    );
    expect(await response.json()).toMatchObject({
      type: "failure",
      status: 400,
    });
  }
  const anonymous = await playwright.request.newContext();
  try {
    const response = await anonymous.post(
      "/dashboard/customize?/saveTrafficAlert",
      {
        form: {
          enabled: "on",
          threshold: "50",
          minimum: "100",
          siteId: "1",
          direction: "either",
        },
        headers: actionHeaders,
      }
    );
    expect(await response.json()).toMatchObject({
      type: "redirect",
      location: "/login",
    });
  } finally {
    await anonymous.dispose();
  }

  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => {
        localStorage.setItem("gtcd_theme", value);
        document.documentElement.classList.toggle("dark", value === "dark");
      }, theme);
      await page
        .getByRole("region", { name: "Traffic alerts", exact: true })
        .screenshot({
          animations: "disabled",
          path: `.amp/in/artifacts/traffic-alert-${width}-${theme}.png`,
        });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        )
      ).toBe(true);
    }
  }
  await page.getByLabel("Enable daily traffic alerts").uncheck();
  await page
    .getByRole("button", { name: "Save traffic alert", exact: true })
    .click();
  await expect(page.getByText("Traffic alerts turned off.")).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel("Enable daily traffic alerts")
  ).not.toBeChecked();
  expect(errors).toEqual([]);
});

test("scheduled summaries and daily alerts deliver through SMTP, deduplicate, retry and stop", async () => {
  test.setTimeout(60_000);
  const messages: string[] = [];
  let rejectMail = false;
  const smtp = createSmtpServer((socket) => {
    let buffer = "";
    let body = "";
    let inData = false;
    socket.write("220 localhost ESMTP\r\n");
    socket.on("data", (chunk) => {
      buffer += chunk.toString();
      let newline: number;
      while ((newline = buffer.indexOf("\r\n")) >= 0) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 2);
        if (inData) {
          if (line === ".") {
            messages.push(body);
            body = "";
            inData = false;
            socket.write("250 accepted\r\n");
          } else body += `${line}\n`;
        } else if (line.startsWith("EHLO")) socket.write("250 localhost\r\n");
        else if (line.startsWith("MAIL") && rejectMail)
          socket.write("451 try later\r\n");
        else if (line === "DATA") {
          inData = true;
          socket.write("354 send message\r\n");
        } else if (line === "QUIT") socket.end("221 bye\r\n");
        else socket.write("250 ok\r\n");
      }
    });
  });
  await new Promise<void>((resolve) => smtp.listen(0, "127.0.0.1", resolve));
  const address = smtp.address();
  if (!address || typeof address === "string")
    throw new Error("SMTP sink did not bind");
  const settings = {
    GOATCOUNTER_API_KEY: "e2e",
    GOATCOUNTER_URL: "http://127.0.0.1:5187",
    REDIS_URL: "redis://127.0.0.1:1",
    SMTP_HOST: "127.0.0.1",
    SMTP_PORT: String(address.port),
    SMTP_SECURE: "false",
    SMTP_FROM: "e2e@example.invalid",
    SMTP_USER: "",
    SMTP_PASSWORD: "",
  };
  const previous = Object.fromEntries(
    Object.keys(settings).map((key) => [key, process.env[key]])
  );
  Object.assign(process.env, settings);
  const vite = await createServer({ server: { middlewareMode: true } });
  try {
    const reports = await vite.ssrLoadModule(
      "/src/lib/server/email-reports.ts"
    );
    const email = "delivery@example.invalid";
    await reports.updateTrafficAlert(
      email,
      { direction: "either", minimum: 100, threshold: 50 },
      1
    );
    await reports.sendDueReports();
    expect(messages).toHaveLength(0);

    const now = new Date("2040-04-03T09:00:00Z");
    await Promise.all([
      reports.sendDueReports(now),
      reports.sendDueReports(now),
    ]);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("Traffic alert");
    expect(messages[0]).toContain("+200.0%");
    await reports.sendDueReports(now);
    expect(messages).toHaveLength(1);
    expect((await reports.getSubscription(email)).trafficAlert.lastSentAt).toBe(
      now.toISOString()
    );

    await reports.updateSubscription(email, "daily", 1);
    await reports.sendDueReports(now);
    expect(messages).toHaveLength(2);
    expect(messages[1]).toContain("Daily report");
    await reports.sendDueReports(now);
    expect(messages).toHaveLength(2);
    await reports.updateSubscription(email, "never", 1);

    rejectMail = true;
    await reports.sendDueReports(new Date("2040-04-02T09:00:00Z"));
    expect(
      (await reports.getSubscription(email)).trafficAlert.lastError
    ).toContain("Could not check or deliver");
    expect(messages).toHaveLength(2);
    rejectMail = false;
    await reports.sendDueReports(new Date("2040-04-02T09:00:00Z"));
    expect(messages).toHaveLength(3);
    expect(
      (await reports.getSubscription(email)).trafficAlert.lastError
    ).toBeNull();

    await reports.updateTrafficAlert(email, null, 1);
    await reports.sendDueReports(new Date("2040-04-04T09:00:00Z"));
    expect(messages).toHaveLength(3);
    expect((await reports.getSubscription(email)).trafficAlert).toBeNull();
  } finally {
    await vite.close();
    await new Promise<void>((resolve) => smtp.close(() => resolve()));
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
