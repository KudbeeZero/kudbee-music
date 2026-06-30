# Example — "Cold Hard Gold"

A complete **Hit Factory song package**, minted by the real pipeline
(`lib/hermes/pipeline.ts`, deterministic seed) — an aggressive boom-bap come-up
anthem. This is the flagship example: it seeds the web app's empty state so a
first-time visitor sees a finished, high-scoring package immediately.

- **Banger score:** 99/100 · **Uniqueness:** 100/100
- **Lead hook:** *"Every step a promise that I build"*

## See it in the app
Open `/hermes` and click **"▶ See a finished example — Cold Hard Gold"**. The full
package loads into the deck (agents, lyrics, production, scores) and into your vault,
so the Brain · Recommendations panel has something to learn from right away.

## Turn it into a music video (both studios, one loop)
```bash
hermes from-song examples/cold-hard-gold/song.json --name cold-hard-gold
# → scaffolds a video project; its README has a one-click Suno link + Style + Lyrics
# 1) render the audio in Suno, save it as cold-hard-gold/song/track.mp3
# 2) hermes build cold-hard-gold     → cold-hard-gold/out/cold-hard-gold.mp4
```
The bridge auto-maps boom-bap → the `vhs-lofi` scene pack and the hard/aggressive
mood → `brain=left`. `song.json` is the exact shape the Vault export produces, so
anything you make in the Hit Factory flows through the same path.
