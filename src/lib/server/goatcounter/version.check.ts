// Run: node --experimental-strip-types src/lib/server/goatcounter/version.check.ts
import assert from "node:assert/strict";
import { isCsvOnlyGoatCounter } from "./version.ts";

// Tagged release builds.
assert.equal(isCsvOnlyGoatCounter("v2.7.0"), true);
assert.equal(isCsvOnlyGoatCounter("v2.6.1"), true);
assert.equal(isCsvOnlyGoatCounter("v1.4.2"), true);
assert.equal(isCsvOnlyGoatCounter("v2.8.0"), false);
assert.equal(isCsvOnlyGoatCounter("3.0"), false);

// The official Docker image: commit plus commit time, no release tag.
assert.equal(isCsvOnlyGoatCounter("7e91d8a9bdbb_2025-12-15T18:20:31Z"), true);
assert.equal(
  isCsvOnlyGoatCounter("7e91d8a9bdbb_2025-06-08T10:00:00Z-dev"),
  true
);
assert.equal(isCsvOnlyGoatCounter("0123456789ab_2026-03-01T00:00:00Z"), false);

// No version information at all: assume the older, CSV-only kind.
assert.equal(isCsvOnlyGoatCounter("dev"), true);
assert.equal(isCsvOnlyGoatCounter(""), false);

console.log("goatcounter-version: all checks passed");
