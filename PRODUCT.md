# GTCD

## Platform

Self-hosted web application: SvelteKit 2, Svelte 5, TypeScript 6 and Node.js 26.
See [README](README.md) for installation and [repository workflow](docs/WORKFLOW.md)
for development and verification.

## Users and purpose

Site owners and analysts monitor traffic, explore pages and audiences, and
manage multiple GoatCounter sites in a self-hosted analytics workspace.

## Capabilities and constraints

Overview, reports and drill-downs, path directory, site settings, and exports
use actual GoatCounter data. Authentication, server-side API mediation,
permissions, sessions, and multi-site context must remain intact.
Administration uses each signed-in user's server-side GoatCounter session to
render custom users, tokens, security, imports, page data and preferences screens.
Keep the stock GoatCounter build unchanged; never elevate these actions through
the dashboard's shared API token. GTCD display settings and scheduled reports
remain separate from native GoatCounter preferences and email reports.
Do not fabricate statistics or add decorative operational claims.

## Reporting and saved state

- Reports preserve the selected site, period, filters and grouping in URL state.
  Saved views and overview layout are per-user Redis-backed preferences.
- Display dates, hours, separators, language and fewer-numbers behavior follow
  GoatCounter preferences with supported per-user GTCD overrides.
- Previous-period comparisons are optional streamed data. Missing or incomplete
  baselines are unavailable, not zero. Pages pagination uses bounded opaque
  server-side cursors; expired cursors require restarting pagination.
- Exports are upstream jobs. Stock GoatCounter 2.7 supports CSV, not JSON;
  JSON is enabled only for supporting builds. Refreshing status must not start
  another job, and downloads stay server-mediated.

## Sharing and delivery

Administrators can create named public links with independent rotation,
revocation, expiration (1, 7 or 30 days, or never), metric categories and fixed
date ranges. Link holders need no account. Grants are checked server-side before
fetching public data; noindex and no-store headers are not substitutes for those
checks. GoatCounter's own site visibility and counter embeds are separate from
GTCD public-report grants.

GTCD summaries and traffic alerts are explicit per-user opt-ins delivered to
the account email through configured SMTP. An in-process scheduler checks every
15 minutes; Redis records jobs, retry attempts and renewable leases. Delivery
can duplicate after a crash between SMTP acceptance and a durable checkpoint;
there is no exactly-once guarantee. Native GoatCounter reports use its separate
configuration and scheduler.

## Security and failure behavior

The browser never receives the configured shared API key or native session
cookies. The admin email allowlist and upstream permissions both apply to their
respective operations; a shared API identity is not per-user tenant isolation.

Session and query-cache fallback is process-local. Durable preferences, shares
and delivery require Redis; writes fail explicitly during outages and public
reports fail closed when grants cannot be verified. See
[Redis state and upgrades](docs/REDIS_STATE.md) before changing persistence.

All current application routes are excluded from search indexing. Shared-link
preview metadata is generic and omits report identity and access tokens.
The PWA caches app assets, not private reports; live analytics require a server.

## Design commitments

The user selected the ReUI design system (https://reui.io/) with ReUI Frame
rather than Card as the primary dashboard surface; [DESIGN.md](DESIGN.md) records the
tokens and primitives. Preserve Svelte 5 and Bits UI; port React registry
recipes without adding React.
Support desktop, mobile, keyboard navigation, and both light and dark themes.

## Operational boundaries

Keep stock GoatCounter unchanged. Native administration compatibility is checked
against stock 2.7; revalidate the allowlisted form bridge after upstream upgrades.
Unknown forms fail closed. Import/merge/purge acceptance is not completion.

CI verifies the app and publishes container images; production rollout and data
migration are operator-owned actions. [Operations](docs/GOATCOUNTER_OPERATIONS.md)
and [performance checks](docs/PERFORMANCE.md) distinguish local fixtures from
production measurements. Completed plans preserve historical decisions and
evidence rather than redefining current behavior.
