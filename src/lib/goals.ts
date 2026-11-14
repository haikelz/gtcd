// No runtime imports: goals.check.ts runs this file directly with
// node --experimental-strip-types.

export const GOAL_KINDS = ["event", "page"] as const;

export type GoalKind = (typeof GOAL_KINDS)[number];

export type Goal = {
  readonly createdAt: string;
  readonly createdBy: string;
  readonly id: string;
  readonly kind: GoalKind;
  readonly name: string;
  readonly path: string;
};

export type GoalInput = Pick<Goal, "kind" | "name" | "path">;

export const GOAL_NAME_MAX_LENGTH = 60;

// ponytail: 50 goals per site keeps each period to one include_paths call
// (GoatCounter answers at most 100 paths per stats call) and the stored list
// small. Past 100, the hits requests need batching.
export const MAX_GOALS_PER_SITE = 50;

// GoatCounter's own limit for a path or event name.
export const GOAL_PATH_MAX_LENGTH = 2048;

const GOAL_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isGoalId(value: unknown): value is string {
  return typeof value === "string" && GOAL_ID_PATTERN.test(value);
}

function isGoalKind(value: unknown): value is GoalKind {
  return GOAL_KINDS.some((kind) => kind === value);
}

/**
 * The path as GoatCounter records it: event names lose leading slashes,
 * page paths get one leading slash and no trailing slash.
 */
export function normalizeGoalPath(kind: GoalKind, path: string): string {
  const trimmed = path.trim();
  if (kind === "event") return trimmed.replace(/^\/+/, "");

  return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
}

/** GoatCounter keeps one path per site and lowercase name. */
export function goalPathKey(path: string): string {
  return path.toLowerCase();
}

/**
 * Whether GoatCounter can look the path up by name: its list parameters
 * split on commas and spaces, and SQLite's lower() folds ASCII letters only.
 */
export function isNamedGoalPath(path: string): boolean {
  return /^[\x21-\x7e]+$/.test(path) && !path.includes(",");
}

/** Visitors per goalPathKey, summed over paths that differ only by case. */
export function visitorsByPathKey(
  hits: readonly { readonly count: number; readonly path: string }[]
): Map<string, number> {
  const visitors = new Map<string, number>();
  for (const hit of hits) {
    const key = goalPathKey(hit.path);
    visitors.set(key, (visitors.get(key) ?? 0) + hit.count);
  }

  return visitors;
}

export function parseGoalName(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const name = value.trim();
  return name && name.length <= GOAL_NAME_MAX_LENGTH ? name : null;
}

/** Validated goal fields from a form or storage; null when any is invalid. */
export function parseGoalInput(fields: {
  readonly kind: unknown;
  readonly name: unknown;
  readonly path: unknown;
}): GoalInput | null {
  const name = parseGoalName(fields.name);
  if (!name || !isGoalKind(fields.kind)) return null;
  if (typeof fields.path !== "string" || !fields.path.trim()) return null;

  const path = normalizeGoalPath(fields.kind, fields.path);
  if (!path || path.length > GOAL_PATH_MAX_LENGTH) return null;

  return { kind: fields.kind, name, path };
}

/** Stored goals; entries this version cannot read are dropped. */
export function parseGoals(value: unknown): Goal[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((candidate: unknown) => {
    if (typeof candidate !== "object" || candidate === null) return [];

    const entry = candidate as Record<string, unknown>;
    const input = parseGoalInput({
      kind: entry.kind,
      name: entry.name,
      path: entry.path,
    });
    if (
      !input ||
      !isGoalId(entry.id) ||
      typeof entry.createdBy !== "string" ||
      typeof entry.createdAt !== "string" ||
      !Number.isFinite(Date.parse(entry.createdAt))
    ) {
      return [];
    }

    return [
      {
        ...input,
        createdAt: entry.createdAt,
        createdBy: entry.createdBy,
        id: entry.id,
      },
    ];
  });
}

/**
 * Visitors who reached a goal. A path GoatCounter has not recorded yet counts
 * 0; null means the path scan has not reached the goal's path yet.
 */
export function goalVisitors({
  goal,
  unresolved,
  visitors,
}: {
  readonly goal: Pick<Goal, "path">;
  /** goalPathKeys the path scan could not settle yet. */
  readonly unresolved: ReadonlySet<string>;
  /** Visitors per goalPathKey. */
  readonly visitors: ReadonlyMap<string, number>;
}): number | null {
  const key = goalPathKey(goal.path);
  if (unresolved.has(key)) return null;

  return visitors.get(key) ?? 0;
}

/** Goal visitors as a percentage of all visitors; null without visitors. */
export function conversionRate(
  goalVisitors: number | null,
  totalVisitors: number
): number | null {
  if (goalVisitors === null || !(totalVisitors > 0)) return null;

  return (goalVisitors / totalVisitors) * 100;
}
