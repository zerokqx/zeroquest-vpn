<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# VPN Shop Agent Guide

## Context

- `vpn-shop` is a Next.js 16 + React 19 + TypeScript project for selling and managing VPN access.
- The project was originally built with AI assistance. Treat the codebase as AI-accelerated output that still requires human-level validation on every non-trivial change.
- The app uses the App Router, Prisma, encrypted payload storage, Mantine for UI, and `3x-ui` as the upstream VPN control panel.

## Architecture Rules

- Prefer Server Components by default.
- Add `'use client'` only for isolated interactive islands: forms, drawers, toggles, optimistic buttons, animations.
- Prefer Server Actions for mutations triggered from the UI.
- Do not introduce new client-side calls to the app's own API routes if the same flow can be handled by a Server Action.
- Keep route handlers for external integrations, programmatic access, or transport-specific concerns.
- Reuse server services from actions and route handlers instead of duplicating domain logic.

## Rendering Policy

- Pages in `src/app/**/page.tsx` should stay server-first unless browser APIs are strictly required.
- Large widgets should render their static shell on the server and move only the interactive leaf nodes to the client.
- When reading request-time APIs such as `cookies()` or `searchParams`, follow the current Next 16 docs and promise-based page props.
- If a layout or page becomes blocked on user/session data, consider splitting the async part behind `Suspense` instead of pushing the whole surface to the client.

## Data And Domain

- `src/entities/**/server` contains core read/write operations against Prisma or upstream services.
- `src/features/**/server` contains mutation workflows such as login, registration, or access issuing.
- `src/widgets/**/server` is acceptable for UI-specific server actions that orchestrate already existing entity/feature logic.
- Shared auth cookie behavior must go through `src/shared/auth/server/session.ts`.
- Shared environment access must go through `src/shared/config/env.server.ts`.

## Frontend Conventions

- Use `next/link` for internal navigation instead of raw anchor navigation where possible.
- Avoid broad client state containers when the server can compute the view directly.
- Prefer plain derived values over `useMemo` unless a real bottleneck is proven.
- Prefer form semantics and `useActionState` for auth-like workflows.
- Avoid hardcoded colors in UI code. Prefer existing design tokens, CSS variables, Mantine theme values, or `light-dark(...)` so light and dark schemes stay consistent.
- Preserve the current visual language unless the task explicitly asks for a redesign.

## Quality Bar

- Run `npm run lint` and `npm run test` after meaningful changes.
- If you touch auth, billing, promo codes, or access issuance, verify both happy path and failure path behavior.
- Do not trust stale AI-generated docs, comments, or naming without checking the implementation.

## Useful Commands

- `npm run dev`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run db:setup`
- `npm run docker:up`
