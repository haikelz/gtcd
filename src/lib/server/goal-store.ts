import { randomUUID } from "node:crypto";
import {
  type Goal,
  type GoalInput,
  goalPathKey,
  MAX_GOALS_PER_SITE,
  parseGoals,
} from "$lib/goals.js";
import {
  readDurableJson,
  updateDurableJson,
} from "$lib/server/durable-state.js";

/**
 * Goals are durable state: every function here throws
 * DurableStateUnavailable when Redis cannot confirm the read or write, and
 * nothing falls back to process memory.
 */

export type AddGoalResult = "added" | "duplicate" | "limit";

function siteKey(siteId: number): string {
  return `goals:site:${siteId}`;
}

export async function getGoals(siteId: number): Promise<Goal[]> {
  return parseGoals(await readDurableJson(siteKey(siteId)));
}

export async function addGoal(
  siteId: number,
  input: GoalInput,
  createdBy: string
): Promise<AddGoalResult> {
  const goal: Goal = {
    ...input,
    createdAt: new Date().toISOString(),
    createdBy,
    id: randomUUID(),
  };

  let result: AddGoalResult = "added";
  await updateDurableJson(siteKey(siteId), (current) => {
    const goals = parseGoals(current);
    // Page paths start with a slash and event names never do, so the path
    // alone identifies the target.
    result = goals.some(
      (existing) => goalPathKey(existing.path) === goalPathKey(goal.path)
    )
      ? "duplicate"
      : goals.length >= MAX_GOALS_PER_SITE
        ? "limit"
        : "added";

    return result === "added" ? [...goals, goal] : goals;
  });
  return result;
}

/** False when the goal no longer exists. */
export async function renameGoal(
  siteId: number,
  goalId: string,
  name: string
): Promise<boolean> {
  let found = false;
  await updateDurableJson(siteKey(siteId), (current) => {
    const goals = parseGoals(current);
    found = goals.some((goal) => goal.id === goalId);

    return goals.map((goal) => (goal.id === goalId ? { ...goal, name } : goal));
  });
  return found;
}

/** False when the goal no longer exists. */
export async function deleteGoal(
  siteId: number,
  goalId: string
): Promise<boolean> {
  let found = false;
  await updateDurableJson(siteKey(siteId), (current) => {
    const goals = parseGoals(current);
    found = goals.some((goal) => goal.id === goalId);

    return goals.filter((goal) => goal.id !== goalId);
  });
  return found;
}
