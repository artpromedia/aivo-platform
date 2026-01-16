# ══════════════════════════════════════════════════════════════════════════════
# AIVO Event Collector Service - Dockerfile
# ══════════════════════════════════════════════════════════════════════════════

# Build stage
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json tsconfig.compat.json ./

# Copy service and dependencies
COPY services/event-collector-svc ./services/event-collector-svc
COPY libs/ts-data-access ./libs/ts-data-access
COPY libs/events ./libs/events

# Install pnpm and dependencies
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

# Generate Prisma client
WORKDIR /app/services/event-collector-svc
RUN npx prisma generate

# Build the service
RUN pnpm build

# Production stage
FROM node:20-alpine AS production

RUN apk add --no-cache openssl dumb-init

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/services/event-collector-svc/dist ./dist
COPY --from=builder /app/services/event-collector-svc/package.json ./
COPY --from=builder /app/services/event-collector-svc/prisma ./prisma
COPY --from=builder /app/services/event-collector-svc/node_modules ./node_modules

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

ENV NODE_ENV=production
ENV PORT=4060

EXPOSE 4060

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4060/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
