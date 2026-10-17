import assert from "node:assert/strict";
import {
  compareCount,
  compareLeader,
  compareTotals,
} from "./overview-comparison.ts";

const totals = compareTotals(
  { total: 150, total_events: 50, total_utc: 150, stats: [] },
  { total: 100, total_events: 20, total_utc: 100, stats: [] }
);
assert.equal(totals.pageviews?.current, 100);
assert.equal(totals.pageviews?.absolute, 20);
assert.equal(totals.pageviews?.percent, 25);
assert.equal(totals.events?.absolute, 30);
assert.equal(totals.events?.percent, 150);
assert.deepEqual(compareTotals(null, null), { pageviews: null, events: null });

assert.deepEqual(compareCount(150, 100), {
  current: 150,
  previous: 100,
  absolute: 50,
  percent: 50,
});
assert.equal(compareCount(0, 100)?.percent, -100);
assert.equal(compareCount(5, 0)?.percent, null);
assert.equal(compareCount(0, 0)?.absolute, 0);
assert.equal(compareCount(5, null), null);
assert.equal(compareCount(null, 5), null);
assert.equal(compareCount(Infinity, 5), null);
assert.equal(compareCount(-1, 5), null);

const current = {
  more: false,
  stats: [
    { id: "a", name: "A", count: 60 },
    { id: "b", name: "B", count: 40 },
  ],
};
const previous = {
  more: false,
  stats: [
    { id: "b", name: "B", count: 80 },
    { id: "a", name: "A", count: 20 },
  ],
};
assert.deepEqual(compareLeader(current, previous), {
  name: "A",
  share: 60,
  shift: 40,
});
assert.equal(compareLeader(current, { ...previous, more: true }), null);
assert.equal(compareLeader({ ...current, more: true }, previous), null);
assert.equal(compareLeader(current, null), null);
assert.equal(compareLeader(current, { stats: [], more: false }), null);
assert.equal(
  compareLeader(current, { stats: [previous.stats[0]], more: false })?.shift,
  60
);
console.log("overview comparison checks passed");
