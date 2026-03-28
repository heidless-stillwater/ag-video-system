# Multi-stage build for Cloud Run Render Worker
FROM node:20-bookworm AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npx tsc

# Production stage - using full Bookworm for complete FFmpeg features (libass, etc)
FROM node:20-bookworm

WORKDIR /app

# Install FFmpeg with full support + fonts for subtitles
RUN apt-get update && apt-get install -y ffmpeg fonts-liberation2 curl python3 build-essential && \
    rm -rf /var/lib/apt/lists/* && apt-get clean

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

# Avoid running as root
USER node

ENV PORT=8080
ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
