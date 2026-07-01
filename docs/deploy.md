# Deploy the Hit Factory (and wire wifidj.xyz)

The web app is a **Next.js (React)** front end. Every route is **fully static** (no
API routes, no SSR — the vault lives in the browser's localStorage), so it exports to
a plain static site and hosts anywhere. Pick one path.

## Option A — Cloudflare Pages (you're already on Cloudflare)
Connect the `KudbeeZero/kudbee-music` repo as a Pages project with these settings:

| Setting | Value |
|---|---|
| Framework preset | **None** (we set it up manually) |
| Build command | `npm run web:build` |
| Build output directory | `out` |
| Environment variable | **`STATIC_EXPORT` = `1`** |
| `NODE_VERSION` (env var) | `22` |

The `STATIC_EXPORT=1` flag flips the build to a static export (`next.config.mjs`),
emitting the site to `out/`. That's all Cloudflare Pages needs — no adapter, no
serverless, no compatibility flags. Then **Custom domains → add `wifidj.xyz`** (or a
subdomain like `app.wifidj.xyz`); since the domain is already in your Cloudflare
account, the DNS record is created for you. Open `/hermes`.

Every push to `main` redeploys automatically.

## Option B — Vercel (zero config; already set up)
The repo ships `vercel.json`. Import it at <https://vercel.com/new> → Deploy → open
`/hermes`. To put it on your domain, add a **CNAME** in Cloudflare DNS:
`app.wifidj.xyz → cname.vercel-dns.com` (set the record to **DNS only**, grey cloud),
then add `app.wifidj.xyz` as a domain in the Vercel project. Vercel handles Next.js
natively — nothing to configure.

## Recommended split
- **`wifidj.xyz`** (apex) → the **WIFI-DJ landing page** (standard HTML) as its own
  Cloudflare Pages project.
- **`app.wifidj.xyz`** → this app (the Hit Factory), via Option A or B.

That keeps the marketing front door and the studio cleanly separated, both under your
one domain.

## Notes
- The Node/ffmpeg **video studio** (`bin/hermes`, `studio/*`) is not part of the web
  build — it never runs on the host; only `next build` does.
- Local dev and Vercel are unaffected by `STATIC_EXPORT` (it's off unless set).
- No API keys, no server — $0 to host on a free plan either way.
