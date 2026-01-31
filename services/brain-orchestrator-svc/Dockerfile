# Stage 1: Builder
FROM node:20-alpine AS builder

RUN apk add --no-cache g++ make python3
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.* ./
COPY packages/ ./packages/
COPY libs/ ./libs/
COPY services/brain-orchestrator-svc/ ./services/brain-orchestrator-svc/

RUN pnpm install --frozen-lockfile
RUN pnpm turbo build --filter="@aivo/brain-orchestrator-svc..."
RUN pnpm deploy --filter="@aivo/brain-orchestrator-svc" --prod /deploy

# Stage 2: Runner
FROM node:20-alpine AS runner

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs
RUN apk add --no-cache dumb-init openssl

WORKDIR /app

COPY --from=builder --chown=nodejs:nodejs /deploy/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/services/brain-orchestrator-svc/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/services/brain-orchestrator-svc/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /deploy/package.json ./

ENV NODE_ENV=production PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

USER nodejs
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/index.js"]
