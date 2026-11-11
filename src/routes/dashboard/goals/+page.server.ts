import { fail } from "@sveltejs/kit";
import {
  conversionRate,
  type Goal,
  GOAL_PATH_SCAN_LIMIT,
  goalPathKey,
  goalVisitors,
  isGoalId,
  MAX_GOALS_PER_SITE,
  parseGoalInput,
  parseGoalName,
} from "$lib/goals.js";
import { translate } from "$lib/i18n";
import { compareCount } from "$lib/overview-comparison.js";
import { previousRange } from "$lib/period.js";
import { requireDashboardAdmin } from "$lib/server/auth/admin.js";
import { DurableStateUnavailable } from "$lib/server/durable-state.js";
import {
  addGoal,
  deleteGoal,
  getGoals,
  renameGoal,
} from "$lib/server/goal-store.js";
import { getDashboardSiteContext } from "$lib/server/goatcounter/site-context.js";
import * as stats from "$lib/server/goatcounter/stats.js";
import { getDateRangeFromUrl, toDateRange } from "$lib/server/helpers.js";

// ponytail: goal paths resolve to GoatCounter path IDs by scanning
// /api/v0/paths, 200 per call and cached 5 minutes, stopping once every goal
// path is found: ceil(paths / 200) calls in the worst case. Past 10,000 paths
// the scan stops and unfound goals show no count rather than a false 0; a new
// path can take 5 minutes to appear. Upgrade path: store each goal's path ID
// once it resolves.
const PATH_SCAN_PAGE_SIZE = 200;
const PATH_CACHE_TTL_MS = 5 * 60_000;

type GoalPaths = {
  readonly complete: boolean;
  /** GoatCounter path IDs by goalPathKey. */
  readonly ids: ReadonlyMap<string, number>;
};

async function findGoalPaths(
  goals: readonly Goal[],
  vhost: string | undefined
): Promise<GoalPaths> {
  const wanted = new Set(goals.map((goal) => goalPathKey(goal.path)));
  const ids = new Map<string, number>();
  let after: number | undefined;
  let scanned = 0;

  while (ids.size < wanted.size) {
    const page = await stats.getPaths(PATH_SCAN_PAGE_SIZE, after, {
      ttlMs: PATH_CACHE_TTL_MS,
      vhost,
    });
    for (const path of page.paths) {
      const key = goalPathKey(path.path);
      if (wanted.has(key)) ids.set(key, path.id);
    }

    scanned += page.paths.length;
    const last = page.paths.at(-1);
    if (!page.more || !last) break;
    if (scanned >= GOAL_PATH_SCAN_LIMIT) return { complete: false, ids };
    after = last.id;
  }

  return { complete: true, ids };
}

/** Visitors per GoatCounter path ID: one stats call covers every goal. */
async function pathVisitors(
  paths: GoalPaths,
  start: string,
  end: string,
  vhost: string | undefined
): Promise<Map<number, number>> {
  const pathIds = [...paths.ids.values()];
  if (pathIds.length === 0) return new Map();

  const hits = await stats.getHits(
    start,
    end,
    pathIds.length,
    undefined,
    undefined,
    pathIds,
    { vhost }
  );
  return new Map(hits.hits.map((hit) => [hit.path_id, hit.count]));
}

export async function load({ locals, parent, url }) {
  const { preferences, site, vhost } = await parent();
  const { end, endWall, range, start, startWall } = getDateRangeFromUrl(
    url,
    preferences.timezone
  );

  let goals: Goal[];
  try {
    goals = await getGoals(site.id);
  } catch (cause) {
    if (!(cause instanceof DurableStateUnavailable)) throw cause;

    return {
      comparison: null,
      goals: [],
      maxGoals: MAX_GOALS_PER_SITE,
      range,
      report: null,
      storageError: translate(locals.locale, "goals.storageLoadFailed"),
    };
  }

  // Who created a goal stays server-side; every signed-in user sees the list.
  const listed = goals.map(({ id, kind, name, path }) => ({
    id,
    kind,
    name,
    path,
  }));
  if (listed.length === 0) {
    return {
      comparison: null,
      goals: listed,
      maxGoals: MAX_GOALS_PER_SITE,
      range,
      report: null,
      storageError: null,
    };
  }

  const request = Promise.all([
    stats.getTotal(start, end, undefined, { vhost }),
    findGoalPaths(goals, vhost).then(async (paths) => ({
      counts: await pathVisitors(paths, start, end, vhost),
      paths,
    })),
  ]).then(([total, { counts, paths }]) => ({
    paths,
    rows: listed.map((goal) => {
      const visitors = goalVisitors({
        counts,
        goal,
        pathIds: paths.ids,
        scanComplete: paths.complete,
      });
      return {
        goal,
        rate: conversionRate(visitors, total.total),
        visitors,
      };
    }),
    total: total.total,
  }));

  // Streamed: the page renders its skeleton while GoatCounter answers.
  const report = stats.streamReport(
    request.then(({ paths, rows, total }) => ({
      rows,
      scanComplete: paths.complete,
      total,
    })),
    locals.locale,
    "goals.loadFailed"
  );

  // Optional, like the Pages report: a failed comparison keeps the counts.
  const comparison = request
    .then(async ({ paths, rows }) => {
      const prevWall = previousRange(startWall, endWall);
      const prev = toDateRange(
        "previous",
        prevWall.start,
        prevWall.end,
        preferences.timezone
      );
      const previousCounts = await pathVisitors(
        paths,
        prev.start,
        prev.end,
        vhost
      );

      const changes: Record<string, ReturnType<typeof compareCount>> = {};
      for (const { goal, visitors } of rows) {
        changes[goal.id] = compareCount(
          visitors,
          goalVisitors({
            counts: previousCounts,
            goal,
            pathIds: paths.ids,
            scanComplete: paths.complete,
          })
        );
      }
      return { changes, status: "ready" as const };
    })
    .catch(() => ({ status: "error" as const }));

  return {
    comparison,
    goals: listed,
    maxGoals: MAX_GOALS_PER_SITE,
    range,
    report,
    storageError: null,
  };
}

function storageFailure(locale: App.Locals["locale"]) {
  return fail(503, { message: translate(locale, "goals.storageSaveFailed") });
}

export const actions = {
  create: async ({ locals, request, url }) => {
    const admin = requireDashboardAdmin(locals.user);

    const form = await request.formData();
    const input = parseGoalInput({
      kind: form.get("kind"),
      name: form.get("name"),
      path: form.get("path"),
    });
    if (!input) {
      return fail(400, {
        message: translate(locals.locale, "goals.invalid"),
      });
    }

    const { site } = await getDashboardSiteContext(url);
    let result: Awaited<ReturnType<typeof addGoal>>;
    try {
      result = await addGoal(site.id, input, admin.email);
    } catch (cause) {
      if (!(cause instanceof DurableStateUnavailable)) throw cause;
      return storageFailure(locals.locale);
    }
    if (result === "duplicate") {
      return fail(400, {
        message: translate(locals.locale, "goals.duplicate"),
      });
    }
    if (result === "limit") {
      return fail(400, {
        message: translate(locals.locale, "goals.limit", {
          limit: MAX_GOALS_PER_SITE,
        }),
      });
    }

    return { saved: translate(locals.locale, "goals.created") };
  },
  rename: async ({ locals, request, url }) => {
    requireDashboardAdmin(locals.user);

    const form = await request.formData();
    const id = form.get("id");
    const name = parseGoalName(form.get("name"));
    if (!isGoalId(id) || !name) {
      return fail(400, {
        message: translate(locals.locale, "goals.invalidName"),
      });
    }

    const { site } = await getDashboardSiteContext(url);
    let found: boolean;
    try {
      found = await renameGoal(site.id, id, name);
    } catch (cause) {
      if (!(cause instanceof DurableStateUnavailable)) throw cause;
      return storageFailure(locals.locale);
    }
    if (!found) {
      return fail(404, {
        message: translate(locals.locale, "goals.notFound"),
      });
    }

    return { saved: translate(locals.locale, "goals.renamed") };
  },
  delete: async ({ locals, request, url }) => {
    requireDashboardAdmin(locals.user);

    const form = await request.formData();
    const id = form.get("id");
    if (!isGoalId(id)) {
      return fail(400, {
        message: translate(locals.locale, "goals.notFound"),
      });
    }

    const { site } = await getDashboardSiteContext(url);
    let found: boolean;
    try {
      found = await deleteGoal(site.id, id);
    } catch (cause) {
      if (!(cause instanceof DurableStateUnavailable)) throw cause;
      return storageFailure(locals.locale);
    }
    if (!found) {
      return fail(404, {
        message: translate(locals.locale, "goals.notFound"),
      });
    }

    return { saved: translate(locals.locale, "goals.deleted") };
  },
};
