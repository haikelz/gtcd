import {
  type DashboardLayout,
  layoutFromGoatCounter,
  parseDashboardLayout,
} from "$lib/dashboard-layout.js";
import {
  DurableStateUnavailable,
  readDurableJson,
  updateDurableJson,
} from "$lib/server/durable-state.js";

function keyFor(email: string): string {
  return `dashboard-layout:${email.trim().toLowerCase()}`;
}

/**
 * Read a user's layout. The first read, before anything is stored, seeds the
 * layout from their GoatCounter widgets and default view (`seed` returns the
 * `/me` user settings) and saves it, so the import runs once per user. When
 * Redis cannot be read, defaults render read-only and nothing is written.
 */
export async function getDashboardLayout(
  email: string,
  seed?: () => Promise<unknown>
): Promise<DashboardLayout> {
  let stored: unknown;
  try {
    stored = await readDurableJson(keyFor(email));
  } catch (cause) {
    if (!(cause instanceof DurableStateUnavailable)) throw cause;
    return parseDashboardLayout(null);
  }
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
    // Another request may have saved since the read; its layout wins.
    const saved = await updateDurableJson(keyFor(email), (current) =>
      current === undefined ? layout : current
    );
    return parseDashboardLayout(saved);
  } catch (cause) {
    if (!(cause instanceof DurableStateUnavailable)) throw cause;
    // Reading a dashboard may use defaults; explicit saves must persist.
    return layout;
  }
}

/**
 * Apply `update` to the stored layout atomically, so concurrent saves (two
 * tabs, two replicas) each see the other's changes. Fails closed when Redis
 * is unavailable.
 */
export async function saveDashboardLayout(
  email: string,
  update: (layout: DashboardLayout) => DashboardLayout
): Promise<DashboardLayout> {
  return updateDurableJson(keyFor(email), (current) =>
    parseDashboardLayout(update(parseDashboardLayout(current)))
  );
}
