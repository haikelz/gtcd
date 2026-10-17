import { requireDashboardAdmin } from "$lib/server/auth/admin.js";
import { pingRedis } from "$lib/server/auth/session-store.js";
import { getSchedulerDiagnostics } from "$lib/server/email-reports.js";
import {
  getClientDiagnostics,
  refreshUpstreamStatus,
} from "$lib/server/goatcounter/client.js";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ locals, setHeaders }) => {
  requireDashboardAdmin(locals.user);
  setHeaders({ "cache-control": "no-store" });
  refreshUpstreamStatus();

  const redis = pingRedis(400).then((up) => ({
    status: up ? ("up" as const) : ("down" as const),
    checkedAt: Date.now(),
  }));

  return {
    client: getClientDiagnostics(),
    redis,
    // Let the initial lazy Redis connection finish before the durable read.
    scheduler: redis
      .then(() => getSchedulerDiagnostics())
      .then(
        (diagnostics) => ({ diagnostics, unavailable: false }),
        () => ({ diagnostics: null, unavailable: true })
      ),
  };
};
