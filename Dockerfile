# Multi-stage Dockerfile for Next.js production with Tor hidden service
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund --prefer-offline

FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Install Tor for hidden service support
RUN apk add --no-cache tor

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/torrc.local ./
COPY package.json ./
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Create directories for Tor
RUN mkdir -p tor_data tor_hidden_service

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
