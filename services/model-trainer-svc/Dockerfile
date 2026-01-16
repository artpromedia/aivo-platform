FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY services/model-trainer-svc ./services/model-trainer-svc
RUN corepack enable && corepack prepare pnpm@latest --activate && pnpm install --frozen-lockfile
WORKDIR /app/services/model-trainer-svc
RUN npx prisma generate && pnpm build

FROM node:20-alpine AS production
RUN apk add --no-cache openssl dumb-init && addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
WORKDIR /app
COPY --from=builder /app/services/model-trainer-svc/dist ./dist
COPY --from=builder /app/services/model-trainer-svc/package.json ./
COPY --from=builder /app/services/model-trainer-svc/prisma ./prisma
COPY --from=builder /app/services/model-trainer-svc/node_modules ./node_modules
RUN chown -R nodejs:nodejs /app
USER nodejs
ENV NODE_ENV=production PORT=4073
EXPOSE 4073
HEALTHCHECK --interval=30s --timeout=10s CMD wget --spider http://localhost:4073/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
