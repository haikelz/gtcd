// Run: node --experimental-strip-types src/lib/goals.check.ts
import assert from "node:assert/strict";
import {
  conversionRate,
  type Goal,
  goalVisitors,
  normalizeGoalPath,
  parseGoalInput,
  parseGoalName,
  parseGoals,
} from "./goals.ts";

// Paths are stored the way GoatCounter records hits, so they match.
assert.equal(normalizeGoalPath("page", " pricing/ "), "/pricing");
assert.equal(normalizeGoalPath("page", "//docs/start//"), "/docs/start");
assert.equal(normalizeGoalPath("page", "/"), "/");
assert.equal(normalizeGoalPath("event", "/Sign up"), "Sign up");

// Names are 1–60 characters after trimming.
assert.equal(parseGoalName("  Signups "), "Signups");
assert.equal(parseGoalName("x".repeat(60)), "x".repeat(60));
for (const bad of ["", "   ", "x".repeat(61), 42, null]) {
  assert.equal(parseGoalName(bad), null, String(bad));
}

assert.deepEqual(
  parseGoalInput({ kind: "page", name: "Pricing", path: "pricing" }),
  { kind: "page", name: "Pricing", path: "/pricing" }
);
for (const bad of [
  { kind: "funnel", name: "Pricing", path: "/pricing" },
  { kind: "page", name: "", path: "/pricing" },
  { kind: "page", name: "Pricing", path: "  " },
  { kind: "event", name: "Click", path: "///" },
  { kind: "page", name: "Pricing", path: `/${"x".repeat(2048)}` },
  { kind: "page", name: "Pricing", path: undefined },
]) {
  assert.equal(parseGoalInput(bad), null, JSON.stringify(bad));
}

const signup: Goal = {
  createdAt: "2026-11-01T00:00:00.000Z",
  createdBy: "qa@example.com",
  id: "6f1c2a0e-3b4d-4e5f-8a9b-0c1d2e3f4a5b",
  kind: "page",
  name: "Signup",
  path: "/Signup",
};

// Storage keeps valid goals and drops entries it cannot read.
assert.deepEqual(
  parseGoals([signup, { ...signup, id: "nope" }, null, "goal"]),
  [signup]
);
assert.deepEqual(parseGoals(undefined), []);
assert.deepEqual(parseGoals({ goals: [signup] }), []);

// GoatCounter matches path names without case; unknown paths count 0.
const pathIds = new Map([["/signup", 7]]);
const counts = new Map([[7, 700]]);
assert.equal(
  goalVisitors({ counts, goal: signup, pathIds, scanComplete: true }),
  700
);
assert.equal(
  goalVisitors({
    counts: new Map(),
    goal: signup,
    pathIds,
    scanComplete: true,
  }),
  0
);
const unseen = { ...signup, path: "/not-yet" };
assert.equal(
  goalVisitors({ counts, goal: unseen, pathIds, scanComplete: true }),
  0
);
assert.equal(
  goalVisitors({ counts, goal: unseen, pathIds, scanComplete: false }),
  null
);

// Conversion is goal visitors over all visitors in the period.
assert.equal(conversionRate(700, 2080)?.toFixed(2), "33.65");
assert.equal(conversionRate(0, 2080), 0);
assert.equal(conversionRate(5, 0), null);
assert.equal(conversionRate(null, 2080), null);
assert.equal(conversionRate(5, Number.NaN), null);

console.log("goals: all checks passed");
