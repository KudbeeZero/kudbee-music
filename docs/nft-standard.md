# Living-Brain dNFT — Metadata Standard Decision

**Decision: Solana / Metaplex. The dNFT metadata emitted by `lib/hermes/brainSignature.ts`
now follows the Metaplex Token Metadata off-chain JSON standard, not ERC-721.**

## Why (the chain decision, per the repo's own docs)

The repo's stated chain direction was already Solana/Metaplex in three places —
but `toNftMetadata()` emitted a bare **ERC-721** (EVM) metadata shape. Evidence:

- `brain/roadmap.json` → `livingBrainNft`: "Chain mint (Solana/Metaplex) = founder decision."
- `TODO.md`: "dNFT mint on-chain (Solana/Metaplex) — the signature is $0-ready; minting is your call."
- `IDEAS.md` (Living Brain dNFT entry): "Remaining: a `/brain/[id]` static render + the actual
  Solana/Metaplex mint (founder)."

Nothing anywhere in the repo says EVM. So the metadata shape is now aligned with the
documented target before any mint code exists — the cheapest possible time to fix it.

## What changed

`toNftMetadata()` and the `NftMetadata` type in `lib/hermes/brainSignature.ts`:

| Field | Before (ERC-721) | After (Metaplex off-chain JSON) |
| --- | --- | --- |
| `name` | present | present — kept ≤ 32 chars (Metaplex on-chain `name` limit) |
| `symbol` | — | `"HERMES"` (≤ 10 chars, Metaplex on-chain `symbol` limit) |
| `description` | present | unchanged ("utility + identity, not an investment") |
| `image` | present | unchanged (`…/brain/<id>.png`) |
| `animation_url` | present | unchanged (`…/brain/<id>` — the live brain page) |
| `external_url` | — | same URL as the live brain page |
| `seller_fee_basis_points` | — | `0` — royalties are enforced on-chain in the Token Metadata account; this JSON field is the legacy mirror, kept at 0 = no royalty claim until the founder decides |
| `attributes` | 6 traits | **unchanged**: Dominant Hemisphere, Temperature, Signature Rhyme, Songs Made, Becoming You, Primary Emotion |
| `properties` | — | `{ files: [{ uri: image, type: "image/png" }, { uri: livePage, type: "text/html" }], category: "html" }` |

`brainSignature()` and `BrainTraits` are untouched — `deriveArtist()` in
`lib/hermes/artist.ts` depends on them and does not use `toNftMetadata()`.

The function stays **pure, deterministic, $0**: no network, no wallet, no new
dependencies. It is metadata-schema-only.

## BLOCKER NOTE

> Any future mint code MUST target Metaplex Token Metadata (mpl-token-metadata / Umi),
> devnet-first, and nothing may touch mainnet without explicit founder approval; the
> previous ERC-721 shape would have been wrong for the stated chain.

## Still-open prerequisites (honest status)

- **No mint code, wallet code, or web3 dependency exists anywhere in the repo** — none was
  added here. "No live mint transactions" is trivially satisfied.
- The `/brain/[id]` render page does **not** exist yet — `animation_url` points at a page
  that has not been built.
- The hosted snapshot image (`…/brain/<id>.png`) does **not** exist yet.
- The `https://wifidj.xyz/brain/...` URLs are **forward-looking placeholders**, not live
  endpoints. They record the intended shape; they resolve to nothing today.
- The mint itself remains a founder decision (see `brain/roadmap.json`).
