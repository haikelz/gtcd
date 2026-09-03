FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN npx vite build

FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "build"]
