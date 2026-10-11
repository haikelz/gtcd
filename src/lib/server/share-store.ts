import { randomInt } from "node:crypto";
import { deleteKey, getJson, setJson } from "$lib/server/kv.js";

const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const TOKEN_PATTERN = /^[A-Za-z0-9]{32}$/;

export type ShareLink = {
  readonly createdAt: string;
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

  const { createdAt, token } = value as Record<string, unknown>;
  return typeof token === "string" &&
    TOKEN_PATTERN.test(token) &&
    typeof createdAt === "string"
    ? { createdAt, token }
    : null;
}

export async function getShareLink(siteId: number): Promise<ShareLink | null> {
  return parseShareLink(await getJson(siteKey(siteId)));
}

/** Replace any existing link for the site; the old URL stops working. */
export async function createShareLink(siteId: number): Promise<ShareLink> {
  await revokeShareLink(siteId);

  const link: ShareLink = {
    createdAt: new Date().toISOString(),
    token: Array.from(
      { length: 32 },
      () => ALPHABET[randomInt(ALPHABET.length)]
    ).join(""),
  };
  await setJson(tokenKey(link.token), { siteId });
  await setJson(siteKey(siteId), link);
  return link;
}

export async function revokeShareLink(siteId: number): Promise<void> {
  const existing = await getShareLink(siteId);
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
  return typeof siteId === "number" && Number.isSafeInteger(siteId)
    ? siteId
    : null;
}
