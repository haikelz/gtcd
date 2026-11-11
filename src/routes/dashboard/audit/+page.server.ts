import { readAudit } from "$lib/server/audit-log.js";
import { requireDashboardAdmin } from "$lib/server/auth/admin.js";
import { DurableStateUnavailable } from "$lib/server/durable-state.js";
import type { PageServerLoad } from "./$types";

const PAGE_SIZE = 50;

export const load: PageServerLoad = async ({ locals, url }) => {
  requireDashboardAdmin(locals.user);

  const requested = Number(url.searchParams.get("page") ?? 1);
  const page = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;

  try {
    const { entries, total } = await readAudit(
      (page - 1) * PAGE_SIZE,
      PAGE_SIZE
    );
    return {
      entries,
      page,
      pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      unavailable: false,
    };
  } catch (cause) {
    if (!(cause instanceof DurableStateUnavailable)) throw cause;
    return { entries: [], page, pages: 1, unavailable: true };
  }
};
