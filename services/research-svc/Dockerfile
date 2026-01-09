# ═══════════════════════════════════════════════════════════════════════════════
# Research Service Dockerfile
# ═══════════════════════════════════════════════════════════════════════════════

FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

# ───────────────────────────────────────────────────────────────────────────────
# Dependencies Stage
# ───────────────────────────────────────────────────────────────────────────────

FROM base AS deps

# Copy root workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy service package.json
COPY services/research-svc/package.json services/research-svc/

# Copy workspace dependencies
COPY libs/events/package.json libs/events/
COPY libs/ts-rbac/package.json libs/ts-rbac/
COPY libs/ts-storage/package.json libs/ts-storage/

# Install dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @aivo/research-svc...

# ───────────────────────────────────────────────────────────────────────────────
# Build Stage
# ───────────────────────────────────────────────────────────────────────────────

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/services/research-svc/node_modules ./services/research-svc/node_modules

# Copy source
COPY services/research-svc ./services/research-svc
COPY libs/events ./libs/events
COPY libs/ts-rbac ./libs/ts-rbac
COPY libs/ts-storage ./libs/ts-storage
COPY tsconfig.base.json ./

# Generate Prisma client
WORKDIR /app/services/research-svc
RUN pnpm db:generate && pnpm build

# ───────────────────────────────────────────────────────────────────────────────
# Production Stage
# ───────────────────────────────────────────────────────────────────────────────

FROM base AS runner

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

WORKDIR /app

# Copy built artifacts with proper permissions
COPY --from=builder --chmod=555 --chown=appuser:nodejs /app/services/research-svc/dist ./dist
COPY --from=builder --chown=appuser:nodejs /app/services/research-svc/node_modules ./node_modules
COPY --from=builder --chmod=444 --chown=appuser:nodejs /app/services/research-svc/prisma ./prisma
COPY --from=builder --chmod=444 --chown=appuser:nodejs /app/services/research-svc/package.json ./

USER appuser

EXPOSE 4020

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4020/health || exit 1

CMD ["node", "dist/index.js"]
