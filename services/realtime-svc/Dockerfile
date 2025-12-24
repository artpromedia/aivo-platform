# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

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
RUN pnpm install --frozen-lockfile

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

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# Add non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built files
COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=builder /app/services/realtime-svc/package.json ./services/realtime-svc/
COPY --from=builder /app/services/realtime-svc/dist ./services/realtime-svc/dist/
COPY --from=builder /app/libs/ts-observability/package.json ./libs/ts-observability/
COPY --from=builder /app/libs/ts-observability/dist ./libs/ts-observability/dist/
COPY --from=builder /app/libs/ts-types/package.json ./libs/ts-types/
COPY --from=builder /app/libs/ts-types/dist ./libs/ts-types/dist/
COPY --from=builder /app/libs/ts-utils/package.json ./libs/ts-utils/
COPY --from=builder /app/libs/ts-utils/dist ./libs/ts-utils/dist/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start the service
CMD ["node", "services/realtime-svc/dist/index.js"]
