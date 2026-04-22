# ── Stage 1: Build the frontend ──────────────────────────────────────────────
FROM node:20-slim AS frontend-builder

WORKDIR /app/shot-app
COPY shot-app/package.json shot-app/package-lock.json ./
RUN npm ci
COPY shot-app ./
RUN npm run build

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:20-slim

# System dependencies required by Playwright's Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxcb1 \
    libxkbcommon0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libatspi2.0-0 \
    fonts-liberation \
    fonts-noto-color-emoji \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install backend dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Install Playwright's Chromium browser
RUN npx playwright install chromium

# Copy backend
COPY backend.mjs ./

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/shot-app/dist ./shot-app/dist

# Sessions directory for scan results
RUN mkdir -p sessions

# Hugging Face Spaces uses port 7860
ENV PORT=7860
ENV NODE_ENV=production

EXPOSE 7860

CMD ["node", "backend.mjs"]
