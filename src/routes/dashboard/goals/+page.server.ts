import { fail } from "@sveltejs/kit";
import {
  conversionRate,
  type Goal,
  goalPathKey,
  goalVisitors,
  isGoalId,
  isNamedGoalPath,
  MAX_GOALS_PER_SITE,
  parseGoalInput,
  parseGoalName,
  visitorsByPathKey,
} from "$lib/goals.js";
import { translate } from "$lib/i18n";
import { compareCount } from "$lib/overview-comparison.js";
import { previousRange } from "$lib/period.js";
import { recordAudit } from "$lib/server/audit-log.js";
import { requireDashboardAdmin } from "$lib/server/auth/admin.js";
import {
  DurableStateUnavailable,
  readDurableJson,
  updateDurableJson,
} from "$lib/server/durable-state.js";
import {
  addGoal,
  deleteGoal,
  getGoals,
  renameGoal,
} from "$lib/server/goal-store.js";
import { getDashboardSiteContext } from "$lib/server/goatcounter/site-context.js";
import * as stats from "$lib/server/goatcounter/stats.js";
import { getDateRangeFromUrl, toDateRange } from "$lib/server/helpers.js";

// Most goal paths go to GoatCounter by name, so path IDs never go stale when
// GoatCounter purges, merges or expires paths.
//
// ponytail: a path GoatCounter cannot look up by name (see isNamedGoalPath)
// resolves to a path ID by scanning /api/v0/paths, at most 10 pages of 200
// per view. The scan resumes from Redis after the last path ID read; IDs only
// grow, so once it reaches the newest path a view reads only paths added
// since, one uncached call. A goal the stored scan never looked for starts it
// over. Past 2,000 paths a new scan takes several views, and goals it has not
// reached show no count meanwhile.
const PATH_SCAN_PAGE_SIZE = 200;
const PATH_SCAN_PAGES_PER_VIEW = 10;
const PATH_SCAN_TTL_SECONDS = 7 * 24 * 60 * 60;

type StoredPathScan = {
  /** The last path ID read; the next view resumes after it. */
  readonly cursor: number;
  /** GoatCounter path IDs by goalPathKey. */
  readonly ids: Readonly<Record<string, number>>;
  /** goalPathKeys the scan has looked for since it started over. */
  readonly keys: readonly string[];
};

type GoalPathScan = {
  readonly ids: readonly number[];
  /** goalPathKeys the scan has not settled yet. */
  readonly unresolved: ReadonlySet<string>;
};

function pathScanKey(siteId: number): string {
  return `goal-paths:site:${siteId}`;
}

function parsePathScan(value: unknown): StoredPathScan | null {
  if (typeof value !== "object" || value === null) return null;

  const { cursor, ids, keys } = value as Record<string, unknown>;
  if (
    typeof cursor !== "number" ||
    !Number.isSafeInteger(cursor) ||
    typeof ids !== "object" ||
    ids === null ||
    !Object.values(ids).every(Number.isSafeInteger) ||
    !Array.isArray(keys) ||
    !keys.every((key) => typeof key === "string")
  ) {
    return null;
  }

  return {
    cursor,
    ids: ids as Record<string, number>,
    keys,
  };
}

async function scanGoalPaths(
  siteId: number,
  goals: readonly Goal[],
  vhost: string | undefined
): Promise<GoalPathScan> {
  const wanted = goals
    .filter((goal) => !isNamedGoalPath(goal.path))
    .map((goal) => goalPathKey(goal.path));
  if (wanted.length === 0) return { ids: [], unresolved: new Set() };

  // Redis is only a head start here: without it the scan starts over.
  const stored = parsePathScan(
    await readDurableJson(pathScanKey(siteId)).catch(() => undefined)
  );
  const resumed =
    stored !== null && wanted.every((key) => stored.keys.includes(key));
  const keys = resumed ? stored.keys : wanted;
  const ids: Record<string, number> = resumed ? { ...stored.ids } : {};
  let cursor = resumed ? stored.cursor : 0;
  let complete = false;

  for (let page = 0; page < PATH_SCAN_PAGES_PER_VIEW; page++) {
    const result = await stats.getPaths(
      PATH_SCAN_PAGE_SIZE,
      cursor || undefined,
      {
        bypassCache: true,
        vhost,
      }
    );
    // A newer path with the same name replaces a purged or merged one.
    for (const path of result.paths) {
      const key = goalPathKey(path.path);
      if (keys.includes(key)) ids[key] = path.id;
    }

    const last = result.paths.at(-1);
    if (last) cursor = last.id;
    if (!result.more || !last) {
      complete = true;
      break;
    }
  }

  const next: StoredPathScan = { cursor, ids, keys };
  if (JSON.stringify(next) !== JSON.stringify(stored)) {
    // Best effort, like the read: a lost write repeats part of the scan.
    await updateDurableJson(
      pathScanKey(siteId),
      () => next,
      PATH_SCAN_TTL_SECONDS
    ).catch(() => {});
  }

  return {
    ids: wanted.flatMap((key) => (Object.hasOwn(ids, key) ? [ids[key]] : [])),
    unresolved: new Set(
      complete ? [] : wanted.filter((key) => !Object.hasOwn(ids, key))
    ),
  };
}

/**
 * Visitors per goalPathKey in one period: one stats call for the goals
 * GoatCounter looks up by name, one for the scanned path IDs.
 */
async function goalPathVisitors(
  goals: readonly Goal[],
  scan: GoalPathScan,
  start: string,
  end: string,
  vhost: string | undefined
): Promise<Map<string, number>> {
  const names = goals
    .filter((goal) => isNamedGoalPath(goal.path))
    .map((goal) => goalPathKey(goal.path));
  const [named, scanned] = await Promise.all([
    names.length > 0
      ? stats.getHits(start, end, names.length, undefined, true, names, {
          vhost,
        })
      : null,
    scan.ids.length > 0
      ? stats.getHits(
          start,
          end,
          scan.ids.length,
          undefined,
          undefined,
          scan.ids,
          { vhost }
        )
      : null,
  ]);

  return visitorsByPathKey([...(named?.hits ?? []), ...(scanned?.hits ?? [])]);
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
    scanGoalPaths(site.id, goals, vhost).then(async (scan) => ({
      scan,
      visitors: await goalPathVisitors(goals, scan, start, end, vhost),
    })),
  ]).then(([total, { scan, visitors }]) => ({
    rows: listed.map((goal) => {
      const count = goalVisitors({
        goal,
        unresolved: scan.unresolved,
        visitors,
      });
      return {
        goal,
        rate: conversionRate(count, total.total),
        visitors: count,
      };
    }),
    scan,
    total: total.total,
  }));

  // Streamed: the page renders its skeleton while GoatCounter answers.
  const report = stats.streamReport(
    request.then(({ rows, scan, total }) => ({
      rows,
      scanComplete: scan.unresolved.size === 0,
      total,
    })),
    locals.locale,
    "goals.loadFailed"
  );

  // Optional, like the Pages report: a failed comparison keeps the counts.
  const comparison = request
    .then(async ({ rows, scan }) => {
      const prevWall = previousRange(startWall, endWall);
      const prev = toDateRange(
        "previous",
        prevWall.start,
        prevWall.end,
        preferences.timezone
      );
      const previousVisitors = await goalPathVisitors(
        goals,
        scan,
        prev.start,
        prev.end,
        vhost
      );

      const changes: Record<string, ReturnType<typeof compareCount>> = {};
      for (const { goal, visitors } of rows) {
        changes[goal.id] = compareCount(
          visitors,
          goalVisitors({
            goal,
            unresolved: scan.unresolved,
            visitors: previousVisitors,
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
    const audit = {
      action: "goal.create",
      actor: admin.email,
      site: site.id,
      target: input.path,
    };
    let result: Awaited<ReturnType<typeof addGoal>>;
    try {
      result = await addGoal(site.id, input, admin.email);
    } catch (cause) {
      if (!(cause instanceof DurableStateUnavailable)) throw cause;
      await recordAudit({ ...audit, outcome: "failure" });
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

    await recordAudit({ ...audit, outcome: "success" });
    return { saved: translate(locals.locale, "goals.created") };
  },
  rename: async ({ locals, request, url }) => {
    const admin = requireDashboardAdmin(locals.user);

    const form = await request.formData();
    const id = form.get("id");
    const name = parseGoalName(form.get("name"));
    if (!isGoalId(id) || !name) {
      return fail(400, {
        message: translate(locals.locale, "goals.invalidName"),
      });
    }

    const { site } = await getDashboardSiteContext(url);
    const renameAudit = {
      action: "goal.rename",
      actor: admin.email,
      site: site.id,
      target: name,
    };
    let found: boolean;
    try {
      found = await renameGoal(site.id, id, name);
    } catch (cause) {
      if (!(cause instanceof DurableStateUnavailable)) throw cause;
      await recordAudit({ ...renameAudit, outcome: "failure" });
      return storageFailure(locals.locale);
    }
    if (!found) {
      return fail(404, {
        message: translate(locals.locale, "goals.notFound"),
      });
    }

    await recordAudit({ ...renameAudit, outcome: "success" });
    return { saved: translate(locals.locale, "goals.renamed") };
  },
  delete: async ({ locals, request, url }) => {
    const admin = requireDashboardAdmin(locals.user);

    const form = await request.formData();
    const id = form.get("id");
    if (!isGoalId(id)) {
      return fail(400, {
        message: translate(locals.locale, "goals.notFound"),
      });
    }

    const { site } = await getDashboardSiteContext(url);
    const deleteAudit = {
      action: "goal.delete",
      actor: admin.email,
      site: site.id,
      target: id,
    };
    let found: boolean;
    try {
      found = await deleteGoal(site.id, id);
    } catch (cause) {
      if (!(cause instanceof DurableStateUnavailable)) throw cause;
      await recordAudit({ ...deleteAudit, outcome: "failure" });
      return storageFailure(locals.locale);
    }
    if (!found) {
      return fail(404, {
        message: translate(locals.locale, "goals.notFound"),
      });
    }

    await recordAudit({ ...deleteAudit, outcome: "success" });
    return { saved: translate(locals.locale, "goals.deleted") };
  },
};
