# Redis state and safe upgrades

Redis holds saved views, layouts, share grants, subscriptions and delivery
checkpoints as well as sessions and cache entries. Durable reads and writes
fail closed during an outage. Sessions and query caches may still use memory;
that fallback never confirms a durable mutation or authorizes a public share.

The Compose setup and Kubernetes deployment scripts configure Redis 7 AOF with
`appendfsync always`, disable periodic RDB snapshots (`save ""`), and use `/data`
on a persistent volume. Kubernetes requires a default StorageClass
capable of provisioning the `redis-data` 1Gi ReadWriteOnce claim. The Redis
Deployment uses Recreate to avoid two writers on the same volume. Persistence
does not replace backups, replication or disk monitoring. Do not enable an
eviction policy that can evict durable keys; use `noeviction` (Redis default).

## Before upgrading an existing installation

Do not restart or replace an ephemeral Redis pod. The deployment helper refuses
an existing Redis Deployment whose `data` volume has no PVC reference; it does not
verify that the referenced claim contains a successful migration. Compose setup
refuses a running Redis without AOF, but cannot inspect state in a stopped
container. These guards do not migrate data for you. Schedule a maintenance
window and select the correct environment and namespace before operator actions.

1. Pause application writers and schedulers, but keep Redis running. Authenticate
   using the existing secret (for example through a securely supplied
   `REDISCLI_AUTH`), never a password in shell history or a checked-in file.
   Inspect `INFO persistence`, `CONFIG GET dir`, `CONFIG GET appendonly`
   and the volume mounts. Record key counts and representative non-secret state.
2. Take a Redis-native consistent backup (`BGSAVE`, wait for completion, copy the
   completed RDB to protected storage). Verify the backup with `redis-check-rdb`
   and restore it to an isolated Redis instance before proceeding. Treat backups
   as credentials: they contain sessions and share tokens. Keep a recovery copy
   outside the pod and its volume.
3. Compose already mounts a named volume at `/data`. Enable AOF on the live
   instance with `CONFIG SET appendonly yes` and `CONFIG SET appendfsync always`.
   Wait for `aof_rewrite_in_progress:0`, `aof_last_bgrewrite_status:ok` and
   `aof_last_write_status:ok` in `INFO persistence`. Confirm the AOF files are on
   that named volume, not a container layer. Only then run setup and recreate
   Redis if needed to load the generated config.
4. For Kubernetes `emptyDir` installations, create and bind `redis-data` first.
   Restore the verified backup into this PVC using a temporary Redis 7 recovery
   pod with the same UID/GID and `/data` directory as the Deployment. Start the
   restored instance in RDB mode, enable AOF live, and wait for successful rewrite
   and write status. Stop that recovery instance cleanly before mounting its PVC
   in the real Deployment. Update the stopped Deployment to use the prepared PVC
   and persistent config, then use the deployment helper. Do not let an empty
   AOF mask the restored RDB; verify the isolated recovery before switching.
5. Start one application replica. Verify settings, a disposable share's creation
   and revocation, diagnostics and Redis health. Restart Redis in the maintenance
   window and verify those records still exist. Resume other replicas and writers
   only after this succeeds. Delivery may resume immediately; do not replay jobs
   manually without checking their ledger.

Migration duration depends on dataset and storage speed. Keep writes paused for
the backup/restore/switch interval; no automatic merge of divergent state exists.
If validation fails, keep writers paused and restore the verified backup to a
separate volume. Switch back only after checking the restored state. Never delete
the old volume or backup as part of rollback, and never run `down -v` or delete
the PVC to roll back application code. Older code does not enforce named audience
grants; do not expose public sharing through an older application version.

## Scheduled delivery semantics

Renewable, ownership-checked Redis leases coordinate workers. Per-recipient jobs
persist attempts and retry times, with up to five attempts and exponential
backoff starting at 15 minutes plus jitter, capped at 24 hours plus jitter.
A persisted scan cursor lets later runs resume work within their time
budget. Failed or exhausted attempts are visible in administrator diagnostics.

SMTP is **at-least-once**, not exactly-once: a process can stop after SMTP accepts
mail but before Redis records success. A retry can then deliver a duplicate.
Redis outages stop delivery instead of switching to a process-local lock. AOF
protects local restarts, but disk loss and restoring an old backup can still lose
recent checkpoints. Back up regularly and review pending jobs after recovery.

## Local verification

Build first (`pnpm build`) and install Playwright Chromium
(`pnpm exec playwright install chromium`). Point `TEST_REDIS_URL` at an isolated
Redis 7 instance before `pnpm test:e2e` or `pnpm test:perf`; both configurations
default to `redis://127.0.0.1:6379` if it is unset. Tests create synthetic records
and must not target production. CI provides Redis as a service.

`TEST_APP_PORT` and `TEST_MOCK_PORT` configure the main smoke stack (defaults
4173 and 5187). The pages-performance smoke test also starts a fixed-port stack
on 4199 and 5199; these ports are not changed by those variables. The performance
suite uses fixed ports 4193 and 5197. Keep the relevant ports free. These fixture tests
do not rehearse the live backup/restore procedure above or prove disk durability.
