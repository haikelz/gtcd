// No imports: version.check.ts runs this file directly with
// node --experimental-strip-types.

/**
 * Commit time of GoatCounter 0a5512861522 ("Add JSON export"), which added the
 * export "format" and "start_from_day" fields after the v2.7.0 release.
 */
const JSON_EXPORT_COMMIT_TIME = "2026-04-25T18:35:22Z";

/**
 * True when a GoatCounter `/status` version predates JSON exports. Release
 * builds report "v2.7.0", but the official Docker image is built without a
 * release tag and reports "<commit>_<commit time>", or "dev" without VCS
 * data; judge those by the commit time, and treat "dev" as the older kind.
 */
export function isCsvOnlyGoatCounter(version: string): boolean {
  const release = /^v?(\d+)\.(\d+)(?:\.|$)/.exec(version);
  if (release) {
    const [major, minor] = [Number(release[1]), Number(release[2])];
    return major < 2 || (major === 2 && minor <= 7);
  }

  // Go stamps the commit time in UTC, so the strings compare as times.
  const build = /^[0-9a-f]{12}_(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)/.exec(
    version
  );
  if (build) return build[1] < JSON_EXPORT_COMMIT_TIME;

  return version === "dev";
}
