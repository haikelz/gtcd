import assert from "node:assert/strict";
import {
  evaluateTrafficAlert,
  parseTrafficAlertRule,
} from "./traffic-alert.ts";

const rule = parseTrafficAlertRule({
  direction: "either",
  minimum: 100,
  threshold: 50,
});
assert.ok(rule);
assert.equal(evaluateTrafficAlert(rule, 150, 100), 50);
assert.equal(evaluateTrafficAlert(rule, 0, 100), -100);
assert.equal(evaluateTrafficAlert(rule, 149, 100), null);
assert.equal(evaluateTrafficAlert(rule, 1000, 0), null);
assert.equal(evaluateTrafficAlert(rule, 1000, 99), null);
assert.equal(evaluateTrafficAlert(rule, NaN, 100), null);
assert.equal(evaluateTrafficAlert(rule, 100, Infinity), null);
assert.equal(
  evaluateTrafficAlert({ ...rule, direction: "increase" }, 0, 100),
  null
);
assert.equal(
  evaluateTrafficAlert({ ...rule, direction: "decrease" }, 200, 100),
  null
);
for (const invalid of [
  null,
  {},
  { ...rule, direction: "unknown" },
  { ...rule, threshold: 0 },
  { ...rule, threshold: 10001 },
  { ...rule, threshold: "50" },
  { ...rule, minimum: 0 },
  { ...rule, minimum: 1.5 },
]) {
  assert.equal(parseTrafficAlertRule(invalid), null);
}
console.log("traffic-alert: all checks passed");
