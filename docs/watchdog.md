# The Watchdog — Claude-powered security + quality review

**Status:** shipped, founder-triggered. Roadmap item 5.7.

**Founder prompt:** "an agent, an engineer, that is consistently monitoring the system,
finding weaknesses, also finding ways to improve the system through research... deploy its
own developer agent, security code review, and basically run on a dynamic type loop through
the Claude API."

## What this actually is (v1 — read this before expecting more)

A GitHub Actions workflow (`claude-watchdog`) that, when triggered, runs one bounded Claude
Messages API call over a curated slice of the repo (recent commits, `npm audit`, the repo's
own written laws in `CLAUDE.md`/`SECURITY.md`, and a fixed list of security-sensitive source
files), and files the result as a GitHub issue: concrete findings (severity + file + summary +
suggested fix + the model's own confidence) plus research ideas worth building next.

**It is findings-only.** It does not write code, does not open a pull request, does not touch
`main`. A human reads the filed issue and decides what to act on — same "assistant, not
autopilot" principle that governs every other AI-assisted feature in this repo (the Writers-
Room, the Council, the Claude Engine's line rewrites). This is a deliberate v1 scope cut, not
a technical limitation — see "What's deliberately NOT built yet" below for why.

## Why manually-triggered, not "consistently monitoring" on a timer

The founder's phrasing asked for something *continuously* running. `SECURITY.md` already has a
standing law, written before this feature existed, for exactly this situation: **"any workflow
that reads [the Anthropic key] secret must be `workflow_dispatch`-only (never push/PR)."** A
`schedule:` trigger would mean the founder's own API key starts spending money on a timer with
no human click in the loop — a real, meaningful change to that law, not just a new feature.

Rather than quietly deciding that policy question myself, this PR ships the part that's
unambiguously in scope under the existing law — the review loop itself, working end-to-end,
triggered by a button — and leaves "should this run on a schedule with no human in the loop"
as an explicit, separate decision for the founder to make deliberately. Flip it on by adding a
`schedule:` trigger to `.github/workflows/claude-watchdog.yml` once that's a decision you want
to make (and update the `SECURITY.md` clause below when you do — it's written to be
findable/greppable specifically so it doesn't get missed).

## How to run it

Actions tab → **claude-watchdog** → **Run workflow** → pick a model (Opus 4.8 default, Haiku
4.5 is the cheap lane) → Run. Needs `ANTHROPIC_API_KEY` set as a repository Actions secret
(same one `claude-compare` already uses — see `docs/claude-engine.md`). Without it, the run
skips cleanly (no failure, no spend) — same double-gate shape as every other Claude lane in
this repo.

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

## What's deliberately NOT built yet

- **A recurring schedule.** See above — a founder decision, not a technical gap.
- **Auto-generated fix PRs ("deploy its own developer agent").** The founder's prompt named
  this explicitly. It's a bigger trust step than a findings report: it means an unattended
  process writing code and opening PRs against the repo, even in draft form. The natural next
  step once this reporting loop has run a few times and proven its findings are worth
  trusting: extend `scripts/watchdog.mjs` so a **subset** of findings (e.g. `severity: low`,
  `confidence: high`, mechanical fixes only) can trigger a second Claude call that drafts an
  actual patch and opens a **draft** PR — never auto-merged, always through the same green-loop
  CI gates as any other change. Not built here; flagged as the explicit next step rather than
  silently scoped out.
- **A broader review surface.** The fixed file list above is intentionally narrow. Widening it
  (e.g. reviewing the whole `lib/hermes/` tree, or diffing against the last watchdog run
  instead of a fixed commit count) is a straightforward follow-up once the cost/value shape of
  v1 is understood from real runs.

## Safety properties (mirrors `claude-compare.yml`)

- `workflow_dispatch` only — never triggered by push, PR, or a schedule.
- Least-privilege: `contents: read` + `issues: write` — one scope wider than
  `claude-compare.yml`'s `contents: read`-only, and that one extra scope (needed to file the
  report) is the full extent of what this workflow can do to the repo. No `pull-requests`
  scope, no `contents: write`.
- Fork PRs never receive the secret; CI proper (push/PR-triggered) uses zero secrets and can
  never spend money via this workflow.
