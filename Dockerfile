# Multi-stage build for the TanStack Start app. Nitro's `node-server` preset bundles almost
# everything into .output/server/index.mjs (verified: only `tslib` survives as a real
# node_modules dependency at runtime), so the final image only needs Node + that one directory —
# no source, no full node_modules, no build toolchain.

FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# VITE_-prefixed vars are inlined into the client bundle at BUILD time (Vite convention), not
# read at container runtime — must be passed as a build arg, not a docker-compose `environment:`
# entry. This is the browser's own PocketBase URL (used for realtime + direct media access), so
# it must be the real public URL in production — never the Docker-internal service name
# (`http://pocketbase:8090` is only resolvable inside the compose network, not from a browser).
ARG VITE_POCKETBASE_URL
ENV VITE_POCKETBASE_URL=${VITE_POCKETBASE_URL}

RUN pnpm generate-routes && pnpm build

# ---------------------------------------------------------------------------

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3101

COPY --from=builder /app/.output ./.output

EXPOSE 3101
CMD ["node", ".output/server/index.mjs"]
