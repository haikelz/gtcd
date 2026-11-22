# GoatCounter performance and operations

## Scope and current status

Upstream defaults reviewed against GoatCounter v2.7.0 source; repository
configuration rechecked 2026-10-18. Both deployment recipes now pin v2.7.0 by
digest (see [GoatCounter image pin](#goatcounter-image-pin)). An installation
created from the earlier `latest` recipes runs whatever that tag resolved to
when it was pulled. Verify the installed version and its `serve -help` before
changing upstream flags.

Local regression tests exercise gtcd against an isolated HTTP server, not a real
GoatCounter database. No live database, CPU throttling, disk latency, ingestion
delay, or retention measurements were available. No deployment or data migration
was performed. Do not interpret the defaults below as measured recommendations.

## 1. Dashboard API demand

gtcd paces outbound calls to `GOATCOUNTER_API_RATE` a second with a 12% margin
(280 ms apart at GoatCounter's default of 4, 56 ms at the 20 that Compose and
Kubernetes give the bundled instance through `-ratelimit api:20/1`), and keeps
its 30-second read cache, Redis shared cache and coalescing of overlapping
identical GETs. Raise both sides together; a gtcd rate above GoatCounter's
brings 429 pauses that are slower than the lower rate. Health refreshes now share one
background operation and start at most once per minute per process, including
after failures. Transient retries can still produce several upstream attempts.
The health endpoint remains nonblocking with respect to GoatCounter and reports
the last observed dependency status; it is not a fresh ingestion check. It returns
HTTP 200 even when dependencies are degraded, so container probe success does not
mean Redis-backed settings or upstream reports are available.

Permanent 4xx errors fail immediately. Reads retry HTTP 408, 429, network
failures and 5xx errors with backoff. Writes (POST, PUT) retry only after a 429:
any other failure may already have taken effect upstream, such as a created
site or export. Each call has one 20-second budget across pacing, attempts and
backoff, and an attempt that times out (15 seconds) is not retried, so an
unreachable GoatCounter fails a page in about 15 seconds instead of a minute.
A 429 pauses every queued request in the process for its `Retry-After`
(seconds or HTTP date), at least 1 second and at most 60; a request whose
budget cannot cover the pause fails at once. The API token remains server-side.

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

Compose keeps GoatCounter's data in the `goatcounter-data` volume at the image's
own data directory; installs from before that change need the one-time move in
[Compose storage](#compose-storage).

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
With the City database for [regional reporting](#regional-reporting), about
60 MB of it is memory-mapped inside that limit.
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

## GoatCounter image pin

`docker-compose.yaml` and `k8s/gtcd/goatcounter.yaml` run
`arp242/goatcounter:2.7.0` pinned to its multi-architecture index digest
`sha256:791df3317bf5ce379511181a4802aaf29127a318b372d4fe39ec59e1c5af44be`.
On 2026-11-04 `latest`, `2.7` and `2.7.0` all resolved to that digest. The
Kubernetes manifest starts GoatCounter with `-automigrate`, so a newer image
migrates the schema on start. Migrations only move forward: a pin older than
the version that last ran against the database is a downgrade onto a schema it
does not know.

Before applying the pin to an existing installation, or changing it later:

1. Read the version and image digest that run now, in the intended context or
   Compose project:

   ```sh
   kubectl exec deployment/goatcounter -- goatcounter version
   kubectl get pods -l app=goatcounter \
     -o jsonpath='{.items[*].status.containerStatuses[*].imageID}'
   docker compose exec goatcounter goatcounter version
   docker compose images goatcounter
   ```

2. List the migrations the running binary knows; `pending:` marks ones it has
   not applied. Run the same command through `docker compose exec` for Compose:

   ```sh
   kubectl exec deployment/goatcounter -- goatcounter db migrate list
   ```

3. Pin only the same or a newer release than step 1 reports. If the running
   version is newer than this pin, pin that version instead.
4. Resolve the new release's index digest with
   `docker buildx imagetools inspect arp242/goatcounter:<version>` and use the
   top-level `Digest:` line, not a per-platform manifest. Update both files in
   one change.
5. Take and test a database backup (see [Database and storage](#2-database-and-storage)),
   then roll out to staging before production.
6. Moving past v2.7.0 brings a second API limit from upstream commit
   `e40357e8c1e4`: 500 requests an hour per client address (`api2`). Every gtcd
   user reaches GoatCounter from the dashboard's address, so a busy dashboard
   can spend it and see 429s for up to an hour. Add
   `-ratelimit api2:15000/3600` to the `serve` arguments, just above the 14,400
   an hour that gtcd's pacing allows one process, and keep the per-second `api`
   limit.

## Regional reporting

GoatCounter records a visitor's region (state or province) only with a MaxMind
City database. Its built-in database covers countries. Both recipes fetch
GeoLite2 City with a free [MaxMind GeoLite account](https://www.maxmind.com/en/geolite2/signup)
and a license key from its **Manage license keys** page.

**Kubernetes.** Set `MAXMIND_ACCOUNT_ID` and `MAXMIND_LICENSE_KEY` in
`k8s/.env`. `deploy-k8s.sh` stores them in the `goatcounter-geoip` Secret, never
as `GOATCOUNTER_*` variables, which make `serve` exit. On each pod start the
`geoipupdate` init container (MaxMind's image, pinned by digest) downloads the
database into `/data/goatcounter-data` on the PVC; GoatCounter runs in `/data`
and loads the first `*.mmdb` there.

- Updates happen only on a pod restart, since GoatCounter reads the file once at
  start: `kubectl rollout restart deployment/goatcounter`. `Recreate` means a
  brief outage. New keys also need this restart; a Secret change restarts
  nothing.
- The init container gives up after 120 seconds and always exits 0. Without the
  Secret, with a rejected key or with MaxMind unreachable, GoatCounter keeps the
  last downloaded database, or its built-in Countries one. Read
  `kubectl logs deployment/goatcounter -c geoipupdate`, and check that
  GoatCounter's startup log shows `geoip.type = GeoLite2-City`.
- Removing the keys from `k8s/.env` leaves the Secret in place;
  `kubectl delete secret goatcounter-geoip` stops the downloads, and GoatCounter
  keeps using the last file.
- Memory: about 60 MB of the City database is memory-mapped, counted as page
  cache inside GoatCounter's 256Mi limit. Watch its working set after turning
  this on and raise the limit only if usage shows the need. The 1 GiB PVC also
  holds a temporary copy during each download.

**Compose.** Set `GOATCOUNTER_GEODB=maxmind:<account_id>:<license_key>` in
`.env` and recreate GoatCounter with `docker compose up -d goatcounter`.
GoatCounter downloads the database itself when it starts and its copy is missing
or over a week old. A failed download stops GoatCounter, and Compose restarts it
in a loop until you fix or clear the value.

**Site settings.** Turn on **Region** under Settings → Data to collect. You keep
regions only for the countries in **Countries with regional reporting**: a blank
list means every country, and GoatCounter's default list is `US, RU, CN`. Other
countries record the country alone. Pageviews recorded earlier keep what they
had.

Checked against the v2.7.0 binary with MaxMind's City test database: GoatCounter
loads `goatcounter-data/*.mmdb` from its working directory, falls back to the
built-in Countries database without one, and refuses to start on a 0-byte
`.mmdb`, which the init container therefore deletes. The real GeoLite2 City
download needs a MaxMind key and was not run.

## Compose storage

The image keeps its database in `/home/goatcounter/goatcounter-data/db.sqlite3`.
Earlier versions of `docker-compose.yaml` mounted the named `goatcounter-data`
volume at `/var/lib/goatcounter` instead, so the database lived in an anonymous
volume that `docker compose down -v` would delete. The recipe now mounts the
named volume at the data directory.

`serve` creates a missing database, so an upgrade would otherwise start on an
empty one. The Compose command refuses to start while the volume has no
`db.sqlite3`, unless `.env` has `GTCD_NEW_INSTALL=1`, which `scripts/setup.sh`
adds only when it creates `.env`. On an existing install the log says
`No database in the goatcounter-data volume`; move the data once:

```bash
# Before pulling the new docker-compose.yaml: name the volume holding the data.
old=$(docker inspect "$(docker compose ps -aq goatcounter)" \
  --format '{{range .Mounts}}{{if eq .Destination "/home/goatcounter/goatcounter-data"}}{{.Name}}{{end}}{{end}}')
echo "$old"   # keep this name

# After pulling it:
docker compose stop goatcounter
docker run --rm --user root --entrypoint /bin/sh \
  -v "$old":/from:ro -v "$(basename "$PWD")_goatcounter-data":/to \
  arp242/goatcounter:2.7.0 -c 'cp -a /from/. /to/ && chown -R 1000:1000 /to'
docker compose up -d goatcounter
```

The copy is consistent because GoatCounter is stopped. Check the dashboard shows
your history, then remove the old volume with `docker volume rm "$old"`. If you
pulled the new file before naming the volume, `docker volume ls` lists it as an
unnamed volume; inspect candidates with
`docker run --rm -v <name>:/v alpine ls /v` and look for `db.sqlite3`.
Rehearsed with the pinned image: the upgrade refused to start, the copy brought
the site back, and a new install with the flag created its database in the
named volume.

## Backups and restore

Kubernetes only; Compose installs have no scheduled backup (see
[Database and storage](#2-database-and-storage) for a manual consistent copy).
With `BACKUP_RESTIC_REPOSITORY`, `BACKUP_RESTIC_PASSWORD`,
`BACKUP_S3_ACCESS_KEY_ID` and `BACKUP_S3_SECRET_ACCESS_KEY` in `k8s/.env`,
`deploy-k8s.sh` creates the `gtcd-backup` Secret and CronJob
(`k8s/gtcd/backup.yaml`). Every night at 03:30, cluster time, one pod:

1. copies GoatCounter's database with `VACUUM INTO` over a read-only
   connection, a consistent snapshot while `serve` keeps writing;
2. takes a Redis snapshot with `redis-cli --rdb`;
3. sends both to the bucket with restic, encrypted, keeping 14 daily and 8
   weekly snapshots.

**Bucket.** Create it first and give the key access to that bucket only. R2:
`s3:https://<account_id>.r2.cloudflarestorage.com/<bucket>` with
`BACKUP_S3_REGION=auto`; AWS: `s3:s3.amazonaws.com/<bucket>`; Backblaze B2 works
through its S3 endpoint. Keep `BACKUP_RESTIC_PASSWORD` outside the cluster too:
without it nobody can read the backups. They hold sessions and share tokens, so
treat them as credentials. Removing the variables later leaves the CronJob in
place; `kubectl delete cronjob gtcd-backup` stops it.

**Checking runs.** Nothing alerts. `kubectl get jobs -l app=gtcd-backup` lists
the last three successful and failed runs, and
`kubectl logs job/<name> -c restic` shows a run's output. Start one now with
`kubectl create job --from=cronjob/gtcd-backup gtcd-backup-now`. With the same
`RESTIC_*` and `AWS_*` variables exported, `restic snapshots` lists them from
any machine, and `restic restore latest --target ./restore` fetches the newest
into `./restore/backup/`.

**Restoring GoatCounter.** Stop it, copy the file over the database, and drop
the old WAL files:

```bash
kubectl scale deployment/goatcounter --replicas=0
kubectl run gc-restore --image=busybox:1.37 --restart=Never --overrides='{"spec":{"securityContext":{"runAsUser":1000,"runAsGroup":1000,"fsGroup":1000},"containers":[{"name":"gc-restore","image":"busybox:1.37","command":["sleep","3600"],"volumeMounts":[{"name":"data","mountPath":"/data"}]}],"volumes":[{"name":"data","persistentVolumeClaim":{"claimName":"goatcounter-data"}}]}}'
kubectl wait --for=condition=Ready pod/gc-restore
kubectl exec gc-restore -- rm -f /data/db.sqlite3-wal /data/db.sqlite3-shm
kubectl cp restore/backup/goatcounter.sqlite3 gc-restore:/data/db.sqlite3
kubectl delete pod gc-restore
kubectl scale deployment/goatcounter --replicas=1
```

**Restoring Redis.** Redis loads its AOF instead of `dump.rdb` when AOF is on,
so load the snapshot with AOF off, then let Redis write a new AOF from it:

```bash
kubectl scale deployment/gtcd deployment/redis --replicas=0
kubectl run redis-restore --image=redis:7-alpine --restart=Never --overrides='{"spec":{"securityContext":{"runAsUser":999,"runAsGroup":999,"fsGroup":999},"containers":[{"name":"redis-restore","image":"redis:7-alpine","command":["sleep","3600"],"volumeMounts":[{"name":"data","mountPath":"/data"},{"name":"config","mountPath":"/run/secrets","readOnly":true}]}],"volumes":[{"name":"data","persistentVolumeClaim":{"claimName":"redis-data"}},{"name":"config","secret":{"secretName":"redis-config"}}]}}'
kubectl wait --for=condition=Ready pod/redis-restore
kubectl exec redis-restore -- sh -c 'mv /data/appendonlydir /data/appendonlydir.old 2>/dev/null; true'
kubectl cp restore/backup/redis.rdb redis-restore:/data/dump.rdb
kubectl exec redis-restore -- redis-server /run/secrets/redis.conf --appendonly no --daemonize yes
kubectl exec redis-restore -- sh -c 'export REDISCLI_AUTH="$(sed -n "s/^requirepass //p" /run/secrets/redis.conf)"; redis-cli dbsize; redis-cli config set appendonly yes'
```

Repeat `redis-cli info persistence` in the same way until it shows
`aof_rewrite_in_progress:0` and `aof_last_bgrewrite_status:ok`, then run
`redis-cli shutdown`, delete the pod, and scale Redis and gtcd back to 1. Delete
`/data/appendonlydir.old` once the restored data checks out.

Rehearsed in Docker with the pinned images: three `VACUUM INTO` copies taken
while `serve` stored hits passed `PRAGMA integrity_check` with no hits lost;
restic backed up to an S3 endpoint and restored; the restored database served
the same totals; and the Redis steps above kept every key across the AOF switch.
The `kubectl` commands follow those steps but were not run against a cluster.

## Rollout and recovery

For application changes, use the checks in [Repository Workflow](WORKFLOW.md#verification),
including an isolated Redis instance for the full browser suite, then review the
owned diff. Do not run setup or deployment scripts just to validate:
they rewrite configuration or change shared infrastructure.

Before a live rollout, record the image digest, DB path/mounts, site settings,
resource metrics, and a tested backup. Change the GoatCounter image digest only as
described in [GoatCounter image pin](#goatcounter-image-pin), as a separately
reviewed change. Apply to staging first, confirm `/status`, then
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
