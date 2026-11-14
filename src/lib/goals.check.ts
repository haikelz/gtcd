// Run: node --experimental-strip-types src/lib/goals.check.ts
import assert from "node:assert/strict";
import {
  conversionRate,
  type Goal,
  goalVisitors,
  isNamedGoalPath,
  normalizeGoalPath,
  parseGoalInput,
  parseGoalName,
  parseGoals,
  visitorsByPathKey,
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

// GoatCounter looks paths up by name unless its list parameters would split
// them (commas, spaces) or SQLite's lower() would miss a letter (non-ASCII).
for (const named of ["/signup", "/docs/a-b_c?q=1", "signup-click", "/%20"]) {
  assert.equal(isNamedGoalPath(named), true, named);
}
for (const scanned of ["/a,b", "plan annual", "/café", ""]) {
  assert.equal(isNamedGoalPath(scanned), false, scanned);
}

// Rows count per lower-case name, summed over paths that differ in case.
const visitors = visitorsByPathKey([
  { count: 600, path: "/Signup" },
  { count: 100, path: "/signup" },
  { count: 40, path: "signup-click" },
]);
assert.deepEqual(
  [...visitors],
  [
    ["/signup", 700],
    ["signup-click", 40],
  ]
);

// Goals match without case; unknown paths count 0 and unscanned ones null.
const none = new Set<string>();
assert.equal(goalVisitors({ goal: signup, unresolved: none, visitors }), 700);
const unseen = { ...signup, path: "/not-yet" };
assert.equal(goalVisitors({ goal: unseen, unresolved: none, visitors }), 0);
assert.equal(
  goalVisitors({
    goal: unseen,
    unresolved: new Set(["/not-yet"]),
    visitors,
  }),
  null
);

// Conversion is goal visitors over page visits (total less event visitors).
assert.equal(conversionRate(700, 2080 - 42)?.toFixed(2), "34.35");
assert.equal(conversionRate(0, 2038), 0);
assert.equal(conversionRate(5, 0), null);
assert.equal(conversionRate(5, 40 - 42), null);
assert.equal(conversionRate(null, 2038), null);
assert.equal(conversionRate(5, Number.NaN), null);

console.log("goals: all checks passed");
