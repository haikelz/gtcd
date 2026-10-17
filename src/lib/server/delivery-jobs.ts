import { createHash, randomUUID } from "node:crypto";
import { getRedis, pingRedis } from "$lib/server/auth/session-store.js";
import {
  latestCompletedPeriod,
  type ReportFrequency,
} from "$lib/report-period.js";
import {
  readDurableJson,
  updateDurableJson,
} from "$lib/server/durable-state.js";

const RETENTION_SECONDS = 400 * 86400;
const MAX_JOBS = 1024;
const LEASE_MS = 120_000;
const MAX_ATTEMPTS = 5;
const META_KEY = "email-report:scheduler-state";

type Attempt = {
  attempts: number;
  sent: boolean;
  status: "pending" | "failed" | "succeeded";
  retryAt: number;
  updatedAt: number;
};
type Ledger = Record<string, Attempt>;
type SchedulerState = {
  cursor: string | null;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
};

export function deliveryIdentity(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function ledgerKey(email: string): string {
  return `email-report:jobs:${deliveryIdentity(email.trim().toLowerCase())}`;
}

/** Keep an unfinished period across midnight, but abandon an edited config. */
export async function selectDeliveryPeriod(
  email: string,
  kind: "alert" | "summary",
  configuration: readonly unknown[],
  frequency: Exclude<ReportFrequency, "never">,
  localNow: Date
) {
  const key = `email-report:active:${kind}:${deliveryIdentity(email)}`;
  const config = deliveryIdentity(configuration);
  const value = await readDurableJson(key);
  let selectedNow = localNow;
  if (value !== undefined) {
    if (
      !value ||
      typeof value !== "object" ||
      !("config" in value) ||
      typeof value.config !== "string" ||
      !("time" in value) ||
      typeof value.time !== "number" ||
      !Number.isFinite(value.time)
    )
      throw new Error("Invalid active delivery period");
    if (value.config === config) {
      const priorNow = new Date(value.time);
      const priorPeriod = latestCompletedPeriod(frequency, priorNow);
      const identity = deliveryIdentity([
        email,
        kind,
        configuration,
        priorPeriod.key,
      ]);
      const ledger = parseLedger(await readDurableJson(ledgerKey(email)));
      const prior = ledger[identity];
      if (
        prior &&
        prior.status !== "succeeded" &&
        prior.attempts < MAX_ATTEMPTS
      )
        selectedNow = priorNow;
    }
  }
  await updateDurableJson(
    key,
    () => ({ config, time: selectedNow.getTime() }),
    RETENTION_SECONDS
  );
  return latestCompletedPeriod(frequency, selectedNow);
}

function parseLedger(value: unknown): Ledger {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid delivery ledger");
  for (const entry of Object.values(value)) {
    if (
      !entry ||
      typeof entry !== "object" ||
      !Number.isInteger(entry.attempts) ||
      entry.attempts < 0 ||
      typeof entry.sent !== "boolean" ||
      !["pending", "failed", "succeeded"].includes(entry.status) ||
      !Number.isFinite(entry.retryAt) ||
      !Number.isFinite(entry.updatedAt)
    )
      throw new Error("Invalid delivery attempt");
  }
  return value as Ledger;
}

/** Unique owners, compare-and-renew/release; Redis outages never grant a lease. */
export async function acquireDeliveryLease(name: string) {
  if (!(await pingRedis())) throw new Error("Delivery storage unavailable");
  const redis = getRedis();
  const key = `email-report:lease:${name}`;
  const owner = randomUUID();
  if ((await redis.set(key, owner, "PX", LEASE_MS, "NX")) !== "OK") return null;
  let valid = true;
  async function assertValid(): Promise<void> {
    if (!valid) throw new Error("Delivery lease lost");
    try {
      const renewed = await redis.eval(
        "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('PEXPIRE', KEYS[1], ARGV[2]) end return 0",
        1,
        key,
        owner,
        LEASE_MS
      );
      if (renewed !== 1) throw new Error("Delivery lease lost");
    } catch (cause) {
      valid = false;
      throw cause;
    }
  }
  const timer = setInterval(() => {
    assertValid().catch(() => {
      valid = false;
    });
  }, LEASE_MS / 3);
  timer.unref?.();
  return {
    assertValid,
    async update<T>(
      keyToWrite: string,
      update: (value: unknown) => T,
      ttlSeconds: number
    ): Promise<T> {
      for (let attempt = 0; attempt < 20; attempt++) {
        await assertValid();
        const raw = await redis.get(keyToWrite);
        const next = update(raw === null ? undefined : JSON.parse(raw));
        const result = await redis.eval(
          `if redis.call('GET', KEYS[1]) ~= ARGV[1] then return -1 end
           if (redis.call('GET', KEYS[2]) or '') ~= ARGV[2] then return 0 end
           redis.call('SET', KEYS[2], ARGV[3], 'EX', ARGV[4])
           return 1`,
          2,
          key,
          keyToWrite,
          owner,
          raw ?? "",
          JSON.stringify(next),
          ttlSeconds
        );
        if (result === 1) return next;
        if (result === -1) {
          valid = false;
          throw new Error("Delivery lease lost");
        }
      }
      throw new Error("Delivery storage busy");
    },
    async release() {
      clearInterval(timer);
      valid = false;
      await redis.eval(
        "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0",
        1,
        key,
        owner
      );
    },
  };
}

/**
 * SMTP is at-least-once: a crash after acceptance but before the success write
 * can repeat delivery. A success record precedes the subscription checkpoint,
 * so checkpoint failures alone never resend. Records expire after 400 days;
 * each recipient is capped at 1024 records (fail closed when full).
 */
export async function runDeliveryJob(
  email: string,
  identity: string,
  deliver: (assertValid: () => Promise<void>) => Promise<boolean | void>
): Promise<"sent" | "succeeded" | "deferred"> {
  const lease = await acquireDeliveryLease(identity);
  if (!lease) return "deferred";
  const key = ledgerKey(email);
  try {
    const ledger = parseLedger(await readDurableJson(key));
    const prior = ledger[identity];
    if (prior?.status === "succeeded") return prior.sent ? "sent" : "succeeded";
    if (prior && (prior.attempts >= MAX_ATTEMPTS || prior.retryAt > Date.now()))
      return "deferred";
    const attempts = (prior?.attempts ?? 0) + 1;
    let sent = false;
    const heldLease = lease;
    async function save(status: Attempt["status"]) {
      await heldLease.assertValid();
      await heldLease.update(
        key,
        (value) => {
          const entries = Object.fromEntries(
            Object.entries(parseLedger(value)).filter(
              ([, entry]) =>
                entry.updatedAt > Date.now() - RETENTION_SECONDS * 1000
            )
          );
          if (!entries[identity] && Object.keys(entries).length >= MAX_JOBS)
            throw new Error("Delivery ledger capacity reached");
          entries[identity] = {
            attempts,
            sent,
            status,
            retryAt:
              Date.now() +
              Math.min(24 * 3600_000, 15 * 60_000 * 2 ** (attempts - 1)) +
              Math.floor(Math.random() * 60_000),
            updatedAt: Date.now(),
          };
          return entries;
        },
        RETENTION_SECONDS
      );
    }
    // A crashed pending attempt also has a bounded retry time and attempt count.
    await save("pending");
    try {
      sent = (await deliver(lease.assertValid)) !== false;
    } catch (cause) {
      await save("failed");
      throw cause;
    }
    await save("succeeded");
    return sent ? "sent" : "succeeded";
  } finally {
    await lease.release();
  }
}

export async function getSchedulerState(): Promise<SchedulerState> {
  const value = await readDurableJson(META_KEY);
  if (!value) return { cursor: null, lastRunAt: null, lastSuccessAt: null };
  const record = value as Record<string, unknown>;
  for (const field of ["cursor", "lastRunAt", "lastSuccessAt"])
    if (record[field] !== null && typeof record[field] !== "string")
      throw new Error("Invalid scheduler state");
  return record as SchedulerState;
}

export async function saveSchedulerState(
  state: SchedulerState,
  lease: NonNullable<Awaited<ReturnType<typeof acquireDeliveryLease>>>
): Promise<void> {
  await lease.update(META_KEY, () => state, RETENTION_SECONDS);
}

/** Admin-only aggregate surface: never returns identities or recipients. */
export async function deliveryDiagnostics(emails: readonly string[]) {
  const { lastRunAt, lastSuccessAt } = await getSchedulerState();
  let pending = 0;
  let failed = 0;
  for (const email of emails) {
    const ledger = parseLedger(await readDurableJson(ledgerKey(email)));
    for (const entry of Object.values(ledger)) {
      if (entry.updatedAt <= Date.now() - RETENTION_SECONDS * 1000) continue;
      if (entry.status === "pending" && entry.attempts < MAX_ATTEMPTS)
        pending++;
      if (
        entry.status === "failed" ||
        (entry.status === "pending" && entry.attempts >= MAX_ATTEMPTS)
      )
        failed++;
    }
  }
  return { lastRunAt, lastSuccessAt, pending, failed };
}
