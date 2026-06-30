# Build a scene pack

A **scene pack** is a visual style: a palette, fonts, and a set of scene modules.
The built-in pack is [`neo-noir`](https://github.com/KudbeeZero/kudbee-music/blob/main/scene-packs/neo-noir/pack.json).

## Anatomy (`scene-packs/<name>/pack.json`)
```json
{
  "name": "retrowave",
  "palette": { "bg": ["#0b0220"], "accent": ["#ff2e88", "#21d4fd"] },
  "fonts": { "display": "Anton", "body": "Oswald" },
  "scenes": ["grid", "sun", "title", "lyric"],
  "post": ["scanlines", "chromatic-aberration", "grain"]
}
```

## Adding scenes
Each scene is a draw function in `studio/player.html` — `scene<Name>(t, f, loud)`
— that paints a background for the current frame. Keep it **deterministic**
(drive motion from `t`/`f`/`loud`, never wall-clock or unseeded randomness) and
**on palette**. Open a [scene-pack issue](https://github.com/KudbeeZero/kudbee-music/issues/new?template=scene-pack.md)
to claim one.
