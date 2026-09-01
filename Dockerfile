# ==========================================
# Stage 1: Dependency Resolver
# ==========================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ==========================================
# Stage 2: Application Builder
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Run type check and Vite client compilation
RUN npm run lint && npm run build

# Prune devDependencies for a lean production image
RUN npm prune --production

# ==========================================
# Stage 3: Minimal Production Runtime
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create required runtime directories and set ownership to unprivileged 'node' user
RUN mkdir -p /app/data /app/mounted_repos && chown -R node:node /app

COPY --chown=node:node package.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/server.ts ./server.ts
COPY --chown=node:node --from=builder /app/src ./src
COPY --chown=node:node --from=builder /app/tsconfig.json ./tsconfig.json

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["npm", "run", "dev"]
