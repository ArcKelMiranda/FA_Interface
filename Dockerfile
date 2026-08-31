# Multi-stage build for facodes (Node 22 / Fastify API + React SPA).
#
# Base image note (task 1.4 risk, see design.md Open Questions):
# better-sqlite3 (v13.x) has no prebuilt binary for this target at all
# (confirmed empirically: `npm ci` on plain `node:22-bookworm-slim` falls
# straight to `node-gyp rebuild`, not a downloaded prebuild) — so a
# musl/alpine base would only make this worse. The fix is not the base
# distro, it's compiling once with a toolchain present, then shipping only
# the compiled artifact into a toolchain-free runtime image:
#   1. `deps` installs python3/make/g++ and runs `npm ci` (compiles
#      better-sqlite3's native addon here, where the toolchain exists).
#   2. `build` reuses that image to compile TypeScript + the Vite bundle.
#   3. `prod-deps` prunes devDependencies from the already-compiled
#      node_modules (the compiled .node binary survives the prune).
#   4. `runtime` is plain node:22-bookworm-slim again — no compiler, just
#      the pruned node_modules + dist copied in. Same glibc as `deps`, so
#      the natively-compiled binary runs unmodified.
# Fallback documented for the record: if this ever breaks on the bastion
# arch, swap to Node's built-in `node:sqlite` (Node 22.5+) behind the same
# ReviewStateStore port with no call-site changes.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY tsconfig.json vite.config.ts vitest.config.ts ./
COPY src ./src
RUN npm run build

FROM deps AS prod-deps
WORKDIR /app
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080 \
    WRITE_TOOLS_ENABLED=false

COPY package.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# tsc does not copy non-.ts assets, so the forward-only SQL migrations
# (src/store/sqlite/migrations/*.sql, task 4.2) must be copied explicitly.
# src/store/sqlite/migrate.ts resolves this directory relative to its own
# compiled location (dist/store/sqlite/migrations), so this path must match.
COPY src/store/sqlite/migrations ./dist/store/sqlite/migrations

EXPOSE 8080
CMD ["node", "dist/index.js"]
