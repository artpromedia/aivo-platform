FROM node:22.22.0-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

# ── deps ──────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/web-status/package.json apps/web-status/
RUN pnpm install --frozen-lockfile

# ── builder ───────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web-status/node_modules ./apps/web-status/node_modules
COPY . .

ARG STATUS_API_URL=http://status-page-svc:3090
ENV STATUS_API_URL=${STATUS_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm turbo build --filter=@aivo/web-status

# ── runner ────────────────────────────────────────────────────────────
FROM node:22.22.0-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3091

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

COPY --from=builder /app/apps/web-status/public ./public

# standalone output from Next.js
COPY --from=builder --chown=nextjs:nodejs /app/apps/web-status/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web-status/.next/static ./apps/web-status/.next/static

USER nextjs

EXPOSE 3091

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3091/ || exit 1

CMD ["node", "apps/web-status/server.js"]
