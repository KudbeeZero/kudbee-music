# HERMES — launch kit

Everything you need to post when we go public. (Repo must be **public** and
merged to **main** first; set the social preview to `media/social-preview.png`
in *Settings → General → Social preview*.)

## Repo topics (Settings → Topics)
`music-video` `generative-art` `ffmpeg` `creative-coding` `ai` `agents`
`lyric-video` `kinetic-typography` `video-generation` `nodejs` `canvas` `music`

## One-liner
HERMES turns a song into a finished, vocal-synced music video — entirely from code (headless Chromium + ffmpeg, no editor, $0).

---

## Show HN
**Title:** Show HN: HERMES – turn a song into a music video, entirely from code

**Body:**
I built an agent-driven studio that turns a song + a few reference clips into a
finished, vocal-synced 1080p music video — composited frame-by-frame in a headless
browser and encoded with ffmpeg. No editor, no paid services.

How it works: it analyzes the audio (BPM/beats/loudness), force-aligns your exact
lyrics to Whisper word-timestamps, arranges sections + per-line shots (with a
max-hold cutter so nothing sits longer than ~4.6s), and renders a deterministic
`<canvas>` — hero footage or procedural neo-noir scenes, split-tone grade, grain,
and kinetic-typography lyrics — then muxes your audio.

Because the whole video is a deterministic program (each frame is a pure function
of its index + the audio), it's reproducible and diffable — change a line, re-run.

Demo video + the full pipeline are in the README. Visual styles are "scene packs"
and adding one is the easiest way to contribute. Feedback welcome.

Repo: https://github.com/KudbeeZero/kudbee-music

## Reddit — r/SideProject
**Title:** I made a tool that turns a song into a music video entirely from code (no editor)

**Body:** (same gist as Show HN; lead with the demo GIF, end with "what would you
add?" — Reddit rewards a question + replying to every comment for the first 2 hrs.)

## Reddit — r/programming
**Title:** HERMES: a deterministic, agent-driven music-video compositor (Chromium + ffmpeg)

**Body:** Lead with the *technical* angle — frame-as-pure-function determinism,
forced lyric alignment + ASR recovery, the max-hold cutter, scene-pack plugin model.

## X / Twitter thread
1/ I turned a song into a full music video — with zero video editor. Just code:
headless Chromium + ffmpeg. 🧵 [attach the demo GIF/video]

2/ Every frame is a pure function of its index + the audio's loudness. So the whole
video is a deterministic program — reproducible, diffable, re-renderable.

3/ It force-aligns your exact lyrics to Whisper word-timestamps so on-screen text
lands on the vocal — and recovers when ASR chokes on a choir hook.

4/ Sections + per-line shot cuts, beat-snapped, with a rule that nothing holds >~4.6s.
Procedural neo-noir scenes + your footage, graded, grained, kinetic type.

5/ Visual styles are "scene packs" — drop-in plugins. Open source, MIT.
⭐ https://github.com/KudbeeZero/kudbee-music

## Posting tips
- Post Tue–Thu, ~8–10am ET. Show HN: submit, then add a top comment with context.
- Reply to every comment in the first 2 hours — engagement drives ranking.
- Lead every post with the **demo** (GIF or 30s clip). The demo is the hook.
