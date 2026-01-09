# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY tsconfig.base.json ./

# Copy service package.json
COPY services/realtime-svc/package.json ./services/realtime-svc/

# Copy shared libraries
COPY libs/ts-observability/package.json ./libs/ts-observability/
COPY libs/ts-types/package.json ./libs/ts-types/
COPY libs/ts-utils/package.json ./libs/ts-utils/

# Install dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source files
COPY services/realtime-svc ./services/realtime-svc/
COPY libs/ts-observability ./libs/ts-observability/
COPY libs/ts-types ./libs/ts-types/
COPY libs/ts-utils ./libs/ts-utils/

# Build the service
RUN pnpm --filter @aivo/realtime-svc build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm and add non-root user
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built files with read-only permissions
COPY --from=builder --chmod=444 /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=builder --chmod=444 /app/services/realtime-svc/package.json ./services/realtime-svc/
COPY --from=builder --chmod=555 /app/services/realtime-svc/dist ./services/realtime-svc/dist/
COPY --from=builder --chmod=444 /app/libs/ts-observability/package.json ./libs/ts-observability/
COPY --from=builder --chmod=555 /app/libs/ts-observability/dist ./libs/ts-observability/dist/
COPY --from=builder --chmod=444 /app/libs/ts-types/package.json ./libs/ts-types/
COPY --from=builder --chmod=555 /app/libs/ts-types/dist ./libs/ts-types/dist/
COPY --from=builder --chmod=444 /app/libs/ts-utils/package.json ./libs/ts-utils/
COPY --from=builder --chmod=555 /app/libs/ts-utils/dist ./libs/ts-utils/dist/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --ignore-scripts --prod

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start the service
CMD ["node", "services/realtime-svc/dist/index.js"]
