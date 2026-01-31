# ══════════════════════════════════════════════════════════════════════════════
# AIVO Model Registry Service - Dockerfile
# ══════════════════════════════════════════════════════════════════════════════
# Multi-stage build for production deployment

# Stage 1: Builder
FROM node:20-alpine AS builder

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

# Copy workspace configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY tsconfig.base.json tsconfig.compat.json ./

# Copy shared packages and libraries
COPY packages/ packages/
COPY libs/ libs/

# Copy service
COPY services/model-registry-svc/ services/model-registry-svc/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN cd services/model-registry-svc && pnpm db:generate

# Build service
RUN pnpm turbo build --filter="@aivo/model-registry-svc..."

# Deploy production dependencies
RUN pnpm deploy --filter="@aivo/model-registry-svc" --prod /deploy

# Copy generated Prisma client to deploy
RUN cp -r services/model-registry-svc/generated /deploy/generated

# Stage 2: Runner
FROM node:20-alpine AS runner

# Install dumb-init for proper signal handling and openssl for Prisma
RUN apk add --no-cache dumb-init openssl

# Create non-root user
RUN addgroup -g 1001 nodejs && adduser -S nodejs -u 1001

WORKDIR /app

# Copy deployed application
COPY --from=builder --chown=nodejs:nodejs /deploy/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /deploy/generated ./generated
COPY --from=builder --chown=nodejs:nodejs /app/services/model-registry-svc/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/services/model-registry-svc/package.json ./

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 4051

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4051/health || exit 1

# Start with dumb-init
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/index.js"]
