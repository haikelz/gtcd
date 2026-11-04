# Deployment

gtcd runs next to a stock GoatCounter and a Redis 7 instance. Pick Docker
Compose for a single host or Kubernetes for a cluster. For Redis persistence and
upgrades of an existing installation, read [Redis state](REDIS_STATE.md) first.

## Docker Compose

`./scripts/setup.sh` builds the whole stack (Caddy, GoatCounter, Redis, gtcd). It:

1. asks for your domain (`localhost` for development, `analytics.example.com` for production);
2. asks for the GoatCounter admin email and password;
3. creates the GoatCounter site, admin user and a full-permission API token;
4. writes the Caddyfile, `secrets/redis.conf` and `.env`;
5. starts the stack.

For a production domain, point its DNS A record at the server before running the
script; Caddy then provisions Let's Encrypt certificates.

Services after setup:

- **Dashboard:** `https://localhost` or your domain. Locally, Caddy issues its
  own certificate; trust it once in your browser.
- **Tracking:** `/count` and `/count.js` on the same host.
- **Visitor counter:** `/counter/*`, served by GoatCounter when enabled per site.
- **Health check:** `/api/health`.
- **GoatCounter itself:** internal only, at `http://goatcounter:8080` inside the
  Compose network.

### Manual configuration

These commands do not create the GoatCounter site, user or API token. Use them
only for an instance that is already bootstrapped; otherwise run
`scripts/setup.sh` or the CLI bootstrap in
[the Kubernetes example](../k8s/gtcd/.env.example).

```bash
cp .env.example .env
# Redis loads its password from secrets/redis.conf (gitignored)
mkdir -p secrets && chmod 700 secrets
printf 'requirepass %s\nsave ""\nappendonly yes\nappendfsync always\ndir /data\nmaxmemory 64mb\nmaxmemory-policy noeviction\n' "$(openssl rand -hex 32)" > secrets/redis.conf
chmod 644 secrets/redis.conf
# Edit .env: credentials, domain, and REDIS_URL with the same password
docker compose up -d --build
```

Installs created before `/counter/*` and `/count.js` were routed need
`./scripts/setup.sh` re-run, or the matching `handle` blocks added to their
Caddyfile.

## Kubernetes

Manifests in [`k8s/`](../k8s/) are envsubst templates applied by one script:

```bash
cp k8s/gtcd/.env.example k8s/.env
# Edit k8s/.env: DOMAIN, EMAIL, IMAGE, GOATCOUNTER_URL, GOATCOUNTER_API_KEY,
# REDIS_PASSWORD, and optional GTCD_ADMIN_EMAILS / GOATCOUNTER_ADMIN_URL.
k8s/deploy-k8s.sh   # requires kubectl and envsubst
```

For a new in-cluster GoatCounter, apply its standalone manifest and create the
site and token first, as described in
[`k8s/gtcd/.env.example`](../k8s/gtcd/.env.example); the script rejects an empty
`GOATCOUNTER_API_KEY`. Existing Redis installations must pass the
[migration preflight](REDIS_STATE.md#before-upgrading-an-existing-installation).

The script creates the `gtcd-env` Secret and a `redis-config` Secret holding
`requirepass` (gtcd builds `REDIS_URL` from the same `REDIS_PASSWORD`), applies
GoatCounter, Redis and gtcd in dependency order, and restarts the deployment so
pods read the current Secret. The setup includes:

- non-root containers (UID 1000, dropped capabilities, read-only root
  filesystem, `RuntimeDefault` seccomp);
- health and readiness probes on `/api/health`;
- a Traefik Ingress with Let's Encrypt TLS that routes `/count`, `/count.js` and
  `/counter/` to GoatCounter and everything else to gtcd;
- PersistentVolumeClaims for the GoatCounter database and Redis AOF state.

The Ingress serves HTTP and HTTPS, because a proxy in front (Cloudflare in
"Flexible" SSL mode) may reach the origin over HTTP. Redirect HTTP to HTTPS at
the edge or in Traefik's static configuration. Without cert-manager, the
ClusterIssuer step is skipped with a warning.

## CI and container images

[`.github/workflows/deploy.yaml`](../.github/workflows/deploy.yaml) runs on pushes
and pull requests to `master` and on `v*.*.*` tags:

1. **Verify:** lint, `pnpm check`, `pnpm test:checks`, build, the Playwright
   suite, a modern-export compatibility run and `pnpm test:perf`, against a mock
   GoatCounter and a disposable Redis.
2. **Smoke test:** builds the amd64 image and runs
   [`scripts/smoke-image.sh`](../scripts/smoke-image.sh): read-only root
   filesystem, no capabilities, `/login` and `/api/health`, clean exit on
   `SIGTERM`.
3. **Publish** (not on pull requests): pushes a `linux/amd64` + `linux/arm64`
   image with SBOM and provenance under `sha-<commit>`, smoke-tests the arm64
   image, then adds `latest` (default branch) and the semver tags by digest.

Repository secrets (**Settings → Secrets and variables → Actions**):

| Secret            | Value                                               |
| :---------------- | :-------------------------------------------------- |
| `DOCKER_USERNAME` | Docker Hub user or organization                     |
| `DOCKER_PASSWORD` | Docker Hub access token with **Read & Write** scope |

Images go to `<DOCKER_USERNAME>/gtcd`; override with a `DOCKER_IMAGE` repository
variable. Prefer the digest or the immutable `sha-` tag for rollouts and
rollbacks. The Dockerfile builds on the runner's native platform and only the
runtime stage targets amd64/arm64, so Apple Silicon builds don't emulate Node.

The workflow does not deploy. For a deployment that runs the mutable `:latest`
image with `imagePullPolicy: Always`, confirm the kubeconfig context and
namespace, then:

```bash
kubectl rollout restart deployment gtcd
kubectl rollout status deployment gtcd --timeout=180s
```

A restart reuses the configured image, so a pinned tag or digest restarts the
same version; change `IMAGE` and re-run `k8s/deploy-k8s.sh` instead. Neither
step migrates Redis or rolls back a failed rollout.

## Proxies, hosts and request size

- Trust forwarded protocol, host and client-IP headers only from your own proxy.
  Compose passes `PROTOCOL_HEADER` and `HOST_HEADER`, so CSRF checks and cookie
  flags follow Caddy. For bare-metal serving, set `ORIGIN` or adapter-node's
  trusted proxy headers instead of disabling CSRF checks.
- The session cookie is `HttpOnly` and `SameSite=Lax`; its `Secure` flag follows
  the protocol the client used, so `http://localhost` and TLS domains both work.
- `GOATCOUNTER_VHOST` names the site's hostname when the internal GoatCounter
  URL differs from it. gtcd sends it as the `Host` header through `node:http`,
  because Node's `fetch` drops a custom Host. Keep Host routing consistent when
  you run several sites.
- Native imports accept files up to 8 MiB. Set `BODY_SIZE_LIMIT=10M` for gtcd
  (adapter-node defaults to 512 KiB) and allow the same request size at the
  reverse proxy.

These settings are not wired into every deployment template; check the
container environment before relying on them.
