#!/bin/bash
set -euo pipefail

# TickCoin Production Server with Tor Hidden Service
# Starts Next.js app on port 3000 with Tor hidden service support
# Usage: ./run.sh [--no-tor]

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=${PORT:-3000}
TORRC_LOCAL="$APP_DIR/torrc.local"
TOR_DATA_DIR="$APP_DIR/tor_data"
TOR_HIDDEN_SERVICE_DIR="$APP_DIR/tor_hidden_service"
PIDFILE_APP="/tmp/tickcoin-app.pid"
PIDFILE_TOR="/tmp/tickcoin-tor.pid"
NO_TOR=${1:-}

echo "═══════════════════════════════════════════════════════════════"
echo "  TickCoin Production Server"
echo "═══════════════════════════════════════════════════════════════"

# Cleanup function
cleanup() {
  echo ""
  echo "Shutting down..."
  [[ -f "$PIDFILE_APP" ]] && kill "$(cat "$PIDFILE_APP")" 2>/dev/null || true
  [[ -f "$PIDFILE_TOR" ]] && kill "$(cat "$PIDFILE_TOR")" 2>/dev/null || true
  exit 0
}

trap cleanup SIGINT SIGTERM

# Check dependencies
if ! command -v npm >/dev/null 2>&1; then
  echo "❌ npm not found. Install Node.js and npm first."
  exit 1
fi

# Install dependencies if needed
if [[ ! -d "$APP_DIR/node_modules" ]]; then
  echo "📦 Installing dependencies..."
  npm ci
fi

# Build the app
echo "🔨 Building Next.js app..."
npm run build

echo ""
echo "✅ Build successful!"

# Start Tor hidden service if not disabled
if [[ -z "$NO_TOR" ]]; then
  if ! command -v tor >/dev/null 2>&1; then
    echo "⚠️  Tor not found. Install it or run with --no-tor flag."
    exit 1
  fi

  echo ""
  echo "🧅 Starting Tor hidden service..."
  
  # Create data directories
  mkdir -p "$TOR_DATA_DIR" "$TOR_HIDDEN_SERVICE_DIR"
  
  # Start Tor in the background
  tor -f "$TORRC_LOCAL" >"$APP_DIR/tor.log" 2>&1 &
  echo $! > "$PIDFILE_TOR"
  
  # Wait for Tor to bootstrap
  echo "⏳ Waiting for Tor to bootstrap (this may take 10-30 seconds)..."
  sleep 2
  
  for i in {1..60}; do
    if [[ -f "$TOR_HIDDEN_SERVICE_DIR/hostname" ]]; then
      ONION_HOST=$(cat "$TOR_HIDDEN_SERVICE_DIR/hostname")
      echo "✅ Tor bootstrapped!"
      echo "   .onion address: http://$ONION_HOST"
      break
    fi
    echo -n "."
    sleep 1
  done
  
  if [[ ! -f "$TOR_HIDDEN_SERVICE_DIR/hostname" ]]; then
    echo ""
    echo "⚠️  Tor hidden service did not initialize. Check tor.log for errors."
    cat "$APP_DIR/tor.log" | tail -20
  fi
fi

# Start Next.js app
echo ""
echo "🚀 Starting Next.js server on port $PORT..."
PORT=$PORT npm start &
echo $! > "$PIDFILE_APP"

sleep 2

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ✅ TickCoin is running!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
if [[ -f "$TOR_HIDDEN_SERVICE_DIR/hostname" ]]; then
  ONION_HOST=$(cat "$TOR_HIDDEN_SERVICE_DIR/hostname")
  echo "  🌐 Web:  http://localhost:$PORT"
  echo "  🧅 Tor:  http://$ONION_HOST"
  echo ""
  echo "  Open the .onion address in Tor Browser for private access."
else
  echo "  🌐 Web:  http://localhost:$PORT"
  echo ""
  echo "  Tor hidden service not available (--no-tor or Tor error)"
fi
echo ""
echo "  Press Ctrl+C to stop."
echo ""
echo "═══════════════════════════════════════════════════════════════"

# Keep running
wait
