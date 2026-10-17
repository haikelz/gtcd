import { createHash, randomBytes } from "node:crypto";
import {
  readDurableJson,
  updateDurableJson,
} from "$lib/server/durable-state.js";

const TTL_SECONDS = 900;
const MAX_CURSORS = 32;
export const MAX_EXCLUDED_PATHS = 2000;

type Cursor = {
  token: string;
  scope: string;
  expires: number;
  ids: number[];
  previous: string;
};

function entries(value: unknown): Cursor[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is Cursor => {
      if (!entry || typeof entry !== "object") return false;
      const cursor = entry as Partial<Cursor>;
      return (
        typeof cursor.token === "string" &&
        /^[a-f0-9]{48}$/.test(cursor.token) &&
        typeof cursor.scope === "string" &&
        /^[a-f0-9]{64}$/.test(cursor.scope) &&
        typeof cursor.expires === "number" &&
        cursor.expires > Date.now() &&
        typeof cursor.previous === "string" &&
        (cursor.previous === "" || /^[a-f0-9]{48}$/.test(cursor.previous)) &&
        Array.isArray(cursor.ids) &&
        cursor.ids.length <= MAX_EXCLUDED_PATHS &&
        cursor.ids.every((id) => Number.isSafeInteger(id) && id > 0)
      );
    })
    .slice(-MAX_CURSORS);
}

export function pageCursorKey(user: string, site: string): string {
  return `page-cursors:${createHash("sha256")
    .update(JSON.stringify([user, site]))
    .digest("hex")}`;
}

export function pageCursorScope(values: readonly unknown[]): string {
  return createHash("sha256").update(JSON.stringify(values)).digest("hex");
}

export async function readPageCursor(
  key: string,
  scope: string,
  token: string
) {
  if (!/^[a-f0-9]{48}$/.test(token)) return undefined;
  return entries(await readDurableJson(key)).find(
    (cursor) => cursor.token === token && cursor.scope === scope
  );
}

export async function savePageCursor(
  key: string,
  scope: string,
  ids: number[],
  previous: string
): Promise<string> {
  if (
    ids.length > MAX_EXCLUDED_PATHS ||
    !ids.every((id) => Number.isSafeInteger(id) && id > 0)
  ) {
    throw new Error("Page cursor exceeds its supported bounds.");
  }
  const token = randomBytes(24).toString("hex");
  await updateDurableJson(
    key,
    (current) => [
      ...entries(current).slice(-(MAX_CURSORS - 1)),
      { token, scope, ids, previous, expires: Date.now() + TTL_SECONDS * 1000 },
    ],
    TTL_SECONDS
  );
  return token;
}
