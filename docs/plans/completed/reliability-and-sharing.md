# Reliability, report performance and sharing

## Outcome

Implement the five accepted improvements in order: durable state, scheduled
delivery jobs, streamed comparisons and bounded pagination, diagnostics, and
independent audience-controlled share links. Keep stock GoatCounter unchanged.

## Decisions

- Redis is required for durable mutations and scheduled delivery. Session and
  query-cache fallback remain available; failed durable writes never succeed
  only in memory. Public shares fail closed when state cannot be verified.
- Email delivery is at-least-once. A crash between SMTP acceptance and the
  durable checkpoint may duplicate delivery; no exactly-once promise.
- Existing production share links remain valid until explicitly revoked,
  rotated or expired. New audience controls are enforced server-side.
- Preserve ReUI Frame, Svelte 5, translations and server-only credentials.

## Implementation order

1. Add strict Redis state operations and outage/recovery tests.
2. Persist delivery attempts, coordinate workers and resume subscriber scans.
3. Stream optional comparisons and use bounded server-side pagination cursors.
4. Add timestamped dependency health and admin-only operational diagnostics.
5. Add named share links with range and metric disclosure controls.

## Verification

Use isolated Redis and mock GoatCounter/SMTP, exercise outage and recovery,
concurrent workers and permissions, then run type/lint/logic/build/E2E checks.
Inspect affected screens at desktop/mobile sizes. Do not touch ignored tasks.

## Delivery

Local implementation only; no push or deployment. Durable Redis remains part of
the existing deployment; document the test Redis prerequisite and delivery
semantics. Reverting code must not delete persisted state.

## Progress

- All five implementation steps are complete locally. Existing share records
  remain readable; audience grants are enforced before upstream metric requests.
- `pnpm check`: zero errors and warnings. Logic self-checks and production build
  pass. `pnpm lint` passes with four existing unused-disable warnings.
- Full isolated Redis/mock upstream E2E suite: 24 passed (43.8 seconds). The
  streamed Pages/cursor scenario also passed independently with screenshots.
- Inspected desktop/mobile diagnostics, audience settings and visits-only public
  sharing, plus Pages loading, comparison failure and expired-cursor states.
  Synthetic fixtures only; captured share fields are masked.
- Disposable Redis AOF restart retained its test record. Shell syntax and
  Prettier YAML parsing pass; no production deployment or migration was run.
- ReUI C1–C3 pass. C4 flags only the existing mobile sidebar backdrop; its
  intentional non-dialog role is documented inline. No new primitives installed.
- Deployment now enables AOF and a Kubernetes PVC. Existing ephemeral Redis
  migration remains an operator rollout step, documented in `docs/REDIS_STATE.md`.
- No commit, push or deployment performed.
