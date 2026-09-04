## Project Configuration

- **Language**: TypeScript
- **Framework**: SvelteKit 2 (Svelte 5 Runes)
- **Package Manager**: pnpm
- **Styling**: Tailwind CSS v4, DaisyUI v5
- **Runtime**: Node.js 20 LTS (`@sveltejs/adapter-node`)
- **State & Caching**: Redis 7 (`ioredis`) with in-memory fallback, memory query cache
- **Containerization & Orchestration**: Docker (multi-stage non-root), Kubernetes (Kustomize manifests)

---

<!-- AI-GUIDELINES:BEGIN -->
## AI Engineering Guidelines

Read `.agents/general.md` and `.agents/preferences.md` for every task. Then select the smallest matching context profile below. Do not read every installed companion by default. Repository-local contracts and instructions remain authoritative.

- **Repository setup, documentation, planning, or process:** no companion guideline.
- **Container, Compose, delivery, or runtime work:** `.agents/guidelines/docker.md`; add an application profile only when its build or runtime behavior also changes.
- **Cross-cutting work:** use the union of only the affected profiles and state why each additional document is needed.
<!-- AI-GUIDELINES:END -->

---

## Architectural Contracts

### 1. Server-Side Mediation & Security
- **API Secret Isolation**: The client browser never receives `GOATCOUNTER_API_KEY`. All GoatCounter API traffic is routed through the SvelteKit backend (`src/lib/server/goatcounter/`).
- **Dynamic Secrets**: Secrets must be loaded via `$env/dynamic/private` with `process.env` fallback to ensure zero build-time secret requirements inside container pipelines.
- **Session Layer**: HTTP-only, `SameSite=Lax` cookies authenticate against Redis (`src/lib/server/auth/session-store.ts`). When Redis is unavailable, the service degrades gracefully to an in-memory session store rather than halting.

### 2. GoatCounter Rate Limiting & Outbound Pacing
- GoatCounter instances enforce an upstream limit of 4 requests/second.
- All outbound calls through `gcFetch` MUST be paced by `paceRequest()` (minimum 280ms threshold).
- Upstream HTTP 429 responses trigger exponential backoff with random jitter and an absolute minimum delay of 1,000ms.
- Dashboard queries are served through a 30-second in-memory query cache to eliminate duplicate upstream fetches on rapid route transitions.

### 3. Data Normalization
- Null, empty string, or whitespace-only metric names (e.g., missing browsers, systems, or campaign tags) must be normalized to `"Unknown"` at the service layer (`src/lib/server/goatcounter/stats.ts`).

### 4. Accessibility & UI Quality (WCAG 2.1 AA)
- Charts must supply accessible representations: SVG `<title>`, `<desc>`, `role="img"`, and a companion screen-reader table (`.sr-only`).
- Interactive metrics use semantic ARIA attributes (`role="meter"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`).
- Color contrast, focus-visible outlines (`--color-primary`), and keyboard shortcuts (`Cmd+B` / `Ctrl+B` for sidebar toggle) must comply with accessibility guidelines.
- Responsive breakpoints: Mobile drawer (<1024px) and collapsible desktop sidebar (>=1024px) with preference persistence in `localStorage`.
