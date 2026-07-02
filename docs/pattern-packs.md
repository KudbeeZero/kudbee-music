# Pattern Packs — lyric structure & rhyme-scheme variety (roadmap 5.6)

**Status:** shipped, $0/local, no key. Founder prompt: "I noticed that the lyrics are all
coming out very similar in regards to pattern... people should be able to choose more
instead of being so limited."

Before this, HERMES had two real gaps a `/deep-research` pass (104 agents, 22 sources, 9
verified findings) confirmed:

1. **Rhyme was hard-coded to sequential AABB couplets.** `buildRhymedVerse` in
   `mockLyricsProvider.ts` had no scheme parameter at all — every verse was independent
   AA/BB/CC pairs, with no ABAB, ABBA, monorhyme, or anything else, ever.
2. **The "Full song" structure option silently did nothing.** It fell through to the same
   `default` case as `hook-first` — a UI-visible dropdown entry that produced byte-identical
   output to another entry.

Both are fixed. Two new independent dials, plus named presets that set both at once:

## The dials

- **`SongInputs.rhymeScheme?: RhymeSchemeId`** — `'AABB' | 'ABAB' | 'ABBA' | 'AAAA' | 'XAXA'`.
  Unset defaults to `'AABB'` (byte-identical to the old, only, behavior). Applies to 4-line
  verses; a 2-line unit (the Bridge) always resolves as a single rhymed couplet — a scheme
  needs at least two rhyme pairs to read as different from AABB.
- **`SongInputs.structure`** (existing field) — `'full-song'` now produces a genuinely longer
  arrangement: the same 7-section shape as `'hook-first'` plus a repeated final Hook, instead
  of an identical copy. See "Findings used" below for why (the AABA convention).

## How rhyme scheme actually generates (not just detects)

`lib/hermes/rhyme.ts` already had `rhymeScheme(lines)` — a **detector** that labels an
already-written set of lines (`['A','A','B','B']` → `"AABB"`). It was never used on the
*generation* side. The new generation-side piece is a **layout**: which lines share a rhyme
family.

```ts
const SCHEME_LAYOUTS: Record<RhymeSchemeId, number[]> = {
  AABB: [0, 0, 1, 1],
  ABAB: [0, 1, 0, 1],
  ABBA: [0, 1, 1, 0],
  AAAA: [0, 0, 0, 0],
  XAXA: [0, 1, 2, 1], // lines 2 & 4 rhyme; 1 & 3 are free, distinct singleton families
};
```

For each distinct family id in the layout, `buildRhymedVerse` draws one `rhymeFamily(rng,
valence, count, temp, banned)` call sized to how many lines share it (already a generic `n`
parameter in `rhyme.ts` — AAAA just asks for 4 words from one family instead of 2, XAXA asks
for a 2-word family plus two 1-word singletons), then walks the lines in order, popping the
next word off its family's queue. Fully deterministic per `rng`; `lib/hermes/__tests__/
patternPacks.test.ts` proves it two ways — same seed reproduces byte-identical lyrics, and
the **existing detector** (`rhymeScheme()`) independently confirms each generated verse
actually reads back as the scheme that was asked for.

## Pattern Packs — named presets

`brain/patternPacks.json` (→ `lib/hermes/patternPacks.ts`) bundles `structure` +
`rhymeScheme` into one pick — e.g. "AABA / 32-Bar Classic," "Ballad — Common Meter (XAXA)."
Applying a pack just writes those two fields on the brief; **it is not its own field on
`SongInputs`** — the brief stays the single source of truth for generation, so there's no
second "which pack was picked" value that could drift from what's actually driving the
combinator. The Song Lab's "Pattern pack" dropdown (`SongLabForm.tsx`) is a quick-apply
control, not a persisted selection — pick one, then the Structure/Rhyme-scheme dropdowns
below still show (and can further tweak) the values it just set.

## What's research-backed vs. what's a general craft-variety offering

Being honest about this matters to the repo's ethos (see the Claude Engine's own
non-determinism caveat for the same spirit). The research verified:

- **The AABA production rule** (`A-A-B-A`, "once the first cycle is complete there tend not
  to be any new lyrics") — Open Music Theory / Summach, MTO 17.3. This directly justifies the
  `full-song` fix (repeat the final Hook, no new material).
- **Section-function semantics** (chorus/refrain/pre-chorus/strophe) and **genre priors**
  (strophic form for blues/early hip-hop/1950s–60s rock; verse-chorus dominance post-1970).
- **Rhyme-quality pedagogy** (perfect → family → additive → subtractive → assonance →
  consonance) and **line-length balancing as a deliberate craft dial** — Berklee/Pattison.

What did **not** survive the research's adversarial verification (2/3 refutation kills a
claim): a genre-to-rhyme-*scheme* mapping (which genres favor ABAB vs. ABBA vs. AAAA), and a
proposed "default modern pop grammar." So the rhyme-scheme dial is offered here as a
**general, well-established poetic device** (AABB/ABAB/ABBA/AAAA/XAXA are standard,
definitional rhyme-scheme patterns — that's not in dispute), **without** claiming any of
them is "the rap scheme" or "the country scheme." Each pack's `sourceNote` in
`patternPacks.json` says exactly which part is research-backed and which is a craft-variety
offering — never overclaimed.

## Deliberately out of scope for this pass

- **Meter / stress patterns** (iambic baseline, syllable-per-line norms). The research
  confirmed the pedagogy (iambic default, vary by mutating the template not mis-stressing a
  word) but flagged genre-specific syllable-count norms as an open question, and HERMES's
  line templates aren't syllable-aware yet — doing this properly needs new infrastructure,
  not just a new dial. Captured in `IDEAS.md` / `TODO.md` backlog.
- **Rap-flow parameters** (MCFlow's 6 quantified dials: speed, rhyme density, metric
  position of stresses/rhymes/phrases, phrase length) — well-sourced but a genuinely
  separate, bigger feature (would need its own line-generation mode, not a tweak to the
  couplet builder). Backlog.
- **Repetition devices beyond anaphora** (epistrophe, call-and-response, list songs, POV
  shifts) — only anaphora survived verification as a sourced, teachable device; the others
  had no surviving claim to build from.
