import { randomInt } from "node:crypto";
import { deleteKey, getJson, setJson } from "$lib/server/kv.js";

const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const TOKEN_PATTERN = /^[A-Za-z0-9]{32}$/;
const DAY_MS = 86_400_000;

export const SHARE_EXPIRY_DAYS = [1, 7, 30, "never"] as const;

export function isShareExpiryDays(
  value: unknown
): value is (typeof SHARE_EXPIRY_DAYS)[number] {
  return SHARE_EXPIRY_DAYS.some((days) => days === value);
}

export type ShareLink = {
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
  if (expiresAt === null) return { createdAt, expiresAt: null, token };

  // Legacy links get seven days from creation, never a fresh lease on read.
  const expiry =
    expiresAt === undefined
      ? Date.parse(createdAt) + 7 * DAY_MS
      : typeof expiresAt === "string"
        ? Date.parse(expiresAt)
        : NaN;
  if (!Number.isFinite(expiry) || expiry <= Date.parse(createdAt)) return null;

  return { createdAt, expiresAt: new Date(expiry).toISOString(), token };
}

export async function getShareLink(siteId: number): Promise<ShareLink | null> {
  const link = parseShareLink(await getJson(siteKey(siteId)));
  return link &&
    (link.expiresAt === null || Date.parse(link.expiresAt) > Date.now())
    ? link
    : null;
}

/** Replace any existing link for the site; the old URL stops working. */
export async function createShareLink(
  siteId: number,
  { expiryDays = 7 }: { expiryDays?: number | "never" } = {}
): Promise<ShareLink> {
  if (!isShareExpiryDays(expiryDays)) {
    throw new RangeError("Share expiry must be 1, 7, or 30 days, or never");
  }

  await revokeShareLink(siteId);

  const now = Date.now();
  const link: ShareLink = {
    createdAt: new Date(now).toISOString(),
    expiresAt:
      expiryDays === "never"
        ? null
        : new Date(now + expiryDays * DAY_MS).toISOString(),
    token: Array.from(
      { length: 32 },
      () => ALPHABET[randomInt(ALPHABET.length)]
    ).join(""),
  };
  const ttlSeconds = expiryDays === "never" ? undefined : expiryDays * 86_400;
  await setJson(tokenKey(link.token), { siteId }, ttlSeconds);
  await setJson(siteKey(siteId), link, ttlSeconds);
  return link;
}

export async function revokeShareLink(siteId: number): Promise<void> {
  const existing = parseShareLink(await getJson(siteKey(siteId)));
  if (existing) await deleteKey(tokenKey(existing.token));
  await deleteKey(siteKey(siteId));
}

/** The site a public token unlocks, or null for unknown or malformed tokens. */
export async function resolveShareToken(token: string): Promise<number | null> {
  if (!TOKEN_PATTERN.test(token)) return null;

  const value = await getJson(tokenKey(token));
  const siteId =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>).siteId
      : undefined;
  if (typeof siteId !== "number" || !Number.isSafeInteger(siteId)) return null;

  const link = await getShareLink(siteId);
  return link?.token === token ? siteId : null;
}
