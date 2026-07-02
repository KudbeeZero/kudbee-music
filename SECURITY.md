# Security Policy

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Use GitHub's private
vulnerability reporting instead: go to the repo's **Security** tab → **Report a
vulnerability** (or open a draft security advisory). You'll get a response as fast
as a one-maintainer project can manage — usually within a few days.

## Threat model (what HERMES actually is)

HERMES is deliberately boring from a security standpoint:

- **The web app is a fully static export.** No server, no API routes, no database,
  no auth, no network calls at generation time. Everything runs in your browser;
  state lives in `localStorage` on your machine.
- **No secrets at runtime.** The core is $0 and keyless. The only place a key ever
  lives is a gitignored `.env.local` (copied from `.env.example`, whose values are
  empty placeholders), and it is read **only by opt-in local Node scripts** — never
  by the browser, never by CI.
- **CI uses no repository secrets.** Fork PRs run with the standard read-only
  token, and the workflow requests only `contents: read`.
- **`brain/*.json` is data, not an attack surface at runtime.** Nothing in the app
  or studio writes tracked brain files; the only file-writer is the opt-in
  vector-memory store, which writes the gitignored `brain/vector-memory.json`.
  Changing the tracked brain means landing a commit — i.e. passing PR review.

## Rules for future paid providers (Claude lyrics, Runway video)

The roadmap includes opt-in real-AI providers (`claudeLyricsProvider` behind
`ANTHROPIC_API_KEY`, `studio/runway.mjs` behind `RUNWAY_API_KEY`). Non-negotiable
rules when those land:

- **Keys stay server-side / local-side only.** Never shipped to the client bundle,
  never in the static deployment. The mock provider stays the default and must be
  un-bypassable in the hosted static app.
- **No hosted deployment may proxy to a paid API** without all of: a server-side
  proxy that holds the key, per-IP rate limiting, and a hard spend cap. Until that
  exists, paid providers run only locally with the user's own key in `.env.local`.
- **GitHub Actions repository secrets are the one approved *remote* home for a key**
  (e.g. `ANTHROPIC_API_KEY` for the manual `claude-compare` workflow). They're
  encrypted, log-masked, and never available to fork PRs. Any workflow that reads a
  secret must be `workflow_dispatch`-only (never push/PR) with `contents: read` —
  CI proper uses zero secrets and can never spend money. Honest caveat: write-access
  collaborators can author workflows that read secrets — keep write access tight and
  secret-scanning/push-protection enabled.

## If a secret is ever committed (incident response)

`.gitignore` blocks `.env` / `.env.*`, but that only protects `git add` — creating
a file through the **GitHub web UI bypasses `.gitignore`**, and a key pasted into a
committed file is exposed the instant it's pushed (and stays in git history even
after you delete the file).

If it happens, in this order:

1. **Rotate/revoke the key first.** This is the only fix that actually matters —
   once a secret is public (even briefly, even in a since-deleted commit, even in a
   force-pushed-away history), assume it is compromised and burn it at the provider.
2. **Then scrub history** (belt-and-suspenders): remove the blob from all history
   with `git filter-repo --path <file> --invert-paths` and force-push. Note this
   does **not** un-leak an already-public value — GitHub can still serve the old
   commit by SHA for a while, and forks/clones retain it. Rotation is what closes it.
3. Enable **push protection** (below) so the next one is blocked before it lands.

Keys belong only in a gitignored `.env.local`, never in a tracked file or the web UI.

## Recommended repo settings (for the maintainer)

Branch protection on `main` (these can't be set from a file — flip them in
Settings → Branches, or a ruleset):

- Require a pull request before merging (no direct pushes to `main`).
- Require review from Code Owners (pairs with `.github/CODEOWNERS`).
- Block force pushes and deletions of `main`.
- Enable GitHub's free secret scanning + push protection (Settings → Code security).
