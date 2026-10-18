# Repository Workflow

[AGENTS.md](../AGENTS.md) is the repository entrypoint. Read [.agents/general.md](../.agents/general.md) and [.agents/preferences.md](../.agents/preferences.md) for every task, then load only the matching technical profile named in `AGENTS.md`. [README.md](../README.md) is the setup and deployment reference; source code, tests, and package scripts establish executable behavior. Start repository discovery with `graft map` and the relevant `graft ask "<question>" --source` or exhaustive `graft grep "<literal>"` query before reading source.

## Work shapes

Read-only requests inspect the smallest relevant scope and report facts, inferences, and limits without editing files.

For a bounded change, inspect the relevant contract and implementation, make the smallest complete change, run the matching checks, and review only the owned diff. Preserve unrelated worktree changes.

For multi-session, coordination-heavy, or recovery-sensitive work, keep one evolving plan in `docs/plans/active/` (create that directory when needed). Record the accepted outcome, scope, decisions, recovery notes, and validation there; move it to `docs/plans/completed/` after completion. Do not create a plan for ordinary focused changes.

Stop for a human decision when a choice would materially change product behavior, public contracts, production data, security posture, deployment, or another person's work.

## Setup and runtime

Run commands from the repository root with Node.js 26 and pnpm 9.15.9 (the `packageManager` pin in `package.json`). `pnpm install --frozen-lockfile` installs the locked dependencies and synchronizes SvelteKit. `pnpm dev` starts the Vite development server; `pnpm build` creates the Node adapter output; `pnpm preview` serves that build for local inspection. The production server can run with `node build`; the Docker image uses `node scripts/start.mjs`, which installs signal handlers before importing `build/index.js`.

Docker Compose is the supported local stack. `scripts/setup.sh` is interactive: it creates or updates `.env`, prompts for GoatCounter credentials, writes `secrets/redis.conf`, generates `Caddyfile`, bootstraps the GoatCounter site/token, and starts containers. Do not run it for read-only work or against an environment you do not own. Keep secrets in untracked environment/configuration files or managed Secrets; never place values in tracked files or logs. Review [Redis migration requirements](REDIS_STATE.md#before-upgrading-an-existing-installation) before recreating an older stack, and the [GoatCounter storage warning](GOATCOUNTER_OPERATIONS.md#2-database-and-storage) before changing its mount or database path.

## Verification

Run the narrowest applicable command first, then the relevant complete boundary check:

- `pnpm check` for Svelte and TypeScript diagnostics.
- `pnpm lint` for formatting and ESLint validation.
- `pnpm test:checks` for the logic self-checks (`src/**/*.check.ts`).
- `pnpm build` for the production bundle.
- `pnpm test:e2e` for the Playwright smoke tests against the build and `e2e/mock-goatcounter.mjs`. Build first, install Chromium with `pnpm exec playwright install chromium`, and set `TEST_REDIS_URL` to an isolated Redis 7 instance; see [local verification](REDIS_STATE.md#local-verification) for defaults and ports. Never point fixture tests at production Redis.
- `MOCK_MODERN_EXPORTS=true pnpm exec playwright test exports.test.ts` for the modern JSON-export fixture in addition to the default compatibility run.
- `pnpm test:perf` for the isolated authenticated fixture benchmark; see [performance setup and limitations](PERFORMANCE.md#run-the-authenticated-fixture-benchmark).
- `pnpm dev` or `pnpm preview` plus the relevant browser flow when a UI or route changes.

Documentation and harness changes require link and command verification; application checks are required only when the changed behavior affects the application. A successful structural harness check does not prove runtime behavior.

For Markdown-only edits, run `pnpm exec prettier --write <owned-files>` and then `pnpm exec prettier --check <owned-files>`, and verify relative links and heading fragments. Avoid `pnpm format` when only a few files are owned: it rewrites the whole repository.

The checked-in [GitHub Actions workflow](../.github/workflows/deploy.yaml) runs lint, type/logic checks, build, smoke tests, the modern-export fixture and the performance benchmark with Redis 7. Its image job smoke-tests amd64; non-PR runs also publish multi-architecture images and smoke-test the published arm64 image. This describes configured checks, not proof that a particular run passed or that branch protection requires them.

## Completion evidence

Before completion, verify that root instructions link to files that exist, inspect the owned diff, and report the exact commands and observable surface checked. State any validation that could not run and why. Do not claim a broader result than the evidence supports.
