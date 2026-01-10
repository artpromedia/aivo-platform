# ==============================================================================
# AIVO Platform - Baseline Service Dockerfile
# ==============================================================================
# Multi-stage build for NestJS services

# Stage 1: Builder
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache g++ make python3

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json tsconfig.compat.json ./
COPY packages/ ./packages/
COPY libs/ ./libs/

# Copy service files
COPY services/baseline-svc/ ./services/baseline-svc/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the service
RUN pnpm turbo build --filter="@aivo/baseline-svc"

# Prune dev dependencies
RUN pnpm prune --prod

# Stage 2: Runner
FROM node:20-alpine AS runner

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs &&     adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/services/baseline-svc/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/services/baseline-svc/package.json ./

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Switch to non-root user
USER nodejs

# Use dumb-init as entrypoint
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

CMD ["node", "dist/main.js"]
