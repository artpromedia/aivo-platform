# ==============================================================================
# AIVO Platform - Content Service Dockerfile
# ==============================================================================
# Multi-stage build for Fastify services

# Stage 1: Builder
FROM node:22-alpine AS builder

# Install build dependencies
RUN apk add --no-cache g++ make python3

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json tsconfig.compat.json ./
COPY packages/ ./packages/
COPY libs/ ./libs/

# Copy service files
COPY services/content-svc/ ./services/content-svc/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the service
RUN pnpm turbo build --filter="@aivo/content-svc..."

# Create a deployable bundle with all production dependencies
RUN pnpm deploy --filter="@aivo/content-svc" --prod /deploy

# Stage 2: Runner
FROM node:22-alpine AS runner

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init openssl

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /deploy/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/services/content-svc/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/services/content-svc/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /deploy/package.json ./

# Set environment variables
ENV NODE_ENV=production \
    PORT=4020

# Expose port
EXPOSE 4020

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:4020/health || exit 1

# Switch to non-root user
USER nodejs

# Use dumb-init as entrypoint
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

CMD ["node", "dist/index.js"]
