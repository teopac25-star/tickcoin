# TickCoin

TickCoin is a Bitcoin-inspired privacy wallet and Tor platform built with Next.js, featuring SHA-256 browser mining simulation and client-side PBKDF2/AES-GCM security.

## What This Project Includes

- Local BIP39 wallet generation and secure browser wallet export.
- A browser-based SHA-256 mining demo with toy proof-of-work block creation.
- Account state stored in browser storage and synchronized across tabs.
- AES-GCM encrypted account backups derived with PBKDF2/SHA-256.
- Tor hidden service discovery and status reporting.
- Anonymous chat and public post feed features.
- A responsive user interface built using Tailwind CSS.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build & Quality

Run the production build and checks:

```bash
npm run build
npm run typecheck
npm run lint
```

Automatically fix lint issues:

```bash
npm run lint:fix
```

## Tor Onion Hosting

To install Tor, configure a local hidden service, and start the app, run:

```bash
npm run host:onion
```

The script prints the generated `.onion` address when the service is available.

## Structure

- `app/` — Next.js pages, layouts, and API routes.
- `lib/` — Server-side helpers and mock database utilities.
- `contracts/` — Smart contract source code.
- `tor_hidden_service/` — Hidden service hostname and key material.

## Notes

- Keep private keys and mnemonics secure.
- Hidden service detection checks environment variables and local Tor service files.
- This project is designed for privacy-minded development and experimentation.
