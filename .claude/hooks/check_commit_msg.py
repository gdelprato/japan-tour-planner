#!/usr/bin/env python3
"""Hook commit-msg (pre-commit) — stessa regola di check_commit.py, ma letta dal file del messaggio.

check_commit.py protegge i commit fatti da Claude Code (PreToolUse su Bash); questo protegge quelli
fatti a mano da terminale. Formato richiesto (S12):

    <type>(<scope>): <descrizione breve>

con type in feat, fix, refactor, test, docs, chore, eval. I merge commit sono lasciati passare.
"""
import re
import sys

VALID_TYPES = {"feat", "fix", "refactor", "test", "docs", "chore", "eval"}
GENERIC = {"wip", "update", "fix", "misc", "stuff", "changes", "tmp", "test", "."}
SUBJECT_RE = re.compile(r"^(?P<type>\w+)(?:\((?P<scope>[^)]+)\))?!?:\s+(?P<desc>.+)$")


def main() -> int:
    if len(sys.argv) < 2:
        return 0
    with open(sys.argv[1], encoding="utf-8") as fh:
        lines = [l for l in fh.read().splitlines() if not l.startswith("#")]
    subject = next((l.strip() for l in lines if l.strip()), "")
    if not subject or subject.startswith("Merge ") or subject.startswith("Revert "):
        return 0
    if subject.lower() in GENERIC:
        sys.stderr.write(f"COMMIT BLOCCATO (S12): messaggio generico '{subject}'.\n")
        return 1
    m = SUBJECT_RE.match(subject)
    if not m or m.group("type") not in VALID_TYPES:
        sys.stderr.write(
            "COMMIT BLOCCATO (S12): atteso '<type>(<scope>): descrizione' con type in "
            + ", ".join(sorted(VALID_TYPES)) + f".\n  Ricevuto: {subject}\n"
        )
        return 1
    if not re.search(r"(?i)(refs|closes|fixes)\s*:?\s*#\d+", "\n".join(lines)):
        sys.stderr.write("[avviso S12] commit senza 'Refs: #issue': ogni commit dovrebbe essere collegato a un task (P08).\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
