# GoatCounter performance and operations

## Scope and current status

Upstream defaults reviewed against GoatCounter v2.7.0 source; repository
configuration rechecked 2026-10-18. The deployed image version
is unknown: both deployment recipes use a mutable `latest` tag. Verify the
installed version and its `serve -help` before changing upstream flags.

Local regression tests exercise gtcd against an isolated HTTP server, not a real
GoatCounter database. No live database, CPU throttling, disk latency, ingestion
delay, or retention measurements were available. No deployment or data migration
was performed. Do not interpret the defaults below as measured recommendations.

## 1. Dashboard API demand

gtcd retains its 280 ms outbound pacing, 30-second read cache, Redis shared cache,
and coalescing of overlapping identical GETs. Health refreshes now share one
background operation and start at most once per minute per process, including
after failures. Transient retries can still produce several upstream attempts.
The health endpoint remains nonblocking with respect to GoatCounter and reports
the last observed dependency status; it is not a fresh ingestion check. It returns
HTTP 200 even when dependencies are degraded, so container probe success does not
mean Redis-backed settings or upstream reports are available.

Permanent 4xx errors fail immediately. HTTP 408, 429, network failures, and 5xx
errors retain bounded retries. A final 429 no longer waits for a nonexistent
next attempt. The API token remains server-side.

Measured with the same local regression scenario before and after the change:

- Twenty health refresh triggers: 20 upstream requests → 1.
- A permanent 403: 4 upstream attempts → 1; 4,367 ms → 22 ms locally.
- Ten concurrent identical reads plus a cached read: 1 upstream request.
- A first-attempt 503 or 429 followed by success: still retries successfully.

These recorded timings are synthetic, not production latency estimates or new
measurements from this documentation review. Run the client regression with
`pnpm build && pnpm exec playwright test goatcounter-client.test.ts`. The complete
`pnpm test:e2e` suite also needs an isolated Redis instance; see
[local verification](REDIS_STATE.md#local-verification).

The pacer and health cooldown are per process, not cluster-wide. GoatCounter
v2.7.0 applies its API limiter by client address after real-IP handling, not by
token. Multiple dashboard replicas or other API clients sharing an address can
still hit the same limit. Observe 429s before increasing replicas; do not disable
the upstream limiter or assume shared caching coordinates simultaneous cold misses.

## 2. Database and storage

GoatCounter v2.7.0 already defaults SQLite to WAL, a 200 ms busy timeout, and
approximately 20 MB of page cache. Do not blindly enable WAL again, turn off
synchronization, run VACUUM against a busy database, or migrate to PostgreSQL.
Measure report latency, lock errors, database/WAL growth, storage latency, and
distinct-path growth first. SQLite remains a reasonable single-instance default.

The Kubernetes manifest uses one replica and now specifies `Recreate` to avoid
overlapping SQLite writers during deployment and automatic migration. This causes
a brief outage while the old pod stops and its replacement starts. ReadWriteOnce
storage alone does not enforce a single pod writer. Keep replicas at one.

**Existing Compose installations need a storage audit before recreation.** The
recipe mounts `goatcounter-data` at `/var/lib/goatcounter` without an explicit DB
path. The upstream image uses a different working/data directory. Do not assume
that named volume contains the active database. Identify the running DB path and
all mounted volumes without dumping environment secrets. Take a consistent SQLite
backup using its backup API or an offline copy of the complete database state,
and test restoring it separately. Copying only the main file while WAL writes
continue is not a consistent backup. Only then change the DB path or volume mount
in a separately reviewed migration. Never use `docker compose down -v` here.

The current Kubernetes PVC is 1 GiB. Watch free capacity and growth; expand using
the storage class's supported procedure before it fills. PostgreSQL migration is
a separate project with a restored test copy, load comparison, maintenance window,
and rollback plan—not a default optimization.

## 3. Tracking and persistence delay

The v2.7.0 `-store-every` default is 10 seconds. Hits are buffered in memory and
persisted/aggregated in batches; processing time and gtcd's read cache add delay.
Ten seconds is not an end-to-end freshness guarantee. Longer intervals can reduce
write frequency but increase report delay and the unpersisted loss window.
Shorter intervals increase database work. Keep the default until measured.

In a staging site, send a uniquely identifiable path using the real browser
tracker and the site's correct host. Record when the browser sends it, when
GoatCounter reports it, and when gtcd displays it. Repeat across quiet and peak
traffic. Do not rely on curl alone: bot filtering, host routing, blocking, and
consent settings can prevent the hit from being recorded.

Investigate duplicate tracker inclusion and unbounded dynamic URL/query-string
cardinality before allocating more CPU. Normalizing paths changes report meaning:
agree the reporting policy first, retain meaningful campaign attribution, and
validate representative URLs before changing tracking configuration.

## 4. Containers and runtime resources

Start with these read-only Kubernetes checks in the intended context/namespace:

```sh
kubectl config current-context
kubectl get deployment goatcounter
kubectl get pods -l app=goatcounter -o wide
kubectl top pods -l app=goatcounter
kubectl get pvc goatcounter-data
kubectl exec deployment/goatcounter -- goatcounter version
kubectl exec deployment/goatcounter -- goatcounter serve -help
```

These require cluster access; `top` also needs Metrics Server. For Compose,
inspect only the intended GoatCounter container with `docker compose ps
goatcounter`, `docker compose stats --no-stream goatcounter`, and `docker compose
exec goatcounter goatcounter version`. Check platform monitoring for CPU throttled
time, OOM kills, restarts, working-set/RSS, and disk latency over representative
peak traffic; a single `top` sample is not a sizing study. Avoid sharing raw logs
or configuration containing tokens, IPs, or visitor data.

Current Kubernetes requests/limits remain 50m/300m CPU and 64Mi/256Mi memory.
Compose has no explicit CPU/memory caps. No measurements justify changing them
yet. Raise CPU limits only when throttling correlates with processing/query delay;
size memory with measured peak headroom, including SQLite/cgo and filesystem
cache. `GOMEMLIMIT` is not a hard container RSS limit. Do not copy large upstream
example PostgreSQL/WAL or connection-pool settings into a small installation.

Kubernetes probes now use GoatCounter's `/status` rather than rendering `/`.
Confirm `/status` returns 200 on the installed version before applying. It checks
service health, not successful tracking persistence. Do not expose that diagnostic
endpoint publicly just for monitoring.

Redis is more than a disposable query cache: it also stores sessions, saved
views, share links, report subscriptions, and delivery state. Current setup
scripts enable AOF with `appendfsync always`; Kubernetes mounts the `redis-data`
PVC and uses `Recreate`. Existing ephemeral installations require an operator-led
migration before the deployment helper will proceed. Follow
[Redis state and safe upgrades](REDIS_STATE.md); persistence does not replace
backups. Do not add `allkeys-lru` or reduce its memory ceiling as a cache optimization.

## 5. Retention

No retention policy was changed. Shortening it permanently deletes historical
statistics; deleted history cannot be restored by reverting configuration.
GoatCounter v2.7.0 permits positive retention periods of at least 14 days, and
cleanup runs daily. Agree the historical reporting requirement and backup retention
before changing the site's existing Settings → retention value. Never infer
permission to delete history from a request to improve performance.

Measure database growth and the oldest history actually used first. Test an
approved policy on a restored copy, verify reports spanning the cutoff, and monitor
cleanup cost and disk space. Keep a tested backup for recovery. Deletion does not
necessarily shrink SQLite's main file immediately; schedule any compaction as a
separate maintenance operation with sufficient spare disk and an outage plan.

## Rollout and recovery

For application changes, use the checks in [Repository Workflow](WORKFLOW.md#verification),
including an isolated Redis instance for the full browser suite, then review the
owned diff. Do not run setup or deployment scripts just to validate:
they rewrite configuration or change shared infrastructure.

Before a live rollout, record the image digest, DB path/mounts, site settings,
resource metrics, and a tested backup. Pin a verified image digest in the deployment
as a separately reviewed change. Apply to staging first, confirm `/status`, then
exercise login, reports, tracking persistence, and 429 recovery. Observe a full
peak period before claiming capacity improvement. Recreate entails downtime;
schedule it. Roll back application code/configuration if needed, but do not roll
back a GoatCounter binary across automatic schema migrations without upstream
compatibility confirmation. Restore a compatible backup if required.

Outstanding live work: confirm the installation/version and real DB location,
collect baseline/load measurements, test storage recovery, agree acceptable report
freshness and retention, then select resource or persistence changes from evidence.

## Upstream references

- [v2.7.0 server flags](https://github.com/arp242/goatcounter/blob/v2.7.0/cmd/goatcounter/serve.go)
- [SQLite connection defaults](https://github.com/arp242/goatcounter/blob/v2.7.0/cmd/goatcounter/db.go)
- [Batch processing](https://github.com/arp242/goatcounter/blob/v2.7.0/cron/tasks.go)
- [Upstream repository and release history](https://github.com/arp242/goatcounter)

The checked-in manifests' `GOATCOUNTER_DB` is supported by this release's flag
environment handling; do not confuse server flags with CLI-only site/token
bootstrap. Inspect the installed version rather than relying on blanket claims
that the official image supports no environment variables.
