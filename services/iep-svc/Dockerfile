# AIVO IEP Service Dockerfile
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./
COPY services/iep-svc ./services/iep-svc
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile
WORKDIR /app/services/iep-svc
RUN npx prisma generate && pnpm build

FROM node:20-alpine AS production
RUN apk add --no-cache openssl dumb-init
WORKDIR /app
COPY --from=builder /app/services/iep-svc/dist ./dist
COPY --from=builder /app/services/iep-svc/package.json ./
COPY --from=builder /app/services/iep-svc/prisma ./prisma
COPY --from=builder /app/services/iep-svc/node_modules ./node_modules
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 && chown -R nodejs:nodejs /app
USER nodejs
ENV NODE_ENV=production PORT=4070
EXPOSE 4070
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4070/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
