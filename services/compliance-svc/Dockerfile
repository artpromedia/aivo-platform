# ══════════════════════════════════════════════════════════════════════════════
# AIVO Compliance Service - Dockerfile
# ══════════════════════════════════════════════════════════════════════════════

# Stage 1: Builder
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY tsconfig.base.json tsconfig.compat.json ./

COPY packages/ packages/
COPY libs/ libs/

COPY services/compliance-svc/ services/compliance-svc/

RUN pnpm install --frozen-lockfile

RUN cd services/compliance-svc && pnpm db:generate

RUN pnpm turbo build --filter="@aivo/compliance-svc..."

RUN pnpm deploy --filter="@aivo/compliance-svc" --prod /deploy

RUN cp -r services/compliance-svc/generated /deploy/generated

# Stage 2: Runner
FROM node:20-alpine AS runner

RUN apk add --no-cache dumb-init openssl

RUN addgroup -g 1001 nodejs && adduser -S nodejs -u 1001

WORKDIR /app

COPY --from=builder --chown=nodejs:nodejs /deploy/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /deploy/generated ./generated
COPY --from=builder --chown=nodejs:nodejs /app/services/compliance-svc/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/services/compliance-svc/package.json ./

USER nodejs

EXPOSE 4052

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4052/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/index.js"]
