# Accounts — the onboarding / identity layer

The Hit Factory is a fully static, $0, client-only app — no server, no API routes.
The identity layer keeps that promise: **accounts are local-first**. A profile is a
small record in this browser's localStorage (`hermes.profile.v1`), created the
moment you tap **Continue as guest** on the welcome gate. Nothing is sent anywhere.

## What it does

- **Welcome gate** (`components/auth/WelcomeGate.tsx`) — shown when no profile
  exists. New visitors start with a blank Song Lab (no preloaded words); an
  explicit "✨ Load an example brief" button fills the form on request.
- **Local-first profiles** (`lib/hermes/identity.ts`) — guest (optional name),
  dev, or (future) oauth. Sign-out forgets the profile but **never touches the
  vault** — songs, albums, taste, and avoid-words stay on the device.
- **Honesty rule** — OAuth buttons render only when a provider is actually
  configured at build time. Until then the gate says plainly: "Google & GitHub
  sign-in are coming — accounts are local-first today." No dead buttons, no fake
  flows.

## The developer door

**Dev/local builds only — it does not exist on the production deploy.** On a
non-production build (`npm run web:dev`, `NODE_ENV=development`), visit
`/hermes?dev=1` once and a quiet **Developer entry →** link appears at the foot of
the welcome gate (the visit persists `hermes.devDoor.v1` so the door stays open in
that browser). One click signs in a `dev` profile — no typing, for testing; it
shows a small `dev` badge in the header.

On the **production static export** (Cloudflare Pages runs `next build`,
`NODE_ENV=production`) the door is compiled out: `isDevBuild()` is false, so
`isDevEntryAllowed()` returns false and `?dev=1` is inert — even a browser carrying
a stale `hermes.devDoor.v1` flag from a prior dev build cannot reopen it. This
keeps `…pages.dev/hermes?dev=1` from ever being a public backdoor. If you *want*
the door on a specific hosted preview, build that deploy with
`NEXT_PUBLIC_DEV_DOOR=1` (an explicit, per-build opt-in).

## What the founder must provide to light up Google/GitHub

Real OAuth needs a token exchange that a static export cannot do itself (the
client secret must live server-side). To activate the buttons:

1. **Pick where the exchange runs** (the open decision):
   - a hosted auth service (Supabase Auth, Auth0, Clerk — free tiers exist), or
   - Cloudflare Pages Functions beside the static site (a tiny `/auth/callback`
     function holds the secret and finishes the exchange).
2. **Create the OAuth apps** — a Google Cloud OAuth client + a GitHub OAuth app,
   with the redirect URL pointing at the choice above.
3. **Expose client-safe config at build time** — `NEXT_PUBLIC_AUTH_GOOGLE=1` /
   `NEXT_PUBLIC_AUTH_GITHUB=1` (plus the client IDs / auth-service URL as further
   `NEXT_PUBLIC_` vars when the flow is implemented).
4. **Implement `beginOAuth()`** in `lib/hermes/identity.ts` — today it throws a
   clear "not configured" error; that seam is where the redirect to the
   provider's authorize URL goes.

Once configured, the gate renders the provider buttons automatically
(`authProviders()` reads the flags).

## Deferred (Phase 4)

Per-profile vault namespacing (and any cloud-synced vault) is deliberately **not**
in this layer. The vault (`lib/hermes/storage.ts`) is being hardened on another
branch, and today every profile in a browser shares the one local vault — honest
and simple. When accounts become real (OAuth above), the Phase-4 item is scoping
vault keys per profile and offering optional cloud sync.
