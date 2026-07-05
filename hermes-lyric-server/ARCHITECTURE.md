# SCRIBE Mock Mode — Architecture & Implementation

## Overview

This document explains how the SCRIBE mock mode works, its architecture, and how to extend it.

---

## Architecture

### System Design

```
┌─────────────────────────────────────┐
│        WIFI DJ Web App              │
│  (Scribe Editor Component)          │
└──────────────┬──────────────────────┘
               │
               │ POST /scribe/rewrite
               │ (JSON request)
               │
┌──────────────▼──────────────────────┐
│   Flask Server (server.py)          │
│                                     │
│  Environment Check:                 │
│  ├─ SCRIBE_MOCK=1? → Mock Mode     │
│  └─ GPU Available? → Real Mode     │
└──────────────┬──────────────────────┘
               │
        ┌──────┴──────┐
        │             │
    [MOCK MODE]   [REAL MODE]
        │             │
    ┌───▼────┐   ┌────▼─────┐
    │ Mock    │   │ Qwen 14B  │
    │ Gen     │   │ + LoRA    │
    │ (CPU)   │   │ (GPU)     │
    └───┬────┘   └────┬─────┘
        │             │
        └──────┬──────┘
               │
        ┌──────▼──────────┐
        │  JSON Response  │
        │ (3 alternatives)│
        └─────────────────┘
```

### Request/Response Flow

1. **WIFI DJ sends request** to `/scribe/rewrite`
   - Contains lyric line to rewrite
   - Contains metadata (title, mood, genre, etc.)
   - Contains banned words list

2. **Server checks environment**
   - If `SCRIBE_MOCK=1`: Use mock generator
   - Else: Load real model and run inference

3. **Server returns JSON**
   - 3 alternative lyric lines
   - Metadata (model name, source)

4. **WIFI DJ displays alternatives** in Scribe editor UI

---

## Mock Mode Implementation

### Code Location: `server.py`

#### Function: `generate_scribe_alternatives_mock()`
**Purpose:** Generate realistic lyric alternatives without model loading

**Location:** Lines ~123-179

**How it works:**
```python
def generate_scribe_alternatives_mock(line_to_rewrite: str, avoid_words: list = None) -> list:
    """Generate realistic mock alternatives for a lyric line."""
    # Strategy 1: Swap key word with synonym
    # Strategy 2: Reorder words slightly
    # Strategy 3: Change tense/form
    # Fill remaining slots
    # Return exactly 3 unique alternatives
```

**Example:**
```python
Input:  "Now the whole brain wakes when I open up the door"
Output: [
  "Now the entire brain wakes when I open up the door",
  "Now the brain whole wakes when I open up the door",
  "Now the whole brain awakes when I open up the door"
]
```

#### Endpoint: `POST /scribe/rewrite`
**Location:** Lines ~274-395

**When SCRIBE_MOCK=1:**
1. Parse request JSON
2. Extract `lineToRewrite` field
3. Extract `avoidWords` field (if present)
4. Call `generate_scribe_alternatives_mock()`
5. Return JSON with mock alternatives

**When SCRIBE_MOCK=0/unset:**
1. Check GPU available
2. Load Qwen 14B + LoRA adapter
3. Run inference
4. Parse model output
5. Return JSON with real alternatives

#### Health Check: `GET /scribe/health`
**Location:** Lines ~109-118

Returns server status including:
- `mockMode`: Boolean (true if SCRIBE_MOCK=1)
- `serverStatus`: "mock" or "ready" or "gpu_required"
- `cudaAvailable`: Boolean
- `modelLoaded`: Boolean

---

## File Organization

### Production Files
```
server.py
├─ generate_scribe_alternatives_mock()     # Mock generator
├─ build_scribe_prompt()                   # Prompt builder
├─ parse_scribe_alternatives()             # Output parser
├─ @app.route("/scribe/health")            # Health check
├─ @app.route("/scribe/rewrite")           # Main endpoint
└─ initialize_generator()                  # Model init (skipped in mock)
```

### Test Files
```
test_scribe_mock.py
├─ test_mock_alternatives_basic()
├─ test_mock_alternatives_avoid_words()
├─ test_build_scribe_prompt_rich_context()
├─ test_build_scribe_prompt_simple()
├─ test_parse_scribe_alternatives_json()
├─ test_parse_scribe_alternatives_numbered()
└─ test_mock_generator_uniqueness()
```

### Helper Scripts
```
start_mock.sh                # Export SCRIBE_MOCK=1 and start server
run_with_keepalive.sh        # Start server + keepalive together
keepalive.py                 # Ping server every 8 minutes
test_server.sh               # Health check test
```

---

## Environment Variables

| Variable | Value | Effect |
|----------|-------|--------|
| `SCRIBE_MOCK` | `1` | Enable mock mode (skip model loading) |
| `SCRIBE_MOCK` | `0` or unset | Disable mock mode (load real model) |
| `SCRIBE_API_KEY` | Any string | Enable API key auth via `X-SCRIBE-KEY` header |
| `LOG_LEVEL` | `DEBUG`, `INFO`, `WARNING`, `ERROR` | Logging level |

---

## Data Flow for Mock Mode

### Input JSON Structure
```json
{
  "title": "Started in the Chat",
  "theme": "songwriting brain",
  "mood": "determined, cinematic, hopeful",
  "genre": "melodic rap",
  "section": "Chorus",
  "lineBefore": "I built this song from pieces on the floor",
  "lineToRewrite": "Now the whole brain wakes when I open up the door",
  "lineAfter": "WIFI DJ got a brain underneath",
  "avoidWords": ["echo", "shadow", "flame", "scars", "pain", "broken"],
  "userInstruction": "Keep same meaning and syllable count"
}
```

### Processing Steps
1. Extract `lineToRewrite` from request
2. Extract `avoidWords` list (default: empty)
3. Call mock generator:
   ```python
   alts = generate_scribe_alternatives_mock(
     line_to_rewrite="Now the whole brain wakes when I open up the door",
     avoid_words=["echo", "shadow", "flame", "scars", "pain", "broken"]
   )
   ```
4. Generator returns 3 alternatives (all unique, none contain banned words)
5. Build JSON response:
   ```json
   {
     "alternatives": ["...", "...", "..."],
     "model": "scribe-mock",
     "source": "mock"
   }
   ```

### Output JSON Structure
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

## Switching Between Mock and Real Mode

### Mock Mode (CPU)
```bash
SCRIBE_MOCK=1 python3 server.py --port 8000
```
- No GPU needed
- Instant startup (< 2 seconds)
- Limited rewrite quality (word substitution)
- Perfect for UI/flow testing

### Real Mode (GPU)
```bash
python3 server.py --port 8000
```
- Requires GPU with CUDA
- Slow startup (load 56GB model)
- High-quality rewrites (trained LoRA adapter)
- For production use and evaluation

### Important: No Code Changes Needed
Switching between modes requires **only** changing the environment variable. The WIFI DJ app doesn't need to change anything—same endpoint, same request/response format.

---

## Testing Strategy

### Unit Tests (CPU-safe)
```bash
python3 test_scribe_mock.py
```
Tests:
- Alternative generation (3 unique results)
- Banned word filtering
- Prompt building (rich context)
- JSON parsing
- Edge cases

### Integration Tests (CPU-safe)
```bash
# Start server
SCRIBE_MOCK=1 python3 server.py --port 8000 &

# Test health endpoint
curl http://127.0.0.1:8000/scribe/health

# Test rewrite endpoint
curl -X POST http://127.0.0.1:8000/scribe/rewrite \
  -H "Content-Type: application/json" \
  -d '{"lineToRewrite": "...", "avoidWords": [...]}'
```

### End-to-End Tests (requires WIFI DJ)
1. Start mock server
2. Start WIFI DJ web app
3. Open Scribe editor
4. Select a line
5. Request rewrite
6. Verify 3 alternatives display

---

## Limitations & Known Issues

### Mock Mode Limitations
- **Low quality rewrites**: Simple word substitution only
- **No semantic understanding**: May produce awkward word order
- **Limited vocabulary**: Hardcoded synonym dictionary
- **No rhyme/meter preservation**: Not validated

### Solutions
When GPU available:
- Disable mock mode
- Real model produces semantically sound rewrites
- Trained on 212 real provider-contract examples
- Validates rhyme scheme and syllable count

---

## Extension Points

### To Improve Mock Generator
Edit `generate_scribe_alternatives_mock()` in `server.py`:

```python
# Current: Simple word substitution
replacements = {
    "whole": "entire",
    "wakes": "comes alive",
    # Add more here
}

# Future: Use thesaurus API or embedding-based similarity
# Future: Use TF-IDF to identify key words to replace
# Future: Use POS tagging to swap semantic roles
```

### To Add More Strategies
Add to `generate_scribe_alternatives_mock()`:

```python
# Strategy 4: Metaphor swap
# Strategy 5: Synonym combination
# Strategy 6: Passive/active voice flip
```

### To Add Real-Time Monitoring
Use keepalive.py as template:

```python
# Current: Pings health endpoint every 8 minutes
# Future: Monitor log files for errors
# Future: Alert on model inference failures
# Future: Track response times
```

---

## Deployment Checklist

- [ ] Mock mode tested on CPU (no GPU)
- [ ] WIFI DJ connects to `/scribe/rewrite` endpoint
- [ ] Scribe UI displays 3 alternatives
- [ ] Banned words are respected
- [ ] Server stays alive with keepalive script
- [ ] All unit tests pass
- [ ] No model files committed to git
- [ ] Endpoint ready for real model swap

---

## Performance Characteristics

### Mock Mode (CPU)
- **Startup time**: ~2 seconds
- **Response time**: ~50ms
- **Memory**: ~500MB
- **CPU**: ~10% during request
- **GPU**: Not used

### Real Mode (GPU)
- **Startup time**: ~30 seconds (model load)
- **Response time**: ~500ms (inference)
- **Memory**: ~60GB (model + cache)
- **CPU**: Minimal (offloaded to GPU)
- **GPU**: ~95% during inference

---

**Last updated:** 2026-07-05  
**Audience:** Developers, ChatGPT AI Assistants  
**Status:** Production-ready for CPU testing
