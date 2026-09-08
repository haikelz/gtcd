# Repository Workflow

`AGENTS.md` is the repository entrypoint. Read `.agents/general.md` and `.agents/preferences.md` for every task, then load only the matching technical profile named in `AGENTS.md`. `README.md` is the setup and deployment reference; source code, tests, and package scripts establish executable behavior.

## Work shapes

Read-only requests inspect the smallest relevant scope and report facts, inferences, and limits without editing files.

For a bounded change, inspect the relevant contract and implementation, make the smallest complete change, run the matching checks, and review only the owned diff. Preserve unrelated worktree changes.

For multi-session, coordination-heavy, or recovery-sensitive work, keep one evolving plan in `docs/plans/active/`. Record the accepted outcome, scope, decisions, recovery notes, and validation there; move it to `docs/plans/completed/` after completion. Do not create a plan for ordinary focused changes.

Stop for a human decision when a choice would materially change product behavior, public contracts, production data, security posture, deployment, or another person's work.

## Setup and runtime

Use pnpm. `pnpm install` prepares the local application. `pnpm dev` starts the Vite development server; `pnpm build` creates the Node adapter output; `pnpm preview` serves that build. The production entrypoint is `node build` (via `scripts/start.mjs`).

Docker Compose is the supported local stack. `scripts/setup.sh` is interactive: it creates `.env` when needed, prompts for GoatCounter credentials, generates `Caddyfile`, and starts containers. Do not run it for read-only work or against an environment you do not own. Keep secrets in environment files only; never place secret values in repository files or logs.

## Verification

Run the narrowest applicable command first, then the relevant complete boundary check:

- `pnpm check` for Svelte and TypeScript diagnostics.
- `pnpm lint` for formatting and ESLint validation.
- `pnpm build` for the production bundle.
- `pnpm dev` or `pnpm preview` plus the relevant browser flow when a UI or route changes.

Documentation and harness changes require link and command verification; application checks are required only when the changed behavior affects the application. A successful structural harness check does not prove runtime behavior.

## Completion evidence

Before completion, verify that root instructions link to files that exist, inspect the owned diff, and report the exact commands and observable surface checked. State any validation that could not run and why. Do not claim a broader result than the evidence supports.
