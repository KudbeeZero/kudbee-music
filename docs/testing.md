# Get a public testing URL for the Hit Factory

The Hit Factory is a **Next.js web app** (`app/hermes`). It runs fully local with
no API key, so you can test it three ways — pick by how much setup you want.

> Note: a public URL can't be tunneled out of the Claude Code sandbox (its egress
> gateway is allowlist-only by design). Use one of these instead — all give you a
> real URL you can open on any device.

## 1. Vercel — best for a shareable URL (zero local setup)
The app is Vercel-ready (`vercel.json` points the build at `next build`).

- **One click:** import `KudbeeZero/kudbee-music` at <https://vercel.com/new> → Deploy.
  You get a permanent `https://<project>.vercel.app` URL; open `/hermes`.
- **Or CLI:**
  ```bash
  npm i -g vercel
  vercel            # from the repo root — follow the prompts
  vercel --prod     # promote to the production URL
  ```
Every push to `main` redeploys automatically.

## 2. GitHub Codespaces — instant forwarded URL, nothing installed locally
1. On the repo: **Code → Codespaces → Create codespace on main**.
2. In the Codespace terminal: `npm install && npm run web:dev`.
3. Codespaces auto-forwards port 3000 — open the **Ports** tab, set the port to
   **Public**, and use the forwarded URL (`…app.github.dev`). Open `/hermes`.

## 3. Your machine + a quick tunnel
Run the app locally, then expose it (this works from your own machine, which has
open outbound — unlike the sandbox):
```bash
git clone https://github.com/KudbeeZero/kudbee-music && cd kudbee-music
npm install
npm run web:dev                       # http://localhost:3000/hermes

# in a second terminal, pick one:
npx cloudflared tunnel --url http://localhost:3000     # -> https://<random>.trycloudflare.com
# or
npx localtunnel --port 3000                            # -> https://<random>.loca.lt
```
`scripts/expose.sh` does the run-and-tunnel in one step (see the script header).

---
**Recommended:** Vercel (#1) for a stable link you can revisit and share; Codespaces
(#2) if you don't want to install anything.
