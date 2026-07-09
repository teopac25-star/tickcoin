# TickCoin Deployment Guide

## Quick Start

### Local Development
```bash
npm run dev
```

### Local Production with Tor Hidden Service
```bash
./run.sh
```

This will:
- Install dependencies
- Build the Next.js app
- Start Tor hidden service
- Start the server on port 3000
- Display the .onion address for Tor Browser access

### Without Tor
```bash
./run.sh --no-tor
```

---

## Production Deployment Options

### Option 1: Systemd Service (Linux)

**1. Edit the service file with your app path:**
```bash
sudo sed -i 's|/path/to/tickcoin|/actual/path/to/tickcoin|g' tickcoin.service
```

**2. Install the service:**
```bash
sudo cp tickcoin.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable tickcoin
sudo systemctl start tickcoin
```

**3. Monitor the service:**
```bash
sudo systemctl status tickcoin
sudo journalctl -u tickcoin -f  # Follow logs
```

---

### Option 2: Docker (Recommended)

**1. Build the image:**
```bash
docker build -t tickcoin:latest .
```

**2. Run the container:**
```bash
docker run -d \
  --name tickcoin \
  -p 3000:3000 \
  -v tickcoin-tor:/app/tor_data \
  -v tickcoin-onion:/app/tor_hidden_service \
  tickcoin:latest
```

**3. Check the .onion address:**
```bash
docker exec tickcoin cat tor_hidden_service/hostname
```

**4. View logs:**
```bash
docker logs -f tickcoin
```

---

### Option 3: Docker Compose

Create a `docker-compose.yml`:
```yaml
version: '3.8'

services:
  tickcoin:
    build: .
    container_name: tickcoin
    ports:
      - "3000:3000"
    volumes:
      - tickcoin-tor:/app/tor_data
      - tickcoin-onion:/app/tor_hidden_service
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3000

volumes:
  tickcoin-tor:
  tickcoin-onion:
```

Then run:
```bash
docker-compose up -d
```

---

### Option 4: Vercel (Clearnet Only, no Tor)

**Already deployed!** See PR #4 for the upgrade.

**Live URL:** https://agents-app-website-performance-review-ikob05gbj.vercel.app

---

## Monitoring

### Check if services are running:
```bash
# Check Next.js app
curl http://localhost:3000

# Check API endpoint
curl http://localhost:3000/api/hidden-service | jq .

# Check Tor logs (if running with ./run.sh)
tail -f tor.log
```

### Get the .onion address:
```bash
cat tor_hidden_service/hostname
```

---

## Environment Variables

- `PORT` — Port to run the app (default: 3000)
- `NODE_ENV` — Set to `production` for production builds
- `TOR_HIDDEN_SERVICE_HOSTNAME` — (Optional) Override .onion hostname from env var

---

## Troubleshooting

### Tor not bootstrapping
- Check `tor.log` for errors
- Ensure you have internet connectivity
- Try waiting longer (can take 30+ seconds on slow networks)

### Port already in use
```bash
# Kill process on port 3000
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### .onion address not accessible
- Ensure Tor Browser is updated and configured for local onion services
- Check that the app is running on localhost:3000
- Look for errors in `tor.log`

---

## File Manifest

- `run.sh` — Main production startup script (Tor + Next.js)
- `tickcoin.service` — Systemd service file
- `docker-entrypoint.sh` — Docker container startup script
- `Dockerfile` — Multi-stage Docker build with Tor support
- `torrc.local` — Tor hidden service configuration

---

## Security Notes

- Always run behind a reverse proxy (nginx/caddy) in production for clearnet access
- Use `.onion` addresses for true anonymity via Tor Browser
- Keep Tor, Node.js, and dependencies updated
- Store secrets in environment variables, never in code

---

## More Information

- **Tor Project:** https://www.torproject.org
- **Next.js Docs:** https://nextjs.org/docs
- **Hidden Services Guide:** https://support.torproject.org/onion-services/
