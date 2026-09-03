# 🐐 gtcd — Custom GoatCounter Dashboard

A DIY dashboard for [GoatCounter](https://www.goatcounter.com/) analytics. Uses GoatCounter as the backend data source while providing a custom frontend experience.

## Stack

- **SvelteKit** — Full-stack framework
- **TailwindCSS v4** — Utility-first CSS
- **DaisyUI v5** — Component library
- **TypeScript** — Type safety

## Features

- **Dashboard overview** — Total visitors, top pages, traffic chart, and breakdowns
- **Pages view** — All tracked paths with visitor counts and search
- **Path detail** — Per-page referrer drill-down with traffic history
- **Browser stats** — Browser breakdown with version drill-down
- **OS stats** — Operating system breakdown with version drill-down
- **Location stats** — Country and region breakdown
- **Language stats** — Language breakdown
- **Device stats** — Screen size breakdown
- **Campaign stats** — Campaign tracking via URL parameters
- **Date range presets** — Today, 7d, 30d, 90d, This month
- **Dark theme** — Premium dark UI
- **Responsive** — Works on mobile, tablet, and desktop
- **Client-side only** — API key stored in localStorage, no server needed

## Getting Started

### 1. Get a GoatCounter API Key

1. Log into your GoatCounter site
2. Click your username → Settings → API tab
3. Create a new key with **Count** and **Read statistics** permissions

### 2. Install & Run

```bash
npm install
npm run dev
```

Open http://localhost:5173 and enter your GoatCounter URL and API key.

### 3. Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── app.css                    # Global styles + design tokens
├── app.html                   # HTML shell
├── lib/
│   ├── components/
│   │   ├── AreaChart.svelte   # SVG area chart
│   │   ├── BarChart.svelte    # Horizontal bar chart
│   │   ├── DateRangePicker.svelte
│   │   └── StatCard.svelte   # KPI card
│   ├── goatcounter.ts         # API client
│   └── types.ts               # TypeScript types
└── routes/
    ├── +layout.svelte         # Dashboard layout with sidebar
    ├── +page.svelte           # Main dashboard
    ├── setup/+page.svelte    # Connect page
    ├── pages/
    │   ├── +page.svelte      # Pages list
    │   └── [id]/+page.svelte # Path detail
    ├── browsers/+page.svelte
    ├── systems/+page.svelte
    ├── locations/+page.svelte
    ├── languages/+page.svelte
    ├── devices/+page.svelte
    └── campaigns/+page.svelte
```

## GoatCounter API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v0/me` | Verify connection |
| `GET /api/v0/stats/total` | Total visitors + time series |
| `GET /api/v0/stats/hits` | Top pages with visitor counts |
| `GET /api/v0/stats/hits/{id}` | Per-page referrer breakdown |
| `GET /api/v0/stats/browsers` | Browser breakdown |
| `GET /api/v0/stats/browsers/{id}` | Browser version drill-down |
| `GET /api/v0/stats/systems` | OS breakdown |
| `GET /api/v0/stats/systems/{id}` | OS version drill-down |
| `GET /api/v0/stats/locations` | Country breakdown |
| `GET /api/v0/stats/locations/{id}` | Region drill-down |
| `GET /api/v0/stats/languages` | Language breakdown |
| `GET /api/v0/stats/sizes` | Screen size breakdown |
| `GET /api/v0/stats/campaigns` | Campaign breakdown |

## Design

Inspired by the [ekel.dev design system](https://ekel.dev/design-system) — content-first, minimal, and functional. Dark theme with cyan accent colors and monospace data display.

## License

MIT
