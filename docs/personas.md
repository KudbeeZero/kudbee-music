# 🎭 The Persona Map — craft archetypes

> **Generated from code.** Rendered from `PERSONAS` + `SIGNALS` in
> [`lib/hermes/personas.ts`](../lib/hermes/personas.ts) (data in
> [`brain/personas.json`](../brain/personas.json)) — regenerate with
> `GEN_DOCS=1 npx vitest run personasDoc`.

**We map how a kind of lyrical MIND works — its subjects, rhyme density, cadence, structure, register, and appetite for novelty — never a real person's name, voice, or words. These are craft archetypes the algorithm can wear. Original-only by design (see brain/beliefs.json).**

A persona is a model of how a kind of lyrical **mind** works — what it writes about, how
it rhymes, its cadence and register, its appetite for the unexpected. You describe the
*feel* you're chasing and the brain matches the closest archetype, which then biases the
Writers-Room. **No real artist is ever named, matched, or imitated** — the mapping is
about craft, not identity, and the output stays original-only.

## How matching works

`matchPersona(description)` scores your described feel against each archetype's trigger
words and returns the best fit (`suggestPersona(inputs)` does the same from a full brief).
The chosen persona adds a coaching line + a tailored option to each Writers-Room step via
`personaOverlay` — so picking one visibly steers the room.

## The archetypes (6)

### The Confessional Storyteller  `confessional-storyteller`

> Turns a private truth into a scene you can walk through.

- **Themes it circles:** family, regret, growing up, the cost of choices, home
- **Rhyme:** moderate density, scheme AABB couplets
- **Cadence:** conversational, behind-the-beat, lets lines breathe
- **Register:** plainspoken, concrete nouns over abstractions
- **Structure habits:** scene-first verses → a bridge that reframes the opening → quiet hook
- **Craft focus:** emotional truth and narrative arc
- **Novelty appetite:** 40%
- **Trigger words** (what you'd *describe* to match it): `story`, `storytelling`, `personal`, `vulnerable`, `emotional`, `narrative`, `honest`, `family`, `confessional`, `intimate`

### The Battle Technician  `battle-technician`

> Engineers rhyme like clockwork — every bar is a mechanism.

- **Themes it circles:** skill, proving it, the come-up, doubters, legacy
- **Rhyme:** dense density, scheme multisyllabic chains, heavy internal rhyme
- **Cadence:** on-beat, percussive, breath-controlled runs
- **Register:** sharp, wordplay-heavy, double meanings
- **Structure habits:** punchline-loaded verses → escalating hook → no wasted bars
- **Craft focus:** technical density and the quotable punchline
- **Novelty appetite:** 70%
- **Trigger words** (what you'd *describe* to match it): `battle`, `bars`, `technical`, `lyrical`, `wordplay`, `punchline`, `complex`, `multisyllabic`, `rhyme`, `aggressive`, `hard`, `sharp`, `boom-bap`

### The Soul Poet  `soul-poet`

> Writes warm, literary lines over sampled grief and hope.

- **Themes it circles:** faith, love, struggle into grace, memory, the block
- **Rhyme:** moderate density, scheme ABAB with internal echoes, heavy internal rhyme
- **Cadence:** melodic, legato, rides the sample
- **Register:** literary, metaphor-rich, spiritual imagery
- **Structure habits:** builds to a lifted hook → call-and-response → outro that resolves
- **Craft focus:** imagery and emotional uplift
- **Novelty appetite:** 55%
- **Trigger words** (what you'd *describe* to match it): `soul`, `sample`, `warm`, `spiritual`, `poetic`, `literary`, `uplift`, `melodic`, `jazzy`, `grace`, `hope`

### The Street Documentarian  `street-documentarian`

> Reports the block in cinematic, unflinching detail.

- **Themes it circles:** survival, the neighborhood, loyalty, consequence, ambition
- **Rhyme:** moderate density, scheme AABB, end-stopped
- **Cadence:** steady, deliberate, every word lands
- **Register:** gritty, concrete, slang-grounded but clear
- **Structure habits:** vivid first-person reportage → a turn at verse two → stark hook
- **Craft focus:** vivid scene and moral weight
- **Novelty appetite:** 45%
- **Trigger words** (what you'd *describe* to match it): `street`, `gritty`, `real`, `survival`, `block`, `trap`, `documentary`, `cinematic`, `reportage`, `raw`, `hood`

### The Melodic Minimalist  `melodic-minimalist`

> Says less, repeats the right thing, lets melody carry it.

- **Themes it circles:** longing, nights, money and emptiness, distance, feeling
- **Rhyme:** sparse density, scheme simple end-rhyme, repetition
- **Cadence:** melodic, spacious, hook-first
- **Register:** simple, emotional, few words doing a lot
- **Structure habits:** hook-led → short verses → repetition as the payoff
- **Craft focus:** earworm hook and mood
- **Novelty appetite:** 35%
- **Trigger words** (what you'd *describe* to match it): `melodic`, `minimal`, `simple`, `catchy`, `mood`, `vibe`, `sing`, `auto`, `hook`, `sad`, `lonely`, `ambient`

### The Conscious Visionary  `conscious-visionary`

> Stacks imagery into a bigger argument about the world.

- **Themes it circles:** society, identity, power, history, liberation
- **Rhyme:** dense density, scheme layered, enjambed, heavy internal rhyme
- **Cadence:** urgent, rhythmically restless, run-on phrasing
- **Register:** dense, allusive, big abstractions earned by detail
- **Structure habits:** thesis hook → verses that widen the lens → bridge as the reckoning
- **Craft focus:** layered meaning and social arc
- **Novelty appetite:** 80%
- **Trigger words** (what you'd *describe* to match it): `conscious`, `message`, `political`, `social`, `abstract`, `visionary`, `deep`, `meaning`, `identity`, `power`, `history`

---

*See [`ARCHITECTURE.md`](../ARCHITECTURE.md) for how personas fit the wider brain, and
[`brain/beliefs.json`](../brain/beliefs.json) for the original-only, truth-first stance.*
