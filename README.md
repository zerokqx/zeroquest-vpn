# VPN Shop

VPN storefront and customer dashboard on Next.js 16, React 19, Prisma, Mantine and `3x-ui`.

The project was originally written with AI assistance and is now maintained as a server-first App Router application with small client islands for forms, drawers, toggles and mutation buttons.

## What The App Does

- shows public VPN plans on the landing page
- supports login and registration with JWT cookie auth
- issues VPN access through `3x-ui`
- stores encrypted domain payloads in PostgreSQL via Prisma
- gives customers a dashboard with access links, traffic usage and device lifecycle
- provides an admin panel for plans and promo codes

## Architecture

- `src/app` contains App Router pages and route handlers
- `src/entities` contains domain repositories and server-side read/write primitives
- `src/features` contains user actions such as auth and plan claiming
- `src/widgets` contains page-level UI
- pages are server-rendered by default
- mutations from the UI should prefer Server Actions over internal `fetch('/api/...')` calls
- API routes remain available for external or transport-specific use cases

## Quick Start

1. Install dependencies.

```bash
bun install
```

2. Create a local env file.

```bash
cp .env.example .env.local
```

3. Start PostgreSQL and initialize the database.

```bash
npm run db:setup
```

4. Start development server.

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment

The main variables are listed in `.env.example`.

- auth: `AUTH_COOKIE_NAME`, `AUTH_JWT_SECRET`, `AUTH_JWT_EXPIRES_IN`
- database: `DATABASE_URL`, `APP_DATA_ENCRYPTION_KEY`
- bootstrap admin: `ADMIN_DEFAULT_LOGIN`
- `3x-ui`: host, credentials, web base path, inbound ids, plan defaults

Replace all example secrets before any real deployment.

## Scripts

- `npm run dev` starts Next.js in development mode
- `npm run build` builds production assets
- `npm run start` starts the production server
- `npm run lint` runs ESLint
- `npm run test` runs Vitest
- `npm run db:generate` generates Prisma client artifacts
- `npm run db:push` initializes schema via the project scripts
- `npm run db:seed` seeds demo data
- `npm run db:setup` starts PostgreSQL, initializes schema and seeds data
- `npm run docker:up` starts the app and database in Docker

## API Surface

Core endpoints:

- `GET /api/plans`
- `POST /api/access/claim`
- `DELETE /api/access/:accessId`
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/admin/plans`
- `GET /api/admin/promo-codes`
- `ALL /api/3x-ui/proxy/*`

Example:

```bash
curl http://localhost:3000/api/plans

curl -X POST http://localhost:3000/api/access/claim \
  -H 'Content-Type: application/json' \
  -d '{"planId":"free-10gb-month","deviceName":"Murad iPhone"}'
```

## Notes

- The dashboard and auth flows were refactored toward SSR plus small client islands.
- `3x-ui` admin session state is still runtime-scoped and should be treated as an operational limitation.
- Before changing framework-level behavior, read the local Next.js docs in `node_modules/next/dist/docs/`.
