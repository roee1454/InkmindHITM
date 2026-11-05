# Multi-stage build for Inkmind CRM (TanStack Start + Nitro + Node 22).
# Supports development (with live reload) and production (minimal hardened runner).

# ---------------------------------------------------------------------------
# Base stage: Node 22 Alpine, system timezone, and pnpm
# ---------------------------------------------------------------------------
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache tzdata
ENV TZ=Asia/Jerusalem
ENV TSR_TMP_DIR=/app/src/.tmp
RUN corepack enable

# ---------------------------------------------------------------------------
# Dependencies stage: Install all npm packages (with frozen lockfile)
# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# Development stage: Live dev server for docker-compose watch / volume mounts
# ---------------------------------------------------------------------------
FROM deps AS dev
ENV NODE_ENV=development
ENV PORT=3101
ENV TSR_TMP_DIR=/app/src/.tmp

# Copy source in case volumes aren't mounted (volumes/watch will overlay this)
COPY . .

EXPOSE 3101
CMD ["sh", "-c", "pnpm generate-routes && pnpm dev"]

# ---------------------------------------------------------------------------
# Studio sync stage: Provisions database with studio.config.ts
# ---------------------------------------------------------------------------
FROM deps AS sync
COPY . .
CMD ["pnpm", "studio:sync"]

# ---------------------------------------------------------------------------
# Builder stage: Generate route tree and build production bundle with Nitro
# ---------------------------------------------------------------------------
FROM deps AS builder

COPY . .

# VITE_-prefixed vars are inlined into the client bundle at BUILD time.
# This must be the real public PocketBase URL (e.g. https://pb.yourdomain.com),
# not the Docker-internal service name (`http://pocketbase:8090`).
ARG VITE_POCKETBASE_URL
ENV VITE_POCKETBASE_URL=${VITE_POCKETBASE_URL}

RUN pnpm generate-routes && pnpm build

# ---------------------------------------------------------------------------
# Production runner: Minimal image with only Nitro's standalone output
# ---------------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3101

# Run as non-root node user for container security
USER node

COPY --chown=node:node --from=builder /app/.output ./.output

EXPOSE 3101
CMD ["node", ".output/server/index.mjs"]
