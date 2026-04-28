# ── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# ── Stage 2: dev ─────────────────────────────────────────────────────────────
# docker compose bind-mounts ./web → /app.
# node_modules live in a named volume at /app/node_modules.
# entrypoint.sh installs deps into that volume on first start if it's empty.
# It lives at /usr/local/bin/sc-entrypoint (avoids name clash with node base).
FROM node:20-alpine AS dev
WORKDIR /app

COPY package.json package-lock.json* ./

COPY entrypoint.sh /usr/local/bin/sc-entrypoint
RUN chmod +x /usr/local/bin/sc-entrypoint

ENV NODE_ENV=development
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/sc-entrypoint"]
CMD ["npm", "run", "dev"]

# ── Stage 3: builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npm run build

# ── Stage 4: runner (production) ─────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
