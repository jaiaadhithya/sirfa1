# Multi-stage build for SIRFA Agent Finance
# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci --only=production

# Copy frontend source code
COPY frontend/ ./

# Build frontend
RUN npm run build

# Stage 2: Setup backend
FROM node:18-alpine AS backend-setup

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./

# Install backend dependencies
RUN npm ci --only=production

# Copy backend source code
COPY backend/ ./

# Stage 3: Final production image
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S sirfa -u 1001

# Copy built frontend from frontend-builder stage
COPY --from=frontend-builder --chown=sirfa:nodejs /app/frontend/dist ./frontend/dist

# Copy backend from backend-setup stage
COPY --from=backend-setup --chown=sirfa:nodejs /app/backend ./backend

# Copy root package.json and other config files
COPY --chown=sirfa:nodejs package*.json ./
COPY --chown=sirfa:nodejs .env.example ./

# Install root dependencies
RUN npm ci --only=production && npm cache clean --force

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV FRONTEND_PORT=3000

# Expose ports
EXPOSE 3001
EXPOSE 3000

# Switch to non-root user
USER sirfa

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node backend/health-check.js || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["npm", "start"]