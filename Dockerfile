# ==========================================
# Multi-stage Dockerfile for Discipl Workspace
# ==========================================

# 1. Build Client Frontend
FROM node:20-bookworm-slim AS client-builder
WORKDIR /app

COPY client/package*.json ./client/
RUN npm ci --prefix client

COPY client/ ./client/
RUN npm run build --prefix client

# 2. Production Runtime
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production server dependencies
COPY server/package*.json ./server/
RUN npm ci --prefix server --omit=dev

# Copy server application
COPY server/ ./server/

# Copy built frontend from builder stage
COPY --from=client-builder /app/client/dist ./client/dist

# Persistent directory for SQLite database
RUN mkdir -p /app/data
ENV DB_PATH=/app/data/taskmanager.db

VOLUME ["/app/data"]
EXPOSE 5000

CMD ["node", "server/index.js"]
