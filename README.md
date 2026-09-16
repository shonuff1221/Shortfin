# Shortfin

Managed perp-grid trading on Hyperliquid — **your keys, our edge.** This repo is the
Shortfin desk UI (Next.js). The trading brain (FastAPI "brain API") runs on the
operator's infrastructure and is consumed same-origin via rewrites.

## Deploy targets

| Target | Base path | Notes |
|---|---|---|
| Gateway (nginx subpath) | `/platform` | Build with `NEXT_PUBLIC_BASE_PATH=/platform` |
| Vercel (root domain) | `/` | No env needed for the path; set `API_ORIGIN` (below) |

## Environment

| Variable | Scope | Default | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_BASE_PATH` | build+client | _(empty)_ | Subpath when served behind a proxy (gateway deploys use `/platform`) |
| `API_ORIGIN` | build/server | `http://127.0.0.1:8890` | Origin the Next rewrites proxy `/api/*` to (the brain API). On Vercel point this at the public brain-API route. |
| `NEXT_PUBLIC_API_URL` | build+client | _(same-origin)_ | Escape hatch: direct absolute API base for local dev |

The desk is token-gated: the admin/operator token is entered once in the UI and kept in
localStorage (`shortfin.desk.token`). Tokens live server-side only — never in this repo.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000 (expects the brain API on 127.0.0.1:8890)
npm run build      # plain build — do NOT prefix NODE_ENV (breaks the export step)
```
