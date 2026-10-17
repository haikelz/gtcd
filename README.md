# 🐐 gtcd — Modern Web Dashboard for GoatCounter

[![SvelteKit](https://img.shields.io/badge/SvelteKit-2.x-FF3E00?style=flat-square&logo=svelte&logoColor=white)](https://kit.svelte.dev/)
[![Svelte](https://img.shields.io/badge/Svelte-5_Runes-FF3E00?style=flat-square&logo=svelte&logoColor=white)](https://svelte.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![shadcn-svelte](https://img.shields.io/badge/shadcn--svelte-components-111111?style=flat-square)](https://shadcn-svelte.com/)
[![ReUI](https://img.shields.io/badge/ReUI-base--nova-111111?style=flat-square)](https://reui.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

A fast, responsive, and customizable self-hosted web dashboard for [GoatCounter](https://www.goatcounter.com/) analytics. Built with **Svelte 5 Runes**, **Tailwind CSS v4**, and a **shadcn-svelte** component layer ported from the **[ReUI](https://reui.io/)** design system (`base-nova` style).

---

## 💡 What is gtcd?

[GoatCounter](https://github.com/arp242/goatcounter) is an incredible privacy-friendly web analytics platform: it is lightweight, tracks page views without invasive cookies or GDPR consent popups, and is very easy to self-host.

**`gtcd` is a custom frontend dashboard for your GoatCounter instance.** It connects to your GoatCounter server via its REST API and provides an alternative, modern web UI with:

- **Svelte 5 Runes**: Fast, reactive client-side navigation with zero bundle bloat.
- **Curated Dark & Light Modes**: Clean UI built on ReUI/shadcn CSS design tokens (`.dark` class on the document root, applied before first paint to avoid flashing).
- **Power-User Ergonomics**: Collapsible desktop sidebar with `Cmd+B` / `Ctrl+B` toggle, mobile drawer, GoatCounter's period presets (day, week, month, quarter, half year, year) with back/forward stepping, saved report views, and a customizable overview.
- **Your GoatCounter Preferences**: Dates, hours, and numbers follow the timezone, date format, 24-hour clock, and thousands separator set in GoatCounter, so report ranges match GoatCounter's own dashboard even when the server runs in UTC.
- **Safe Server-Side API Mediation**: The browser never sees your `GOATCOUNTER_API_KEY`. Authentication uses HTTP-only session cookies validated against your GoatCounter login. Accounts with GoatCounter two-factor authentication (TOTP) finish login with their code. Failed logins are rate limited per email (5 per 15 minutes) and per client IP (20) when `ADDRESS_HEADER` names the proxy header. An optional Cloudflare Turnstile check on the login form (`TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`) stops bots before they reach GoatCounter. The Content Security Policy allows only nonced inline scripts. Docker Compose passes `PROTOCOL_HEADER`/`HOST_HEADER`, so CSRF origin checks and cookie flags derive from the reverse proxy's request headers.
- **Zero Third-Party Requests**: Fonts are self-hosted; apart from the optional Turnstile widget on the login page, the dashboard makes no calls to external CDNs, so visitor IPs never leak to third parties and it works fully offline.
- **Upstream Rate-Limit Protection**: An outbound queue pacer (280ms spacing), exponential backoff with jitter, and a 30s query cache (shared across replicas through Redis) prevent `429 Too Many Requests` errors from GoatCounter's 4 req/sec limit.
- **Resilient Session Store**: Distributed Redis session layer with automatic fallback to an in-memory store if Redis is unavailable.
- **Accessible Visualizations (WCAG 2.1 AA)**: Interactive charts with SVG `<title>`, `<desc>`, semantic `role="meter"`, high-contrast focus rings, and screen-reader accessible data tables.
- **Installable PWA**: Web app manifest, service worker with auto-update, and offline-cached app assets — installable from the browser address bar.
- **Server-Side Query Cache**: Report data loads through SvelteKit server loads; identical upstream requests share one in-flight call and a 30-second cache, so quick range switches don't re-hit GoatCounter.

---

## 🏗️ Architecture

`gtcd` acts as a secure presentation and caching layer in front of your GoatCounter instance:

```mermaid
flowchart TD
    subgraph Client["Client Browser"]
        UI["gtcd UI (Svelte 5 + Tailwind v4)<br/>Accessible Charts & Ergonomic Nav"]
    end

    subgraph Backend["gtcd Backend (SvelteKit / Node 26)"]
        direction TB
        Auth["Session Gate<br/>(HTTP-only Cookie)"]
        Cache["In-Memory Query Cache<br/>(30s Read Deduplication)"]
        Pacer["Outbound Request Pacer<br/>(280ms Spacing Queue)"]
        Backoff["429 Backoff & Jitter Handler"]
    end

    subgraph Storage["External Services"]
        Redis[("Redis 7<br/>(Sessions & Fallback)")]
        GC[("GoatCounter Instance<br/>(Tracking Engine & SQLite/Postgres)")]
    end

    UI <-->|HTTP / Session Cookie| Auth
    Auth <-->|Session Store| Redis
    Auth --> Cache
    Cache --> Pacer
    Pacer --> Backoff
    Backoff <-->|Authorized REST API| GC
```

---

## 📊 Features & Views

- **Overview Dashboard**: Instant KPIs (total visitors, total pageviews) and an interactive SVG traffic time-series chart with date-range filters.
- **Top Content & Pages**: List of tracked paths with visitor counts, percentage bars, search filtering, and per-path drill-downs.
- **Referrer Attribution**: Per-page breakdown of referring domains and external links.
- **Client Telemetry**:
  - **Browsers**: Browser breakdown with version drill-downs.
  - **Operating Systems**: OS distribution with version drill-downs.
  - **Devices & Sizes**: Screen resolutions and device classification.
- **Audience Geography & Localization**:
  - **Locations**: Visitor distribution by country and region.
  - **Languages**: Browser locale and language breakdown.
- **Campaign Tracking**: Monitor marketing campaigns via URL query parameters.
- **Site Administration**: Designated dashboard administrators can update site
  retention, ignored IP/CIDR ranges, regional reporting countries, embedding
  origins, and public-counter settings without exposing the API token.
- **Data Exports**: Administrators can create and download gzip-compressed CSV
  exports through the GoatCounter API. JSON backups download as ZIP archives on
  supporting GoatCounter builds. GoatCounter 2.7 and older support CSV only;
  gtcd disables JSON for those releases. Use **Refresh status** to check a
  pending job without creating another export.
- **Saved Views & Overview Layout**: Save a period, filter, grouping, and chart scale under a name, pick a default view, and choose which overview widgets show, in what order, with how many rows and which chart style (GoatCounter's own widgets and default view are imported on first use). Stored per user in Redis (in-memory fallback); hidden widgets skip their GoatCounter requests.
- **Email Reports**: Daily, weekly, two-weekly, or monthly summaries (visits with change, top pages, referrers, countries) over your SMTP server, sent after 07:00 in your GoatCounter timezone, with a test-email button. A Redis lock keeps replicas from sending twice.
- **Public Dashboard**: A read-only gtcd overview behind a revocable share link, for people without a login.
- **English and Bahasa Indonesia**: The interface and email reports follow your GoatCounter language, with a per-user override.
- **Fewer Numbers Mode**: Hide visit counts and keep chart shapes and shares, following GoatCounter's setting (including its lock) with a per-user override.
- **Connection Check**: Send a labelled test visit through the API to confirm gtcd can write to GoatCounter.
- **Sharing & Visitor Counter**: Set dashboard visibility (private, secret link, public), generate the access token and share link, and copy ready-made visitor-counter embeds (`/counter/<path>.svg|png|html|json`).
- **Readable Charts**: Toggle the traffic chart to a data table, and switch page sparklines between per-page and shared scale. Event counts appear next to pageview totals.
- **Data Normalization**: Empty or null metric names are automatically normalized to `"Unknown"` for clean chart display.

---

## 🖼️ Screenshots

Captured from a local build against a synthetic GoatCounter upstream whose user
prefers the Asia/Jakarta timezone, ISO dates, and comma separators; the numbers
are illustrative.

### Traffic overview

<table>
  <tr>
    <td><img src="static/screenshots/traffic.png" alt="Traffic overview in light mode with KPI tiles, hourly traffic chart, and browser mix"></td>
    <td><img src="static/screenshots/traffic-dark.png" alt="Traffic overview in dark mode with KPI tiles, hourly traffic chart, and browser mix"></td>
  </tr>
</table>

<p align="center">
  <img src="static/screenshots/traffic-mobile.png" alt="Traffic overview on a phone with the stacked toolbar and KPI tiles" width="320">
</p>

### Pages and paths

<table>
  <tr>
    <td><img src="static/screenshots/pages.png" alt="Pages report with sparklines, view counts, and the per-page or shared scale toggle"></td>
    <td><img src="static/screenshots/page-detail.png" alt="Page detail for /blog showing the referrers sending traffic to it"></td>
  </tr>
  <tr>
    <td><img src="static/screenshots/paths.png" alt="Path directory listing every tracked path with event markers"></td>
    <td><img src="static/screenshots/report-detail.png" alt="Report detail showing browser versions for one browser"></td>
  </tr>
</table>

### Audience and acquisition

<table>
  <tr>
    <td><img src="static/screenshots/browsers.png" alt="Browsers report with visitor counts and audience-share chart"></td>
    <td><img src="static/screenshots/operating-systems.png" alt="Operating systems report with visitor share bars"></td>
  </tr>
  <tr>
    <td><img src="static/screenshots/locations.png" alt="Locations report showing visitor distribution by country"></td>
    <td><img src="static/screenshots/languages.png" alt="Languages report showing visitor language distribution"></td>
  </tr>
  <tr>
    <td><img src="static/screenshots/screen-size.png" alt="Screen sizes report showing visitor device classes"></td>
    <td><img src="static/screenshots/campaigns.png" alt="Campaigns report showing traffic by campaign"></td>
  </tr>
  <tr>
    <td><img src="static/screenshots/referrers.png" alt="Referrers report showing top referring sites"></td>
    <td><img src="static/screenshots/customize.png" alt="Customize page with saved views and overview widget order"></td>
  </tr>
</table>

### Administration

<table>
  <tr>
    <td><img src="static/screenshots/settings.png" alt="Site settings with retention, data collection, visibility, and visitor counter options"></td>
    <td><img src="static/screenshots/exports.png" alt="Data exports page with CSV and JSON format choice and export status"></td>
  </tr>
</table>

### Public dashboard and Bahasa Indonesia

<table>
  <tr>
    <td><img src="static/screenshots/share.png" alt="Read-only public dashboard opened from a share link, with period buttons and key metrics"></td>
    <td><img src="static/screenshots/traffic-id.png" alt="Traffic overview in Bahasa Indonesia"></td>
  </tr>
</table>

### Sign in and errors

<table>
  <tr>
    <td><img src="static/screenshots/login.png" alt="gtcd sign-in page with the GoatCounter account form and a passed Cloudflare Turnstile check"></td>
    <td><img src="static/screenshots/login-mfa.png" alt="Two-factor step asking for the 6-digit code from an authenticator app"></td>
  </tr>
  <tr>
    <td><img src="static/screenshots/not-found.png" alt="Not found error page with Continue and Previous page actions"></td>
    <td></td>
  </tr>
</table>

---

## 🚀 Quickstart

### 1. Run with Docker Compose (Easiest)

The fastest way to spin up the whole stack (Caddy + GoatCounter + Redis + `gtcd`):

```bash
# Clone the repository
git clone https://github.com/haikelz/gtcd.git
cd gtcd

# Run the automated setup script
./scripts/setup.sh
```

The setup script will:

1. Ask for your domain (`localhost` for dev, `analytics.example.com` for production)
2. Prompt for your GoatCounter admin email and password
3. Create the GoatCounter site and admin user
4. Generate an API token with all permissions
5. Generate a Caddyfile for reverse proxying
6. Save all credentials to `.env`
7. Start the full stack

**Or manually:**

```bash
cp .env.example .env
# Redis loads its password from secrets/redis.conf (gitignored)
mkdir -p secrets && chmod 700 secrets
printf 'requirepass %s\n' "$(openssl rand -hex 32)" > secrets/redis.conf
chmod 644 secrets/redis.conf
# Edit .env: credentials, domain, and REDIS_URL with the same password
nano .env
docker compose up -d --build
```

Services will be accessible at:

- **gtcd Dashboard**: `https://localhost` (Caddy redirects HTTP and uses a locally-issued certificate — trust it once in your browser; or `https://analytics.example.com` for production)
- **Tracking Endpoint**: `https://localhost/count` (or `https://analytics.example.com/count`)
- **GoatCounter**: internal only — reachable from the other containers at `http://goatcounter:8080`, not exposed on the host
- **Health Check**: `http://localhost/api/health`

#### Custom Domain Setup

For production, point your DNS A record to your server and run:

```bash
./scripts/setup.sh
# Enter: analytics.example.com
# Caddy will auto-provision TLS certificates via Let's Encrypt
```

Add the tracking snippet to your website:

```html
<script
  data-goatcounter="https://analytics.example.com/count"
  async
  src="//gc.zgo.at/count.js"
></script>
```

---

### 2. Local Bare-Metal Development

Requirements: Node.js 22+ and [pnpm](https://pnpm.io/) 9+ (the Docker image runs `node:26-alpine`).

```bash
# Install dependencies
pnpm install

# Set up local .env
cp .env.example .env

# Run development server with hot-reload
pnpm dev

# Run TypeScript & Svelte type checking
pnpm check

# Run the logic self-checks (src/**/*.check.ts)
pnpm test:checks

# Smoke-test the production build against a mock GoatCounter
pnpm build && pnpm exec playwright install chromium && pnpm test:e2e

# Production build
pnpm build
```

---

### 3. CI/CD: Docker Hub image

[`.github/workflows/docker.yml`](.github/workflows/docker.yml) runs on every push
and pull request to `master` and on `v*.*.*` tags:

1. **Verify**: `pnpm lint`, `pnpm check`, `pnpm test:checks`, `pnpm build`,
   and the Playwright smoke tests (`pnpm test:e2e`), which log in to the built
   app against [`e2e/mock-goatcounter.mjs`](e2e/mock-goatcounter.mjs).
2. **Smoke test**: builds the amd64 image and runs
   [`scripts/smoke-image.sh`](scripts/smoke-image.sh), which starts it with a
   read-only root filesystem and no capabilities, waits for `/login`, checks
   `/api/health`, and confirms a clean exit on `SIGTERM`.
3. **Publish** (not on pull requests): pushes a `linux/amd64` + `linux/arm64`
   image with SBOM and provenance, then smoke-tests the published arm64 image.

Add these repository secrets under **Settings → Secrets and variables →
Actions**:

| Secret            | Value                                               |
| :---------------- | :-------------------------------------------------- |
| `DOCKER_USERNAME` | Docker Hub user or organization                     |
| `DOCKER_PASSWORD` | Docker Hub access token with **Read & Write** scope |

Images are published as `<DOCKER_USERNAME>/gtcd` (override with a
`DOCKER_IMAGE` repository variable), tagged `sha-<commit>` on every publish,
`latest` on `master`, and `<major>.<minor>.<patch>` plus `<major>.<minor>` on
version tags. Deploy the immutable `sha-` tag or the digest from the run
summary.

The Dockerfile's build stage runs on the builder's native platform and only the
runtime stage targets amd64/arm64, so cross-building on Apple Silicon also
avoids emulating Node during the build.

### 4. Self-Hosting with Kubernetes

Production manifests live in [`k8s/`](k8s/) as envsubst-templated YAML applied by a single script (no Kustomize):

```bash
# 1. Create the deploy configuration from the example
cp k8s/gtcd/.env.example k8s/.env
# Edit k8s/.env with DOMAIN, EMAIL, IMAGE, GOATCOUNTER_URL, GOATCOUNTER_API_KEY,
# and optional GTCD_ADMIN_EMAILS / GOATCOUNTER_ADMIN_URL values.

# 2. Deploy (requires kubectl and envsubst)
k8s/deploy-k8s.sh
```

The script renders the manifests with envsubst, creates the `gtcd-env` Secret
from your env values, applies GoatCounter + gtcd + Redis in dependency order,
and rolls the deployment so pods pick up the current Secret.

The Kubernetes setup features:

- GoatCounter + gtcd + Redis deployed together
- Ingress routes `/count` to GoatCounter and `/` to gtcd
- Non-root hardened containers (numeric UID 1000, dropped capabilities, read-only root filesystem, `RuntimeDefault` seccomp)
- Health and readiness probes wired to `/api/health`
- Traefik Ingress with automatic Let's Encrypt TLS; application security headers
- PersistentVolumeClaim for GoatCounter data
- Session credentials delivered through a kubectl-created Secret (`gtcd-env`)
- Password-protected Redis: `deploy-k8s.sh` renders `requirepass` from
  `REDIS_PASSWORD` into a `redis-config` Secret mounted as
  `/run/secrets/redis.conf`, and gtcd builds its `REDIS_URL` from the same value

If cert-manager is absent, the ClusterIssuer step is skipped with a warning. The
Ingress does not reference optional Traefik Middleware, so an unavailable
Middleware CRD cannot make Traefik return 404 for every GTCD route.

After the first deploy, bootstrap GoatCounter (site + API token) and put the
token in `k8s/.env` as `GOATCOUNTER_API_KEY`, then re-run `k8s/deploy-k8s.sh` —
the exact commands are documented in [`k8s/gtcd/.env.example`](k8s/gtcd/.env.example).

Add the tracking snippet to your website:

```html
<script
  data-goatcounter="https://<DOMAIN>/count"
  async
  src="//gc.zgo.at/count.js"
></script>
```

---

## ⚙️ Environment Variables

Configure these in your `.env` file or container environment:

| Variable                | Required | Default                     | Purpose                                                                                                                                                                                                        |
| :---------------------- | :------: | :-------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DOMAIN`                |    No    | `localhost`                 | Custom domain for your dashboard (e.g., `analytics.example.com`)                                                                                                                                               |
| `GOATCOUNTER_URL`       | **Yes**  | `http://goatcounter:8080`   | URL of your GoatCounter instance                                                                                                                                                                               |
| `GOATCOUNTER_API_KEY`   | **Yes**  | —                           | GoatCounter API token. Use the setup script's full-permission token (`127`), or at minimum grant the permissions required by the views you enable; site settings require site-read and site-update.            |
| `REDIS_URL`             | **Yes**  | —                           | Redis connection for sessions and saved views, with the password from `secrets/redis.conf`: `redis://:<password>@redis:6379`. `scripts/setup.sh` writes both. In Kubernetes it is built from `REDIS_PASSWORD`. |
| `PORT`                  |    No    | `3000`                      | Port for the Node.js server to listen on                                                                                                                                                                       |
| `NODE_ENV`              |    No    | `production`                | Environment mode                                                                                                                                                                                               |
| `COOKIE_SECURE`         |    No    | auto                        | Force the session cookie's `Secure` flag (`true`/`false`). By default it is set automatically from the request protocol, including `X-Forwarded-Proto` behind reverse proxies.                                 |
| `GTCD_ADMIN_EMAILS`     |    No    | —                           | Comma-separated emails permitted to manage sites and exports in gtcd.                                                                                                                                          |
| `GOATCOUNTER_ADMIN_URL` |    No    | —                           | Public HTTPS GoatCounter URL for password-reset and secret-site share links; also a fallback Host for native sessions. HTTP is allowed only on localhost.                                                      |
| `SMTP_HOST`             |    No    | —                           | SMTP server for email reports. Reports stay off until `SMTP_HOST` and `SMTP_FROM` are set.                                                                                                                     |
| `SMTP_PORT`             |    No    | `587` (`465` if secure)     | SMTP port.                                                                                                                                                                                                     |
| `SMTP_SECURE`           |    No    | `false`                     | `true` for implicit TLS (port 465); otherwise STARTTLS is used when offered.                                                                                                                                   |
| `SMTP_USER`             |    No    | —                           | SMTP username, if your server needs authentication.                                                                                                                                                            |
| `SMTP_PASSWORD`         |    No    | —                           | SMTP password.                                                                                                                                                                                                 |
| `SMTP_FROM`             |    No    | —                           | Sender address, e.g. `gtcd reports <reports@example.com>`.                                                                                                                                                     |
| `GTCD_PUBLIC_URL`       |    No    | —                           | Public HTTPS URL of the dashboard, used for links in email reports.                                                                                                                                            |
| `TURNSTILE_SITE_KEY`    |    No    | —                           | Cloudflare Turnstile site key. With `TURNSTILE_SECRET_KEY`, the login form requires a Turnstile check.                                                                                                         |
| `TURNSTILE_SECRET_KEY`  |    No    | —                           | Turnstile secret key, verified server-side. The check stays off until both keys are set.                                                                                                                       |
| `ADDRESS_HEADER`        |    No    | `x-forwarded-for` (Compose) | Request header carrying the client IP, for the per-IP login rate limit. Empty skips the per-IP limit. Use `cf-connecting-ip` behind Cloudflare.                                                                |
| `XFF_DEPTH`             |    No    | `1`                         | Trusted proxies in front of gtcd when `ADDRESS_HEADER` is `x-forwarded-for`.                                                                                                                                   |

The login session cookie is `HttpOnly`, `SameSite=Lax`, and its `Secure` flag
follows the protocol the client actually used, so both `http://localhost`
development stacks and TLS production domains work without configuration.

---

## 🔒 How Authentication Works

`gtcd` separates user authentication from API access:

1. **User Login**: Users sign in on `/login` with their GoatCounter account email and password. `gtcd` verifies the credentials against GoatCounter's `/user/requestlogin` endpoint. Accounts with TOTP enabled then enter their 6-digit code, which gtcd sends to GoatCounter's `/user/totplogin`; GoatCounter's login token stays on the server for the 5 minutes the step lasts. With `GOATCOUNTER_ADMIN_URL` set, the login form links to GoatCounter's password reset page.
2. **Session Creation**: On success, `gtcd` issues an HTTP-only, `SameSite=Lax` session cookie (protocol-aware `Secure` flag) and stores the session in Redis (or in-memory fallback).
3. **API Access**: All dashboard requests are made server-side using the `GOATCOUNTER_API_KEY` defined in the environment. Your API key is never leaked to the browser.

### Site settings and administration

Site settings and exports are restricted to the email addresses in
`GTCD_ADMIN_EMAILS`. The Settings page updates the authenticated user's current
GoatCounter site only; it cannot be used to select or modify another site.

Use the Settings page for:

- the linked website URL and retention period;
- ignored IP addresses or CIDR ranges, one per line;
- comma-separated country codes for regional reporting;
- trusted embed origins, one per line; and
- the public visitor counter and Bosmang options.

The form accepts line-separated lists for readability. Before the server sends
the update to GoatCounter, it serializes `ignore_ips`, `collect_regions`, and
`allow_embed` as the comma-delimited strings required by GoatCounter's
`Strings` settings type. This avoids the `cannot unmarshal array into ...
goatcounter.Strings` API error.

Open **Administration** for custom GTCD screens for users and roles, API tokens,
passwords and TOTP, CSV and Google Analytics imports, pageview deletion/merging,
and native preferences and email reports. GoatCounter runs unchanged. These
screens use the signed-in user's native session, not the shared API token:
GoatCounter enforces that user's permissions on every request. Users, tokens,
imports and page data additionally require `GTCD_ADMIN_EMAILS`; account security
and personal preferences are available to every signed-in user.

Sign out and sign back in after upgrading to establish this session. Native
cookies and CSRF values stay server-side in Redis (or the existing in-memory
fallback); secure Redis access and backups as credentials. Expired native
sessions require a fresh login. Signing out also attempts GoatCounter logout,
which can invalidate other native browser sessions for the same user. Token
secrets appear only after **Reveal token**; authenticator setup keys appear only
on the account-security screen. Personal email is read-only here to keep the
dashboard login identity consistent; administrators can edit users separately.

The bridge is verified with stock GoatCounter 2.7. It extracts only allowlisted
forms into Svelte components, never embeds native HTML. Recheck compatibility
after an upstream upgrade; unknown forms fail closed. Destructive changes require
explicit confirmation, and search-result intents bind page mutations to the
paths that were displayed. Background-job acceptance is not completion; check
GoatCounter's logs for import, merge and purge failures.

Import files are capped at 8 MiB uploaded and 32 MiB decompressed. To permit
uploads above adapter-node's default 512 KiB limit, configure `BODY_SIZE_LIMIT=10M`
for GTCD and allow the same request size at the reverse proxy; this change does
not modify existing infrastructure limits. GTCD preferences and scheduled reports
remain independent of GoatCounter preferences and native email reports, which
require GoatCounter's own SMTP configuration.

`GOATCOUNTER_ADMIN_URL` remains the public base for native password-reset and
secret-site share links. Set `GOATCOUNTER_VHOST` when the internal GoatCounter URL
differs from its configured public hostname; native requests preserve this Host.

The visitor counter is served by GoatCounter at `/counter/*`. The generated
Caddyfile and the Kubernetes Ingress route that path to GoatCounter; existing
Docker installs need `./scripts/setup.sh` re-run (or the `handle /counter/*`
block added to their Caddyfile) before the counter embeds work.

---

## Search indexing and shared-link metadata

GTCD is a private application, not a public product site. Server responses use
`X-Robots-Tag: noindex, nofollow`, including login, redirects, APIs and errors.
Page metadata defaults to the same policy. The sitemap contains no URLs and is
not advertised in robots.txt. Crawling remains allowed so compliant search
engines can discover the noindex directive; robots.txt is not access control.

Shared reports use generic preview metadata without the site's name, analytics
details or access token. They emit neither canonical nor Open Graph page URLs.
The report itself remains accessible to anyone holding a valid share link.
Structured data is opt-in and suppressed on noindex pages and shared reports.
Any future public landing page needs an explicit server indexing policy as well
as factual, explicitly supplied metadata. Previously indexed URLs may take time
to disappear after deployment and recrawling; noindex is not authentication.

---

## ♿ Accessibility (WCAG 2.1 AA)

- **Keyboard Navigation**: Full keyboard tab order, skip link (`<a href="#main-content">`), and `Cmd+B` / `Ctrl+B` sidebar toggle.
- **Charts & Screen Readers**: Area and bar charts include accessible SVG `<title>`, `<desc>`, and hidden fallback tables (`.sr-only`) for screen-reader users.
- **Controls**: The theme menu uses menu radio items, and period presets, grouping, and chart scale use toggle groups, all with keyboard arrow navigation.
- **Reduced Motion**: All animations and transitions respect `prefers-reduced-motion: reduce`.

---

## Report workflows

- **Saved views:** use **Views → Save current view…** to retain the selected site,
  period, filters, grouping and scale. Manage views and the default in Customize.
- **Period comparison:** the overview compares pageviews and events with the
  preceding equal-length period, plus the current browser/country leader's
  audience-share shift. Missing or incomplete baselines show unavailable.
- **Read-only sharing:** administrators can create links in Settings with a
  1-, 7- or 30-day expiry (7 by default), or choose **Never expires**.
  Non-expiring links remain active until replaced or revoked, provided their
  stored records are retained. Replacing or revoking a link stops
  access through the old URL. Anyone holding an active URL can read the report;
  shared responses disable caching, indexing and referrer transmission.
- **Email summaries and traffic alerts:** configure SMTP, then opt in separately
  in Customize. Alerts compare the last completed day's pageviews with the day
  before, after 07:00 in the GoatCounter timezone. Choose a site, direction,
  percentage threshold and minimum baseline. Saving a rule starts checks the
  next day; zero or insufficient baselines do not trigger alerts. Delivery goes
  only to the signed-in account's email. Failed checks retry on a later tick.

The Node server checks schedules every 15 minutes while running; it is not an
external cron service. Redis stores subscriptions and delivery state. The
in-memory fallback is process-local and loses state on restart. Redis locking
and a local overlap guard reduce duplicate deliveries, but SMTP delivery is not
exactly-once: a crash after acceptance or a Redis outage across replicas can
produce duplicates. Turn subscriptions off to stop future sends; delivered
emails cannot be recalled.

---

## GoatCounter performance and operations

See [SvelteKit performance checks](docs/PERFORMANCE.md) for the authenticated
browser benchmark, delivery probe, budgets, and navigation tradeoffs.

See [the operations runbook](docs/GOATCOUNTER_OPERATIONS.md) for API demand,
database/storage checks, tracking freshness, container sizing, and retention.
It separates locally tested improvements from changes that need live measurements
or approval to delete historical data. Audit the active database location before
recreating an existing Compose installation.

---

## 🤝 Contributing

Contributions, bug reports, and suggestions are welcome!

1. Fork the repo and create your branch: `git checkout -b feature/cool-idea`.
2. Ensure types and checks pass: `pnpm check && pnpm test:checks && pnpm build && pnpm test:e2e`.
3. Commit your changes and open a Pull Request.

---

## 🙏 Acknowledgements

- [Martin Tournoij (arp242)](https://github.com/arp242) for creating [GoatCounter](https://github.com/arp242/goatcounter) — a true gem in the open-source privacy analytics space.
- The [SvelteKit](https://kit.svelte.dev/) and [shadcn-svelte](https://shadcn-svelte.com/) teams for fantastic tooling, and the [ReUI](https://reui.io/) team for the design system this dashboard is styled with.

---

## 📄 License

[MIT](LICENSE) © 2026 Haikel
