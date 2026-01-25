# ==============================================================================
# AIVO Platform - Orchestrator Service Dockerfile
# ==============================================================================
# Multi-stage build for Node.js services

# Stage 1: Builder
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache g++ make python3 openssl

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json tsconfig.compat.json ./
COPY packages/ ./packages/
COPY libs/ ./libs/

# Copy service files
COPY services/orchestrator-svc/ ./services/orchestrator-svc/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the service (includes dependencies like ts-api-utils)
RUN pnpm turbo build --filter="@aivo/orchestrator-svc"

# Create a deployable bundle with all production dependencies
RUN pnpm deploy --filter="@aivo/orchestrator-svc" --prod /deploy

# Stage 2: Runner
FROM node:20-alpine AS runner

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

# Install dumb-init for proper signal handling and OpenSSL for Prisma
RUN apk add --no-cache dumb-init openssl

# Copy built application from the deploy bundle
COPY --from=builder --chown=nodejs:nodejs /deploy/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/services/orchestrator-svc/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/services/orchestrator-svc/generated ./generated
COPY --from=builder --chown=nodejs:nodejs /deploy/package.json ./

# Set environment variables
ENV NODE_ENV=production \
    PORT=4075

# Expose port
EXPOSE 4075

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:4075/health || exit 1

# Switch to non-root user
USER nodejs

# Use dumb-init as entrypoint
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

CMD ["node", "dist/index.js"]
