# Report workflows

## Outcome

Complete saved views, overview comparisons, expiring read-only sharing, and
opt-in scheduled summaries and traffic alerts without duplicating existing
features. Keep account ownership, site access, localization and Frame UI.

## Implementation

- Preserve the existing saved-view workflow; include the selected site when
  saving and reopening a view.
- Stream previous-period totals and audience share comparisons alongside the
  overview; missing baselines remain unavailable rather than zero.
- Expire shared links after a chosen 1, 7 or 30 days (7 by default), retain
  rotation/revocation, and disable caching, indexing and referrer transmission.
- Reuse SMTP and the server scheduler for opt-in daily traffic alerts comparing
  the last completed day with the day before, after 07:00 in the GoatCounter
  timezone. Configure change threshold, direction, baseline minimum and site.
- Summaries and alerts are separate subscriptions. No real emails or public
  links are created without the user's explicit action in the application.

## Verification and recovery

Use logic checks, authenticated/anonymous route checks and browser flows against
the isolated e2e upstream and local SMTP sink. Inspect desktop/mobile themes.
Run check, lint, logic tests, build and e2e. No production deployment or commit.
Redis persists preferences; its existing memory fallback is process-local and
lost on restart. Disable alert/report subscriptions to stop future deliveries;
revoke share links to stop access. Previously delivered emails cannot be recalled.

## Results

- `pnpm check`: zero errors or warnings.
- `pnpm test:checks`: all logic checks passed, including view-site sanitation,
  missing/zero comparison baselines and traffic-alert thresholds/directions.
- `pnpm build`: passed.
- `pnpm test:e2e --workers=1`: all nine tests passed against mock GoatCounter
  and a local SMTP sink. Covers view navigation, alert persistence/validation,
  anonymous rejection, SMTP delivery/retry/overlap suppression/disable, token
  expiry/rotation/revocation and login smoke tests.
- Inspected comparison and alert Frame captures at 1440px and 390px in light
  and dark themes, plus sharing controls. Capture animations were disabled to
  avoid recording sidebar transitions during resize.
- `pnpm lint` is blocked by pre-existing formatting in
  `.cursor/hooks/graft-hooks.cjs`, `AGENTS.md`, and `GEMINI.md`; these remain
  untouched. Separate ESLint has zero errors and four existing unused-disable
  warnings. Owned files pass formatting checks.
- SMTP is not exactly-once. Local overlap suppression and a Redis lease reduce
  duplicates; crashes after SMTP acceptance and Redis outages across replicas
  remain documented delivery limits. No real mail or deployment was performed.
