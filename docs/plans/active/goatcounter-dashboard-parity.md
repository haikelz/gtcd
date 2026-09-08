# GoatCounter Dashboard Parity

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
