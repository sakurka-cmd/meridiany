# ============================================================
#  Multi-stage Dockerfile for "Меридианы — атлас великих экспедиций"
#  Next.js 16 standalone build + SQLite (Prisma)
# ============================================================

# ---------- 1. Deps stage ----------
FROM node:20-alpine AS deps
WORKDIR /app

# Bun is used for fast installs in dev; here we use npm/yarn for Docker.
# Copy lock file + package.json first to leverage Docker layer caching.
COPY package.json bun.lock* yarn.lock* package-lock.json* ./
COPY prisma ./prisma

# Install with npm (lockfile-agnostic). Use --omit=dev for prod-only deps,
# but we need prisma CLI at build time so install everything here.
RUN npm install --legacy-peer-deps || npm install

# ---------- 2. Builder stage ----------
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the Next.js standalone output (creates .next/standalone)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# ---------- 3. Runner stage (production image) ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Default DATABASE_URL — overridden by docker-compose / -e flag if needed
ENV DATABASE_URL="file:/app/db/custom.db"

# Install only what we need at runtime: a tiny shell, openssl (for Prisma)
RUN apk add --no-cache openssl libc6-compat

# Copy the standalone server output (Next.js bundles only what's needed)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma needs its generated client + schema
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/prisma ./prisma

# SQLite DB volume mount point
RUN mkdir -p /app/db
VOLUME ["/app/db"]

# Copy the seed script for first-time bootstrap
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src/lib/db.ts ./src/lib/db.ts
COPY --from=builder /app/src/lib/types.ts ./src/lib/types.ts

EXPOSE 3000

# Container starts: run migrations (idempotent), seed if DB is empty, start server
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node server.js"]
