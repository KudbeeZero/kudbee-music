#!/usr/bin/env python3
"""
Git Steward: Autonomous Git workflow orchestrator
Manages branch sync, PR review/merge, and cloud sync
"""

import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any

STUDIO_ROOT = Path("/teamspace/studios/this_studio")
REPO_ROOT = STUDIO_ROOT / "hermes-lyric-server"
AGENT_DIR = STUDIO_ROOT / ".claude/agents/agent-git-steward"
MEMORY_DIR = AGENT_DIR / "memory"
BRANCH_LEDGER = REPO_ROOT / "training/research/BRANCH_LEDGER.md"

# Branches to manage
MANAGED_BRANCHES = ["research", "editorial", "engineering", "security", "vector-db"]


def run_cmd(cmd: str, cwd=REPO_ROOT, check=False) -> Tuple[int, str, str]:
    """Execute shell command, return (returncode, stdout, stderr)"""
    result = subprocess.run(
        cmd,
        shell=True,
        cwd=cwd,
        capture_output=True,
        text=True
    )
    if check and result.returncode != 0:
        raise RuntimeError(f"Command failed: {cmd}\n{result.stderr}")
    return result.returncode, result.stdout.strip(), result.stderr.strip()


def git_fetch():
    """Fetch latest from origin"""
    code, out, err = run_cmd("git fetch origin")
    if code == 0:
        log_finding("fetch", "success", f"Fetched origin")
    else:
        log_finding("fetch", "error", f"Fetch failed: {err}")
        return False
    return True


def git_status() -> Dict[str, Any]:
    """Get status of all branches"""
    status = {}

    # Get current branch
    code, current, _ = run_cmd("git rev-parse --abbrev-ref HEAD")
    status["current_branch"] = current

    # Check master
    code, commits, _ = run_cmd("git rev-list --count master..origin/master")
    status["master_behind"] = int(commits) if commits else 0

    # Check each managed branch
    for branch in MANAGED_BRANCHES:
        code, _, _ = run_cmd(f"git rev-parse --verify origin/{branch}")
        if code == 0:
            # Branch exists on origin
            code, behind, _ = run_cmd(f"git rev-list --count {branch}..master")
            code, ahead, _ = run_cmd(f"git rev-list --count master..{branch}")
            status[branch] = {
                "exists": True,
                "behind_master": int(behind) if behind else 0,
                "ahead_master": int(ahead) if ahead else 0
            }
        else:
            status[branch] = {"exists": False}

    return status


def check_staleness(branch: str, days_threshold: int = 7) -> bool:
    """Check if branch is >N days behind master"""
    code, last_commit_ts, _ = run_cmd(
        f"git log -1 --format=%ct origin/{branch}",
        check=False
    )
    if code != 0:
        return True  # Branch doesn't exist

    try:
        last_ts = int(last_commit_ts)
        age_days = (datetime.now().timestamp() - last_ts) / 86400
        return age_days > days_threshold
    except:
        return False


def rebase_on_master(branch: str) -> bool:
    """Rebase branch on latest master"""
    log_finding("rebase_attempt", "start", f"Rebasing {branch} on master")

    # Checkout branch
    code, _, err = run_cmd(f"git checkout {branch}")
    if code != 0:
        log_finding("rebase", "error", f"Checkout failed: {err}")
        return False

    # Fetch latest master
    code, _, _ = run_cmd("git fetch origin master:master")

    # Try rebase
    code, out, err = run_cmd("git rebase master", check=False)
    if code == 0:
        log_finding("rebase", "success", f"Rebased {branch} on master")
        # Push rebased branch
        code, _, err = run_cmd(f"git push origin {branch} --force", check=False)
        if code == 0:
            log_finding("rebase", "pushed", f"Force-pushed rebased {branch}")
            return True
        else:
            log_finding("rebase", "push_error", f"Push failed: {err}")
            return False
    else:
        # Conflict during rebase
        log_finding("rebase", "conflict", f"Rebase conflict on {branch}: {err}")
        run_cmd("git rebase --abort", check=False)
        return False


def commit_staged_work() -> List[str]:
    """Commit any staged/modified work across branches"""
    commits = []

    for branch in ["master"] + MANAGED_BRANCHES:
        code, _, _ = run_cmd(f"git checkout {branch}", check=False)
        if code != 0:
            continue

        # Check for modified files
        code, modified, _ = run_cmd("git status --short")
        if not modified:
            continue

        # Stage relevant files (skip secrets, large binaries)
        skip_patterns = [".env", "credentials", ".pkl", ".bin", "*.pth"]
        files_to_stage = []
        for line in modified.split('\n'):
            if not line:
                continue
            _, filepath = line.split(maxsplit=1)
            if not any(skip in filepath for skip in skip_patterns):
                files_to_stage.append(filepath)

        if not files_to_stage:
            continue

        # Stage and commit
        for f in files_to_stage:
            run_cmd(f"git add {f}")

        # Commit with co-author
        msg = f"Auto-commit: {', '.join(files_to_stage[:3])}"
        if len(files_to_stage) > 3:
            msg += f" +{len(files_to_stage)-3} more"
        msg += f"\n\nCo-Authored-By: Git Steward <steward@kudbee.local>"

        code, _, _ = run_cmd(f'git commit -m "{msg}"', check=False)
        if code == 0:
            # Extract commit hash
            code, sha, _ = run_cmd("git rev-parse HEAD")
            commits.append((branch, sha))
            log_finding("commit", "success", f"Committed on {branch}: {sha[:8]}")

    return commits


def push_commits() -> bool:
    """Push all commits to origin"""
    success = True
    for branch in ["master"] + MANAGED_BRANCHES:
        code, _, err = run_cmd(f"git push origin {branch}", check=False)
        if code == 0:
            log_finding("push", "success", f"Pushed {branch}")
        else:
            log_finding("push", "error", f"Push {branch} failed: {err}")
            success = False

    return success


def create_pr_if_needed(branch: str) -> Optional[str]:
    """Create PR for branch if not exists"""
    # Check if PR already exists
    code, pr_output, _ = run_cmd(
        f'gh pr list --head {branch} --base master --json url --jq ".[0].url"',
        check=False
    )

    if code == 0 and pr_output:
        return pr_output  # PR already exists

    # Create PR
    title = f"Week {get_week()}: {branch.capitalize()} phase"
    body = f"Auto-generated PR for {branch} branch\n\nBranch: {branch}\nBase: master"

    code, pr_url, err = run_cmd(
        f'gh pr create --base master --head {branch} --title "{title}" --body "{body}" --draft',
        check=False
    )

    if code == 0:
        log_finding("pr_create", "success", f"Created PR for {branch}")
        return pr_url
    else:
        log_finding("pr_create", "error", f"PR creation failed: {err}")
        return None


def check_pr_status(branch: str) -> Dict[str, any]:
    """Check CI and review status of PR"""
    # Get PR number
    code, pr_json, _ = run_cmd(
        f'gh pr list --head {branch} --base master --json number --jq ".[0].number"',
        check=False
    )

    if code != 0:
        return {"status": "no_pr"}

    pr_number = pr_json

    # Check CI status
    code, checks, _ = run_cmd(
        f'gh pr checks {pr_number}',
        check=False
    )

    ci_pass = "pass" in checks.lower() or code == 0

    # Check reviews
    code, reviews, _ = run_cmd(
        f'gh pr view {pr_number} --json reviews --jq ".[].state"',
        check=False
    )

    return {
        "pr_number": pr_number,
        "ci_pass": ci_pass,
        "has_reviews": bool(reviews)
    }


def can_merge(branch: str, pr_status: Dict) -> bool:
    """Determine if PR can be merged"""
    if not pr_status.get("ci_pass"):
        log_finding("merge_check", "blocked", f"CI not passing for {branch}")
        return False

    # Check for conflicts
    code, _, _ = run_cmd(f"git merge-base --is-ancestor master {branch}", check=False)
    if code != 0:
        log_finding("merge_check", "blocked", f"Merge conflict for {branch}")
        return False

    return True


def merge_branch(branch: str) -> bool:
    """Merge branch to master"""
    msg = f"Merge {branch}: phase auto-merge"

    code, _, err = run_cmd(f"git checkout master")
    if code != 0:
        log_finding("merge", "error", f"Checkout master failed: {err}")
        return False

    code, _, err = run_cmd(f'git merge --no-ff {branch} -m "{msg}"', check=False)
    if code == 0:
        code, _, _ = run_cmd("git push origin master")
        if code == 0:
            log_finding("merge", "success", f"Merged {branch} to master")
            # Delete branch
            run_cmd(f"git push origin :{branch}", check=False)
            return True

    log_finding("merge", "error", f"Merge failed: {err}")
    return False


def update_branch_ledger():
    """Update BRANCH_LEDGER.md with current status"""
    if not BRANCH_LEDGER.exists():
        return

    status = git_status()
    timestamp = datetime.now().isoformat()

    # Parse existing ledger
    content = BRANCH_LEDGER.read_text()

    # Update "Current Status" section
    new_content = content.split("## Current Status")[0]
    new_content += f"""## Current Status (Last updated: {timestamp})

- **master:** ✅ Ready
"""

    for branch, info in status.items():
        if branch == "current_branch" or branch == "master_behind":
            continue

        if not info.get("exists"):
            new_content += f"- **{branch}:** ⚪ Does not exist\n"
        else:
            ahead = info.get("ahead_master", 0)
            behind = info.get("behind_master", 0)
            if ahead > 0:
                new_content += f"- **{branch}:** 🟡 Ahead by {ahead} commits, behind by {behind}\n"
            else:
                new_content += f"- **{branch}:** 🟢 Synced\n"

    BRANCH_LEDGER.write_text(new_content)
    log_finding("ledger_update", "success", "Updated BRANCH_LEDGER.md")


def log_finding(action: str, status: str, message: str, metadata: Optional[Dict] = None):
    """Log action to findings.jsonl and create index card for Librarian"""
    MEMORY_DIR.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().isoformat()
    finding = {
        "timestamp": timestamp,
        "action": action,
        "status": status,
        "message": message,
        **(metadata or {})
    }

    # Log to findings
    findings_file = MEMORY_DIR / "findings.jsonl"
    with open(findings_file, "a") as f:
        f.write(json.dumps(finding) + "\n")

    # Create index card for Librarian
    index_card = {
        "id": f"git-{timestamp.replace(':', '-')}",
        "timestamp": timestamp,
        "source": "git_steward",
        "type": action,
        "status": status,
        "content": message,
        "tags": ["git", "workflow", action, status],
        "librarian_query_key": f"git:{action}:{status}",
        "metadata": metadata or {},
        "indexed": False  # Librarian will set to True after vectorization
    }

    # Log to index cards
    cards_file = MEMORY_DIR / "index_cards.jsonl"
    with open(cards_file, "a") as f:
        f.write(json.dumps(index_card) + "\n")

    print(f"[{action}] {status}: {message}")


def get_week() -> int:
    """Get current week number (1-20)"""
    # Simplified; use actual week calculation
    return 1


def run():
    """Main Git Steward workflow"""
    print("🔄 Git Steward: Starting workflow cycle...")

    try:
        # Phase 1: Fetch and check staleness
        if not git_fetch():
            return False

        status = git_status()
        print(f"📊 Branch status: {json.dumps(status, indent=2)}")

        # Phase 2: Rebase stale branches
        for branch in MANAGED_BRANCHES:
            if not status.get(branch, {}).get("exists"):
                continue
            if status[branch]["behind_master"] > 0:
                rebase_on_master(branch)

        # Phase 3: Commit staged work
        commits = commit_staged_work()
        print(f"✅ Committed {len(commits)} changes")

        # Phase 4: Push
        push_commits()

        # Phase 5: PR review and merge
        for branch in MANAGED_BRANCHES:
            if not status.get(branch, {}).get("exists"):
                continue

            # Create PR if needed
            pr_url = create_pr_if_needed(branch)
            if pr_url:
                print(f"📋 PR: {pr_url}")

            # Check status
            pr_status = check_pr_status(branch)

            # Merge if ready
            if can_merge(branch, pr_status):
                if merge_branch(branch):
                    status[branch]["exists"] = False  # Mark as merged

        # Phase 6: Update ledger
        update_branch_ledger()

        print("✅ Git Steward cycle complete")
        return True

    except Exception as e:
        log_finding("error", "exception", str(e))
        print(f"❌ Error: {e}")
        return False


if __name__ == "__main__":
    success = run()
    sys.exit(0 if success else 1)
