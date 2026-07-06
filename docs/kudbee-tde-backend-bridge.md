# Kudbee TDE — the backend bridge plan

What has to exist before any TDE panel performs a real action. Read by whoever builds
the first live integration (and by every reviewer who has to say no until then). The
companion of [`kudbee-tde-roadmap.md`](kudbee-tde-roadmap.md): the roadmap built the
window; this documents the lever it deliberately doesn't have. Status lives in
`brain/roadmap.json` phase 9 (item 9.13). Docs only — merging this changes nothing live.

---

## The rule this whole document serves

**The static client never holds a credential and never performs a write.** The app is
a $0 static export on Cloudflare Pages; there is no server in the core path, and the
security model (SECURITY.md) depends on that staying true. Everything below exists so
that going live never quietly violates it.

## The permission layer (must exist first, before any integration)

A founder-controlled backend service — **not** Cloudflare Pages env, **not** the
static client — that:

1. **Holds the keys.** GitHub token, Lightning token, SCRIBE endpoint credentials live
   only here (or in GitHub Actions secrets for CI-shaped work). The browser gets
   short-lived, scoped, read-only views — never the credential.
2. **Owns an allowlist of actions**, each with a named risk level and an
   `approvalRequired` flag — the same vocabulary as `components/tde/modelRouter.ts`
   and `contracts.ts` (`TdeDataSource: 'mock' | 'snapshot' | 'live-readonly'`).
3. **Approves per action.** A proposed action is recorded → founder approves (a human
   click, out-of-band of the requesting agent) → the bridge executes → the result and
   the full audit trail are queryable. No standing write authority, one gate lifted at
   a time by a founder-approved PR.
4. **Reads before writes, always.** Every integration ships read-only first, runs
   long enough to trust, and only then argues for its write path.

## Integration plans (in the order they should go live)

| # | Integration | First (read-only) slice | Contract | Write path (later, gated) |
| --- | --- | --- | --- | --- |
| 1 | **GitHub PR state** | Open PRs + check status for kudbee-music, rendered on the Repos panel via `PRStatus` | REST/GraphQL through the bridge; scoped token, `contents: read` | Draft-PR creation only, behind per-action approval |
| 2 | **hermes-lyric-server health** | A single `/health`-style ping surfaced as `ScribeStatus.reachable` | The bridge polls; the browser reads the cached result | none planned |
| 3 | **Lightning GPU job status** | Job list + states into `GPUJobStatus[]` on the Models/GPU panel | Bridge polls Lightning Studios API with the founder key | Job **launch** is the last gate of all — needs approval flow + spend cap + the CPU-fallback tripwire |
| 4 | **Memory / vector index** | `MemoryState[]` freshness stamps for PROJECT_STATE / repo atlas | Bridge reads the files where they live | Proposed spine edits as PRs, never direct writes |
| 5 | **SCRIBE endpoint** | `POST /predict` health + latency (contract per `docs/scribe-training.md` §4: Bearer auth, `{"prompt", "max_tokens"}`) | Visitor BYOK stays browser-side (the existing exemption); founder-key calls go through the bridge | Batch rewrite jobs, approval-gated |
| 6 | **KUDBEECODEV0 eval scoreboard** | `TrainingEvalSummary` (rows, pass rate, drop queue) replacing the Memory/Training panel's mock numbers | Bridge reads eval artifacts from Lightning storage | Triggering evals rides on integration 3's launch gate |

## Safety gates before ANY of the above goes live

- Permission layer deployed, audited, and holding the only credentials.
- Every feed stamps `TdeDataSource` honestly; the UI renders `live-readonly` distinctly
  from `mock` — a mock number can never impersonate a live one.
- Audit trail: every proposed → approved → executed action is recorded and reviewable.
- The Branch 07 gate list is enforced server-side by the bridge, not just rendered.
- Per-integration kill switch (env flag on the bridge, like the OG unfurl's `OG_UNFURL=1`
  pattern: merged code stays inert until the founder flips it).
- The unattended-write boundary holds: no system pushes code or spends money without a
  human click between generation and execution (the lesson already learned with the
  reverted auto-fix watchdog — see SECURITY.md / docs/watchdog.md).
- A leaked-credential drill: rotating any bridge key is a documented five-minute
  operation before that key ever exists.

## What stays mocked until each gate is lifted

Mission execution · GitHub writes · GPU job launches · agent spawning · SCRIBE
founder-key calls · memory writes. The only persistence remains the visitor's own
localStorage mock state (`hermes.tdeMissions.v1`). When in doubt: the TDE is a window;
opening a lever is a new founder decision, one PR, one gate at a time.
