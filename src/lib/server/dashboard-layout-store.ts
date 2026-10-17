import {
  type DashboardLayout,
  layoutFromGoatCounter,
  parseDashboardLayout,
} from "$lib/dashboard-layout.js";
import { getJson } from "$lib/server/kv.js";
import {
  DurableStateUnavailable,
  updateDurableJson,
} from "$lib/server/durable-state.js";

function keyFor(email: string): string {
  return `dashboard-layout:${email.trim().toLowerCase()}`;
}

/**
 * Read a user's layout. The first read, before anything is stored, seeds the
 * layout from their GoatCounter widgets and default view (`seed` returns the
 * `/me` user settings) and saves it, so the import runs once per user.
 */
export async function getDashboardLayout(
  email: string,
  seed?: () => Promise<unknown>
): Promise<DashboardLayout> {
  const stored = await getJson(keyFor(email));
  if (stored !== undefined || !seed) return parseDashboardLayout(stored);

  let imported: DashboardLayout | null;
  try {
    imported = layoutFromGoatCounter(await seed());
  } catch {
    // An unreachable GoatCounter must not block the dashboard.
    return parseDashboardLayout(null);
  }

  const layout = imported ?? parseDashboardLayout(null);
  try {
    await saveDashboardLayout(email, layout);
  } catch (cause) {
    if (!(cause instanceof DurableStateUnavailable)) throw cause;
    // Reading a dashboard may use defaults; explicit saves must persist.
  }
  return layout;
}

export async function saveDashboardLayout(
  email: string,
  layout: DashboardLayout
): Promise<void> {
  await updateDurableJson(keyFor(email), () => parseDashboardLayout(layout));
}
