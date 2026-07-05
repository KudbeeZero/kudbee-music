# SCRIBE Real LoRA V1 — Evaluation Prompts

Three realistic test cases matching real Scribe editor flows.

## Test 1 — Real Chorus Rewrite (Meaning + Cadence)

**Prompt:**
```
Rewrite ONE line from a song, offering 3 alternative phrasings.

Title: Started in the Chat
Theme: turning rough thoughts into release-ready songs with a songwriting brain
Mood: determined, cinematic, hopeful
Genre: melodic rap / alternative hip-hop

Section: [Chorus]
Line before (context, do not rewrite): "I built this song from pieces on the floor"
LINE TO REWRITE: "Now the whole brain wakes when I open up the door"
Line after (context, do not rewrite): "WIFI DJ got a brain underneath"

Keep roughly the same meaning, syllable count, and rhyme role as the original line.
Each alternative must be a single, complete, singable line (no bar numbers, no explanation).

Output ONLY a JSON object in this exact format (no markdown, no extra text):
{"alternatives":["line 1","line 2","line 3"]}
- exactly 3 alternatives, each a string
```

**Expected Output:**
```json
{"alternatives":["line 1","line 2","line 3"]}
```

**Evaluation Criteria:**
- Output shape: Valid JSON with exactly 3 alternatives
- Meaning preservation: Keeps the "brain awakens when door opens" metaphor
- Cadence/singability: Maintains 11-14 syllables, natural phrasing
- Context fit: Works with floor→door rhyme, fits with "brain underneath" line after
- Originality: Not generic, feels like real artist voice
- Ready for UI: Each line can be displayed as a single alternative in the Scribe editor

---

## Test 2 — Avoid-Word Repair (Constraint Handling)

**Prompt:**
```
Rewrite ONE line from a song, offering 3 alternative phrasings.

Title: Late Signal
Theme: rebuilding creativity after setbacks
Mood: reflective, focused, resilient
Genre: melodic rap / alternative hip-hop

Section: [Verse]
Line before (context, do not rewrite): "I carried all my doubt through the city rain"
LINE TO REWRITE: "I kept the broken pieces tucked inside my chest"
Line after (context, do not rewrite): "But I still found rhythm when I needed rest"

Avoid words: broken, scars, pain, flame, shadow, echo
Rhyme role: should loosely rhyme with chest/rest
Syllable target: 10-14 syllables
User instruction: remove the banned word and keep the line emotionally honest

Keep roughly the same meaning, syllable count, and rhyme role as the original line.
Each alternative must be a single, complete, singable line (no bar numbers, no explanation).

Output ONLY a JSON object in this exact format (no markdown, no extra text):
{"alternatives":["line 1","line 2","line 3"]}
- exactly 3 alternatives, each a string
```

**Expected Output:**
```json
{"alternatives":["line 1","line 2","line 3"]}
```

**Evaluation Criteria:**
- Output shape: Valid JSON with exactly 3 alternatives
- Avoid-word compliance: Must NOT use "broken", "scars", "pain", "flame", "shadow", "echo"
- Meaning preservation: Keeps the "holding pieces of myself" emotional core
- Cadence/singability: Maintains 10-14 syllables, chest/rest rhyme scheme
- Context fit: Works with "I carried doubt through rain" before and "found rhythm" after
- Emotional honesty: Doesn't become generic or lose resilience theme
- Ready for UI: Each alternative is a real replacement that maintains the verse

---

## Test 3 — Hook Tightening (Punchiness)

**Prompt:**
```
Rewrite ONE line from a song, offering 3 alternative phrasings.

Title: Release Ready
Theme: WIFI DJ turns rough ideas into complete release packages
Mood: ambitious, polished, urgent
Genre: hip-hop / pop rap / startup anthem

Section: [Hook]
Line before (context, do not rewrite): "Drop the thought and let the engine start"
LINE TO REWRITE: "Turn rough ideas into release-ready songs"
Line after (context, do not rewrite): "Scribe every line till it hits the heart"

Hook/theme: make the app promise instantly memorable
Syllable target: 8-12 syllables
User instruction: make it sound like a real hook, not a marketing sentence

Keep roughly the same meaning, syllable count, and rhyme role as the original line.
Each alternative must be a single, complete, singable line (no bar numbers, no explanation).

Output ONLY a JSON object in this exact format (no markdown, no extra text):
{"alternatives":["line 1","line 2","line 3"]}
- exactly 3 alternatives, each a string
```

**Expected Output:**
```json
{"alternatives":["line 1","line 2","line 3"]}
```

**Evaluation Criteria:**
- Output shape: Valid JSON with exactly 3 alternatives
- Hook-worthiness: Punchy, memorable, slogan-like without being marketing-speak
- Meaning preservation: Keeps "rough → release" transformation core
- Cadence/singability: 8-12 syllables, works as a hook chant
- Context fit: Works with "drop thought, engine start" before and "scribe every line" after
- Artist voice: Feels like confident creator energy, not corporate
- Ready for UI: Each line works as a production hook alternative

---

## Scoring Rubric (0-10 per criterion)

For each test:
- **Output shape:** Does it return exactly 3 alternatives in valid JSON? (0-10)
- **Meaning preservation:** Does it keep the core intent? (0-10)
- **Cadence/singability:** Can a singer actually perform it? (0-10)
- **Context fit:** Does it work with surrounding lines? (0-10)
- **Avoid-word compliance:** (Test 2 only) Does it respect banned-words list? (0-10)
- **Originality:** Not generic, maintains artist voice? (0-10)
- **Ready for Scribe UI:** Can be displayed as an immediate alternative? (yes/no)

**Total possible:** 6 criteria × 10 points = 60 points per test, 180 max across all three

---

## Comparison Protocol

After evaluation, run the same three prompts against:
1. **Base model:** Qwen2.5-14B-Instruct (no LoRA)
2. **SCRIBE adapter:** The trained LoRA adapter

Compare:
- Consistency with 3-alternative format
- Adherence to "LINE TO REWRITE:" structure
- Avoid-word compliance
- Hook sharpness and relevance
- Readiness for Scribe UI production

The adapter is successful if it outperforms the base model on Scribe-specific criteria (format compliance, constraint handling, context awareness).
