#!/usr/bin/env python3
"""PreToolUse (Bash) — valida la commit convention prima di un git commit (S12).

Intercetta i comandi `git commit` e verifica che il subject segua il formato:

    <type>(<scope>): <descrizione breve>

con type in: feat, fix, refactor, test, docs, chore, eval.
Rifiuta i messaggi generici ("wip", "update", "fix", "misc", ...).
Il riferimento all'issue (Refs: #N) e' raccomandato ma non bloccante.

Se non riesce a estrarre il messaggio in modo affidabile (es. commit senza -m,
heredoc complessi) lascia procedere per evitare falsi blocchi.
"""
import json
import re
import shlex
import sys

VALID_TYPES = {"feat", "fix", "refactor", "test", "docs", "chore", "eval"}
GENERIC = {"wip", "update", "fix", "misc", "stuff", "changes", "tmp", "test", "."}
SUBJECT_RE = re.compile(r"^(?P<type>\w+)(?:\((?P<scope>[^)]+)\))?(?P<bang>!)?:\s+(?P<desc>.+)$")


def extract_commit_messages(command: str):
    """Restituisce la lista di stringhe passate con -m/--message, o None se
    il comando non e' un git commit con messaggio estraibile."""
    try:
        tokens = shlex.split(command)
    except ValueError:
        return None

    # Considera solo se compare "git commit" nella catena di comandi.
    joined = " ".join(tokens)
    if "git" not in tokens or "commit" not in tokens:
        return None
    if not re.search(r"\bgit\b.*\bcommit\b", joined):
        return None

    # Command substitution / heredoc: il messaggio reale non e' estraibile in
    # modo affidabile (es. -m "$(cat <<EOF ...)"). Non bloccare per evitare
    # falsi positivi: la validazione si fa solo su messaggi inline letterali.
    if "$(" in command or "`" in command or "<<" in command:
        return None

    messages = []
    i = 0
    while i < len(tokens):
        tok = tokens[i]
        if tok in ("-m", "--message") and i + 1 < len(tokens):
            messages.append(tokens[i + 1])
            i += 2
            continue
        if tok.startswith("-m") and len(tok) > 2:
            messages.append(tok[2:])
        elif tok.startswith("--message="):
            messages.append(tok.split("=", 1)[1])
        elif tok in ("-F", "--file", "--amend", "--no-edit"):
            # Messaggio da file o amend: non validabile qui, lascia procedere.
            return None
        i += 1

    return messages or None


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0

    command = (payload.get("tool_input", {}) or {}).get("command", "")
    if not command:
        return 0

    messages = extract_commit_messages(command)
    if not messages:
        return 0

    subject = messages[0].strip().splitlines()[0].strip()

    if subject.lower() in GENERIC:
        sys.stderr.write(
            f"COMMIT BLOCCATO (S12 - Commit Convention): messaggio generico "
            f"'{subject}'. Usa il formato '<type>(<scope>): descrizione' con un "
            "messaggio che spieghi il perche' della modifica.\n"
        )
        return 2

    m = SUBJECT_RE.match(subject)
    if not m:
        sys.stderr.write(
            "COMMIT BLOCCATO (S12 - Commit Convention): il subject non rispetta "
            "il formato.\n"
            "  Atteso:  <type>(<scope>): descrizione breve\n"
            "  Esempio: feat(agent): add tool call retry with backoff\n"
            f"  Tipi ammessi: {', '.join(sorted(VALID_TYPES))}\n"
        )
        return 2

    ctype = m.group("type")
    if ctype not in VALID_TYPES:
        sys.stderr.write(
            f"COMMIT BLOCCATO (S12 - Commit Convention): type '{ctype}' non "
            f"ammesso. Usa uno tra: {', '.join(sorted(VALID_TYPES))}.\n"
        )
        return 2

    # Refs: #N -- raccomandato, non bloccante.
    full = "\n".join(messages)
    if not re.search(r"(?i)(refs|closes|fixes)\s*:?\s*#\d+", full):
        sys.stderr.write(
            "[avviso S12] Commit senza riferimento all'issue (es. 'Refs: #42'). "
            "Ogni commit dovrebbe essere collegato a un task (P08). Procedo "
            "comunque.\n"
        )
        # exit 0: avviso non bloccante.

    return 0


if __name__ == "__main__":
    sys.exit(main())
