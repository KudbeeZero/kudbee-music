# Quickstart

```bash
git clone https://github.com/KudbeeZero/kudbee-music && cd kudbee-music
npm install
# ffmpeg: a static build is expected at .bin/ffmpeg (or set $FFMPEG / $FFPROBE)

node bin/hermes prep        # extract hero-clip frames from assets/hero-clip-*.mp4
node bin/hermes preview     # render a short slice -> out/preview.mp4
node bin/hermes build       # full render -> out/kudbee-music-video-1080p.mp4
```

## Use your own song
1. Drop your track at `song/track.mp3`.
2. Put the lyrics in `song/lyrics.md`.
3. Add reference clips as `assets/hero-clip-01.mp4`, `-02`, …
4. (Optional) `node bin/hermes transcribe` to force-align lyrics to the vocal
   (needs `pip install faster-whisper`).
5. `node bin/hermes build`.

## Vertical / square
```bash
node bin/hermes render --aspect 9:16   # Shorts / TikTok / Reels
node bin/hermes render --aspect 1:1    # square
```
