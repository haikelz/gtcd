# SvelteKit performance

## Run the authenticated fixture benchmark

```sh
pnpm build
TEST_REDIS_URL=redis://127.0.0.1:6379 pnpm test:perf
```

Run from the repository root with Node.js 26, the pinned pnpm version, and
Playwright Chromium installed (`pnpm exec playwright install chromium`). The
Redis URL above must identify a disposable test instance, not production; see
[Redis local verification](REDIS_STATE.md#local-verification).

Playwright starts isolated production and mock-GoatCounter processes on ports
4193 and 5197. It signs in, creates a fresh browser context with the session,
and opens an uncached report period. The initial login's streaming requests are
allowed to finish before measurements start. The performance configuration inherits
Redis from `TEST_REDIS_URL` (default `redis://127.0.0.1:6379`) in the smoke
configuration. No real analytics, GoatCounter credentials, SMTP service, or
GoatCounter database is needed.

The benchmark records cold-browser TTFB, FCP, encoded JavaScript response bytes,
script requests, CLS, long tasks, report navigation, period changes, repeat
queries, and upstream calls caused by hovering. It writes JSON to
`.amp/in/artifacts/dashboard-performance.json` and a Playwright attachment. Before
running, ensure `/.amp/in/` is present in the file reported by
`git rev-parse --git-path info/exclude`; preserve its existing rules.

The measured ready time includes completion of streamed data and a 500 ms
network-idle window. It is not LCP or the time the first widget becomes usable.
These are desktop Chromium fixture results with no CPU/network throttling, not
production capacity numbers. Run several samples before interpreting timing
changes. Service workers are blocked in this benchmark; separate smoke coverage
checks actual registration, private-cache removal, and static precaching.

Fixture regression gates are under 200,000 encoded JavaScript bytes, CLS below
0.1, no upstream request on hover, no new upstream calls for the tested cached
repeat, Brotli delivery for a hashed script, and streaming before all data arrives.
Absolute navigation timings are reported rather than asserted to avoid CI noise.
CI runs the benchmark after the normal production-build smoke tests.

## Navigation and server work

Route code preloads on hover; server data preloads on tap. This avoids speculative
GoatCounter requests competing with current reports. Clicking a report can take
longer than when hover had already loaded its data; this is a deliberate demand
tradeoff, not a promise that every navigation becomes faster.

Stats-detail handlers reuse the session already validated in `hooks.server.ts`.
Unauthenticated requests still return 401. Logout invalidates state while navigating
to login rather than first reloading the dashboard with a destroyed session.
Failed logout requests retain the page and show a retry message.

Shared layout/default-view behavior is preserved. No broad layout caching or
untracking was added: those changes can make site selection and saved defaults
stale. Overview queries still stream and skip hidden widgets.

## Bundle decisions

Before these changes, the measured overview used 155,704 encoded JavaScript bytes.
After explicit PWA registration and navigation changes, a local sample used
158,551 bytes. Registration code is dynamically imported after mount; the
additional code makes offline asset support and old-cache retirement actually run.

Charts are native SVG/Svelte components, not a heavyweight visualization package.
Settings and exports already have separate SvelteKit routes. No additional lazy
chart boundary was justified by this baseline. Keep above-the-fold charts ready
instead of adding fetch waterfalls. Revisit optional UI splitting if coverage or
the bundle budget identifies a meaningful candidate. Keep SSR enabled.

The service worker caches static assets only. Its activate handler removes the
retired `gtcd-api` browser cache without deleting unrelated caches. Authenticated
reports are not available offline; do not reintroduce account-shared API caching.

## Compression and streaming

The Node build already precompresses static assets. The fixture verifies an
immutable script is served with `Content-Encoding: br`; no extra compression
dependency was added. The direct Node server does not dynamically compress HTML.
The checked-in Caddy configuration enables gzip/zstd for proxied responses.

Inspect an actual deployment read-only with:

```sh
node scripts/check-delivery.mjs https://analytics.example.com/login
```

The probe reports HTML encoding, first-chunk/full-response times, decoded bytes,
and a same-origin script's encoding/cache headers. For an authenticated dashboard
probe, supply its session cookie through `GTCD_AUDIT_COOKIE` in your local
environment, never in arguments, Git, shared logs, or chat. Use HTTPS remotely.
Redirects are rejected so an expired session cannot silently measure login instead.
The probe does not print cookies or HTML. HTML is limited to 5 MB decoded and a
30-second timeout; the script request has a 15-second timeout but no explicit
byte limit. A login response cannot establish dashboard streaming behavior.

For the fixture's uncached streamed overview, one local run delivered its first
chunk in 21 ms and finished in 3,710 ms. This verifies local incremental delivery,
not the deployed ingress. A warm/cache-hit response may finish in a single chunk;
that alone is not evidence of buffering. Real proxy compression/buffering remains
unverified until the probe runs through the intended ingress with delayed data.

## Recorded baseline (2026-10-17)

These historical samples were not rerun during the 2026-10-18 documentation
review and are not measurements of the current bundle.

With the same fixture, hover-triggered stats calls changed from 1 to 0. The
uncached overview still required 13 stats calls, and the measured ready time
remained approximately 4.2 seconds. There is no claimed cold-load speedup.
The tested repeat period switch caused zero new upstream calls. Full before/after
JSON is kept in local artifacts, not committed as a production benchmark.
