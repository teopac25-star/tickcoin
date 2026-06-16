This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Host as Tor Onion Service

Run the following command to install Tor, configure a local hidden service, build the app, and launch it on your machine:

```bash
npm run host:onion
```

After setup, the script prints your `.onion` address. Open it in Tor Browser to access the app privately.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Free live deployment to the web

This repository is ready for free public deployment.

### Render (free tier)

Render can deploy this app directly using the existing `render.yaml` configuration.

- Connect this GitHub repo to Render.
- Create a new Web Service from the repo.
- Render will use `buildCommand: npm run build` and `startCommand: npm start`.
- The free plan is already configured in `render.yaml`.

### Vercel (free tier)

Vercel also supports this Next.js app automatically.

- Connect this GitHub repo to Vercel.
- The app will build and deploy on each push.
- `vercel.json` is included to ensure the Next.js project is recognized.

[![Deploy on Vercel](https://vercel.com/button)](https://vercel.com/new/project?template=https://github.com/teopac25-star/tickcoin)

### Automatic deployment from GitHub Actions

The repo includes a GitHub workflow that builds the app and publishes a Docker image on pushes to `main` or `master`.

To enable automatic public deployment through the workflow, add these GitHub repository secrets:

- `RENDER_API_KEY`
- `RENDER_SERVICE_ID`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

When these secrets are configured, the workflow will optionally trigger Render or Vercel deploys after a successful build.

### Docker local preview

To run locally in production mode:

```bash
npm run build
npm start
```

Then open:

```bash
http://localhost:3000
```

### Tor Onion Service

Use the included `full_setup.sh` to install Tor, configure a hidden service, build the app, and start it. Run:

```bash
npm run host:onion
```

If you want, I can add CI to automatically build and push images, or create Vercel/Render deployment pipelines. Tell me which to prioritize.

## Verification Automation

A GitHub Actions workflow now runs automatically on `push` and `pull_request` events.

It performs:
- `npm ci`
- `npm run lint`
- `npm run build`

This gives you automated verification for app/website changes before they land in the main branch.

> Manual review is still recommended: review pull requests and approve code changes before merging.

## CI: Build & Publish Docker Image

A GitHub Actions workflow is included to build the app and publish a Docker image to GitHub Container Registry (`ghcr.io`). To enable automatic publishing, ensure the repository has appropriate permissions or set a Personal Access Token in `GITHUB_TOKEN` with `packages:write` scope.

Secrets you may set for optional deployments:
- `RENDER_API_KEY` — to trigger Render deploys via API.
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` — to trigger Vercel deployments.

The project includes `.env.example` so you can safely copy the template and store only production values in `.env`.

