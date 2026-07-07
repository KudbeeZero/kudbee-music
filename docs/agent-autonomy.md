# Running the training agents without the approval treadmill

**What this is / who reads it:** how to let the KUDBEE model-training agents (this repo's
sessions + the Lightning GPU agent) run the safe, repeated commands **without stopping to
ask you** — while the genuinely dangerous ones stay gated. Read this if you're tired of
tapping "approve" on the hundredth `git commit`. The config lives in
[`.claude/settings.json`](../.claude/settings.json); this doc explains it and gives the
Lightning agent its run-autonomously preamble.

## Why you were getting asked so much (and why that's fixable, not a bug)

Claude Code asks before running a command it hasn't been told is safe. Out of the box it
knows nothing about *this* repo, so every `git commit`, `npx vitest`, `litgpt finetune`
is a fresh prompt. That's not an error — it's the default being cautious. The fix isn't to
turn caution off globally (that's how a repo with secrets and a determinism contract gets
wrecked); it's to **tell it, once, which commands are always safe here.** That's an
allowlist, and it's checked into the repo so every agent session inherits it.

The errors you *have* hit are a different thing and worth separating honestly:

- **Invalid rhyme schemes in the v2 dataset** (an agent invented `XABY`/`ABCB`) — a real
  agent mistake, now caught by a CI guard test so it can't recur. *Guardrails, not
  approvals, are what catch this class.*
- **GPU wouldn't start** — a Lightning Studio infrastructure issue (the RTX 6000 didn't
  attach), not a code or permission problem. `nvidia-smi` failing means restart the Studio;
  no amount of autonomy config changes that.
- **"Blocked from git push"** — branch protection doing its job. The fix is a feature-branch
  PR, never a manual override.

Autonomy config fixes the first-order friction (approvals). Guardrails (CI guard tests, the
KUDBEE-GATE invariants) fix the second-order risk (bad output). You need both — and the more
guardrails exist, the safer it is to let the agent run unattended.

## What the allowlist grants (and what it deliberately doesn't)

`.claude/settings.json` sets `defaultMode: "acceptEdits"` (file edits inside the repo apply
without a prompt) and allowlists the training loop's safe, repeated commands:

- **Read-only inspection:** `ls`, `cat`, `grep`, `rg`, `find`, `head`/`tail`, `nvidia-smi`,
  `df`/`du`.
- **Git, non-destructive:** `status`/`diff`/`log`/`add`/`commit`/`fetch`/`pull`/`checkout`/
  `branch`/`stash`, and **push only to `claude/…` and `feat/…` branches**.
- **The gate suite:** `npm test`, `npm run test:web`/`lint:check`/`eval`/`web:build`,
  `npx tsc`, `npx vitest`, the `GEN_*=1` generators, `node scripts/…`/`studio/…`.
- **Training:** `litgpt`, and `ssh ssh.lightning.ai` for the cross-studio work.

Still gated (in `deny`, which always beats `allow`):

- **Force pushes and pushes to `main`/`master`** — the default branch is protected; a push
  there isn't allowlisted, so it still asks.
- **Destructive resets/deletes** — `git reset --hard`, `git clean -fd/-fx`, `rm -rf`.
- **Anything secret-shaped** — reading/writing `.env*`, files matching `*secret*`, or
  touching git credential config. This keeps the "no secret ever in git" iron law
  mechanical even when the agent is running hands-off.

So: the agent stops asking for the hundred safe things, and still can't force-push, wipe a
tree, read your `.env.local`, or push to `main` without you.

## The Lightning agent's run-autonomously preamble (copy-paste)

Paste this at the top of a Lightning-agent session so it drives straight through the safe
work instead of pausing on every step:

```
Run autonomously. The repo ships a .claude/settings.json allowlist that pre-approves the
safe, repeated training-loop commands (git add/commit/push-to-feature-branch, npm test /
test:web / lint:check / eval / web:build, npx tsc/vitest, the GEN_*=1 generators, litgpt,
nvidia-smi, ssh.lightning.ai, read-only inspection). Do NOT stop to ask me before running
any of those — just run them, in sequence, until the task is done or you hit a real blocker.

Only stop and ask when: (a) a command falls OUTSIDE that allowlist (force push, push to
main/master, git reset --hard, rm -rf, anything touching a secret/.env) — those stay gated
on purpose and you must not work around them; (b) a gate genuinely fails and the fix is
ambiguous or architecturally significant; or (c) the KUDBEE-GATE would advance past a stage
that didn't actually happen (never mark a model verified/served/promoted, or an eval
confirmed, without the real run — the modelFamily guard test enforces this and so do you).

End every GPU session with the Librarian close-out: update brain/modelFamily.json honestly,
run `npx vitest run modelFamily`, push to a feature branch, open the PR.
```

## If you want it fully hands-off on the GPU box (the bigger hammer, honest tradeoff)

The Lightning Studio is an isolated, disposable environment doing well-scoped training work,
and the real safety net for its *output* is on the kudbee-music side (CI guard tests +
branch protection + the KUDBEE-GATE invariants + your PR review before anything merges). If
you want that agent to never prompt at all, you can launch its CLI with **bypass-permissions
mode** (`claude --dangerously-skip-permissions`).

Do this **only** on the GPU studio, and only because:

- it's a throwaway box, not your laptop, with nothing personal on it;
- its code changes still land as PRs that CI + you gate before they reach `main`;
- the no-secrets rule is still carried by discipline (tokens live in the Studio env /
  gitignored `.env.local`, never a tracked file) — bypass mode skips *prompts*, it does not
  make leaking a secret safe.

Do **not** run bypass mode in the kudbee-music repo on your own machine — there the scoped
allowlist above is the right level, because that tree has your real git identity and the
production app. The honest rule: bypass the prompts where the blast radius is contained and
the output is gated downstream; keep the scoped allowlist everywhere else.

## Automated living-state reminders (hooks)

CLAUDE.md's living-state-sync rule is an *instruction* — an agent has to remember it.
`.claude/settings.json` also carries two **hooks** (the harness runs these mechanically,
every session, for every agent in this repo) so the discipline doesn't rely on memory:

- **SessionStart hook** — injects a reminder to read `brain/modelFamily.json`,
  `brain/handoffs.json`, `TODO.md` and `IDEAS.md` at the start, and to keep the living
  state synced. So every session — mine, the Lightning agent's, a fresh one — opens
  oriented to the notes.
- **Stop hook** — before a session ends, if the working diff touched product code
  (`lib/`, `components/`, `app/`) but **not** `TODO.md` / `IDEAS.md` / `brain/roadmap.json`,
  it prints a one-line nudge to sync the living state and regenerate the status board.
  It's **non-blocking and low-false-positive**: it never stops the agent, and it stays
  silent when the tree is clean (already committed/pushed) or when the living state was
  already updated. Docs- or config-only changes don't trigger it.

These are *nudges*, not enforcement. The real enforcement is still CI: `statusBoard.test.ts`
fails the build on any living-state drift, and the memory-index guards fail if a route
rots. Hooks catch it early (per session); CI catches it hard (at the PR). To review or
disable the hooks, open `/hooks`.

## Two agents, one repo — the lane rule (coordinate or collide)

Two agents run this program in parallel and **can be active in overlapping windows** — they
are not strictly serial. On 2026-07-07 both edited `TODO.md` + `IDEAS.md` + `brain/handoffs.json`
in the same window and collided: merge conflicts and duplicate entries. The fix is
ownership + a claim step (now also in CLAUDE.md's "Two agents, one repo" rule and the
protocol block of `brain/handoffs.json`):

- **Lane ownership.** The **kudbee-music session** owns the app and the shared living-state
  files — `TODO.md`, `IDEAS.md`, `brain/roadmap.json`, `brain/modelFamily.json`. The
  **Lightning GPU agent** owns training/GPU and the `hermes-lyric-server` repo (whose PRs
  never collide with kudbee-music).
- **Claim before you edit a shared file.** `brain/handoffs.json` is **append-only**, so
  writing to it never conflicts. Before either agent edits a shared kudbee-music living-state
  file, it appends a claim entry there and does not edit those files concurrently with the
  other agent. The Lightning agent updates `modelFamily.json` at session end *behind a
  claim*, not in a race.
- **App features route through the kudbee-music session.** The Lightning agent doesn't pick
  up kudbee-music app work unprompted — that's how the collision started (it built an app
  feature in this repo while this session was also editing it).

`hermes-lyric-server` is the pressure valve: anything the Lightning agent can do in *its own*
repo has zero collision surface, so prefer that when both agents are live.

## See also

- [`.claude/settings.json`](../.claude/settings.json) — the allowlist + the hooks
- [`lightning-librarian.md`](lightning-librarian.md) — the KUDBEE-GATE guardrails that make
  hands-off running safe (the output-side net)
- [`CLAUDE.md`](../CLAUDE.md) — the security rules the `deny` list keeps mechanical
