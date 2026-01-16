# ══════════════════════════════════════════════════════════════════════════════
# AIVO Legal Hold Service - Dockerfile
# ══════════════════════════════════════════════════════════════════════════════

FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json tsconfig.compat.json ./

COPY services/legal-hold-svc ./services/legal-hold-svc
COPY libs/ts-data-access ./libs/ts-data-access
COPY libs/events ./libs/events

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

WORKDIR /app/services/legal-hold-svc
RUN npx prisma generate
RUN pnpm build

FROM node:20-alpine AS production

RUN apk add --no-cache openssl dumb-init

WORKDIR /app

COPY --from=builder /app/services/legal-hold-svc/dist ./dist
COPY --from=builder /app/services/legal-hold-svc/package.json ./
COPY --from=builder /app/services/legal-hold-svc/prisma ./prisma
COPY --from=builder /app/services/legal-hold-svc/node_modules ./node_modules

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

ENV NODE_ENV=production
ENV PORT=4061

EXPOSE 4061

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4061/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
