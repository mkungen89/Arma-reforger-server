FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install backend deps (production only)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy backend source
COPY backend ./backend

FROM node:20-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

# Optional but useful (system update endpoints use git; also enables better error messages)
RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend ./backend

EXPOSE 3001

CMD ["node", "backend/server.js"]


