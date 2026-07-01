# Demo songs — with full generation traces

Five original songs, each **minted by the real pipeline** (`lib/hermes/pipeline.ts`,
deterministic seeds) — and each with a **generation trace** showing what every brain
region actually contributed. Proof the "brain" thinks, not just markets. All $0, local,
no API key. Regenerate with `GEN_DEMOS=1 npx vitest run trace`.

**▶ [Open the interactive demo gallery](../../docs/demo-gallery.html)** — or open any
`trace.html` below: a brain heat-map, collapsible per-region cards, and a copy-paste
Suno prompt, all in one self-contained file.

> The brain anatomy is an [inspired workflow model](../brain/hemispheres.md), not
> biological. The traces are generated from real code in `lib/hermes/`.

| Song | Genre | Banger score | Trace |
|------|-------|--------------|-------|
| **Midnight Shift** | lo-fi soul hip-hop | 93/100 | [explore](midnight-shift/trace.html) · [trace.md](midnight-shift/trace.md) · [song.json](midnight-shift/song.json) |
| **Concrete Garden** | boom-bap hip-hop | 92/100 | [explore](concrete-garden/trace.html) · [trace.md](concrete-garden/trace.md) · [song.json](concrete-garden/song.json) |
| **Signal Fade** | synthwave pop | 93/100 | [explore](signal-fade/trace.html) · [trace.md](signal-fade/trace.md) · [song.json](signal-fade/song.json) |
| **Paper Crowns** | drill-influenced trap | 93/100 | [explore](paper-crowns/trace.html) · [trace.md](paper-crowns/trace.md) · [song.json](paper-crowns/song.json) |
| **Hometown Ghosts** | acoustic folk-rap | 93/100 | [explore](hometown-ghosts/trace.html) · [trace.md](hometown-ghosts/trace.md) · [song.json](hometown-ghosts/song.json) |

Load any `song.json` into the app at `/hermes` (Vault → Import) to see the full deck.
