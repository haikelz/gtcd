import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createServer } from "vite";

test("independent workers coordinate leases, cap retries and retain success without a checkpoint", async () => {
  const previous = process.env.REDIS_URL;
  process.env.REDIS_URL =
    process.env.TEST_REDIS_URL ?? "redis://127.0.0.1:6379";
  const first = await createServer({ server: { middlewareMode: true } });
  const second = await createServer({ server: { middlewareMode: true } });
  const email = `scheduler-${randomUUID()}@example.invalid`;
  const identity = randomUUID();
  const leaseName = randomUUID();
  try {
    const a = await first.ssrLoadModule("/src/lib/server/delivery-jobs.ts");
    const b = await second.ssrLoadModule("/src/lib/server/delivery-jobs.ts");
    const sessions = await first.ssrLoadModule(
      "/src/lib/server/auth/session-store.ts"
    );
    const state = await first.ssrLoadModule("/src/lib/server/durable-state.ts");
    const key = `email-report:jobs:${a.deliveryIdentity(email)}`;
    const configuration = [1, "daily", randomUUID()];
    const period = await a.selectDeliveryPeriod(
      email,
      "summary",
      configuration,
      "daily",
      new Date("2040-04-03T09:00:00Z")
    );
    const failedIdentity = a.deliveryIdentity([
      email,
      "summary",
      configuration,
      period.key,
    ]);
    let calls = 0;
    let enter!: () => void;
    let finish!: () => void;
    const entered = new Promise<void>((resolve) => {
      enter = resolve;
    });
    const finishing = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const running = a.runDeliveryJob(
      email,
      identity,
      async (valid: () => Promise<void>) => {
        calls++;
        enter();
        await finishing;
        await valid();
      }
    );
    await entered;
    expect(
      await b.runDeliveryJob(email, identity, async () => {
        calls++;
      })
    ).toBe("deferred");
    finish();
    expect(await running).toBe("sent");
    expect(
      await b.runDeliveryJob(email, identity, async () => {
        calls++;
      })
    ).toBe("sent");
    expect(calls).toBe(1);

    for (let attempt = 1; attempt <= 5; attempt++) {
      await expect(
        a.runDeliveryJob(email, failedIdentity, async () => {
          throw new Error("SMTP unavailable");
        })
      ).rejects.toThrow("SMTP unavailable");
      const ledger = await state.readDurableJson(key);
      expect(ledger[failedIdentity]).toMatchObject({
        attempts: attempt,
        status: "failed",
      });
      expect(ledger[failedIdentity].retryAt).toBeGreaterThan(Date.now());
      if (attempt === 1) {
        const continued = await b.selectDeliveryPeriod(
          email,
          "summary",
          configuration,
          "daily",
          new Date("2040-04-04T09:00:00Z")
        );
        expect(continued.key).toBe(period.key);
      }
      expect(
        await b.runDeliveryJob(email, failedIdentity, async () => {
          calls++;
        })
      ).toBe("deferred");
      await state.updateDurableJson(key, (value: Record<string, unknown>) => ({
        ...value,
        [failedIdentity]: { ...ledger[failedIdentity], retryAt: 0 },
      }));
    }
    expect(
      await b.runDeliveryJob(email, failedIdentity, async () => {
        calls++;
      })
    ).toBe("deferred");
    expect(calls).toBe(1);
    expect(await a.deliveryDiagnostics([email])).toMatchObject({
      pending: 0,
      failed: 1,
    });

    const lease = await a.acquireDeliveryLease(leaseName);
    expect(lease).not.toBeNull();
    const leaseKey = `email-report:lease:${leaseName}`;
    await sessions.getRedis().set(leaseKey, "replacement", "PX", 10_000);
    await expect(lease.assertValid()).rejects.toThrow("Delivery lease lost");
    await lease.release();
    expect(await sessions.getRedis().get(leaseKey)).toBe("replacement");
    sessions.getRedis().disconnect();
    await expect(
      a.runDeliveryJob(email, randomUUID(), async () => {
        calls++;
      })
    ).rejects.toThrow("Delivery storage unavailable");
    expect(calls).toBe(1);
  } finally {
    for (const server of [first, second]) {
      const sessions = await server.ssrLoadModule(
        "/src/lib/server/auth/session-store.ts"
      );
      if (await sessions.pingRedis()) {
        const jobs = await server.ssrLoadModule(
          "/src/lib/server/delivery-jobs.ts"
        );
        await sessions
          .getRedis()
          .del(
            `email-report:jobs:${jobs.deliveryIdentity(email)}`,
            `email-report:active:summary:${jobs.deliveryIdentity(email)}`,
            `email-report:lease:${leaseName}`
          );
      }
      sessions.getRedis().disconnect();
      await server.close();
    }
    if (previous === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = previous;
  }
});
