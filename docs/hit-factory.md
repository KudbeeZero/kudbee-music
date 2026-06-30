# HERMES Hit Factory — Lyrical Combinator Brain (V1)

A multi-agent **song-creation** studio that lives alongside the music-**video**
studio in this repo. Enter a rough idea — *"Chicago pain song for my daughter,
melodic hook, street but emotional, 808 trap, not corny"* — and HERMES routes it
through 10 specialized agents into a complete, original **song package**.

V1 runs **fully local with mock generation — no API key, no copyrighted material.**

## Run it
```bash
npm install
npm run web:build      # production build
npm run web:start      # serve on http://localhost:3000
# open /hermes  (or /hit-factory)
npm run test:web       # engine tests (vitest)
```
Dev: `npm run web:dev`. The video studio (`bin/hermes`, `studio/*`) is untouched
and runs exactly as before.

**Instant demo (no typing).** On the empty deck, click **"▶ See a finished example
— Cold Hard Gold"** to load a real 99/100 package the engine produced
(`examples/cold-hard-gold/song.json`). Then take it to the video studio:
`hermes from-song examples/cold-hard-gold/song.json` scaffolds a project whose README
carries a **one-click Suno link + Style of Music + lyrics**; render the audio in Suno,
drop it at `song/track.mp3`, and `hermes build`. If the audio isn't placed yet, the
build prints exactly what to do instead of failing.

## The 10 agents (right brain proposes, left brain disposes)
| Agent | Hemisphere | Output |
|-------|-----------|--------|
| HERMES Conductor | left | creative brief + concept |
| Hooksmith | right | 3–5 hook options |
| Lyric Chemist | right | sections + final lyrics |
| Beat Oracle | left | production notes |
| Emotion Scanner | left | emotional-arc clarity |
| Originality Auditor | left | uniqueness report (0–100) |
| A&R Judge | left | banger score (0–100) |
| Visual Director | right | album cover + 16:9 video prompts |
| Viral Clip Scout | right | short-form clip moments |
| Rights & Release Guard | left | release checklist + warnings |

## Architecture
- `lib/hermes/types.ts` — typed contracts (agents, song package, scores, reports).
- `lib/hermes/agents.ts` — the 10 agent definitions the board renders.
- `lib/hermes/pipeline.ts` — runs the agents in order, assembles the `SongPackage`.
- `lib/hermes/originality.ts` — local uniqueness checker (n-grams, vault similarity,
  banned/avoid words, clichés → 0–100 + rewrites). A repeating chorus is *not*
  penalized; cross-song similarity and clichés are the real signals.
- `lib/hermes/scoring.ts` — 7-category banger score summing to 100.
- `lib/hermes/storage.ts` — local vault (localStorage in the browser, in-memory on
  the server), with per-title version history.
- `lib/hermes/providers/*` — vendor-neutral seams (`LyricsProvider`,
  `AudioProvider`, `ImagePromptProvider`, `VideoPromptProvider`). V1 ships mock
  implementations; a future lane drops in a real vendor behind the same interfaces.
- `components/hermes/*` — the cinematic command deck (Song Lab, Agent Board, Song
  Package, Banger Score, Uniqueness, Release Readiness, Vault).
- `app/hermes`, `app/hit-factory` — the routes.

## Banger score (out of 100)
hook strength (20) · emotional clarity (20) · originality (20) · replay value (15)
· visual identity (10) · short-form potential (10) · release readiness (5).

## The belief system (the brain's constitution)
`brain/beliefs.json` is the **values tier** of memory — hard-coded operating
principles the brain reads: *always a green loop · craft over one-shot generation ·
assistant not autopilot · learn the artist's voice · use every tool · original only ·
truth first*. `lib/hermes/beliefs.ts` exposes them (`belief(id)`, `beliefsFor(area)`)
and the writers-room cites the belief each step embodies.

## The Writers-Room (the proprietary edge)
`lib/hermes/process.ts` is what separates HERMES from a one-shot lyric generator: a
**step-by-step craft assistant**. It walks the artist through the real process —
concept → truth → perspective → title/metaphor → hook → rhyme & cadence → verse
draft → revise → arc — and at each step poses the craft question, proposes a few
starting options **with reasons** (`guideStep`), and turns the artist's choices into
voice signals (`choiceSignals`) the brain learns from. `artistContext()` summarizes
who the writer is from their vault (reusing `learn.ts`), so the room is informed by
everything they've made. **Assistant, not autopilot** — the artist makes every real
choice; the brain sharpens the voice instead of replacing it.

## Nervous system & memory tiers
The brain has a **signalling layer** and two **memory systems**.
`lib/hermes/brainMap.ts` is the anatomy — the **regions** (functional areas, each a
knowledge file) and the **nerves** (`PATHWAYS`) between them — the single source of
truth the Brain Scan renders. `lib/hermes/nervousSystem.ts` is a small pub/sub
**signal bus**: as each agent fires, a signal travels its region's nerves.
`lib/hermes/workingMemory.ts` is **short-term memory** — a decaying ring buffer that
holds the current session and **consolidates** its salient words into **long-term
memory** (the taste/voice model) when a song is saved. Short-term feels the moment,
the nervous system carries the signal, long-term keeps what mattered.

## Brain Scan (the brain, made visible)
`components/hermes/BrainScan.tsx` renders an anatomical brain whose **functional
regions light up** as the agents fire — cyan for the analytical left hemisphere,
magenta for the generative right, amber for the center (intent, values, decision,
memory). Crucially, **each region is one of the brain's knowledge files** (the
Obsidian-style vault on the file system: `brain/beliefs.json`, `brain/memory.json`,
`brain/personas.json`, the Writers-Room) — tap a region to see the file behind it. A
*Language & Culture* region sits dim as the next area to wire. Reduced-motion aware.

## Lyric Lab (the Writers-Room, in the app)
The **✍️ Lyric Lab** button (header) opens the writers-room as a drawer
(`components/hermes/LyricLab.tsx`): set a brief, pick a craft **persona**, then walk the
**9 steps** — each poses the craft question, proposes options **with reasons**, and you
commit a choice (or write your own). The **hook you commit becomes the song's real
hook** (pipeline `forcedHook`), and every choice **trains your voice** (`recordTaste`),
so the next song is more *you*. Assistant, not autopilot.

## Persona map (anonymized craft-DNA)
`brain/personas.json` + `lib/hermes/personas.ts` map **how a kind of lyrical mind
works** — its subjects, rhyme density, cadence, structure, register, and appetite for
novelty — as craft **archetypes** (*The Confessional Storyteller, The Battle
Technician, The Soul Poet, The Street Documentarian, The Melodic Minimalist, The
Conscious Visionary*). The artist describes the **feel** they're chasing;
`matchPersona()`/`suggestPersona()` map it to the closest archetype, and
`personaOverlay()` weaves that craft-DNA into each Writers-Room step (a tailored
option + coaching). **No real artist is ever named, no lyrics are ever used** — we
map the brain and the persona, never the identity (enforced by the `original-only`
belief). This is framework Part 1 ("deconstruct the influences"), done original-only.

## Memory layer
`brain/memory.json` is the **semantic-memory tier** of the brain — a persistent,
version-controlled store of the user's creative preferences and a growing
**exclusion list**. `lib/hermes/memory.ts` `allAvoidWords()` merges it with the
generic clichés (`bannedWords.ts`) and any per-song words, and the pipeline reads
it by default — so once a word/phrase is excluded or a preference is set, it
**sticks without re-specifying**. Edit `brain/memory.json` to grow the list.

## Learning brain & recommendations
`lib/hermes/learn.ts` derives an evolving **ArtistProfile** from the vault
(genres, moods, recurring themes, craft strengths, overused words, dark-lean).
`lib/hermes/recommend.ts` turns that profile + memory + **taste** into concrete
suggestions shown in the **Brain · Recommendations** panel: the emotional
contrast to take next, words to retire (one-tap → exclusion), album readiness,
your signature sound, weak-hook craft notes, and the best-fit production pack.

**Learn from edits.** Rewrite the final lyrics in the Song Package and hit
"Save — teach the brain": `lib/hermes/edits.ts` diffs the change into a **taste
model** (`storage.recordTaste`) — words you add are your voice, words you cut are
rejected. A word you keep cutting becomes a one-tap exclusion recommendation, and
your signature vocabulary surfaces back. The brain gets more *you* over time.

**Durability.** The Vault drawer can **export/import** the whole vault as JSON
(`storage.exportVault`/`importVault`) so clearing the browser never loses your
catalog. Scores are honest heuristics (directional signal), and the uniqueness
check is explicitly a *local* guard (vs your vault + clichés, not the internet).

## Expansion packs
The Hit Factory analog of the video studio's scene packs:
`expansion-packs/<name>/pack.json` is a production/style preset with a
ready-to-paste **Suno style string**. Three ship (`drill-dark`, `soul-sample`,
`trap-ballad`); the recommender suggests the one that fits your profile, and
"→ send to Song Lab" prefills a new track from it. Add one by dropping a new
`pack.json` and importing it in `lib/hermes/expansionPacks.ts`.

## Albums & Suno export
`lib/hermes/album.ts` groups vault songs into an album (`buildAlbum`), flags the
arc/length **gaps** (`albumGaps`), and proposes a running order
(`suggestSequence`). The **Albums** drawer creates albums and exports **all Suno
prompts in one copy-paste block** (`lib/hermes/suno.ts` `albumSunoExport` —
per-track title + Style of Music + tagged lyrics). `sunoStyle`/`sunoLyrics` also
power single-track export.

## Song → video (the bridge)
The two studios fuse via `hermes from-song`. From a finished package, hit
**"🎬 Export for video studio"** to download the song JSON, then:

```bash
hermes from-song cold-hard-gold.json   # scaffolds cold-hard-gold/ (lyrics + pack/aspect/brain prefilled)
# render the audio in Suno (the Hit Factory gave you the prompts), save it as
# cold-hard-gold/song/track.mp3
hermes build cold-hard-gold            # -> cold-hard-gold/out/cold-hard-gold.mp4
```

`studio/from-song.mjs` maps the song's genre/mood to a fitting scene pack
(`boom-bap → vhs-lofi`, `retro → retrowave`, …) and dark/aggressive moods to the
`left` brain, writes `song/lyrics.md` from the package sections, and stashes the
Suno style + music-video direction in the project README. The lyrics you wrote in
the Hit Factory become the on-screen, vocal-synced text of the video.

## Safety
Original content only — no copyrighted lyrics, artist mimicry, or scraped
material. The avoid-word list **warns, never blocks**, and is editable in the UI.

## Next lane (not built yet)
Real AI/music provider behind the adapters, Suno/Udio-style prompt export, the
16:9 scene builder wired to the existing video studio, artist/project vault,
release calendar, Stripe credits, team/agent marketplace.
