FROM node:20

# Explicitly install every system library Chromium headless shell needs.
# This is the definitive list — apt-get runs with full root access during
# Docker build, which is the only reliable way to install these on Railway.
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
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install backend deps — skip postinstall so we control when playwright installs
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Install Playwright Chromium browser now that system libs are confirmed present
RUN npx playwright install chromium

# Build the frontend
COPY shot-app/package.json shot-app/package-lock.json ./shot-app/
RUN cd shot-app && npm ci
COPY shot-app ./shot-app
RUN cd shot-app && npm run build

# Copy backend
COPY backend.mjs ./

RUN mkdir -p sessions

ENV PORT=3001
ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "backend.mjs"]
