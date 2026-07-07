# HERMES docs

Two studios, one brain: the **Hit Factory** (song brain — start here) and the
**Video Studio** (turns a song into a finished music video). Agent-driven, $0,
entirely from code — no paid software.

## 🎤 Hit Factory (the song brain)

- [Hit Factory guide](hit-factory.md) — the multi-agent lyrical combinator, start here
- [Concepts](concepts.md) — agents, sections, sub-shots, the frame-driven compositor
- [Persona map](personas.md) — craft-DNA archetypes *(generated from code)*
- [Brain wiring](brain-wiring.md) — the anatomy diagram *(generated from code)*
- [Pattern packs](pattern-packs.md) — structure + rhyme-scheme variety
- [Accounts / onboarding](accounts.md) — the identity layer (guest, dev door)
- [Mobile](mobile.md) — device detection + phone-testing workflow
- [Sharing a song](share.md) — the deterministic link + PNG card
- [Claude Engine (opt-in)](claude-engine.md) — bring-your-own-key real-AI lyrics
- [SCRIBE Lightning training](scribe-training.md) — fine-tuning data for the line-rewrite engine
- [SCRIBE Real LoRA v1](scribe-real-training-v1.md) — evaluation prompts and real test cases
- [SCRIBE checkpoint conversion](scribe-training-next-steps.md) — litgpt → HF/PEFT → endpoint deployment workflow
- [SCRIBE evaluation prompts](scribe-evaluation-prompts.md) — test cases for line-rewrite quality
- [Watchdog](watchdog.md) — the scheduled Claude security/quality review
- [OG unfurl](og-unfurl.md) — per-song link previews *(inert until founder-activated)*
- [Living-Brain dNFT standard](nft-standard.md) — the metadata format decision
- [WIFI DJ redesign](wifi-dj-redesign.md) — the founder's new production-UI mockups,
  mapped to existing code, phased build plan
- [Kudbee TDE roadmap](kudbee-tde-roadmap.md) — the branch-by-branch plan for the
  TDE / HERMES Workbench side cockpit (suggest-only, mock-state v1)
- [Kudbee TDE backend bridge](kudbee-tde-backend-bridge.md) — the permission layer
  required before any TDE panel goes live (the lever the window doesn't have)

## 🎬 Video Studio

- [Quickstart](quickstart.md) — render the demo in a few commands
- [CLI reference](cli.md) — every `hermes` command
- [Build a scene pack](scene-packs.md) — add a new visual style (best way to contribute)
- [Runway Gen-4 plan](runway-plan.md) — the AI-video adapter rollout
- [Lightning AI plan](lightning-plan.md) — the opt-in "your own agent on compute" adapter
- [Public testing URL](testing.md) — share a live preview of the studio

## Reference

- [`ARCHITECTURE.md`](../ARCHITECTURE.md) — iron laws, module map, generated brain-wiring diagram
- [`brain/README.md`](../brain/README.md) — the memory-vault index (beliefs, personas, packs, roadmap…)
- [`CLAUDE.md`](../CLAUDE.md) — the memory spine: conventions, workflow, routes to everything
- [Deploy guide](deploy.md) — wiring `wifidj.xyz` to the live app

See the [flagship example](https://github.com/KudbeeZero/kudbee-music/tree/main/examples/dom-shady).
