// Run: node --experimental-strip-types src/lib/server/goatcounter/api-rate.check.ts
import assert from "node:assert/strict";
import { requestIntervalMs } from "./api-rate.ts";

// GoatCounter's default limit keeps the 280 ms spacing.
assert.equal(requestIntervalMs(undefined), 280);
assert.equal(requestIntervalMs(""), 280);
assert.equal(requestIntervalMs("4"), 280);

// A raised `-ratelimit api:N/1` shortens it, still 12% under the limit.
assert.equal(requestIntervalMs("20"), 56);
assert.equal(requestIntervalMs(" 10 "), 112);
assert.equal(requestIntervalMs("3"), 374);

// Nonsense falls back to the default instead of hammering GoatCounter.
for (const bad of ["0", "-5", "fast", "Infinity", "NaN"]) {
  assert.equal(requestIntervalMs(bad), 280, bad);
}

console.log("goatcounter-api-rate: all checks passed");
