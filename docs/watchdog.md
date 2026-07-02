# The Watchdog — Claude-powered security + quality review

**Status:** shipped, runs on a schedule + on demand. Roadmap item 5.7.

**Founder prompt:** "an agent, an engineer, that is consistently monitoring the system,
finding weaknesses, also finding ways to improve the system through research... deploy its
own developer agent, security code review, and basically run on a dynamic type loop through
the Claude API."

## What this actually is

A GitHub Actions workflow (`claude-watchdog`) that runs weekly on a schedule (plus on demand
via the Actions tab), does one bounded Claude Messages API call over a curated slice of the
repo (recent commits, `npm audit`, the repo's own written laws in `CLAUDE.md`/`SECURITY.md`,
and a fixed list of security-sensitive source files), and files the result as a GitHub issue:
concrete findings (severity + file + summary + suggested fix + the model's own confidence)
plus research ideas worth building next.

**It is findings-only, permanently.** It does not write code, does not open a pull request,
does not touch `main`. A human reads the filed issue and decides what to act on — same
"assistant, not autopilot" principle that governs every other AI-assisted feature in this repo
(the Writers-Room, the Council, the Claude Engine's line rewrites).

## Why findings-only is a permanent floor, not a v1 gap

This repo's build process (an AI agent, working from a founder's plain-language directive)
actually attempted the fuller version first: a follow-on step where a low-severity,
high-confidence finding would get a Claude-drafted one-file patch, validated against the full
local gate suite, then auto-committed and pushed to a new branch with a draft PR opened —
still never auto-merged, but with **no human click anywhere in the chain from finding to
pushed branch**.

The platform's own safety tooling blocked that attempt before it was wired live, with this
reasoning: an unattended agent writing and pushing code, gated only by automated tests with no
human approval step in the loop, is a real risk boundary — not a formality to route around.
Given the choice to either add a human-approval checkpoint back into that flow or drop it, the
founder chose to drop the auto-fix-PR piece entirely and keep the schedule + findings-report
half. That's not a temporary v1 cut waiting on more trust being built up — it's the intended
final shape: **an agent that finds and reports, never one that pushes code on its own.** If
this is ever revisited, the honest way to do it is with an explicit human click *inside* the
loop (e.g. a separate, human-triggered "attempt this specific fix" action per finding) — never
a fully unattended write-and-push path.

## How it runs

- **Scheduled:** every Monday (`cron: '17 14 * * 1'`, UTC) via `.github/workflows/
  claude-watchdog.yml`. This is the "consistently monitoring" half of the founder's ask —
  genuinely unattended, no click required.
- **On demand:** Actions tab → **claude-watchdog** → **Run workflow** → pick a model (Opus 4.8
  default, Haiku 4.5 is the cheap lane) → Run.

Both paths need `ANTHROPIC_API_KEY` set as a repository Actions secret (same one
`claude-compare` already uses — see `docs/claude-engine.md`). Without it, the run skips
cleanly (no failure, no spend) — same double-gate shape as every other Claude lane in this
repo, and the reason a scheduled run with no key configured is still perfectly safe (it just
does nothing).

The report lands in three places on a successful run: the workflow's Summary page, a 30-day
artifact, and a new GitHub issue labeled `watchdog-report`.

## What it actually reviews

`scripts/watchdog.mjs` gathers a **bounded, fixed** context — not the whole repo, deliberately,
to keep cost and scope predictable:

- The last 20 commits (`git log --oneline`).
- `npm audit --json` (dependency vulnerabilities).
- `SECURITY.md` and `CLAUDE.md` in full — the repo's own written laws, so the model can flag
  drift from them, not just generic security advice.
- A fixed list of security-sensitive source files: `claudeKey.ts`, `claudeLyricsProvider.ts`,
  `shareLink.ts`, `storage.ts`, `identity.ts`, and every `.github/workflows/*.yml` this repo
  ships.

One Messages API call, structured JSON output (`output_config.format`), same pattern as every
other Claude integration in this repo (`claudeLyricsProvider.ts`). `renderReport()` in
`scripts/watchdog.mjs` is pure and unit-tested (`test/watchdog.test.mjs`) — the Markdown shape
is proven independent of any real API call.

## Cost shape

One Messages API request per run, weekly by schedule plus whatever manual runs get triggered —
roughly 52 scheduled runs/year at whatever `claude-opus-4-8` (or a cheaper model, via the
`model` input on a manual run) costs per request with the context described above. Tune the
cron in `.github/workflows/claude-watchdog.yml` if weekly is too frequent or not frequent
enough; check current per-token pricing before relying on a specific number.

## What's deliberately NOT built (and won't be, without a redesign)

- **Auto-generated fix PRs ("deploy its own developer agent").** See "Why findings-only is a
  permanent floor" above — this was built, then deliberately removed after the platform's
  safety tooling flagged the missing human-approval step.
- **A broader review surface.** The fixed file list above is intentionally narrow. Widening it
  (e.g. reviewing the whole `lib/hermes/` tree, or diffing against the last watchdog run
  instead of a fixed commit count) is a straightforward follow-up once the cost/value shape is
  understood from real runs — doesn't touch the findings-only floor either way.

## Safety properties

- Least-privilege: `contents: read` + `issues: write` — one scope wider than
  `claude-compare.yml`'s `contents: read`-only, and that one extra scope (needed to file the
  report) is the full extent of what this workflow can do to the repo. No `pull-requests`
  scope, no `contents: write` — it is structurally incapable of changing any file, on a
  schedule or otherwise.
- Fork PRs never receive the secret; scheduled runs always use the secret from the default
  branch. CI proper (push/PR-triggered) uses zero secrets and can never spend money via this
  workflow.
