# ==============================================================================
# AIVO Platform - Session Service Dockerfile
# ==============================================================================
# Multi-stage build for NestJS services

# Stage 1: Builder
FROM node:22-alpine AS builder

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
COPY services/session-svc/ ./services/session-svc/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the service
RUN pnpm turbo build --filter="@aivo/session-svc..."

# Create a deployable bundle with all production dependencies
RUN pnpm deploy --filter="@aivo/session-svc" --prod /deploy

# Copy built workspace lib dist into deployed node_modules (pnpm deploy doesn't include build artifacts)
# Must resolve symlinks since pnpm uses symlinked node_modules
RUN cp -rL /app/libs/billing-access/dist /deploy/node_modules/@aivo/billing-access/dist && \
    cp -rL /app/libs/billing-common/dist /deploy/node_modules/@aivo/billing-common/dist && \
    cp -rL /app/libs/ts-rbac/dist /deploy/node_modules/@aivo/ts-rbac/dist

# Stage 2: Runner
FROM node:22-alpine AS runner

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs &&     adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init openssl

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /deploy/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/services/session-svc/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/services/session-svc/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /deploy/package.json ./

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
