// No imports: version.check.ts runs this file directly with
// node --experimental-strip-types.

/** v2.7.0, the last release with CSV-only exports, shipped on this day. */
const LAST_CSV_ONLY_RELEASE_DAY = "2025-12-15";

/**
 * True when a GoatCounter `/status` version predates JSON exports. Release
 * builds report "v2.7.0", but the official Docker image is built without a
 * release tag and reports "<commit>_<commit time>", or "dev" without VCS
 * data; judge those by the commit date, and treat "dev" as the older kind.
 */
export function isCsvOnlyGoatCounter(version: string): boolean {
  const release = /^v?(\d+)\.(\d+)(?:\.|$)/.exec(version);
  if (release) {
    const [major, minor] = [Number(release[1]), Number(release[2])];
    return major < 2 || (major === 2 && minor <= 7);
  }

  const build = /^[0-9a-f]{12}_(\d{4}-\d{2}-\d{2})/.exec(version);
  if (build) return build[1] <= LAST_CSV_ONLY_RELEASE_DAY;

  return version === "dev";
}
