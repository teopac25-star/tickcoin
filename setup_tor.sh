#!/bin/bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=3004
HIDDEN_DIR="/var/lib/tor/ionut_hidden_service"
TORRC="/etc/tor/torrc"

if [[ $EUID -ne 0 ]]; then
  echo "Please run this script with sudo or as root: sudo $0"
  exit 1
fi

cd "$APP_DIR"

if ! command -v tor >/dev/null 2>&1; then
  echo "Installing Tor..."
  apt update
  apt install -y tor
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm not found. Install Node.js and npm before running this script."
  exit 1
fi

if [[ ! -d "node_modules" ]]; then
  npm install
fi

mkdir -p "$HIDDEN_DIR"
chown debian-tor:debian-tor "$HIDDEN_DIR" 2>/dev/null || true
chmod 700 "$HIDDEN_DIR"

if ! grep -q "HiddenServiceDir $HIDDEN_DIR" "$TORRC" 2>/dev/null; then
  echo "Configuring Tor hidden service..."
  cp -n "$TORRC" "${TORRC}.backup" 2>/dev/null || true
  cat <<TORCFG >> "$TORRC"

# Ionut hidden service
HiddenServiceDir $HIDDEN_DIR
HiddenServicePort 80 127.0.0.1:$PORT
TORCFG
fi

echo "Starting Tor service..."
if command -v systemctl >/dev/null 2>&1; then
  systemctl enable tor
  systemctl restart tor
else
  tor -f "$TORRC" &
fi

sleep 8

if [[ -f "$HIDDEN_DIR/hostname" ]]; then
  echo "Your .onion address is: http://$(cat "$HIDDEN_DIR/hostname")"
else
  echo "Could not read Tor hidden service hostname. Check /var/lib/tor/ionut_hidden_service and Tor logs." >&2
fi

echo "Starting Next.js production server on port $PORT..."
PORT=$PORT npm start &

sleep 5

echo "Local site: http://localhost:$PORT"
