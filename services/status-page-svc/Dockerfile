# ==============================================================================
# AIVO Platform - Status Page Service Dockerfile
# ==============================================================================
# Multi-stage build for the Fastify + SQLite status page service.
# This service is intentionally independent — it uses SQLite, not the
# platform PostgreSQL, so it can report platform status during outages.

# Stage 1: Builder
FROM node:22-alpine AS builder

# better-sqlite3 needs build tools
RUN apk add --no-cache g++ make python3

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json tsconfig.compat.json ./
COPY packages/ ./packages/
COPY libs/ ./libs/

# Copy service files
COPY services/status-page-svc/ ./services/status-page-svc/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the service
RUN pnpm turbo build --filter="@aivo/status-page-svc..."

# Create a deployable bundle with all production dependencies
RUN pnpm deploy --filter="@aivo/status-page-svc" --prod /deploy

# Stage 2: Runner
FROM node:22-alpine AS runner

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy built application from the deploy bundle
COPY --from=builder --chown=nodejs:nodejs /deploy/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/services/status-page-svc/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /deploy/package.json ./

# Create persistent data directory for SQLite
RUN mkdir -p /app/data && chown -R nodejs:nodejs /app/data

# Set environment variables
ENV NODE_ENV=production \
    PORT=3090 \
    DATABASE_PATH=/app/data/status.db

# Expose port
EXPOSE 3090

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3090/health || exit 1

# Switch to non-root user
USER nodejs

# Use dumb-init as entrypoint
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

CMD ["node", "dist/index.js"]
