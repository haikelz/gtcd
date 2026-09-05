# syntax=docker/dockerfile:1.7
# node:20-alpine, multi-arch manifest digest (2026-09-05).
# NOTE: Node.js 20 reached end-of-life in April 2026; bump to a supported LTS
# line deliberately, together with AGENTS.md and CI.
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

# Corepack reads the pinned version from the packageManager field.
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build && pnpm prune --prod

FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

LABEL org.opencontainers.image.title="gtcd" \
      org.opencontainers.image.description="Self-hosted analytics dashboard for GoatCounter" \
      org.opencontainers.image.source="https://github.com/haikelz/gtcd" \
      org.opencontainers.image.licenses="MIT"

COPY --from=builder --chown=node:node /app/build ./build
COPY --from=builder --chown=node:node /app/package.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/scripts/start.mjs ./scripts/start.mjs

# Numeric UID/GID so Kubernetes securityContext and volume ownership stay stable.
USER 1000:1000

EXPOSE 3000

# start.mjs registers SIGTERM/SIGINT handlers, which Node needs to shut down
# cleanly when running as PID 1 in a container.
CMD ["node", "scripts/start.mjs"]
