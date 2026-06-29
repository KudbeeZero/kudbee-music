import json, sys
from faster_whisper import WhisperModel
model = WhisperModel("base", device="cpu", compute_type="int8")
segments, info = model.transcribe("song/track.mp3", word_timestamps=True, vad_filter=True,
                                  beam_size=5, language="en")
words=[]; segs=[]
for s in segments:
    segs.append({"start":round(s.start,2),"end":round(s.end,2),"text":s.text.strip()})
    if s.words:
        for w in s.words:
            words.append({"w":w.word.strip(),"start":round(w.start,2),"end":round(w.end,2)})
json.dump({"segments":segs,"words":words}, open("song/whisper.json","w"))
print(f"segments={len(segs)} words={len(words)} dur={info.duration:.1f}")
for s in segs[:12]: print(f"  {s['start']:6.2f}-{s['end']:6.2f}  {s['text']}")
