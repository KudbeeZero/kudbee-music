---
name: resume
description: Pick up HERMES exactly where the last session left off — nothing stale, nothing crossed in the PR/workflow. Invoke at the start of a new chat about this repo (kudbee-music). Reads the living state (TODO/IDEAS/docs), checks git + open PRs, states the workflow rules, and proposes the next step.
---

# Resume HERMES

You are continuing work on **HERMES** — the agent-driven music-creation brain in this
repo. A previous chat built a lot; this skill gets you oriented so **nothing gets
stale and nothing gets crossed over in the PRs or the workflow.**

## Step 1 — Read the living state (in this order)
1. `TODO.md` — the backlog. **Shipped** (newest-first, with PR numbers) tells you what
   exists; **Up next (ordered)** tells you what to build; the **Working agreement**
   section is the rules.
2. `IDEAS.md` — the idea inbox (raw ideas + flagship visions + the founder narrative).
   Respect the **privacy rule** noted there: never publish the founder's personal /
   medical specifics anywhere — only the resilience message.
3. `docs/hit-factory.md` — how the brain works (belief system, Writers-Room, personas,
   Language & Culture, nervous system + memory tiers, Brain Scan).
4. `README.md` Roadmap — the highlight reel.

## Step 2 — Check git + PRs so nothing is stale or crossed
- `git fetch origin main && git checkout main && git reset --hard origin/main` — start
  from the true latest.
- List **open PRs** (GitHub MCP `list_pull_requests` state=open, or the `gh` equivalent).
  There should normally be **zero**. If an open PR exists, decide: drive it to green +
  merge, or close it — don't start new work stacked on top of it.
- Confirm the designated feature branch's PR history. **If its PR is already merged,
  treat follow-up as a fresh change**: branch off the latest `main`, never stack new
  commits on already-merged history.

## Step 3 — The workflow rules (hard-coded — see `brain/beliefs.json`)
- **Always a green loop.** One PR at a time. Once CI is green on a PR, mark it ready
  and **merge it the same turn** — never park a draft. Verify UI changes with a
  **screenshot** before shipping.
- **Fresh branch per change**; never stack on merged history. After merging, sync
  `main`, prune the branch.
- **Capture every idea the moment it's said** into `IDEAS.md` — even mid-build — then
  finish the current green loop and design it. Nothing gets lost.
- **Original-only.** Map how a *kind of mind* works, never a real artist's name or
  words. Culture = the artist describing *themselves*, never a group profile.
- **Move items TODO → Shipped in the same PR**, and keep `README`/`docs` in sync.
- Commit footer:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
  and the session link line, exactly as prior commits.

## Step 4 — Verify it still runs
`npm run test:web` (vitest engine) · `npm test` (node) · `npm run web:build` — all
should be green before you start. `npm run web:dev` → `/hermes` to see the app.

## Step 5 — Propose the next step
Summarize in 3–4 lines: what shipped last, current state (open PRs, tests green?), and
the **top item from TODO "Up next"** as the recommended next build. Then either start
it (if the user has said keep building) or confirm direction.

## Fast facts (the brain today)
- The brain is a **file-system vault**: `brain/beliefs.json` (values), `brain/memory.json`
  (preferences/exclusions), `brain/personas.json` (craft-DNA), `brain/brainMap.ts`-style
  anatomy in `lib/hermes/brainMap.ts` (regions + nerves). Each file = a Brain Scan region.
- Engine lives in `lib/hermes/` (TypeScript); UI in `components/hermes/` + `app/hermes`.
- Video studio (`bin/hermes`, `studio/*`) is separate and untouched by song-brain work.
- Deploy/review: **Vercel** gives an instant URL (repo is Vercel-ready); point
  **wifidj.xyz** at it later. The sandbox can't tunnel out.
