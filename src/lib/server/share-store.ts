import { randomInt } from "node:crypto";
import {
  readDurableJson,
  updateDurableJson,
} from "$lib/server/durable-state.js";

const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const TOKEN_PATTERN = /^[A-Za-z0-9]{32}$/;
const DAY_MS = 86_400_000;

export const SHARE_EXPIRY_DAYS = [1, 7, 30, "never"] as const;
export const SHARE_RANGES = ["week", "month", "quarter", "year"] as const;
export const SHARE_METRICS = [
  "total",
  "hits",
  "browsers",
  "referrers",
  "locations",
] as const;
export type ShareRange = (typeof SHARE_RANGES)[number];
export type ShareMetric = (typeof SHARE_METRICS)[number];

export function isShareExpiryDays(
  value: unknown
): value is (typeof SHARE_EXPIRY_DAYS)[number] {
  return SHARE_EXPIRY_DAYS.some((days) => days === value);
}

export type ShareLink = {
  readonly id: string;
  readonly label: string;
  readonly maxRange: ShareRange;
  readonly metrics: readonly ShareMetric[];
  readonly createdAt: string;
  readonly expiresAt: string | null;
  readonly token: string;
};

function siteKey(siteId: number): string {
  return `share-link:site:${siteId}`;
}

function tokenKey(token: string): string {
  return `share-link:token:${token}`;
}

function parseShareLink(value: unknown): ShareLink | null {
  if (typeof value !== "object" || value === null) return null;

  const { createdAt, expiresAt, token } = value as Record<string, unknown>;
  if (typeof token !== "string" || !TOKEN_PATTERN.test(token)) return null;
  if (
    typeof createdAt !== "string" ||
    !Number.isFinite(Date.parse(createdAt))
  ) {
    return null;
  }

  // Only an explicit null means no expiry; missing legacy fields still expire.
  const grant = {
    id: "default",
    label: "",
    maxRange: "year",
    metrics: SHARE_METRICS,
  } as const;
  if (expiresAt === null)
    return { ...grant, createdAt, expiresAt: null, token };

  // Legacy links get seven days from creation, never a fresh lease on read.
  const expiry =
    expiresAt === undefined
      ? Date.parse(createdAt) + 7 * DAY_MS
      : typeof expiresAt === "string"
        ? Date.parse(expiresAt)
        : NaN;
  if (!Number.isFinite(expiry) || expiry <= Date.parse(createdAt)) return null;

  return {
    ...grant,
    createdAt,
    expiresAt: new Date(expiry).toISOString(),
    token,
  };
}

function parseLinks(value: unknown): ShareLink[] {
  if (!Array.isArray(value)) {
    const legacy = parseShareLink(value);
    return legacy ? [legacy] : [];
  }
  if (value.length > 20) throw new Error("Invalid share link storage");
  return value.flatMap((candidate: unknown) => {
    if (typeof candidate !== "object" || candidate === null) return [];
    const entry = candidate as Record<string, unknown>;
    const base = parseShareLink(entry);
    const maxRange = SHARE_RANGES.find((range) => range === entry.maxRange);
    const metrics = SHARE_METRICS.filter(
      (metric) => Array.isArray(entry.metrics) && entry.metrics.includes(metric)
    );
    if (
      !base ||
      typeof entry.id !== "string" ||
      !/^(default|[A-Za-z0-9]{32})$/.test(entry.id) ||
      typeof entry.label !== "string" ||
      entry.label.length > 80 ||
      !maxRange ||
      !Array.isArray(entry.metrics) ||
      !metrics.length ||
      metrics.length !== entry.metrics.length ||
      entry.metrics.some(
        (metric: unknown) =>
          !SHARE_METRICS.some((allowed) => allowed === metric)
      )
    )
      return [];
    return [
      {
        ...base,
        id: entry.id,
        label: entry.label,
        maxRange,
        metrics,
      },
    ];
  });
}

function isLive(link: ShareLink): boolean {
  return link.expiresAt === null || Date.parse(link.expiresAt) > Date.now();
}

export async function getShareLinks(siteId: number): Promise<ShareLink[]> {
  return parseLinks(await readDurableJson(siteKey(siteId))).filter(isLive);
}

export async function getShareLink(siteId: number): Promise<ShareLink | null> {
  return (
    (await getShareLinks(siteId)).find((link) => link.id === "default") ?? null
  );
}

/** Rotate the default link, create a named audience, or rotate an explicit id. */
export async function createShareLink(
  siteId: number,
  {
    expiryDays = 7,
    label,
    id,
    maxRange,
    metrics,
  }: {
    expiryDays?: number | "never";
    label?: string;
    id?: string;
    maxRange?: ShareRange;
    metrics?: readonly ShareMetric[];
  } = {}
): Promise<ShareLink> {
  if (!isShareExpiryDays(expiryDays)) {
    throw new RangeError("Share expiry must be 1, 7, or 30 days, or never");
  }

  const now = Date.now();
  if (
    (id !== undefined && !/^(default|[A-Za-z0-9]{32})$/.test(id)) ||
    (label !== undefined && (!label.trim() || label.trim().length > 80)) ||
    (maxRange !== undefined && !SHARE_RANGES.includes(maxRange)) ||
    (metrics !== undefined &&
      (!metrics.length ||
        metrics.length > SHARE_METRICS.length ||
        new Set(metrics).size !== metrics.length ||
        metrics.some((metric) => !SHARE_METRICS.includes(metric))))
  ) {
    throw new RangeError("Invalid audience grant");
  }
  const link: ShareLink = {
    id: id ?? (label === undefined ? "default" : randomToken()),
    label: label?.trim() ?? "",
    maxRange: maxRange ?? (label === undefined ? "year" : "week"),
    metrics: metrics ?? (label === undefined ? SHARE_METRICS : ["total"]),
    createdAt: new Date(now).toISOString(),
    expiresAt:
      expiryDays === "never"
        ? null
        : new Date(now + expiryDays * DAY_MS).toISOString(),
    token: randomToken(),
  };
  const ttlSeconds = expiryDays === "never" ? undefined : expiryDays * 86_400;
  await updateDurableJson(tokenKey(link.token), () => ({ siteId }), ttlSeconds);
  let saved = link;
  await updateDurableJson(siteKey(siteId), (current) => {
    const links = parseLinks(current).filter(isLive);
    const existing = links.find((candidate) => candidate.id === link.id);
    if (id !== undefined && id !== "default" && !existing)
      throw new RangeError("Unknown audience link");
    saved =
      existing && label === undefined && id !== undefined
        ? {
            ...link,
            label: existing.label,
            maxRange: existing.maxRange,
            metrics: existing.metrics,
          }
        : link;
    const siblings = links.filter((candidate) => candidate.id !== link.id);
    if (siblings.length >= 20)
      throw new RangeError("Maximum 20 share links per site");
    return [...siblings, saved];
  });
  return saved;
}

function randomToken(): string {
  return Array.from(
    { length: 32 },
    () => ALPHABET[randomInt(ALPHABET.length)]
  ).join("");
}

export async function revokeShareLink(
  siteId: number,
  id = "default"
): Promise<void> {
  // One authoritative record makes revocation atomic; orphan token indexes
  // cannot authorize a report without a matching live site record.
  await updateDurableJson(siteKey(siteId), (current) => {
    const links = parseLinks(current);
    if (!links.some((link) => link.id === id))
      throw new RangeError("Unknown audience link");
    return links.filter((link) => link.id !== id);
  });
}

/** The site a public token unlocks, or null for unknown or malformed tokens. */
export async function resolveShareToken(token: string): Promise<number | null> {
  return (await resolveShareGrant(token))?.siteId ?? null;
}

export async function resolveShareGrant(
  token: string
): Promise<{ siteId: number; link: ShareLink } | null> {
  if (!TOKEN_PATTERN.test(token)) return null;

  const value = await readDurableJson(tokenKey(token));
  const siteId =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>).siteId
      : undefined;
  if (typeof siteId !== "number" || !Number.isSafeInteger(siteId)) return null;

  const link = (await getShareLinks(siteId)).find(
    (candidate) => candidate.token === token
  );
  return link ? { siteId, link } : null;
}
