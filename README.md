# 🐐 gtcd — Modern Web Dashboard for GoatCounter

[![SvelteKit](https://img.shields.io/badge/SvelteKit-2.x-FF3E00?style=flat-square&logo=svelte&logoColor=white)](https://kit.svelte.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)

gtcd is a self-hosted dashboard for [GoatCounter](https://www.goatcounter.com/),
the privacy-friendly web analytics tool. It talks to your GoatCounter server
through its API and gives you a faster, modern interface, built with Svelte 5,
Tailwind CSS v4 and the [ReUI](https://reui.io/) design system. GoatCounter
itself runs unchanged.

<table>
  <tr>
    <td><img src="docs/screenshots/traffic.png" alt="Traffic overview in light mode with KPI tiles, hourly traffic chart, and browser mix"></td>
    <td><img src="docs/screenshots/traffic-dark.png" alt="Traffic overview in dark mode with KPI tiles, hourly traffic chart, and browser mix"></td>
  </tr>
</table>

## Features

- **Reports:** traffic over time, pages with referrers, browsers and systems
  with version drill-downs, locations, languages, screen sizes and campaigns,
  with GoatCounter's periods, filters and previous-period comparison.
- **Your workspace:** saved views, a customizable overview, dark and light
  themes, a mobile layout, `Cmd+B` / `Ctrl+B` sidebar toggle and an installable
  PWA.
- **Your GoatCounter preferences:** timezone, date format, 24-hour clock,
  number separators and "fewer numbers" mode carry over, with per-user
  overrides. English and Bahasa Indonesia.
- **Sharing:** read-only report links with expiry, date-range and metric limits.
- **Email:** scheduled summaries and daily traffic alerts over your SMTP server.
- **Notifications:** the same alerts and summaries to Slack, Discord, Telegram
  or a JSON webhook, plus an audit log of administrator actions.
- **Administration:** site settings, exports, users, API tokens, two-factor
  setup, imports and page cleanup, without exposing the API token.
- **Secure by default:** the API key never reaches the browser; login supports
  GoatCounter two-factor codes, rate limiting and optional Cloudflare Turnstile.
- **Gentle on GoatCounter:** gtcd paces and caches its API calls to stay under
  GoatCounter's API limit: 4 requests a second by default, 20 for the bundled
  instance (`GOATCOUNTER_API_RATE`).
- **Accessible:** keyboard navigation, screen-reader tables for every chart and
  reduced-motion support (WCAG 2.1 AA).

<details>
<summary>More screenshots</summary>

<table>
  <tr>
    <td><img src="docs/screenshots/pages.png" alt="Pages report with sparklines, view counts, and the per-page or shared scale toggle"></td>
    <td><img src="docs/screenshots/page-detail.png" alt="Page detail for /blog showing the referrers sending traffic to it"></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/paths.png" alt="Path directory listing every tracked path with event markers"></td>
    <td><img src="docs/screenshots/report-detail.png" alt="Report detail showing browser versions for one browser"></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/browsers.png" alt="Browsers report with visitor counts and audience-share chart"></td>
    <td><img src="docs/screenshots/operating-systems.png" alt="Operating systems report with visitor share bars"></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/locations.png" alt="Locations report showing visitor distribution by country"></td>
    <td><img src="docs/screenshots/languages.png" alt="Languages report showing visitor language distribution"></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/screen-size.png" alt="Screen sizes report showing visitor device classes"></td>
    <td><img src="docs/screenshots/campaigns.png" alt="Campaigns report showing traffic by campaign"></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/referrers.png" alt="Referrers report showing top referring sites"></td>
    <td><img src="docs/screenshots/customize.png" alt="Customize page with saved views and overview widget order"></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/settings.png" alt="Site settings with retention, data collection, visibility, and visitor counter options"></td>
    <td><img src="docs/screenshots/exports.png" alt="Data exports page with CSV and JSON format choice and export status"></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/share.png" alt="Read-only public dashboard opened from a share link, with period buttons and key metrics"></td>
    <td><img src="docs/screenshots/traffic-id.png" alt="Traffic overview in Bahasa Indonesia"></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/login.png" alt="gtcd sign-in page with the GoatCounter account form and a passed Cloudflare Turnstile check"></td>
    <td><img src="docs/screenshots/login-mfa.png" alt="Two-factor step asking for the 6-digit code from an authenticator app"></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/traffic-mobile.png" alt="Traffic overview on a phone with the stacked toolbar and KPI tiles" width="320"></td>
    <td><img src="docs/screenshots/not-found.png" alt="Not found error page with Continue and Previous page actions"></td>
  </tr>
</table>

Captured from a local build against a synthetic GoatCounter; the numbers are
illustrative.

</details>

## Quick start

Docker Compose runs the whole stack: Caddy, GoatCounter, Redis and gtcd.

```bash
git clone https://github.com/haikelz/gtcd.git
cd gtcd
./scripts/setup.sh
```

The script asks for your domain and a GoatCounter admin account, creates the
site and API token, writes `.env` and starts everything. Open
`https://localhost` (or your domain) and sign in with that account.

Then add the tracking snippet to your website:

```html
<script
  data-goatcounter="https://analytics.example.com/count"
  async
  src="https://analytics.example.com/count.js"
></script>
```

For Kubernetes, manual Compose setup, CI images and reverse-proxy notes, see
[Deployment](docs/DEPLOYMENT.md).

## Local development

Requires Node.js 26 and pnpm 9.15.9. Point `GOATCOUNTER_URL` and `REDIS_URL`
at addresses your machine can reach.

```bash
pnpm install
cp .env.example .env
pnpm dev            # development server
pnpm check          # Svelte and TypeScript
pnpm test:checks    # logic self-checks
```

The browser tests need a disposable Redis 7. `TEST_REDIS_URL` has no default, so
it never touches another project's Redis:

```bash
docker run -d --name gtcd-test-redis -p 127.0.0.1:16379:6379 redis:7-alpine
pnpm build && pnpm exec playwright install chromium
TEST_REDIS_URL=redis://127.0.0.1:16379/0 pnpm test:e2e
```

## Configuration

Set these in `.env` or the container environment.

| Variable                | Required | Purpose                                                                                                     |
| :---------------------- | :------: | :---------------------------------------------------------------------------------------------------------- |
| `GOATCOUNTER_URL`       | **Yes**  | GoatCounter address, e.g. `http://goatcounter:8080`.                                                        |
| `GOATCOUNTER_API_KEY`   | **Yes**  | GoatCounter API token. `setup.sh` creates one with every permission.                                        |
| `REDIS_URL`             | **Yes**  | Redis with its password, e.g. `redis://:<password>@redis:6379`. Kubernetes builds it from `REDIS_PASSWORD`. |
| `DOMAIN`                |    No    | Dashboard domain for Compose; defaults to `localhost`.                                                      |
| `GTCD_ADMIN_EMAILS`     |    No    | Comma-separated accounts that can manage sites, exports, sharing and users.                                 |
| `GOATCOUNTER_ADMIN_URL` |    No    | Public GoatCounter URL, used for password-reset and secret-site links.                                      |
| `GOATCOUNTER_VHOST`     |    No    | GoatCounter site hostname, sent as `Host`. `setup.sh` writes it; Kubernetes defaults it to `DOMAIN`.        |
| `GOATCOUNTER_API_RATE`  |    No    | GoatCounter API calls a second. gtcd defaults to `4`; Compose and Kubernetes set `20` on both sides.        |
| `GTCD_PUBLIC_URL`       |    No    | Public dashboard URL for links in emails.                                                                   |
| `GTCD_ALLOWED_WEBHOOKS` |    No    | Hosts notification channels may reach on private addresses, comma-separated; they also accept `http://`.    |
| `SMTP_HOST`             |    No    | SMTP server. Email stays off until `SMTP_HOST` and `SMTP_FROM` are set.                                     |
| `SMTP_PORT`             |    No    | Defaults to `587`, or `465` with `SMTP_SECURE=true`.                                                        |
| `SMTP_SECURE`           |    No    | `true` for implicit TLS; otherwise STARTTLS when offered.                                                   |
| `SMTP_USER`             |    No    | SMTP username, if needed.                                                                                   |
| `SMTP_PASSWORD`         |    No    | SMTP password.                                                                                              |
| `SMTP_FROM`             |    No    | Sender, e.g. `gtcd reports <reports@example.com>`.                                                          |
| `TURNSTILE_SITE_KEY`    |    No    | Cloudflare Turnstile site key. The login check turns on once both keys are set.                             |
| `TURNSTILE_SECRET_KEY`  |    No    | Turnstile secret key, verified on the server.                                                               |
| `ADDRESS_HEADER`        |    No    | Header carrying the client IP for the per-IP login limit; `cf-connecting-ip` behind Cloudflare.             |
| `XFF_DEPTH`             |    No    | Trusted proxies in front of gtcd when `ADDRESS_HEADER` is `x-forwarded-for`; defaults to `1`.               |
| `COOKIE_SECURE`         |    No    | Force the session cookie's `Secure` flag; by default it follows the request protocol.                       |
| `BODY_SIZE_LIMIT`       |    No    | Raise to `10M` to allow native imports up to 8 MiB.                                                         |
| `PORT`                  |    No    | Server port; defaults to `3000`.                                                                            |
| `NODE_ENV`              |    No    | Defaults to `production`.                                                                                   |

## How it works

```diagram
┌──────────────────────────────┐
│ Browser: Svelte 5 dashboard   │
└──────────────┬───────────────┘
               │ HTTP-only session cookie
┌──────────────▼───────────────┐       ┌─────────────────────────────┐
│ SvelteKit / Node 26          │◄─────►│ Redis 7                     │
│ Session and permission gates│       │ Sessions, shared cache,     │
│ Cached API reads + pacing   │       │ preferences, grants, jobs   │
│ Personal native-admin bridge│       └─────────────────────────────┘
└──────────────┬───────────────┘
               │ Server-only API token / personal native session
┌──────────────▼───────────────┐
│ Stock GoatCounter           │
│ Tracking, reports, database  │
└──────────────────────────────┘
```

- You sign in with your GoatCounter email and password (plus a two-factor code
  if you use one). gtcd checks them with GoatCounter and keeps the session in
  Redis behind an HTTP-only cookie.
- Reports load on the server with the API token, so the token never reaches the
  browser. Administration screens use your own GoatCounter session, so
  GoatCounter's permissions still apply.
- Sessions and the report cache fall back to memory if Redis goes down. Saved
  views, share links and email jobs need Redis and fail safely without it.

## Documentation

- [Deployment](docs/DEPLOYMENT.md): Compose, Kubernetes, CI images, proxies.
- [Administration and reports](docs/ADMINISTRATION.md): settings, users,
  sharing, email reports, diagnostics.
- [Redis state](docs/REDIS_STATE.md): what Redis stores and how to upgrade
  safely.
- [GoatCounter operations](docs/GOATCOUNTER_OPERATIONS.md): sizing, storage,
  retention and the image pin.
- [Performance](docs/PERFORMANCE.md) and [workflow](docs/WORKFLOW.md):
  benchmarks, verification commands and CI parity.
- [Product](PRODUCT.md) and [design](DESIGN.md): behavior contracts and the
  design system.

## Contributing

Contributions and bug reports are welcome. Create a branch, run
`pnpm lint && pnpm check && pnpm test:checks && pnpm build && pnpm test:e2e`
with a test Redis as shown above, then open a pull request.

## Acknowledgements

- [Martin Tournoij (arp242)](https://github.com/arp242) for
  [GoatCounter](https://github.com/arp242/goatcounter).
- The [SvelteKit](https://kit.svelte.dev/), [shadcn-svelte](https://shadcn-svelte.com/)
  and [ReUI](https://reui.io/) teams for the tooling and design system.

## License

This repository has no `LICENSE` file yet. Ask the owner before redistributing
it. Bundled font licenses are in `static/fonts/`.
