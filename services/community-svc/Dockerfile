# ══════════════════════════════════════════════════════════════════════════════
# Community Service Dockerfile
# ══════════════════════════════════════════════════════════════════════════════

FROM node:20-alpine AS builder

WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY tsconfig.base.json tsconfig.compat.json ./

# Copy service files
COPY services/community-svc/package.json ./services/community-svc/
COPY services/community-svc/tsconfig.json ./services/community-svc/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY services/community-svc ./services/community-svc/

# Generate Prisma client and build
WORKDIR /app/services/community-svc
RUN pnpm db:generate && pnpm build

# ══════════════════════════════════════════════════════════════════════════════
# Production Stage
# ══════════════════════════════════════════════════════════════════════════════

FROM node:20-alpine AS production

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy built files
COPY --from=builder /app/services/community-svc/dist ./dist/
COPY --from=builder /app/services/community-svc/generated ./generated/
COPY --from=builder /app/services/community-svc/package.json ./
COPY --from=builder /app/services/community-svc/node_modules ./node_modules/

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/src/index.js"]
