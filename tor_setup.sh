#!/bin/bash
set -euo pipefail

HIDDEN_DIR="/var/lib/tor/ionut_hidden_service"
TORRC="/etc/tor/torrc"
PORT=3004

if [[ $EUID -ne 0 ]]; then
  echo "Please run this script with sudo or as root: sudo $0"
  exit 1
fi

if ! command -v tor >/dev/null 2>&1; then
  echo "Installing Tor..."
  apt update
  apt install -y tor
fi

mkdir -p "$HIDDEN_DIR"
chown debian-tor:debian-tor "$HIDDEN_DIR" 2>/dev/null || true
chmod 700 "$HIDDEN_DIR"

if ! grep -q "HiddenServiceDir $HIDDEN_DIR" "$TORRC" 2>/dev/null; then
  cp -n "$TORRC" "${TORRC}.backup" 2>/dev/null || true
  cat <<TORCFG >> "$TORRC"

# Ionut hidden service
HiddenServiceDir $HIDDEN_DIR
HiddenServicePort 80 127.0.0.1:$PORT
TORCFG
fi

if command -v systemctl >/dev/null 2>&1; then
  systemctl enable tor
  systemctl restart tor
else
  tor -f "$TORRC" &
fi

sleep 8

echo "Tor hidden service is configured to forward http://$PORT to .onion."
if [[ -f "$HIDDEN_DIR/hostname" ]]; then
  echo "Your .onion address is: http://$(cat "$HIDDEN_DIR/hostname")"
else
  echo "hostname file not found. Check Tor logs." >&2
fi
