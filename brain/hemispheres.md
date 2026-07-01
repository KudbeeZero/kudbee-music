# The HERMES brain — two hemispheres, one dial

HERMES isn't a pipeline that happens to have agents; it's a **brain**. The agent
roster splits cleanly into two hemispheres, and a single dial biases which one
leads — exactly the way a creative person's brain leans one way without ever
shutting the other half off.

> **Read this first — what "brain" means here.** The hemispheres, the named
> **regions** (intent, values, language & culture, generative/analytical, decision,
> limbic, default-mode, reward, short-term & long-term memory), and the **nervous
> system** are an **engineering metaphor inspired by brain lateralization**, not a
> claim of biological accuracy. Nothing here simulates neurons or real neuroscience.
> What the metaphor buys us is a concrete architecture: a divergent path that
> *proposes*, a convergent path that *disposes*, structured artifacts passed between
> them, and a memory layer that decays and consolidates. Treat the anatomy as a map
> of the workflow — the actual behavior is whatever `lib/hermes/` does.

> Lateralization is a **bias, not a switch.** Both hemispheres always fire. The
> right one *dreams up* the video; the left one *makes sure it's actually correct.*
> A **corpus callosum** of shared files carries structured thoughts between them.

## The two hemispheres

| Right — *generative / divergent* | Left — *analytical / convergent* |
|----------------------------------|----------------------------------|
| `hermes-director` — concept, palette, mood | `hermes-analyst` — BPM, beats, loudness (measurement) |
| `hermes-songwriter` — lyrics from a prompt | `hermes-editor` — arrangement, cut timing, structure |
| `hermes-lyricist` — phrasing, feel | `hermes-producer` — master to −14 LUFS spec |
| `hermes-art` — the look, the scenes | `hermes-render` — deterministic encode |
| `hermes-composer` — music generation | `hermes-qa` — the eval gate / judge |

**Right proposes; left disposes.**

## The corpus callosum

The hemispheres never share mutable state — they pass **artifacts**:
`brain/treatment.md` (the look), `brain/shotlist.md`, `studio/config.json` (the
cut), `song/sync-map.json` (the lyric timing), `song/analysis.json` (the audio
facts). Each is a small, structured, diffable "thought" handed across the divide.

## The dominance dial (`--brain`)

`studio/brain.mjs` turns the dominance into a real knob. It only presets values
that already exist in the pipeline, so it's a *bias* on the same machine:

| | left-dominant | balanced | right-dominant |
|---|---|---|---|
| cut length (`maxhold`) | 3.4s — tight | 4.6s | 6.0s — breathes |
| footage jump (`jump`) | 60 — subtle | 90 | 140 — bold |
| min on-screen (`mingap`) | 1.0s — legible | 0.75s | 0.55s — flowing |
| grade intensity | 0.80 — calm | 1.0 | 1.35 — rich |
| QA strictness | strict | normal | lenient |

```bash
hermes build mysong --brain right   # let the artist lead
hermes build mysong --brain left    # let the engineer lead
hermes build mysong                 # balanced (default, unchanged)
```

On the flagship song this is measurable: **left → 57 short legible cuts**,
**right → 41 longer cuts that breathe.** Same song, different temperament.

## Why this is also the LLMOps loop

The harness pattern (trace → eval → gate → release) *is* the left hemisphere
checking the right's work. `hermes qa` (`studio/qa.mjs`) scores a finished render
and exits non-zero on failure; the CI `smoke` job runs it as the release gate.
The right hemisphere generates; the left hemisphere refuses to ship something
broken. `brain/brain.json` is the machine-readable version of this document.
