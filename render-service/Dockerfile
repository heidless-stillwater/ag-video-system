FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    fonts-noto-cjk \
    fonts-noto-color-emoji \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built artifacts
COPY --from=builder /app/dist ./dist

# Create temp directories for rendering
RUN mkdir -p /tmp/renders && chmod 777 /tmp/renders

# Set environment
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

# Cloud Run health check and main command
CMD ["node", "dist/index.js"]
