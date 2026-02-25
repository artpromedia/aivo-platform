# ═══════════════════════════════════════════════════
# compliance-evidence-svc — Multi-stage Dockerfile
# ═══════════════════════════════════════════════════

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# ── Dependencies ──────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

# ── Build ─────────────────────────────────────────
FROM deps AS build
COPY . .
RUN pnpm prisma generate
RUN pnpm build

# ── Production ────────────────────────────────────
FROM base AS production
ENV NODE_ENV=production

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./

# Run Prisma migrations on startup
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3092

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3092/health || exit 1

CMD ["node", "dist/index.js"]
