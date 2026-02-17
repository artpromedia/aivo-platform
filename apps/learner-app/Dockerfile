# ==============================================================================
# AIVO Platform - Learner App Dockerfile
# ==============================================================================
# Multi-stage build for Next.js applications

# Stage 1: Dependencies
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Copy workspace configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/ ./packages/
COPY libs/ ./libs/
COPY apps/learner-app/ ./apps/learner-app/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

COPY --from=deps /app ./

# Build arguments for environment
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_VERSION

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application
RUN pnpm turbo build --filter="@aivo/learner-app"

# Stage 3: Runner
FROM node:22-alpine AS runner
WORKDIR /app

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3003

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/apps/learner-app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/learner-app/.next/static ./apps/learner-app/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/learner-app/public ./apps/learner-app/public

USER nextjs

EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3003/api/health || exit 1

CMD ["node", "apps/learner-app/server.js"]
