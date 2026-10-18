# GoatCounter Dashboard Parity

> Historical plan, archived after completion. Its implementation boundaries
> describe the original scope, not current policy. See the [README](../../../README.md)
> for current capabilities and the [reliability and sharing plan](reliability-and-sharing.md)
> for follow-on work.

## Current disposition

The phase notes and test results below are historical. Native administration is
now rendered in GTCD through a personal-session bridge rather than a mandatory
native-UI handoff. Later work added durable Redis state, bounded page cursors,
named/scoped share links and persisted delivery retries. Earlier statements about
unbounded pagination, memory fallback or sending once are not current contracts.
See [PRODUCT.md](../../../PRODUCT.md) and [Redis state](../../REDIS_STATE.md).

## Outcome

Make GTCD the primary interface for every GoatCounter capability exposed by the
documented JSON API, while preserving a clear, secure native-admin handoff for
capabilities that the API does not expose.

## Scope

- Complete API-supported reporting: pagination and detail drill-downs.
- Complete API-supported exports: CSV/JSON format and incremental/date cursors.
- Complete API-supported site lifecycle where authorization permits it.
- Keep API secrets server-side and preserve the existing GoatCounter pacing,
  session, tenant, and admin boundaries.

## Explicit API boundary

The documented API exposes statistics, exports, sites, paths, and current-user
data. Native operations without a documented API route, including user/TOTP/API
token management, imports, email reports, and pageview merge/delete, remain a
direct native-admin handoff. GTCD must make that handoff discoverable rather
than falsely emulate it.

## Plan

1. Complete: inventory every current GTCD route against the official API and
   native dashboard capabilities.
2. Complete: extend server contracts and routes for supported gaps without
   exposing the GoatCounter API token.
3. Complete: update dashboard navigation and management surfaces with
   accessible states.
4. Blocked: production/type validation is complete; authenticated browser QA
   requires a working local GoatCounter and dashboard session.

## Decisions and progress

- Added paged report views and drill-downs for every upstream detail category;
  languages has no detail endpoint upstream and remains a top-level report.
- Added a paged path directory for `GET /paths`; the report page uses GoatCounter's
  required excluded-path cursor pagination.
- Added CSV and JSON export requests with their respective cursors, and retained
  the one-hour upstream export limit as a visible constraint.
- Added data-collection switches, site creation when the API token includes
  `site-create`, and removed the site settings secret before serializing data to
  the browser.
- User/TOTP/API-token/preferences/email-report/import/pageview-mutation flows
  have no documented JSON API mutation endpoint, so native-admin handoff remains
  the safe complete behavior for those operations.
- Review fixes: page cursor navigation has no artificial path-count cap; failed
  site creation preserves input; success announces site creation distinctly;
  report-detail mobile context is explicit.

## Evidence

- Official API inventory: GoatCounter API documentation.
- Current implementation: `src/lib/server/goatcounter/` and
  `src/routes/dashboard/`.
- `pnpm check`: pass with zero diagnostics.
- `pnpm build`: pass.
- `docker compose up -d --build gtcd`: pass; `/api/health` returned 200, but
  reported GoatCounter as unknown and Redis as disconnected. Protected routes
  redirect to `/login`, so protected-route screenshots and interactions were
  not claimed as verified.
- `pnpm lint`: changed files are clean; eight existing violations remain in
  `AreaChart.svelte`, `Brand.svelte`, `SEO.svelte`, `ThemeToggle.svelte`,
  `ToastStack.svelte`, and `+error.svelte`.

## Phase 2: preferences, sharing, and layout (2026-10-11)

Gap analysis against GoatCounter's API spec, source, and help pages found that
every API endpoint except `POST /count` and all ten widget types were already
covered. This phase closes the remaining gaps.

- Complete: display preferences from `/me` (`$lib/preferences.ts`). Report
  ranges are built as wall-clock dates in the user's GoatCounter timezone and
  sent with that zone's offset; dates, hours, and numbers follow the user's
  date format, clock, and thousands separator. `sunday_starts_week` is not
  applied: GoatCounter only uses it in its own date picker, and gtcd uses
  native date inputs. Runnable check: `node --experimental-strip-types
src/lib/preferences.check.ts`.
- Complete: event totals from `/stats/total` on the overview.
- Complete: dashboard visibility as private/secret/public with token
  generation and share link. Decision: the site `secret` is now sent to the
  admin-only settings page when the site is in secret mode. It is a view-only
  token that GoatCounter's own settings page shows to the same admins; other
  routes still strip it.
- Complete: visitor-counter embed builder; `/counter/*` routed to GoatCounter
  in the generated Caddyfile, `scripts/setup.sh`, and the Kubernetes Ingress.
- Complete: shared/per-page sparkline scale (`?scale=shared`) and a table view
  for the traffic chart.
- Complete: saved views, default view, and overview widget order/visibility,
  stored per user in Redis with an in-memory fallback
  (`$lib/server/dashboard-layout-store.ts`, `/dashboard/customize`). Hidden
  widgets skip their upstream requests.
- Not done by design: email reports (needs gtcd-run mail delivery).
- `gcFetch` now shares one in-flight request between identical concurrent GETs.

Evidence: `pnpm check`, `pnpm lint` (src), `pnpm build`, the preferences check,
and browser QA against a synthetic upstream with a Jakarta-timezone user while
the server ran with `TZ=UTC` (upstream received `+07:00` boundaries).

## Phase 3: remaining buildable gaps (started 2026-10-11)

Scope, in build order:

1. Widget parity and options: add GoatCounter's `toprefs` and `campaigns`
   overview widgets; per-widget `limit` (list widgets, 1–20; pages 1–100) and
   `style` (traffic: line/bar; pages: line/bar/text).
2. First-use import of the API token owner's GoatCounter widgets and
   `default` view (period/filter/group) into the gtcd layout. GoatCounter's
   copy is read-only through the API, so later edits stay in gtcd.
3. "Fewer numbers" mode from `/me` (`fewer_numbers`, honoring
   `fewer_numbers_lock_until`), with a per-user gtcd override.
4. "Send test visit" via `POST /api/v0/count`, recorded as a labelled event.
5. Public read-only gtcd dashboard behind revocable per-site share tokens.
6. Email reports over SMTP (`SMTP_*` env), per-user frequency and site,
   scheduled in-process with a Redis lock so replicas send once.
7. Indonesian translation: locale from the GoatCounter `language` setting,
   overridable per user; English fallback.

Out of scope (no API): users/access, API tokens, TOTP, imports, path
merge/purge, site removal/code change, account merge/delete, server admin.

Phase 3 status (2026-10-11): all seven items complete.

- Widget parity/options and first-use GoatCounter import: done
  (`src/lib/dashboard-layout.ts`, check: `src/lib/dashboard-layout.check.ts`).
- Fewer numbers with lock and override: done (`src/lib/preferences.ts`).
- Test visit: done (`sendTestVisit` in `src/lib/server/goatcounter/admin.ts`).
- Public dashboard: done (`src/routes/share/[token]`, `src/lib/server/share-store.ts`).
- Email reports: done (`src/lib/server/email-reports.ts`, `src/lib/report-period.ts`,
  check: `src/lib/report-period.check.ts`); verified against Mailpit, including a
  scheduled send from the production build.
- Indonesian translation: done (`src/lib/i18n`, 651 keys per locale; a missing
  Indonesian key fails `pnpm check`).
- Fixes found during QA: Redis `pingRedis` now connects before its first ping
  (lazyConnect without an offline queue made the first command of every
  process fall back to memory, dropping early logins and the first report
  tick); session lookups also fall back to the in-memory store on a Redis miss.
