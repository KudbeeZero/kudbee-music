# Demo songs — with full generation traces

Five original songs, each **minted by the real pipeline** (`lib/hermes/pipeline.ts`,
deterministic seeds) — and each with a **generation trace** showing what every brain
region actually contributed. Proof the "brain" thinks, not just markets. All $0, local,
no API key. Regenerate with `GEN_DEMOS=1 npx vitest run trace`.

> The brain anatomy is an [inspired workflow model](../brain/hemispheres.md), not
> biological. The traces are generated from real code in `lib/hermes/`.

| Song | Genre | Banger score | Trace |
|------|-------|--------------|-------|
| **Midnight Shift** | lo-fi soul hip-hop | 92/100 | [trace](midnight-shift/trace.md) · [song.json](midnight-shift/song.json) |
| **Concrete Garden** | boom-bap hip-hop | 97/100 | [trace](concrete-garden/trace.md) · [song.json](concrete-garden/song.json) |
| **Signal Fade** | synthwave pop | 98/100 | [trace](signal-fade/trace.md) · [song.json](signal-fade/song.json) |
| **Paper Crowns** | drill-influenced trap | 98/100 | [trace](paper-crowns/trace.md) · [song.json](paper-crowns/song.json) |
| **Hometown Ghosts** | acoustic folk-rap | 93/100 | [trace](hometown-ghosts/trace.md) · [song.json](hometown-ghosts/song.json) |

Load any `song.json` into the app at `/hermes` (Vault → Import) to see the full deck.
