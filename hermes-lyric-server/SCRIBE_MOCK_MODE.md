# SCRIBE Mock Mode — Setup & Usage Guide

## Overview

This document explains how to set up, run, and test the SCRIBE mock mode endpoint without GPU or model loading. Mock mode is CPU-safe and ideal for WIFI DJ Scribe UI testing during development.

## What is Mock Mode?

Mock mode simulates the SCRIBE lyric rewrite endpoint by:
- ✅ Returning realistic alternative lyric lines
- ✅ Running on CPU (no GPU needed)
- ✅ Not loading the 56GB Qwen 14B model
- ✅ Matching the real endpoint request/response format
- ✅ Respecting banned words in requests

When GPU becomes available, toggle off mock mode and the same endpoints use the real trained model.

---

## Quick Start

### 1. Start Mock Server

```bash
cd /teamspace/studios/this_studio/hermes-lyric-server
SCRIBE_MOCK=1 python3 server.py --port 8000
```

Or use the convenience script:

```bash
./run_with_keepalive.sh
```

Expected output:
```
🎭 SCRIBE_MOCK mode enabled - skipping model initialization
Running on http://127.0.0.1:8000
```

### 2. Test Health Endpoint

```bash
curl http://127.0.0.1:8000/scribe/health | python3 -m json.tool
```

Expected response:
```json
{
  "modelLoaded": false,
  "cudaAvailable": false,
  "mockMode": true,
  "serverStatus": "mock",
  "timestamp": "2026-07-05T..."
}
```

### 3. Test Rewrite Endpoint

```bash
curl -X POST http://127.0.0.1:8000/scribe/rewrite \
  -H "Content-Type: application/json" \
  -d '{
    "lineToRewrite": "Now the whole brain wakes when I open up the door",
    "avoidWords": ["echo", "shadow", "flame"]
  }' | python3 -m json.tool
```

Expected response:
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

## Request Format

### Simple Request
```json
{
  "prompt": "..."
}
```

### Rich Context Request (Recommended)
```json
{
  "title": "Song Title",
  "theme": "Song theme",
  "mood": "Song mood",
  "genre": "Genre",
  "section": "Chorus|Verse|Bridge",
  "lineBefore": "Previous line for context",
  "lineToRewrite": "THE LINE TO REWRITE",
  "lineAfter": "Next line for context",
  "avoidWords": ["word1", "word2"],
  "userInstruction": "Optional special instruction"
}
```

---

## Response Format

All responses (mock or real) follow this format:

```json
{
  "alternatives": ["line1", "line2", "line3"],
  "model": "scribe-mock",
  "source": "mock"
}
```

- `alternatives`: Array of exactly 3 lyric line alternatives
- `model`: Either "scribe-mock" (CPU) or "scribe-real-qwen2.5-14b-lora-v1" (GPU)
- `source`: Either "mock" or "lightning-scribe"

---

## Keeping Server Alive

Lightning AI's runtime times out inactive servers after ~10 minutes. Use the keepalive script:

```bash
# Run in a separate terminal while server is running
python3 keepalive.py
```

This pings `/scribe/health` every 8 minutes to keep the session active.

Or use the combined launcher:

```bash
./run_with_keepalive.sh
```

---

## Testing with WIFI DJ

1. **Start mock server:**
   ```bash
   SCRIBE_MOCK=1 python3 server.py --port 8000
   ```

2. **Start WIFI DJ dev server:**
   ```bash
   cd /teamspace/studios/this_studio/kudbee-music
   npm run web:dev
   ```

3. **Configure Scribe endpoint in WIFI DJ:**
   - Set provider endpoint to: `http://127.0.0.1:8000/scribe/rewrite`

4. **Test in Scribe UI:**
   - Open Scribe editor
   - Select a lyric line
   - Choose Lightning/SCRIBE provider
   - Request rewrite
   - Confirm 3 alternatives display

---

## Running Tests

```bash
python3 test_scribe_mock.py
```

Expected output:
```
✅ test_mock_alternatives_basic passed
✅ test_mock_alternatives_avoid_words passed
✅ test_build_scribe_prompt_rich_context passed
✅ test_build_scribe_prompt_simple passed
✅ test_parse_scribe_alternatives_json passed
✅ test_parse_scribe_alternatives_numbered passed
✅ test_mock_generator_uniqueness passed

✅ All tests passed!
```

---

## Switching to Real Model (When GPU Available)

When GPU reconnects, disable mock mode:

```bash
# Simply unset SCRIBE_MOCK or set to 0
python3 server.py --port 8000
```

The server will:
1. Load the real Qwen 14B model
2. Use the LoRA adapter at `/teamspace/studios/this_studio/scribe-runs/scribe-real-qwen2.5-14b-lora-v1/final/`
3. Return real model inference results
4. Same request/response format (no WIFI DJ changes needed)

---

## Troubleshooting

### Server won't start

**Error:** `SCRIBE_MOCK mode not recognized`
- Solution: Use `export SCRIBE_MOCK=1` before running

**Error:** `Port 8000 already in use`
- Solution: `lsof -i :8000` to find process, then `kill -9 <PID>`

### Endpoint returns no response

**Error:** `curl: (7) Failed to connect to 127.0.0.1 port 8000`
- Solution: Verify server is running: `ps aux | grep server.py`
- Solution: Check logs: `tail -50 /tmp/hermes-scribe-mock.log`

### Mock alternatives are too similar

- This is expected behavior for mock mode (simple word substitution)
- Real model will produce more varied and higher-quality rewrites
- Mock is for UI/flow testing, not lyric quality evaluation

---

## File Structure

```
hermes-lyric-server/
├── server.py                 # Main Flask server (mock mode enabled)
├── test_scribe_mock.py       # Unit tests for mock mode
├── start_mock.sh             # Helper to start mock server
├── run_with_keepalive.sh     # Server + keepalive launcher
├── keepalive.py              # Keep-alive ping script (8-min intervals)
└── SCRIBE_MOCK_MODE.md       # This file
```

---

## Files NOT Committed (By Design)

These are excluded from git and should never be committed:

```
scribe-runs/                  # Training artifacts (56GB model, 25MB LoRA)
.env                          # API keys
*.pth, *.lora                 # Model checkpoints
```

---

## Questions?

Refer to the main project docs:
- WIFI DJ: `/teamspace/studios/this_studio/kudbee-music/README.md`
- SCRIBE Training: `/teamspace/studios/this_studio/kudbee-music/docs/scribe-real-training-v1.md`
- Lightning AI: https://lightning.ai/

---

**Last updated:** 2026-07-05  
**Status:** Ready for production testing on CPU
