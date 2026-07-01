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

## Which host for what (you have Cloudflare, Vercel, and Fly.io)
- **The Hit Factory front end** (this app) is **static** → cheapest + simplest on
  **Cloudflare Pages** or **Vercel**. Don't put it on Fly.io — a container is overkill
  for static files.
- **Fly.io is for the *server* workloads** that come later, where it genuinely shines
  (Docker containers, always-on, real CPU): the **video studio** render pipeline
  (ffmpeg + headless Chromium), a future **real-AI / audio** backend, the **WIFI DJ
  radio** stream, and per-agent compute. Keep those off the static host and on Fly.io.
- **Cloudflare** stays the front door: the domain, DNS, the WIFI-DJ landing, the CDN,
  and (later) a Worker/API in front of the Fly.io services.

Rule of thumb: **static + edge → Cloudflare/Vercel; anything with a server, ffmpeg, or
a model → Fly.io.**

## Cloudflare build gotcha (important — this is why the first build failed)
The repo's default `npm run build` is the **video pipeline** (ffmpeg/Chromium) and will
fail on a web host. The web build command is **`npm run web:build`** (with
`STATIC_EXPORT=1` for a static export). Set that explicitly in the project settings —
don't let it auto-run `npm run build`.

### If you're using Cloudflare **Workers** (Git integration)
The repo ships a `wrangler.jsonc` (assets-only Worker serving `./out`). In the Workers
project **Settings → Build**:
- **Build command:** `STATIC_EXPORT=1 npm run web:build`
- **Deploy command:** `npx wrangler deploy`
- **Environment variable:** `NODE_VERSION` = `22`

### Simpler: Cloudflare **Pages** (recommended for a static site)
Create a **Pages** project instead of Workers (Pages is purpose-built for static
output): build command `npm run web:build`, output dir `out`, env `STATIC_EXPORT=1` +
`NODE_VERSION=22`. No `wrangler.jsonc` needed.

## Notes
- The Node/ffmpeg **video studio** (`bin/hermes`, `studio/*`) is not part of the web
  build — it never runs on the host; only `next build` does.
- Local dev and Vercel are unaffected by `STATIC_EXPORT` (it's off unless set).
- No API keys, no server — $0 to host on a free plan either way.
