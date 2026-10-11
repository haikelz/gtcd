# syntax=docker/dockerfile:1.7
# Pinned by version and multi-arch index digest (verified 2026-10-11) so every
# build uses the same Node and npm; a bare "26-alpine" tag re-resolves on each
# build. Bump the version and digest together, deliberately, with AGENTS.md:
#   docker buildx imagetools inspect node:<version>-alpine
ARG NODE_IMAGE=node:26.11.1-alpine@sha256:143494b1da2945f061539253adc65e4f1569ddf07da2d384c022c791a9d90a4a

# The builder runs on the build host's own architecture. Its output (SvelteKit
# build + pure-JS production deps, no native addons) is platform-independent,
# and Node 26 miscomputes floating-point math under Docker Desktop's amd64
# emulation on Apple Silicon (npm then fails with "cannot set sizeCalculation
# without setting maxSize"). Only the runtime stage targets $TARGETPLATFORM.
FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

# Install the pnpm version pinned in package.json's packageManager field.
# (Node 25+ images no longer bundle corepack, and npm is guaranteed to exist
# in the node base image.)
RUN npm install --global pnpm@9.15.9

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build && pnpm prune --prod

FROM ${NODE_IMAGE} AS runtime

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
