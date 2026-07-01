# Self-hosted fonts

Bundled locally (not fetched at build/runtime) so the studio's typography works
**offline and $0** — no Google Fonts call, no CDN dependency, deterministic CI builds.

| File | Family | Weight | Role |
|------|--------|--------|------|
| `SpaceGrotesk-500.woff2` / `SpaceGrotesk-700.woff2` | Space Grotesk | 500 / 700 | display — brand, headings, scores |
| `Inter-400.woff2` / `Inter-600.woff2` | Inter | 400 / 600 | body — text, labels, controls |

Both families are licensed under the **SIL Open Font License 1.1** (freely usable and
redistributable, including bundling in this repo):

- **Space Grotesk** — © Florian Karsten. https://github.com/floriankarsten/space-grotesk
- **Inter** — © The Inter Project Authors. https://github.com/rsms/inter

`latin` subsets from [Fontsource](https://fontsource.org). Wired via `next/font/local`
in `app/layout.tsx`, exposed as the `--font-display` / `--font-body` CSS variables.
