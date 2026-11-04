# =============================================================================
# BuilderCFO AI Web — Cloud Run container
# =============================================================================
# Multi-stage build:
#   1. base    — pnpm enabled on node:20-alpine
#   2. deps    — installs the monorepo dependencies
#   3. builder — compiles Next.js in standalone mode
#   4. runner  — minimal runtime image
# =============================================================================

FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

# -----------------------------------------------------------------------------
# deps — install dependencies (using the monorepo's pnpm-lock)
# -----------------------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile --filter web...

# -----------------------------------------------------------------------------
# builder — compile Next.js (standalone)
# -----------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
# Disable telemetry inside the container
ENV NEXT_TELEMETRY_DISABLED=1

# -----------------------------------------------------------------------------
# Firebase WEB client config — these are PUBLIC (not secrets). The web API key
# identifies the project to Google; access is controlled by Firebase Security
# Rules + Auth + App Check, not by keeping the key private. They MUST be present
# at build time because Next.js inlines NEXT_PUBLIC_* into the client bundle
# during `next build`. Setting them only as Cloud Run runtime env vars leaves
# the browser bundle with empty config → `auth/invalid-api-key` on every login.
# Passed via --build-arg from cloudbuild.yaml.
# -----------------------------------------------------------------------------
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
    NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_FIREBASE_EMULATORS=0

RUN pnpm --filter web build

# -----------------------------------------------------------------------------
# runner — minimal production image
# -----------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Next standalone output bundles required deps
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 8080

CMD ["node", "apps/web/server.js"]
