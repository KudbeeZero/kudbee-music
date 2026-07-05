# SCRIBE Mock Mode — Quick Start (5 Minutes)

## For: WIFI DJ Developers & ChatGPT AI Assistants

---

## What You Need to Know (TL;DR)

✅ **SCRIBE mock mode is CPU-safe endpoint testing without GPU**
- No 56GB Qwen 14B model loading
- Returns realistic lyric alternatives
- Perfect for WIFI DJ Scribe UI testing
- Same endpoint works with real model when GPU available

---

## 1. Start Server (30 seconds)

```bash
cd /teamspace/studios/this_studio/hermes-lyric-server
SCRIBE_MOCK=1 python3 server.py --port 8000
```

**Expected output:**
```
🎭 SCRIBE_MOCK mode enabled - skipping model initialization
Running on http://127.0.0.1:8000
```

---

## 2. Test It Works (15 seconds)

```bash
curl http://127.0.0.1:8000/scribe/health | python3 -m json.tool
```

**Expected response:**
```json
{
  "mockMode": true,
  "serverStatus": "mock",
  "cudaAvailable": false
}
```

✅ You're done! Server is running.

---

## 3. Connect WIFI DJ (2 minutes)

In WIFI DJ Scribe settings:
```
Endpoint URL: http://127.0.0.1:8000/scribe/rewrite
```

---

## 4. Test in Scribe UI (1 minute)

1. Open Scribe editor
2. Select a lyric line
3. Click "Rewrite with Lightning"
4. See 3 alternatives appear

---

## Full Request/Response Example

### Send This
```bash
curl -X POST http://127.0.0.1:8000/scribe/rewrite \
  -H "Content-Type: application/json" \
  -d '{
    "lineToRewrite": "Now the whole brain wakes when I open up the door",
    "avoidWords": ["echo", "shadow"]
  }'
```

### Get This Back
```json
{
  "alternatives": [
    "Now the entire brain wakes when I open up the door",
    "Now the brain whole wakes when I open up the door",
    "Now the whole brain awakes when I open up the door"
  ],
  "model": "scribe-mock",
  "source": "mock"
}
```

---

## Keep Server Alive (Optional)

Lightning AI times out after 10 minutes. In a separate terminal:

```bash
python3 keepalive.py
```

Or use the combined launcher:

```bash
./run_with_keepalive.sh
```

---

## Switch to Real Model (When GPU Available)

```bash
# Just remove SCRIBE_MOCK=1, that's it
python3 server.py --port 8000
```

Same endpoint, same request format, same WIFI DJ app. Server will:
- Load real Qwen 14B model
- Use trained LoRA adapter
- Return real model inference results

No code changes needed.

---

## Troubleshooting (30 seconds)

**Q: Port 8000 already in use?**
```bash
lsof -i :8000  # Find process
kill -9 <PID>  # Kill it
```

**Q: Server won't start?**
```bash
SCRIBE_MOCK=1 python3 server.py --port 8000
```

**Q: No response from endpoint?**
```bash
ps aux | grep server.py  # Check if running
curl http://127.0.0.1:8000/scribe/health  # Test connection
```

---

## File Structure

```
hermes-lyric-server/
├── server.py                    ← Main Flask server
├── test_scribe_mock.py          ← Unit tests
├── keepalive.py                 ← Keep-alive pinger
├── run_with_keepalive.sh        ← Combined launcher
├── SCRIBE_MOCK_MODE.md          ← Full documentation
├── ARCHITECTURE.md              ← Deep dive
└── QUICK_START.md               ← This file
```

---

## Key Files NOT in Git (By Design)

```
scribe-runs/                    ← 56GB model + LoRA (local only)
.env                            ← Secrets (never commit)
*.pth, *.lora                   ← Model checkpoints (never commit)
```

---

## Commands Cheat Sheet

| Task | Command |
|------|---------|
| Start mock server | `SCRIBE_MOCK=1 python3 server.py --port 8000` |
| Start with keepalive | `./run_with_keepalive.sh` |
| Test health | `curl http://127.0.0.1:8000/scribe/health` |
| Run tests | `python3 test_scribe_mock.py` |
| Keep alive | `python3 keepalive.py` |
| Stop server | `Ctrl+C` or `pkill -f server.py` |

---

## Request Fields (Full Reference)

### Required
- `lineToRewrite`: The lyric line to rewrite

### Optional
- `title`: Song title
- `theme`: Song theme/topic
- `mood`: Mood/emotion
- `genre`: Music genre
- `section`: Verse/Chorus/Bridge
- `lineBefore`: Previous line for context
- `lineAfter`: Next line for context
- `avoidWords`: Array of words to avoid in alternatives
- `userInstruction`: Special instructions

### Minimal Request
```json
{
  "lineToRewrite": "Some lyric line here"
}
```

### Full Request (Recommended)
```json
{
  "title": "Song Name",
  "theme": "The main idea",
  "mood": "How it feels",
  "genre": "Music type",
  "section": "Chorus",
  "lineBefore": "Previous line",
  "lineToRewrite": "LINE TO REWRITE",
  "lineAfter": "Next line",
  "avoidWords": ["word1", "word2"],
  "userInstruction": "Keep same rhyme"
}
```

---

## What Happens Behind the Scenes

```
You:  "Give me alternatives for this line"
     ↓
  Server: "Is SCRIBE_MOCK=1?"
     ├─ YES → Use mock generator (CPU) ← 50ms
     └─ NO → Load Qwen 14B (GPU) → Inference ← 500ms
     ↓
You: Get 3 alternatives back
```

---

## Performance

| Metric | Mock Mode | Real Mode |
|--------|-----------|-----------|
| Startup | 2 sec | 30 sec |
| Response | 50 ms | 500 ms |
| GPU | Not used | Required |
| CPU | Low | Minimal |
| Quality | Good for UI | Production |

---

## Next Steps

1. ✅ **Start mock server** (this page)
2. ✅ **Connect WIFI DJ** (this page)
3. ✅ **Test Scribe UI** (this page)
4. 📖 **Read full docs** → `SCRIBE_MOCK_MODE.md`
5. 🏗️ **Understand architecture** → `ARCHITECTURE.md`
6. 🚀 **Deploy with GPU** → Switch off SCRIBE_MOCK

---

## Questions?

See:
- **Usage questions** → `SCRIBE_MOCK_MODE.md`
- **Architecture questions** → `ARCHITECTURE.md`
- **Code questions** → Inline comments in `server.py`

---

**Last updated:** 2026-07-05  
**Status:** ✅ Production-ready for CPU testing
