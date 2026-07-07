# /test-command — Verified Test Command Generator

Generate a test command with built-in verification and dry-run validation.

## Usage

```
/test-command
```

Provide:
1. **Environment**: tool name/version, runtime (GPU/CPU/container), directory structure
2. **What to test**: the test/run you want to execute (e.g., "contract-prompt round-trip for KUDBEESCRIBEV1")
3. **Success criteria**: expected output shape, exit codes, files/artifacts that should exist
4. **Constraints**: packing disabled? quantization disabled? float32 only? Other known limitations.

## Output

Claude generates:

1. **The command** — exact syntax for your environment
2. **Dry-run validation** — `--help` check or a harmless test invocation to confirm syntax before the real run
3. **Verification steps** — how to confirm the output matches expected shape
4. **Failure recovery** — what to check if it fails (exit code, stderr, logs)

Example structure:

```bash
# ENVIRONMENT
# Tool: litgpt v0.9.0
# Runtime: H100 Blackwell via Lightning Studio
# Directory: /root/litgpt installed, adapter at /teamspace/studios/...

# DRY-RUN VALIDATION
python /root/litgpt/generate.py --help 2>&1 | grep -q "checkpoint_dir" && echo "✓ litgpt available"

# THE COMMAND (real run)
cd /root/litgpt && python generate.py \
  --checkpoint_dir /teamspace/studios/.../final \
  --max_new_tokens 150 \
  --temperature 0.7 \
  --prompt "..."

# VERIFICATION
# ✓ Exit code 0
# ✓ Output is valid JSON with {"alternatives": ["a","b","c"]}
# ✓ GPU utilization confirmed (nvidia-smi shows VRAM spike)

# FAILURE RECOVERY
# If exit 1: check stderr for GPU errors (nvidia-smi first)
# If invalid JSON: check model output for truncation (increase --max_new_tokens)
# If banned words found: model ignored constraints; try different temperature
```

## Benefits

- **Syntax validated** — Claude checks `--help` before you run it, not after
- **Environment-aware** — generated for your specific tool version, runtime, directory layout
- **Dry-run first** — harmless check before the real invocation
- **Verification built-in** — you know exactly what success looks like
- **Failure recovery** — debugging steps if something goes wrong

## Example

```
/test-command

Environment:
- Tool: litgpt (installed at /root/litgpt)
- Runtime: Lightning Studio H100 Blackwell
- Adapter: /teamspace/studios/wifi-dj-agent/scribe-runs/scribe-real-qwen2.5-14b-lora-v1/final
- Constraints: no packing, no quantization (Blackwell compatibility)

Test: Contract-prompt round-trip
Input: {"instruction": "...", "input": "...", "output": "..."}
Success: Output is valid JSON with exactly 3 alternatives, GPU in use, no banned words

```

Claude generates the full command with dry-run validation + verification steps.
