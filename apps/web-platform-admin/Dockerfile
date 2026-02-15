# ==============================================================================
# AIVO Platform - Web Platform Admin Dockerfile
# ==============================================================================
# Multi-stage build for Next.js applications

# Stage 1: Dependencies
FROM node:20.19.4-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Copy workspace configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json tsconfig.compat.json ./
COPY packages/ ./packages/
COPY libs/ ./libs/
COPY apps/web-platform-admin/ ./apps/web-platform-admin/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:20.19.4-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

COPY --from=deps /app ./

# Build arguments for environment
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_VERSION

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application
RUN pnpm turbo build --filter="@aivo/web-platform-admin"

# Stage 3: Runner
FROM node:20.19.4-alpine AS runner
WORKDIR /app

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3006

# Copy built application
COPY --from=builder /app/apps/web-platform-admin/public ./apps/web-platform-admin/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web-platform-admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web-platform-admin/.next/static ./apps/web-platform-admin/.next/static

USER nextjs

EXPOSE 3006

ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web-platform-admin/server.js"]
