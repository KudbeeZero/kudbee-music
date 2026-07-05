# Training-data input (optional, drop folder)

**Who reads this:** the founder, before running `npm run prepare-training-data`. This
folder is the optional third source (alongside the golden set and $0 synthetic
generation — see `lib/hermes/__tests__/trainingData.test.ts`) for the Lightning AI
LoRA fine-tuning dataset. See `docs/lightning-plan.md` → "Training-data prep" for the
full picture.

## What to drop here

Any of these, exported from the live app (Vault drawer → Export):

- A full **vault export** (`{kind:'hermes-vault', songs:[...], albums:[...]}`)
- A full **brain export** (`{kind:'hermes-brain', vault:{songs:[...]}, ...}`)
- A loose **`song.json`** (a single `SongPackage`)

Every file is parsed and validated through the same `sanitizeSong()` boundary the app's
own vault import uses (`lib/hermes/storage.ts`) — a malformed or hostile file is silently
skipped, never trusted as-is.

## What NOT to drop here

Nothing containing a Claude/Lightning API key — vault and brain exports never include
one (`exportBrain()` deliberately excludes it), but double-check before adding any other
file. Contents of this folder (except this README) are gitignored, so nothing you drop
here can accidentally get committed — but a stray key would still be sitting in a
gitignored file with the current dataset. If unsure, don't.

## Empty is fine

`npm run prepare-training-data` works with zero files here — it just uses the golden set
+ synthetic generation.
