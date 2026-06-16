#!/usr/bin/env bash
set -euo pipefail

# This script builds the app and triggers optional free deployments to Render and Vercel.
# Usage:
#   RENDER_API_KEY=... RENDER_SERVICE_ID=... VERCEL_TOKEN=... ./deploy-free.sh

if [[ -n "${CI:-}" ]]; then
  echo "Warning: running in CI mode. This script is best run locally with proper credentials."
fi

echo "Installing dependencies..."
npm ci

echo "Building production app..."
npm run build

if [[ -n "${RENDER_API_KEY:-}" && -n "${RENDER_SERVICE_ID:-}" ]]; then
  echo "Triggering Render deployment..."
  curl -X POST "https://api.render.com/deploy/srv-${RENDER_SERVICE_ID}" \
    -H "Accept: application/json" \
    -H "Authorization: Bearer ${RENDER_API_KEY}" \
    -o /tmp/render-deploy.json
  echo "Render deploy request sent. See /tmp/render-deploy.json for response."
else
  echo "Skipping Render deploy: RENDER_API_KEY and/or RENDER_SERVICE_ID not set."
fi

if [[ -n "${VERCEL_TOKEN:-}" ]]; then
  echo "Deploying to Vercel..."
  npx vercel --prod --token "${VERCEL_TOKEN}" --confirm
  echo "Vercel deployment completed."
else
  echo "Skipping Vercel deploy: VERCEL_TOKEN not set."
fi

echo "Done."
