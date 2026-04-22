FROM node:20

WORKDIR /app

# Install backend dependencies
# postinstall script automatically runs: npx playwright install chromium
# node:20 full image already has libglib2.0-0 and all Chromium system deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Build the frontend
COPY shot-app/package.json shot-app/package-lock.json ./shot-app/
RUN cd shot-app && npm ci
COPY shot-app ./shot-app
RUN cd shot-app && npm run build

# Copy backend
COPY backend.mjs ./

# Sessions storage
RUN mkdir -p sessions

ENV PORT=3001
ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "backend.mjs"]
