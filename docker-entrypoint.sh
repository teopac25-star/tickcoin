#!/bin/bash
set -euo pipefail

# TickCoin Docker Entrypoint
# Starts Next.js app and Tor hidden service inside container

echo "🚀 Starting TickCoin in Docker..."

# Create necessary directories
mkdir -p tor_data tor_hidden_service

# Install Tor if not present
if ! command -v tor >/dev/null 2>&1; then
  echo "📦 Installing Tor..."
  apt-get update >/dev/null 2>&1
  apt-get install -y tor >/dev/null 2>&1
fi

# Install Node dependencies
if [[ ! -d "node_modules" ]]; then
  echo "📦 Installing Node.js dependencies..."
  npm ci
fi

# Build the app
echo "🔨 Building Next.js app..."
npm run build

# Start Tor in background
if [[ -f "torrc.local" ]]; then
  echo "🧅 Starting Tor hidden service..."
  tor -f torrc.local >"tor.log" 2>&1 &
  TOR_PID=$!
  
  # Wait for Tor to bootstrap
  sleep 10
  
  if [[ -f "tor_hidden_service/hostname" ]]; then
    ONION=$(cat tor_hidden_service/hostname)
    echo "✅ Tor ready: http://$ONION"
  fi
fi

# Start Next.js app
echo "🚀 Starting Next.js server (port ${PORT:-3000})..."
exec npm start
