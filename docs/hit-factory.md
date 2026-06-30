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

## Safety
Original content only — no copyrighted lyrics, artist mimicry, or scraped
material. The avoid-word list **warns, never blocks**, and is editable in the UI.

## Next lane (not built yet)
Real AI/music provider behind the adapters, Suno/Udio-style prompt export, the
16:9 scene builder wired to the existing video studio, artist/project vault,
release calendar, Stripe credits, team/agent marketplace.
