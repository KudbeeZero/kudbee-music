# Environment Details Template

Use this template when asking Claude to generate commands for unfamiliar or specialized environments 
(Lightning Studio, custom containers, GPU setups, etc.). Fill it in and include in your request so 
Claude can generate the right command upfront, not via trial-and-error screenshots.

## Template

```
ENVIRONMENT DETAILS:

Tool/Framework:
- Name: [e.g., litgpt, huggingface/transformers, Lightning Studio CLI]
- Version: [e.g., 0.9.0, latest, from a specific repo]
- Install location: [full path, e.g., /root/litgpt, /usr/local/bin/litgpt]
- Installation method: [pip, git clone, pre-installed, other]

Runtime:
- Platform: [Lightning Studio GPU, local machine, cloud container, etc.]
- Hardware: [H100 Blackwell, RTX 6000, CPU-only, etc.]
- OS: [Ubuntu 22.04, Docker container, etc.]
- Available packages/tools: [litgpt, transformers, bitsandbytes, peft, etc.]

Directory Structure:
- Working directory: [where commands run from, e.g., /root/litgpt, /home/user/kudbee-music]
- Input paths: [where data/models/adapters live, e.g., /teamspace/studios/.../final/]
- Output paths: [where artifacts should be written]
- Temp directory: [for intermediate files, e.g., /tmp, ./scratch/]

Known Constraints:
- Packing: [enabled/disabled, reason if non-default]
- Quantization: [enabled/disabled, dtype if forced]
- GPU memory: [required, max available, constraints]
- Data size: [small dataset <1KB, medium, large — affects some tool behavior]
- Special flags needed: [--no-cache, --device=cuda, etc.]

Previous Success:
- What worked last time: [exact command that succeeded]
- Exit code: [0]
- Output shape: [e.g., "valid JSON with 3 alternatives", "training log ending with 'Train finished'"]
- Runtime: [~40s, ~2h, immediate]

Current Task:
- What you're trying to do: [test contract-prompt, train a model, validate an adapter, etc.]
- Input: [data shape, prompt format, etc.]
- Expected output: [success criteria, file artifacts, etc.]
- Failure mode to avoid: [CUDA kernel issues, packing errors, banned-word violations, etc.]
```

## Example (litgpt on Lightning Studio H100)

```
ENVIRONMENT DETAILS:

Tool/Framework:
- Name: litgpt
- Version: 0.9.0 (from https://github.com/Lightning-AI/litgpt)
- Install location: /root/litgpt
- Installation method: git clone + pip editable

Runtime:
- Platform: Lightning Studio GPU
- Hardware: H100 Blackwell (RTX PRO 6000)
- OS: Ubuntu 22.04 in container
- Available packages: transformers, peft, bitsandbytes, torch 2.5.0, cuda 12.1

Directory Structure:
- Working directory: /root/litgpt
- Input paths: /teamspace/studios/wifi-dj-agent/scribe-runs/scribe-real-qwen2.5-14b-lora-v1/final/
- Output paths: same (reads lit_model.pth.lora from there)
- Temp directory: /tmp

Known Constraints:
- Packing: disabled (dataset <1KB, only 212 rows)
- Quantization: disabled (Blackwell GPU compatibility — standard PyTorch wheels lack sm_120 kernels, but litgpt has them bundled)
- GPU memory: 48GB H100, litgpt inference uses ~30GB with bfloat16
- Data size: small (212 training rows, ~3.5KB)
- Special flags needed: --checkpoint_dir must point to the lit_model.pth.lora adapter location

Previous Success:
- What worked: python generate.py --checkpoint_dir /path/to/adapter --max_new_tokens 150 --temperature 0.7 --prompt "..."
- Exit code: 0
- Output shape: raw text containing valid JSON with {"alternatives": ["line1", "line2", "line3"]}
- Runtime: ~40s including model load

Current Task:
- What you're trying to do: G2-verify contract-prompt round-trip for KUDBEESCRIBEV1 real adapter
- Input: instruction/input/output JSON, contract prompt ending with "Output ONLY a JSON object..."
- Expected output: valid JSON with exactly 3 lyric alternatives, GPU utilization >60%, no banned words
- Failure mode to avoid: PyTorch CUDA kernel errors (PyTorch wheel issue solved by litgpt), packing errors (disabled), invalid JSON output (retry with stricter prompt)
```

---

## Why This Matters

When you include these details upfront:
- Claude generates the **right command on first try** instead of learning via screenshots
- **Faster iteration** — no "sorry, my command didn't work for your environment" round-trips
- **Better error recovery** — Claude knows what to check if something fails
- **Reproducibility** — the command works for you AND for downstream agents (Lightning agent, future team members)

Without environment details:
- Initial command often doesn't match your setup ✗
- User has to screenshot the failure ✗
- Claude fixes syntax, not root causes ✗
- Extra 1-2 iteration cycles ✗

With environment details:
- Claude generates the right command ✓
- It works the first time ✓
- You skip the screenshot correction loop ✓
- One round, not three ✓
