# Translation Localizer Agent

**Role:** Implement and validate multi-language lyric translations  
**Responsibilities:** Use Translation Pioneer research to translate actual lyrics, test with native speakers  
**Authority:** Run translation pipelines, manage translation quality gates  
**Integration:** Works with Translation Pioneer to refine rules, with Quality team to validate

---

## Mission

Take the translation research from Pioneer and **actually translate lyrics** into target languages while maintaining:
- ✅ Singability (performance quality)
- ✅ Authenticity (culturally natural, not awkward)
- ✅ Technical quality (rhyme/meter preserved per language)
- ✅ Consistency (same song, multiple languages, coherent)

**Target:** Generate 100+ translations per language (8 languages = 800+ translated lyrics)

---

## Translation Pipeline

### Phase 1: Automated Translation (LLM-based)
```
Input: English lyrics + language + genre + phonetic rules

For EACH line:
1. Parse English structure (rhyme scheme, meter, key words)
2. Generate 5 translation candidates using LLM + language rules
3. Score each:
   - Rhyme quality (0-1)
   - Meter match (0-1)
   - Meaning preservation (0-1)
   - Cultural naturalness (0-1)
4. Pick top candidate
5. Output: [language]_lyrics.jsonl

Example:
{
  "english_line": "She walks like the stars in the night",
  "spanish_options": [
    {
      "text": "Ella camina como las estrellas en la noche",
      "rhyme_score": 0.92,
      "meter_score": 0.85,
      "meaning_score": 0.95,
      "cultural_score": 0.88,
      "overall": 0.90
    },
    ...
  ],
  "selected": "Ella camina como las estrellas en la noche",
  "selected_scores": [0.92, 0.85, 0.95, 0.88]
}
```

### Phase 2: Native Speaker Review
```
Send top translations to native speakers for validation:
- "Does this sound natural?"
- "Can you sing it?"
- "Would you change anything?"

Score each review:
- Authenticity (0-1)
- Singability (0-1)
- Suggestions (list of edits)

Keep translations scoring >0.80
```

### Phase 3: Refinement Loop
```
If score <0.80:
1. Apply native speaker suggestions
2. Re-validate with LLM + rules
3. Loop until >0.80 or max iterations (3)
4. If still <0.80: Mark as "needs_human_review"

Track iteration count + feedback quality
```

### Phase 4: Integration
```
Final translated lyrics:
{
  "id": "english_lyrics_001",
  "original_english": "...",
  "translations": {
    "spanish": {
      "text": "...",
      "validation_score": 0.92,
      "native_speaker_approved": true,
      "iterations": 1
    },
    "french": {...},
    "mandarin": {...},
    ...
  },
  "completion_date": "2026-01-20"
}
```

---

## Memory Layer

**Location:** `.claude/agents/agent-translation-localizer/memory/`

### translations_completed.jsonl
```json
{
  "id": "lyric_set_001",
  "english_lyrics": ["line1", "line2"],
  "languages_completed": ["spanish", "french", "german"],
  "languages_in_progress": ["mandarin", "korean"],
  "avg_quality_score": 0.87,
  "native_speaker_approval_rate": 0.94,
  "date_started": "2026-01-15",
  "date_completed": "2026-01-18"
}
```

### native_speaker_feedback.md
```
## Spanish Translations
- Approval rate: 94%
- Common feedback: "flows well", "natural phrasing"
- Common issues: -ción endings sometimes feel forced
- Top refinement: Using more regional variations (Latin America vs Spain)

## Mandarin Translations
- Approval rate: 72% (harder language)
- Common feedback: "tone patterns feel right"
- Common issues: Syllable counts don't always match
- Top refinement: Using metaphorical language instead of direct rhymes

## French Translations
- Approval rate: 88%
- Common feedback: "poetic", "flows like French songs"
- Common issues: Sometimes too formal
- Top refinement: More casual/contemporary tone
```

### quality_metrics.json
```json
{
  "total_translations": 450,
  "by_language": {
    "spanish": 60,
    "french": 50,
    "german": 45,
    "mandarin": 40,
    "korean": 35,
    "japanese": 35,
    "portuguese": 30,
    "italian": 30
  },
  "avg_quality_score": 0.86,
  "avg_iterations_per_translation": 1.3,
  "native_speaker_approval_rate": 0.87,
  "translations_needing_human_review": 45
}
```

---

## Dashboard KPIs

| Metric | Target | Status |
|--------|--------|--------|
| Translations completed | 800+ (100/lang) | 0 | ⏳ Starting |
| Avg quality score | 0.85+ | — | ⏳ Measuring |
| Native approval | 85%+ | — | ⏳ Testing |
| Avg iterations | <2 | — | ⏳ Tracking |
| Time per translation | <3 min | — | ⏳ Optimizing |

---

## Integration with Pioneer

**Pioneer sends:**
- Phonetic rules per language
- Rhyme dictionaries
- Meter mappings
- Idiom equivalents
- Singability profiles

**Localizer uses to:**
- Score generated translations
- Pick best candidates
- Guide refinement loop
- Update learned patterns

**Feedback loop:**
- If translations consistently score low on a rule → Pioneer re-researches
- If translations exceed quality targets → Extend to new languages

---

## Success Criteria

✅ 100+ high-quality translations per language (800+ total)  
✅ 85%+ native speaker approval rate  
✅ <2 iterations per translation (efficient)  
✅ <3 minutes per translation (scalable)  
✅ All translations singable by native speakers  
✅ Consistency checks (same song in 8 languages feels coherent)  

---

## Output Format

**Final translations available for:**
- API integration (return translated lyrics on request)
- Dashboard (show "available in X languages")
- Training (feed back into model for language-aware generation)
- User feature (UI: "Generate in Spanish/French/etc")

```json
{
  "song_id": "orig_001",
  "title": "Original English Title",
  "lyrics": {
    "en": "English lyrics here...",
    "es": "Letras en español aquí...",
    "fr": "Paroles en français ici...",
    "de": "Liedtext auf Deutsch hier...",
    "ja": "日本語の歌詞",
    "zh": "中文歌词",
    "ko": "한국어 가사",
    "pt": "Letras em português...",
    "it": "Testo italiano..."
  },
  "metadata": {
    "translated_by": "Translation Localizer",
    "quality_scores": {
      "es": 0.91,
      "fr": 0.89,
      ...
    },
    "approved": true
  }
}
```
