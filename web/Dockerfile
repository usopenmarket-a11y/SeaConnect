# ── Stage 1: deps ────────────────────────────────────────────────────────────
# Installs node_modules into a separate cached layer.
# Rebuilt only when package.json / package-lock.json change.
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# ── Stage 2: dev ─────────────────────────────────────────────────────────────
# Target used by docker compose for local development.
# Source is bind-mounted from the host; node_modules live in a named volume
# that is seeded from this image on first `docker compose up --build`.
FROM node:20-alpine AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* next.config.mjs tsconfig.json tailwind.config.ts postcss.config.js ./
COPY public ./public
COPY . .
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ── Stage 3: builder ─────────────────────────────────────────────────────────
# Produces the optimised Next.js standalone output for production / UAT.
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
