import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer as createHttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { expect, test, type Page } from "@playwright/test";
import { createServer } from "vite";
import { testRedisUrl } from "./test-redis";

const PASSWORD = "correct-horse";

type Received = { readonly body: string; readonly path: string };

/** A local webhook receiver; `status` is what it answers next. */
async function startReceiver() {
  const receiver = {
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
    port: 0,
    received: [] as Received[],
    status: 204,
  };
  const server = createHttpServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      receiver.received.push({ body, path: req.url ?? "" });
      res.writeHead(
        receiver.status,
        receiver.status === 302 ? { location: "/followed" } : {}
      );
      res.end();
    });
  });
  server.listen(0, "localhost");
  await once(server, "listening");
  receiver.port = (server.address() as AddressInfo).port;

  return receiver;
}

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

test("an admin adds a webhook channel, sends a test message and never sees the URL again", async ({
  page,
}) => {
  const receiver = await startReceiver();
  const secretPath = `/hook/${randomUUID()}`;
  const label = `Ops ${randomUUID().slice(0, 8)}`;
  try {
    await signIn(page, "qa@example.com");
    await page.goto("/dashboard/settings?site=1");
    await page.getByRole("link", { name: "Manage channels" }).click();
    await expect(page).toHaveURL(
      /\/dashboard\/settings\/notifications\?site=1/
    );

    await page.getByLabel("Channel type").selectOption("webhook");
    await page.getByLabel("Name", { exact: true }).fill(label);
    await page
      .getByLabel("Webhook URL")
      .fill(`http://localhost:${receiver.port}${secretPath}`);
    await page.getByLabel("Scheduled summaries").check();
    await page.getByRole("button", { name: "Add channel" }).click();
    await expect(
      page.getByText("Channel added.", { exact: false })
    ).toBeVisible();

    const item = page.getByRole("listitem").filter({ hasText: label });
    await expect(item).toContainText(`http://localhost:${receiver.port}/••••`);
    await expect(item).toContainText("Weekly report");
    await expect(item).toContainText("Nothing sent yet.");

    // Neither the page nor its serialized data carries the saved URL.
    await page.reload();
    expect(await page.content()).not.toContain(secretPath);
    const data = await page.request.get(
      "/dashboard/settings/notifications/__data.json?site=1"
    );
    expect(data.status()).toBe(200);
    expect(await data.text()).not.toContain(secretPath);

    await item.getByRole("button", { name: /Send test message/ }).click();
    await expect(page.getByText("Test message delivered.")).toBeVisible();
    // Scheduled runs from parallel tests may also reach this channel.
    const tests = receiver.received.filter(
      (entry) => JSON.parse(entry.body).event === "test"
    );
    expect(tests).toHaveLength(1);
    expect(tests[0].path).toBe(secretPath);
    expect(JSON.parse(tests[0].body)).toEqual({
      event: "test",
      site: "demo.example",
      text: expect.stringContaining("Test message from gtcd for demo.example"),
    });

    await item.getByRole("button", { name: /Delete/ }).click();
    await expect(page.getByText("Channel deleted.")).toBeVisible();
    await expect(
      page.getByRole("listitem").filter({ hasText: label })
    ).toHaveCount(0);
  } finally {
    await receiver.close();
  }
});

test("webhook channels refuse private and non-https targets the operator did not allow", async ({
  page,
}) => {
  const receiver = await startReceiver();
  const label = `Internal ${randomUUID().slice(0, 8)}`;
  try {
    await signIn(page, "qa@example.com");
    await page.goto("/dashboard/settings/notifications?site=1");
    await page.getByLabel("Channel type").selectOption("webhook");
    await page.getByLabel("Name", { exact: true }).fill(label);
    // The allowlist names "localhost"; the same receiver by IP is refused.
    await page
      .getByLabel("Webhook URL")
      .fill(`https://127.0.0.1:${receiver.port}/hook`);
    await page.getByRole("button", { name: "Add channel" }).click();
    await expect(
      page.getByText(
        "This URL points to a private, local or reserved address.",
        {
          exact: false,
        }
      )
    ).toBeVisible();

    for (const [url, message] of [
      ["https://10.0.0.8/hook", "private, local or reserved"],
      [
        "https://169.254.169.254/latest/meta-data",
        "private, local or reserved",
      ],
      ["https://[::ffff:127.0.0.1]/hook", "private, local or reserved"],
      ["https://100.64.0.1/hook", "private, local or reserved"],
      ["http://example.com/hook", "Use an https:// URL."],
      ["https://user:pass@example.com/hook", "Remove the user name"],
    ]) {
      const response = await page.request.post(
        "/dashboard/settings/notifications?/add&site=1",
        {
          form: {
            alerts: "on",
            direction: "either",
            label,
            minimum: "100",
            threshold: "50",
            type: "webhook",
            url,
          },
          headers: actionHeaders(page),
        }
      );
      const result = await response.json();
      expect(result, url).toMatchObject({ type: "failure", status: 400 });
      expect(result.data, url).toContain(message);
    }

    expect(receiver.received).toHaveLength(0);
    await page.reload();
    await expect(page.getByText(label)).toHaveCount(0);
  } finally {
    await receiver.close();
  }
});

test("channel delivery pins checked addresses, refuses redirects, sends once per period and retries", async () => {
  test.setTimeout(60_000);
  const receiver = await startReceiver();
  const owner = `channel-${randomUUID()}@example.invalid`;
  const settings: Record<string, string | undefined> = {
    GOATCOUNTER_API_KEY: "e2e",
    GOATCOUNTER_URL: `http://127.0.0.1:${process.env.TEST_MOCK_PORT ?? 5187}`,
    GTCD_ALLOWED_WEBHOOKS: undefined,
    GTCD_PUBLIC_URL: undefined,
    REDIS_URL: testRedisUrl(),
  };
  const previous = Object.fromEntries(
    Object.keys(settings).map((key) => [key, process.env[key]])
  );
  for (const [key, value] of Object.entries(settings)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  const vite = await createServer({ server: { middlewareMode: true } });
  const worker = await createServer({ server: { middlewareMode: true } });
  const hook = `http://localhost:${receiver.port}/scheduled`;
  let channelId: string | undefined;
  try {
    const channels = await vite.ssrLoadModule(
      "/src/lib/server/notification-channels.ts"
    );
    const otherChannels = await worker.ssrLoadModule(
      "/src/lib/server/notification-channels.ts"
    );
    const webhook = await vite.ssrLoadModule(
      "/src/lib/server/webhook-request.ts"
    );
    const input = {
      alert: { direction: "either", minimum: 100, threshold: 50 },
      chatId: "",
      label: "Scheduled",
      summary: "weekly",
      type: "webhook",
    };

    // Without the allowlist a name that resolves to loopback is refused at
    // save time and again at connect time, before any byte is sent.
    const loopback = `https://localhost:${receiver.port}/scheduled`;
    await expect(
      channels.addChannel(1, { ...input, secret: loopback }, owner)
    ).rejects.toMatchObject({ name: "WebhookRefused", problem: "private" });
    await expect(webhook.postWebhook(loopback, "{}")).rejects.toMatchObject({
      name: "WebhookRefused",
      problem: "private",
    });
    expect(receiver.received).toHaveLength(0);

    process.env.GTCD_ALLOWED_WEBHOOKS = "localhost";
    receiver.status = 302;
    await expect(webhook.postWebhook(hook, "{}")).rejects.toMatchObject({
      name: "WebhookFailed",
      status: 302,
    });
    expect(receiver.received.map((entry) => entry.path)).toEqual([
      "/scheduled",
    ]);
    receiver.received.length = 0;
    receiver.status = 204;

    const channel = await channels.addChannel(
      1,
      { ...input, secret: hook },
      owner
    );
    channelId = channel.id;
    const mine = () => receiver.received.map((entry) => JSON.parse(entry.body));

    const now = new Date("2040-04-03T09:00:00Z");
    await Promise.all([
      channels.sendDueChannelMessages(now),
      otherChannels.sendDueChannelMessages(now),
    ]);
    const sent = mine();
    expect(sent.map((event) => event.event).sort()).toEqual([
      "alert",
      "summary",
    ]);
    const alert = sent.find((event) => event.event === "alert");
    expect(alert.site).toBe("demo.example");
    expect(alert.text).toContain("Traffic alert: demo.example");
    expect(alert.text).toContain("+200.0%");
    expect(sent.find((event) => event.event === "summary").text).toContain(
      "Weekly report for demo.example"
    );
    await channels.sendDueChannelMessages(now);
    expect(mine()).toHaveLength(2);

    // A failed delivery is recorded and retried after backoff, not at once.
    receiver.status = 500;
    const earlier = new Date("2040-04-02T09:00:00Z");
    await channels.sendDueChannelMessages(earlier);
    expect(mine()).toHaveLength(3);
    const failed = (await channels.listChannels(1)).find(
      (entry: { id: string }) => entry.id === channel.id
    );
    expect(failed.lastFailureAt).toBe(earlier.toISOString());
    receiver.status = 204;
    await channels.sendDueChannelMessages(earlier);
    expect(mine()).toHaveLength(3);

    const state = await vite.ssrLoadModule("/src/lib/server/durable-state.ts");
    const jobs = await vite.ssrLoadModule("/src/lib/server/delivery-jobs.ts");
    await state.updateDurableJson(
      `email-report:jobs:${jobs.deliveryIdentity(`channel:${channel.id}`.toLowerCase())}`,
      (value: Record<string, { retryAt: number }>) =>
        Object.fromEntries(
          Object.entries(value).map(([key, entry]) => [
            key,
            { ...entry, retryAt: 0 },
          ])
        )
    );
    await channels.sendDueChannelMessages(earlier);
    expect(mine()).toHaveLength(4);
    expect(mine()[3].text).toContain("-95");
    const recovered = (await channels.listChannels(1)).find(
      (entry: { id: string }) => entry.id === channel.id
    );
    expect(recovered.lastFailureAt).toBeNull();
    expect(recovered).not.toHaveProperty("secret");

    await channels.deleteChannel(1, channel.id);
    channelId = undefined;
    await channels.sendDueChannelMessages(new Date("2040-04-05T09:00:00Z"));
    expect(mine()).toHaveLength(4);
  } finally {
    if (channelId) {
      const channels = await vite.ssrLoadModule(
        "/src/lib/server/notification-channels.ts"
      );
      await channels.deleteChannel(1, channelId).catch(() => {});
    }
    for (const server of [vite, worker]) {
      const sessions = await server.ssrLoadModule(
        "/src/lib/server/auth/session-store.ts"
      );
      sessions.getRedis().disconnect();
    }
    await worker.close();
    await vite.close();
    await receiver.close();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("channel storage fails closed when Redis is unavailable", async () => {
  const previous = process.env.REDIS_URL;
  process.env.REDIS_URL = "redis://127.0.0.1:1";
  const server = await createServer({ server: { middlewareMode: true } });
  try {
    const channels = await server.ssrLoadModule(
      "/src/lib/server/notification-channels.ts"
    );
    await expect(channels.listChannels(1)).rejects.toThrow(
      "Storage is unavailable"
    );
    await expect(channels.deleteChannel(1, "A".repeat(24))).rejects.toThrow(
      "Storage is unavailable"
    );
  } finally {
    const sessions = await server.ssrLoadModule(
      "/src/lib/server/auth/session-store.ts"
    );
    sessions.getRedis().disconnect();
    await server.close();
    if (previous === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = previous;
  }
});
