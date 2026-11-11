import { randomUUID } from "node:crypto";
import {
  getRedis,
  pingRedis,
  reportRedisFailure,
} from "$lib/server/auth/session-store.js";
import { DurableStateUnavailable } from "$lib/server/durable-state.js";

export type AuditOutcome = "failure" | "success";

export type AuditEntry = {
  readonly action: string;
  /** Email of the signed-in user who acted. */
  readonly actor: string;
  readonly at: string;
  readonly outcome: AuditOutcome;
  readonly site: number | null;
  /** What was acted on: a name, id or form. Never field values or secrets. */
  readonly target: string;
};

// ponytail: one sorted set scored by time, trimmed on every write to 90 days
// and 2,000 entries, whichever keeps fewer. Ceiling: one key for the whole
// deployment (~1 MiB at the cap); shard by site or month if that ever grows.
const AUDIT_KEY = "audit-log";
const MAX_ENTRIES = 2_000;
const MAX_AGE_MS = 90 * 86_400_000;
const ACTION_PATTERN = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*$/;

function clip(value: string, length: number): string {
  return value
    .replace(/\p{Cc}/gu, " ")
    .trim()
    .slice(0, length);
}

/**
 * Record an admin action. Unlike durable settings, the audit trail never
 * blocks or fails the action it describes: an outage loses the entry and logs
 * that it did, because refusing site changes while Redis is down would turn a
 * storage problem into an administration outage.
 */
export async function recordAudit(
  entry: Omit<AuditEntry, "at">
): Promise<void> {
  const at = Date.now();
  const record: AuditEntry & { readonly id: string } = {
    action: ACTION_PATTERN.test(entry.action)
      ? entry.action.slice(0, 64)
      : "unknown",
    actor: clip(entry.actor.toLowerCase(), 254),
    at: new Date(at).toISOString(),
    // A random id keeps identical actions in the same millisecond distinct.
    id: randomUUID(),
    outcome: entry.outcome === "success" ? "success" : "failure",
    site:
      typeof entry.site === "number" && Number.isSafeInteger(entry.site)
        ? entry.site
        : null,
    target: clip(entry.target, 200),
  };

  try {
    if (!(await pingRedis())) throw new DurableStateUnavailable();
    const results = await getRedis()
      .multi()
      .zadd(AUDIT_KEY, at, JSON.stringify(record))
      .zremrangebyscore(AUDIT_KEY, "-inf", at - MAX_AGE_MS)
      .zremrangebyrank(AUDIT_KEY, 0, -(MAX_ENTRIES + 1))
      .exec();
    const failed = results?.find(([error]) => error)?.[0];
    if (!results || failed) throw failed ?? new Error("Audit write aborted");
  } catch (cause) {
    if (!(cause instanceof DurableStateUnavailable)) reportRedisFailure(cause);
    console.error(
      `audit log: could not record ${record.action}:`,
      cause instanceof Error ? cause.message : cause
    );
  }
}

function parseEntry(raw: string): AuditEntry | null {
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (
      typeof value.action !== "string" ||
      typeof value.actor !== "string" ||
      typeof value.at !== "string" ||
      (value.outcome !== "success" && value.outcome !== "failure") ||
      (value.site !== null && typeof value.site !== "number") ||
      typeof value.target !== "string"
    )
      return null;

    return {
      action: value.action,
      actor: value.actor,
      at: value.at,
      outcome: value.outcome,
      site: value.site,
      target: value.target,
    };
  } catch {
    return null;
  }
}

/** One page of entries, newest first; fails closed when Redis is down. */
export async function readAudit(
  offset: number,
  limit: number
): Promise<{ readonly entries: AuditEntry[]; readonly total: number }> {
  if (!(await pingRedis())) throw new DurableStateUnavailable();

  try {
    const redis = getRedis();
    const oldest = Date.now() - MAX_AGE_MS;
    const [raw, total] = await Promise.all([
      redis.zrevrangebyscore(AUDIT_KEY, "+inf", oldest, "LIMIT", offset, limit),
      redis.zcount(AUDIT_KEY, oldest, "+inf"),
    ]);
    return {
      entries: raw.flatMap((value) => parseEntry(value) ?? []),
      total,
    };
  } catch (cause) {
    reportRedisFailure(cause);
    throw new DurableStateUnavailable();
  }
}
