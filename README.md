# Bun + TanStack Start + Convex

## Setup (local dev)
1. `bun i`
2. `bunx convex dev` — follow prompts, auto-creates `.env.local` with dev URL
3. Add to `.env.local`:
   ```env
   VITE_APP_TITLE=My App
   CF_WORKER_NAME=my-app
   ```
4. `bun run dev` → http://localhost:3333

## Deploy (production)
1. `bun run cf:login` — one-time Cloudflare auth
2. `bunx convex deploy` — push backend to Convex production
3. `bun run deploy` — build + push frontend to Cloudflare
4. In [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers → your app → Settings → Variables:
   - `VITE_CONVEX_URL` = **production** Convex URL (from step 2, different from dev)
   - `VITE_APP_TITLE` = your app title

## shadcn
```bash
bunx --bun shadcn@latest add button
```
