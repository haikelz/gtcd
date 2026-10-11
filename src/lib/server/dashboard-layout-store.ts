import {
  type DashboardLayout,
  parseDashboardLayout,
} from "$lib/dashboard-layout.js";
import { getRedis, pingRedis } from "$lib/server/auth/session-store.js";

const KEY_PREFIX = "dashboard-layout:";

// ponytail: per-process fallback while Redis is down; layouts saved there are
// lost on restart and not shared across replicas. Redis is the durable store.
const memoryLayouts = new Map<string, string>();

function keyFor(email: string): string {
  return `${KEY_PREFIX}${email.trim().toLowerCase()}`;
}

function parseStored(raw: string | null | undefined): DashboardLayout {
  if (!raw) return parseDashboardLayout(null);

  try {
    return parseDashboardLayout(JSON.parse(raw));
  } catch {
    return parseDashboardLayout(null);
  }
}

export async function getDashboardLayout(
  email: string
): Promise<DashboardLayout> {
  const key = keyFor(email);

  if (await pingRedis()) {
    try {
      return parseStored(await getRedis().get(key));
    } catch {
      // Fall through to the in-memory copy.
    }
  }

  return parseStored(memoryLayouts.get(key));
}

export async function saveDashboardLayout(
  email: string,
  layout: DashboardLayout
): Promise<void> {
  const key = keyFor(email);
  const raw = JSON.stringify(parseDashboardLayout(layout));

  memoryLayouts.set(key, raw);

  if (await pingRedis()) {
    try {
      await getRedis().set(key, raw);
    } catch {
      // The in-memory copy keeps the change for this process.
    }
  }
}
