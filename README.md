# Bun + TanStack Start + Convex

## Environment variables

### Server
- No required runtime server-only variables for local dev.
- In production, prefer setting server variables in your platform/CI (Cloudflare/Wrangler/CI secrets) rather than committing any `.env*` files.

### Client
- `VITE_CONVEX_URL` — Convex deployment URL (dev vs prod)
- `VITE_APP_TITLE` — app title

For local builds:
- Dev uses `.env.local`
- Prod build uses `.env.production.local` (Vite loads this when running `vite build --mode production`)

### Tooling
- `CONVEX_DEPLOYMENT` — used by the Convex CLI (typically written by `bunx convex dev`)
- `CF_WORKER_NAME` — used by `wrangler deploy --name ...` when deploying from your machine

If you deploy from CI, `CF_WORKER_NAME` can be set in CI instead of `.env.local`.

## Setup (local dev)
1. `bun i`
2. `cp .env.example .env.local`
3. `bunx convex dev` — follow prompts (writes `CONVEX_DEPLOYMENT` + `VITE_CONVEX_URL` into `.env.local`)
4. Set in `.env.local`: `VITE_APP_TITLE`, `CF_WORKER_NAME`
5. `bun run dev` → http://localhost:3333

## Deploy (production)
1. `bun run cf:login` — one-time Cloudflare auth
2. `bunx convex deploy` — push backend to Convex production (prints the prod `VITE_CONVEX_URL`)
3. `cp .env.example .env.production.local` and set `VITE_CONVEX_URL` to the prod URL
4. `bun run deploy` — build (prod mode reads `.env.production.local`) + push to Cloudflare (uses `CF_WORKER_NAME` from `.env.local`)

## shadcn
```bash
bunx --bun shadcn@latest add button
```
