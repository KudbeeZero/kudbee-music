# /handoff — Structured Agent Handoff Generator

Generate a verified agent handoff entry with explicit completion criteria.

## Usage

```
/handoff
```

Then provide:
1. **Receiving agent**: (e.g., `lightning-agent`, `hermes-ui-agent`)
2. **Task summary**: what you're asking them to do
3. **Exact commands**: the shell/code they should run
4. **Success criteria**: output shape, files that should exist, exit codes
5. **Side-effect updates**: what to change in living-state files (modelFamily.json, TODO.md, etc.)
6. **Verification checklist**: the specific steps the agent should complete to confirm success

## Output

Claude generates a structured handoff entry (JSON or Markdown) that includes:

```json
{
  "date": "YYYY-MM-DD",
  "from": "kudbee-music-session",
  "to": "receiving-agent-name",
  "status": "active",
  "summary": "what the agent should do",
  "asks": [
    "Exact command to run: ...",
    "Verify: output contains X, file at Y exists, exit code is 0",
    "Update: brain/modelFamily.json with Z status",
    "Append resolved handoff entry with: [output / results / completion timestamp]"
  ],
  "verification_checklist": [
    "[ ] Command runs to exit 0",
    "[ ] Output matches expected shape",
    "[ ] File artifacts exist at specified paths",
    "[ ] Living-state files updated correctly",
    "[ ] Resolved handoff entry appended with results"
  ]
}
```

The handoff is then appended to `brain/handoffs.json` and committed, ready for the receiving agent to pick up.

## Example

```
/handoff

To: lightning-agent
Task: Run the real KUDBEESCRIBEV1 adapter through a contract-prompt JSON-alternatives test

Commands:
  cd /root/litgpt && python generate.py --checkpoint_dir /path/to/adapter ...

Success looks like:
  - Command exits 0
  - Output is valid JSON with {"alternatives": [...]} exactly 3 strings
  - GPU utilization confirmed (nvidia-smi shows >60% VRAM)
  - No banned words in the 3 alternatives

Update on success:
  - brain/modelFamily.json KUDBEESCRIBEV1.gate.G2.status = 'cleared'
  - brain/modelFamily.json KUDBEESCRIBEV1.gate.G2.verifiedAt = <timestamp>
  - Commit + push

Report back:
  - Raw model output (full generated text)
  - Confirmation of all 4 success checks above
```

Claude generates a JSON handoff entry ready to append to `brain/handoffs.json`.
