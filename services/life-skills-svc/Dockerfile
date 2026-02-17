# Life Skills Service Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY packages/ts-api-utils ./packages/ts-api-utils

# Copy service files
COPY services/life-skills-svc ./services/life-skills-svc

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client and build
WORKDIR /app/services/life-skills-svc
RUN pnpm run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy built files
COPY --from=builder /app/services/life-skills-svc/dist ./dist
COPY --from=builder /app/services/life-skills-svc/generated ./generated
COPY --from=builder /app/services/life-skills-svc/package.json ./
COPY --from=builder /app/services/life-skills-svc/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production
EXPOSE 4050

CMD ["node", "dist/index.js"]
