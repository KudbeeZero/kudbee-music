#!/usr/bin/env python3
"""
Code Reviewer Agent: Auto-approve safe edits, escalate risky ones
"""

import json
import re
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple, Dict

AGENT_DIR = Path("/teamspace/studios/this_studio/.claude/agents/agent-code-reviewer")
MEMORY_DIR = AGENT_DIR / "memory"
MEMORY_DIR.mkdir(parents=True, exist_ok=True)


class CodeReviewer:
    """Autonomous code review and approval engine"""

    # Files that always escalate (security-critical)
    ESCALATE_FILES = {
        "auth.py", "crypto.py", "security.py", "settings.json",
        ".env", "Dockerfile", "docker-compose.yml",
        ".claude/settings.json", "kudbee_config.py"
    }

    # Files that are safe to auto-approve
    SAFE_FILES = {
        ".md", ".txt", "*.test.py", "*.spec.py",
        "requirements.txt", "*.yml", "*.yaml"
    }

    def __init__(self):
        self.approvals_file = MEMORY_DIR / "approvals.jsonl"
        self.stats_file = MEMORY_DIR / "metrics.json"
        self.load_stats()

    def load_stats(self):
        """Load approval statistics"""
        if self.stats_file.exists():
            self.stats = json.loads(self.stats_file.read_text())
        else:
            self.stats = {
                "total_reviews": 0,
                "auto_approved": 0,
                "escalated": 0,
                "approval_rate": 0.0,
                "false_positive_rate": 0.0,
                "avg_confidence": 0.0,
                "health": "green"
            }

    def save_stats(self):
        """Save approval statistics"""
        self.stats_file.write_text(json.dumps(self.stats, indent=2))

    def review_edit(self, filepath: str, old_code: str, new_code: str) -> Tuple[bool, float, str]:
        """
        Review a proposed edit.
        Returns: (approve: bool, confidence: float, reason: str)
        """
        # Calculate diff
        diff_lines = self.get_diff_lines(old_code, new_code)
        diff_size = len(diff_lines)
        change_type = self.classify_change(filepath, old_code, new_code)

        # Run through decision tree
        confidence, decision, reason = self.decide(filepath, diff_size, change_type, old_code, new_code)

        # Log approval
        approval = {
            "timestamp": datetime.now().isoformat(),
            "file": filepath,
            "lines_changed": diff_size,
            "change_type": change_type,
            "confidence": confidence,
            "decision": "approve" if decision else "escalate",
            "reason": reason,
            "auto_approved": decision
        }

        with open(self.approvals_file, "a") as f:
            f.write(json.dumps(approval) + "\n")

        # Update stats
        self.stats["total_reviews"] += 1
        if decision:
            self.stats["auto_approved"] += 1
        else:
            self.stats["escalated"] += 1

        self.stats["approval_rate"] = self.stats["auto_approved"] / self.stats["total_reviews"]
        self.save_stats()

        return decision, confidence, reason

    def get_diff_lines(self, old: str, new: str) -> list:
        """Calculate rough diff (lines changed)"""
        old_lines = old.split('\n')
        new_lines = new.split('\n')
        diff = []
        for i, (o, n) in enumerate(zip(old_lines, new_lines)):
            if o != n:
                diff.append(i)
        diff.extend(range(len(old_lines), len(new_lines)))
        return diff

    def classify_change(self, filepath: str, old_code: str, new_code: str) -> str:
        """Classify the type of change"""
        # Check if only whitespace/comments changed
        old_clean = re.sub(r'#.*', '', old_code)
        new_clean = re.sub(r'#.*', '', new_code)
        if old_clean.strip() == new_clean.strip():
            return "comment_or_formatting"

        # Check if only imports/type hints changed
        if self.only_imports_or_hints_changed(old_code, new_code):
            return "type_hint_or_import"

        # Check if test file
        if filepath.endswith(('.test.py', '.spec.py', '_test.py', 'test_*.py')):
            return "test_addition"

        # Check if docstring only
        if self.only_docstring_changed(old_code, new_code):
            return "docstring_addition"

        # Check if refactor (structure change, same logic)
        if self.is_refactor(old_code, new_code):
            return "refactor"

        # Check if bug fix
        if self.is_likely_bugfix(old_code, new_code):
            return "bugfix"

        # Default to logic change
        return "logic_change"

    def only_imports_or_hints_changed(self, old: str, new: str) -> bool:
        """Check if only imports or type hints changed"""
        old_lines = old.split('\n')
        new_lines = new.split('\n')

        for line in old_lines:
            if line.strip().startswith(('import ', 'from ')):
                continue
            if ':' in line and '->' in line:  # type hints
                continue
            if line.strip():
                return False

        return True

    def only_docstring_changed(self, old: str, new: str) -> bool:
        """Check if only docstrings changed"""
        # Simple heuristic: look for """ or '''
        return '"""' in new or "'''" in new

    def is_refactor(self, old: str, new: str) -> bool:
        """Check if this looks like a pure refactor (no logic change)"""
        # Very simplified: check if key operations are the same
        old_ops = set(re.findall(r'\b(if|for|while|return|raise)\b', old))
        new_ops = set(re.findall(r'\b(if|for|while|return|raise)\b', new))
        return old_ops == new_ops and old.count('\n') == new.count('\n')

    def is_likely_bugfix(self, old: str, new: str) -> bool:
        """Check if this looks like a bug fix"""
        # Look for common bug fix patterns
        bugfix_patterns = [
            r'(!=|==|<|>|<=|>=)',  # comparison fix
            r'\.get\(',  # safer dict access
            r'try:.*except',  # exception handling
            r'if .* is (None|not)',  # None check
        ]
        return any(re.search(p, new) for p in bugfix_patterns)

    def decide(self, filepath: str, diff_size: int, change_type: str, old_code: str, new_code: str) -> Tuple[float, bool, str]:
        """Decision tree for approval"""

        # Check if security-critical file
        if any(fp in filepath for fp in self.ESCALATE_FILES):
            return 0.0, False, f"Security-critical file: {filepath}"

        # Documentation or test only?
        if filepath.endswith(('.md', '.txt')):
            return 0.95, True, "Documentation change"

        # Comment or formatting only?
        if change_type == "comment_or_formatting":
            return 0.95, True, "Formatting/comment only"

        # Type hints or imports only?
        if change_type == "type_hint_or_import":
            return 0.95, True, "Type hint or import fix"

        # Docstring addition?
        if change_type == "docstring_addition":
            return 0.90, True, "Docstring addition"

        # Test file?
        if change_type == "test_addition":
            return 0.90, True, "Test addition"

        # Refactor?
        if change_type == "refactor" and diff_size < 200:
            return 0.85, True, "Small refactor, no logic change"

        # Bug fix?
        if change_type == "bugfix" and diff_size < 50:
            return 0.88, True, "Small isolated bugfix"

        # Large diff?
        if diff_size > 200:
            return 0.2, False, f"Large diff ({diff_size} lines)"

        # Logic change?
        if change_type == "logic_change":
            return 0.3, False, "Logic change requires review"

        # Default escalate
        return 0.4, False, "Ambiguous change, escalate for review"

    def stats_summary(self) -> str:
        """Return approval statistics summary"""
        self.load_stats()
        return f"""
Code Reviewer Statistics:
========================
Total Reviews: {self.stats['total_reviews']}
Auto-Approved: {self.stats['auto_approved']}
Escalated: {self.stats['escalated']}
Approval Rate: {self.stats['approval_rate']:.1%}
Avg Confidence: {self.stats['avg_confidence']:.2f}
Health: {self.stats['health']}
"""


if __name__ == "__main__":
    reviewer = CodeReviewer()

    # Example usage
    old_code = "def foo(x):\n    return x + 1"
    new_code = "def foo(x: int) -> int:\n    return x + 1"

    approve, confidence, reason = reviewer.review_edit("test.py", old_code, new_code)
    print(f"Approve: {approve}, Confidence: {confidence:.2f}, Reason: {reason}")
    print(reviewer.stats_summary())
