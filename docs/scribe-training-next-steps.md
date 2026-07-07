# SCRIBE Lightning AI Training — Next Steps

**Date:** 2026-07-07  
**Status:** ✅ TRAINING COMPLETE (val loss: 0.082) — Ready for checkpoint conversion & endpoint deployment  
**Target Output:** HF/PEFT format checkpoint → live /scribe/rewrite endpoint  

---

## What This Document Is

A step-by-step checklist for taking the **SCRIBE dataset** (212 realistic line-rewrite examples) through fine-tuning, evaluation, and deployment readiness. The **training prompt** below is copy-paste-ready for Lightning AI Studio.

---

## ✅ Training Complete — Checkpoint Conversion (Copy-Paste Ready)

**Training Status:** DONE ✓  
**Validation Loss:** 0.082  
**Checkpoint Format:** litgpt (56GB lit_model.pth) → needs HF/PEFT conversion  

### Copy-Paste Checkpoint Conversion Command

Run this on an RTX 6000 GPU (20GB+ VRAM required):

```bash
# Convert from litgpt format to Hugging Face format
litgpt convert_from_litgpt \
  --checkpoint_path /path/to/KUDBEESCRIBEV1/lit_model.pth \
  --output_dir ./KUDBEESCRIBEV1-hf-peft

# Verify conversion (should produce these files):
# - adapter_config.json
# - adapter_model.bin
# - config.json
# - generation_config.json
# - special_tokens_map.json
# - tokenizer.json
# - tokenizer_config.json

# Test inference locally before deploying:
python -c "
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer

base_model = 'Qwen/Qwen2.5-14B-Instruct'
adapter_path = './KUDBEESCRIBEV1-hf-peft'
model = AutoModelForCausalLM.from_pretrained(base_model)
model = PeftModel.from_pretrained(model, adapter_path)
tokenizer = AutoTokenizer.from_pretrained(base_model)

prompt = 'Rewrite ONE line from a song...'
inputs = tokenizer(prompt, return_tensors='pt')
outputs = model.generate(**inputs, max_length=512)
print(tokenizer.decode(outputs[0], skip_special_tokens=True))
"
```

---

## Pre-Deployment Checklist

**Training complete (val loss: 0.082)** ✓

Before converting the checkpoint, ensure:
1. Checkpoint is located at `/path/to/KUDBEESCRIBEV1/lit_model.pth` (56GB)
2. RTX 6000 GPU is available (20GB+ VRAM required for conversion + testing)
3. LitGPT CLI is installed: `pip install litgpt` (or already available on RTX 6000)
4. Output directory is ready for HF conversion: `./KUDBEESCRIBEV1-hf-peft/`

---

## Deployment Workflow

### Step 1: Convert Checkpoint (LitGPT → HF/PEFT Format) ✓

**After conversion, expect these files in `./KUDBEESCRIBEV1-hf-peft/`:**
```
adapter_config.json         # PEFT configuration
adapter_model.bin           # LoRA weights (400–600MB)
config.json
generation_config.json
special_tokens_map.json
tokenizer.json
tokenizer_config.json
```

**Verify conversion succeeded:**
```bash
ls -lh KUDBEESCRIBEV1-hf-peft/
# Should show non-empty .bin and .json files
```

---

### Step 2: Test Inference Locally

Run local inference to verify the converted checkpoint works before deploying:

**Test prompt (a SCRIBE line-rewrite task):**
```
Rewrite ONE line from a song, offering 3 alternative phrasings.

Title: Brain Wakes
Theme: moment of clarity after years dormant
Mood: wondrous, awakening, raw
Genre: indie-folk

Section: [Chorus]
Line before: "Light seeps through the cracks I made"
LINE TO REWRITE: "My brain wakes when the door opens wide"
Line after: "All these years I was running from the truth"

Keep roughly the same meaning, syllable count, and rhyme slot.

Output ONLY a JSON object in this exact format (no markdown, no extra text):
{"alternatives": ["line 1", "line 2", "line 3"]}
```

**Expected behavior:**
- Inference should complete in <5 seconds on RTX 6000
- Output should be valid JSON with 3 alternative lines
- Lines should preserve meaning and meter
- No clichés or rule violations

---

### Step 3: Deploy to Lightning Endpoint

**Deployment target:** KUDBEESCRIBEV1 Lightning Studio (RTX 6000)

Once local inference passes, deploy the converted checkpoint to your Lightning Studio endpoint:

1. **Upload adapter files to Lightning Studio:**
   ```bash
   # Copy converted PEFT adapter to your deployment directory
   cp -r KUDBEESCRIBEV1-hf-peft/* /path/to/lightning-deployment/
   ```

2. **Update LitServe endpoint config:**
   ```yaml
   # Your Lightning Studio's model config
   model_path: KUDBEESCRIBEV1-hf-peft
   base_model: Qwen/Qwen2.5-14B-Instruct
   adapter_type: peft
   max_tokens: 512
   ```

3. **Verify endpoint is live:**
   ```bash
   curl -X POST https://your-lightning-endpoint/predict \
     -H "Authorization: Bearer YOUR_LIGHTNING_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "prompt": "Rewrite ONE line from a song...\n[full context]",
       "max_tokens": 512
     }'
   ```

---

### Step 4: Wire into kudbee-music

Once endpoint is verified live:

1. **Add endpoint & token to `.env.local`:**
   ```bash
   # .env.local (gitignored — NEVER commit)
   LIGHTNING_ENDPOINT=https://your-lightning-studio/predict
   LIGHTNING_API_KEY=your_bearer_token_here
   ```

2. **Test via CLI (all 3 commands must pass):**
   ```bash
   node studio/lightning.mjs --ping
   # Expected: ✓ Endpoint reachable
   
   node studio/lightning.mjs --prompt "Rewrite: My brain wakes when the door opens"
   # Expected: JSON with 3 alternatives
   
   npm test test/lightning.test.mjs
   # Expected: All unit tests pass
   ```

3. **Optional: Enable UI toggle in ScribeEditor.tsx** (future enhancement)
   - Add provider radio button (Claude vs. Lightning)
   - Wire `lightningLineRewriteProvider.ts` into the provider selector
   - Test toggle behavior in Scribe Editor

---

### Step 5: Production Expansion (Roadmap)

Once v1 passes evaluation:

1. **Grow dataset to 500+ examples:**
   - Export 10–20 real songs from the Vault (founder + beta users)
   - Add to `training-data-input/`
   - Regenerate training data
2. **Expand synthetic coverage:**
   - 15–20 themes (up from 10)
   - 10 rhyme schemes (up from 5)
   - 3–5 seeds per scheme
   - Target: 300–500 synthetic rows
3. **Re-train on larger dataset**
4. **Track model drift over time:**
   - Are alternatives still original or slipping to clichés?
   - Monthly audit via `parseLineRewrites()` output logs
5. **Plan v2 improvements:**
   - Multi-line context (full verse instead of single line)
   - Genre-specific adapters (hip-hop LoRA vs. indie-folk LoRA)
   - Rhyme-scheme enforcement via constraint tokens

---

## File Structure (After Training)

```
kudbee-music/
├── out/training-data/
│   ├── scribe-line-rewrite.alpaca.json     # INPUT to training
│   └── REPORT.md                           # Dataset stats
├── docs/
│   ├── scribe-real-training-v1.md          # What was trained
│   ├── scribe-training.md                  # Overall strategy
│   └── scribe-training-next-steps.md       # This file
├── studio/
│   └── lightning.mjs                       # CLI adapter (already built)
├── lib/hermes/providers/
│   ├── lightningLineRewriteProvider.ts      # Line-rewrite caller
│   └── lightningLyricsProvider.ts           # Full generation variant
└── components/hermes/
    └── ScribeEditor.tsx                    # UI provider toggle (not yet built)

/teamspace/studios/this_studio/scribe-runs/  # Lightning Studio artifacts (outside repo)
└── scribe-real-qwen2.5-14b-lora-v1/
    ├── lit_model.pth
    ├── adapter_config.json
    ├── adapter_model.bin
    └── EVAL.md                             # Your evaluation results
```

---

## Key References

- **Training strategy:** [`docs/scribe-real-training-v1.md`](scribe-real-training-v1.md)
- **Dataset generation:** `lib/hermes/trainingData.ts` + `GEN_TRAINING_DATA=1 npx vitest run trainingData`
- **App provider code:** `lib/hermes/providers/lightningLyricsProvider.ts`
- **CLI adapter:** `studio/lightning.mjs`
- **Scribe UI component:** `components/hermes/ScribeEditor.tsx`
- **Lightning rollout plan:** [`docs/lightning-plan.md`](lightning-plan.md)

---

## Timing & Next Check-In

- **Training:** ~20-30 min on Blackwell
- **Evaluation:** ~15-30 min (run 3 test cases + score)
- **Total wall-clock to go-live:** ~45-60 min + deployment setup

Once training completes, **check the logs immediately** — any errors bubble up there before the adapter files exist. If something fails, investigate the log rather than retrying the training command blindly (it wastes GPU time and credits).

**Next milestone:** Evaluation passes → create draft PR with adapter credentials + endpoint details → merge training v1 documentation → plan v2 expansion.
