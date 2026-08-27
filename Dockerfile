# syntax=docker/dockerfile:1
#
# Production image for the YB storefront.
#
# next.config.ts sets `output: "standalone"`, so the build emits a self-contained
# Node server that carries only the modules it actually traced. The runtime stage
# therefore installs nothing: it copies three things and runs `node server.js`.
#
#   .next/standalone   the server + its traced node_modules + package.json
#   .next/static       the hashed client assets (NOT included in standalone)
#   public/            static files served from the site root
#
# The two static directories are the classic omission — the app boots, the HTML
# renders, and every stylesheet and script 404s.

ARG NODE_VERSION=22-alpine
ARG PNPM_VERSION=10.28.2


# ─── 1. deps ─────────────────────────────────────────────────────────────────
# Isolated so a source-only change does not re-run the install.
FROM node:${NODE_VERSION} AS deps
ARG PNPM_VERSION
# pnpm via npm rather than corepack: corepack's bundled signature keys go stale
# in older Node images and fail the build on a key it has never heard of.
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile


# ─── 2. build ────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS builder
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* is inlined into browser JavaScript HERE, at build time. Passing
# them at `docker run` does nothing — changing any of them needs a rebuild.
# Left unset they are empty strings, and src/lib/site.ts falls back to defaults.
ARG NEXT_PUBLIC_SITE_NAME=""
ARG NEXT_PUBLIC_SITE_SHORT_NAME=""
ARG NEXT_PUBLIC_SITE_TAGLINE=""
ARG NEXT_PUBLIC_MIN_AGE=""
ENV NEXT_PUBLIC_SITE_NAME=${NEXT_PUBLIC_SITE_NAME} \
    NEXT_PUBLIC_SITE_SHORT_NAME=${NEXT_PUBLIC_SITE_SHORT_NAME} \
    NEXT_PUBLIC_SITE_TAGLINE=${NEXT_PUBLIC_SITE_TAGLINE} \
    NEXT_PUBLIC_MIN_AGE=${NEXT_PUBLIC_MIN_AGE}

# ⚠️ Deliberately absent: KAMUI_API_BASE_URL and KAMUI_STORE_API_KEY. The build
# never needs them — every route is server-rendered on demand — and a build ARG
# is readable in the image history forever. They are runtime env vars, only.
ENV NEXT_TELEMETRY_DISABLED=1

# `public/` is optional in Next and this repo ships none yet; create it so the
# runtime COPY below is unconditional.
RUN mkdir -p public && pnpm build


# ─── 3. runtime ──────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

# tini reaps zombies and forwards SIGTERM, so a redeploy stops in milliseconds
# instead of waiting out the platform's kill timeout.
RUN apk add --no-cache tini

# HOSTNAME is THE standalone gotcha. server.js does
# `const hostname = process.env.HOSTNAME || '0.0.0.0'`, and every container
# runtime sets HOSTNAME to the container id — so left alone the server binds to
# a name that resolves to nothing routable and the platform's health check never
# connects. Pinning it here wins over the runtime-injected value.
# PORT is a default only; Railway (and `docker run -e PORT=`) overrides it.
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 --ingroup nodejs nextjs

# Order matters: standalone first (it lays down ./server.js, ./package.json and
# ./node_modules at the WORKDIR root), then the two asset trees underneath it.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

# Hits our own /api/health, which never calls upstream — see README § Deploy.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
