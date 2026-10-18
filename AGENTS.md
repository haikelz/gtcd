## Project Configuration

- **Language**: TypeScript
- **Framework**: SvelteKit 2 (Svelte 5 Runes)
- **Package Manager**: pnpm
- **Styling**: Tailwind CSS v4, ReUI design system (shadcn base-nova recipes ported to Svelte with Bits UI); see `DESIGN.md`
- **Runtime**: Node.js 26 (`@sveltejs/adapter-node`; Node 20 is EOL — bump deliberately, together with the Dockerfile)
- **State & Caching**: Redis 7 (`ioredis`) for durable preferences, grants and delivery jobs; process-local fallback only for sessions and query caching. See `docs/REDIS_STATE.md`.
- **Containerization & Orchestration**: Docker (multi-stage non-root, `node:26-alpine`), Kubernetes (envsubst-templated manifests + `k8s/deploy-k8s.sh`)

---

<!-- AI-GUIDELINES:BEGIN -->

## AI Engineering Guidelines

Read `.agents/general.md` and `.agents/preferences.md` for every task. Then select the smallest matching context profile below. Do not read every installed companion by default. Precedence follows `.agents/general.md` §2: repository-local instructions win, then the `haikel-*` owner profile, then the other guidelines.

- **Repository setup, documentation, planning, CI, or process:** `.agents/harness.md`.
- **JavaScript or TypeScript language/library work:** `.agents/guidelines/javascript-typescript.md` and `.agents/guidelines/haikel-javascript-typescript.md`.
- **Go language, package, or service work:** `.agents/guidelines/go.md` and `.agents/guidelines/haikel-go.md`.
- **Container, Compose, delivery, or runtime work:** `.agents/guidelines/docker.md`; add an application profile only when its build or runtime behavior also changes.
- **UI, styling, theming, or design-system work:** `.agents/guidelines/design-system.md`; add the framework profile only when its code also changes.
- **Cross-cutting work:** use the union of only the affected profiles and state why each additional document is needed.

### Workspace scopes

Match the changed path first, then use only that workspace's applicable profile.

- `.amp/in/goatcounter-v2.7.0/**`: go, docker.

<!-- AI-GUIDELINES:END -->

---

## Repository Workflow

Use [docs/WORKFLOW.md](docs/WORKFLOW.md) for repository work shapes, canonical verification commands, runtime ownership, and completion evidence. Keep source changes and validation scoped to the request; preserve unrelated worktree changes.

---

## Architectural Contracts

### 1. Server-Side Mediation & Security

- **API Secret Isolation**: The client browser never receives `GOATCOUNTER_API_KEY`. All GoatCounter API traffic is routed through the SvelteKit backend (`src/lib/server/goatcounter/`).
- **Dynamic Secrets**: Secrets must be loaded via `$env/dynamic/private` with `process.env` fallback to ensure zero build-time secret requirements inside container pipelines.
- **Session Layer**: HTTP-only, `SameSite=Lax` cookies authenticate against Redis (`src/lib/server/auth/session-store.ts`). When Redis is unavailable, the service degrades gracefully to an in-memory session store rather than halting.
- **Durable State**: Preferences, share mutations and delivery jobs require Redis. Public shares fail closed when grants cannot be verified. Do not substitute session fallback for durable operations.
- **Native Administration**: Native-admin forms use the signed-in user's server-held GoatCounter session, allowlisted routes and CSRF intents. Preserve upstream authorization; the shared API token must not elevate personal administration actions.
- **Login Guard**: Failed logins are counted per email and, only when `ADDRESS_HEADER` is set, per client IP (`src/lib/server/auth/login-guard.ts`). GoatCounter's TOTP login token stays server-side in the pending-MFA store; never send it to the browser.
- **CSP**: `kit.csp` in `vite.config.ts` owns the Content Security Policy with per-request nonces; `script-src` must not regain `'unsafe-inline'`. Inline scripts in `app.html` carry `nonce="%sveltekit.nonce%"`.

### 2. GoatCounter Rate Limiting & Outbound Pacing

- GoatCounter instances enforce an upstream limit of 4 requests/second.
- All outbound calls through `gcFetch` MUST be paced by `paceRequest()` (minimum 280ms threshold).
- Upstream HTTP 429 responses trigger exponential backoff with random jitter and an absolute minimum delay of 1,000ms.
- Dashboard queries use a 30-second cache (in-memory per process, shared through Redis under `gc-cache:*`). In-flight deduplication and pacing are process-local; cache sharing does not impose a global multi-replica rate limit.

### 3. Data Normalization

- Null, empty string, or whitespace-only metric names (e.g., missing browsers, systems, or campaign tags) must be normalized to `"Unknown"` at the service layer (`src/lib/server/goatcounter/stats.ts`).

### 4. GoatCounter Deployment Facts

- Keep GTCD application variables separate from GoatCounter configuration; unsupported `GOATCOUNTER_*` variables can cause upstream startup errors. The Kubernetes manifest supplies `GOATCOUNTER_DB`; verify the deployed version and database path before changing it. Site/user/token bootstrap uses CLI commands (`db create site`, `db create apitoken`), automated by `scripts/setup.sh` or documented in `k8s/gtcd/.env.example`.
- The stats API requires a `stats` permission bit the CLI cannot set; after `db create apitoken`, permissions are set to all bits (`127`) via `db query "UPDATE api_tokens SET permissions='127' ..."`.
- Use a site vhost with 2+ DNS labels (`stats.localhost` locally, the real domain in production) and align request Host routing with it. A single-site domain warning alone does not establish lost hits; verify site selection, tracking persistence and multi-site behavior before diagnosing data loss.
- GoatCounter persists hits asynchronously (`hit_stats` fills within ~a minute) and filters non-browser User-Agents; don't validate tracking with `curl`/`wget` alone.

### 5. Delivery Schemes

- **Docker Compose**: Caddy (TLS, `/count`, `/counter/*` and legacy `/admin/*` → GoatCounter, rest → gtcd) + GoatCounter + Redis + gtcd; `scripts/setup.sh` generates the Caddyfile and `.env`. The legacy prefix is not a complete native-admin interface; use GTCD's personal-session bridge.
- **Kubernetes** (`k8s/`): envsubst-templated manifests (`${DOMAIN}`, `${IMAGE}`) applied by `k8s/deploy-k8s.sh` — kubectl-created Secret `gtcd-env` (GoatCounter URL/key, admin settings, `REDIS_PASSWORD`; `REDIS_URL` is built in the Deployment from `REDIS_PASSWORD` and the in-cluster service) plus Secret `redis-config` holding `redis.conf`, ordered apply, rollout restart. Shared assets in `k8s/shared/` (cert-manager ClusterIssuer, Traefik `security-headers` middleware).
- The current Ingress does not reference Traefik Middleware. The shared middleware manifest is optional; security headers are supplied by the application. Cert-manager absence is warned about, not repaired automatically.
- `REDIS_URL` unset or empty makes the app fall back to `localhost:6379`, which doesn't exist in-cluster — sessions would die; keep it set or hardcoded.
- Redis requires a password loaded from `redis.conf` (`redis-server /run/secrets/redis.conf`): Compose mounts `secrets/redis.conf` (gitignored, written by `scripts/setup.sh`), Kubernetes mounts the `redis-config` Secret. `REDIS_URL` must carry the same password; a mismatch silently drops sessions to the in-memory fallback.
- Redis uses AOF and persistent storage in new deployments. Before upgrading existing ephemeral/cache-only installations, follow `docs/REDIS_STATE.md`; deployment guards do not migrate data or prove backups are restorable.
- **CI vs deployment**: `.github/workflows/deploy.yaml` verifies and publishes Docker Hub images; it currently has no SSH deployment job. Applying Kubernetes manifests or restarting production remains an explicit operator action.

### 6. Accessibility & UI Quality (WCAG 2.1 AA)

- Charts must supply accessible representations: SVG `<title>`, `<desc>`, `role="img"`, and a companion screen-reader table (`.sr-only`).
- Interactive metrics use semantic ARIA attributes (`role="meter"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`).
- Color contrast, focus-visible outlines (`--color-primary`), and keyboard shortcuts (`Cmd+B` / `Ctrl+B` for sidebar toggle) must comply with accessibility guidelines.
- Responsive breakpoints: Mobile drawer (<1024px) and collapsible desktop sidebar (>=1024px) with preference persistence in `localStorage`.

<!-- graft:start -->

## Graft — repo context graph

This repo is indexed in `graft/`: small linked markdown nodes that explain each
system and carry exact file:line spans, kept in sync with the code through git.

For ANY task here — understanding how something works, finding where code lives,
or scoping a change — get context from the graph before grepping or opening
source files. Re-ask freely (it's cheap) and reuse literal identifiers you
already have (symbol, error string, file name) as the query. New to this repo?
Run `graft map` first — a token-budgeted orientation (dir clusters, hubs,
hotspots), no LLM, no key.

- Run `graft ask "<your question>" --source` → ranked nodes with the relevant
  code spans inlined (each hit's ≤8-line crux by default; `--full` for whole
  definitions when the crux isn't enough). Match the tool to the task shape:
  for understanding or editing, the top node IS the answer — cite its
  `covers:` file:line spans and edit straight from `--source`. For
  exhaustive tasks ("every occurrence / every caller of this pattern"), ranked
  results are top-N, not complete — run `graft grep "<literal>"` instead
  (exhaustive over indexed files, grouped by enclosing symbol), falling back
  to raw `grep -rn` only for unindexed files.
- `graft skeleton <file>` → every definition's signature + span, ~10× cheaper
  than reading the file; use it to skim an API surface.
- `graft callers <symbol>` gives precomputed, exact edges — who calls this.
  Add `--direction out` for what it calls, or `--depth N` to walk
  transitively for the full blast radius. For structural questions, skip
  ranking and use this directly.
- Or browse: `graft/INDEX.md` lists every node; follow the links.
- Monorepos and folders of multiple repos rank fairly across sub-projects —
  hits carry `[scope/]` labels naming which one they're from. Narrow with
  `graft ask "<task>" --in <scope>/` once you know where you're working.

If a returned span is truncated ("+N more lines"), open the file at that exact
range before finalizing. Only open source files when a node genuinely lacks a
needed detail, and then at the exact file:line the node points to — never
re-read whole files.

After big code changes, refresh the graph with `graft build` (deterministic,
no API key, $0).
<!-- graft:end -->
