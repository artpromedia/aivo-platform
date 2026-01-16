# AIVO Residency Service Dockerfile
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY services/residency-svc ./services/residency-svc
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile
WORKDIR /app/services/residency-svc
RUN npx prisma generate && pnpm build

FROM node:20-alpine AS production
RUN apk add --no-cache openssl dumb-init
WORKDIR /app
COPY --from=builder /app/services/residency-svc/dist ./dist
COPY --from=builder /app/services/residency-svc/package.json ./
COPY --from=builder /app/services/residency-svc/prisma ./prisma
COPY --from=builder /app/services/residency-svc/node_modules ./node_modules
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 && chown -R nodejs:nodejs /app
USER nodejs
ENV NODE_ENV=production PORT=4072
EXPOSE 4072
HEALTHCHECK --interval=30s --timeout=10s CMD wget --spider http://localhost:4072/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
