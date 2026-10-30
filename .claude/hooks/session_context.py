#!/usr/bin/env python3
"""SessionStart — inietta nel contesto un promemoria sintetico degli standard.

Lo stdout del hook viene aggiunto al contesto della sessione. Lo scopo e' che
Claude sviluppi sempre tenendo presenti i principi e gli standard della practice,
e sappia quali utility (slash command e subagent) ha a disposizione.

Esce sempre 0. Resta volutamente conciso per non consumare contesto inutilmente.
"""
import sys

CONTEXT = """\
# Japan Tour Planner -- contesto operativo (standard AI/ML Engineering)

Progetto governato dagli standard della practice (P01-P10, S01-S23), adattati a
una web app statica JavaScript senza build: vedere docs/decisions/ADR-001.

Promemoria per questo repository:
- Il sito pubblicato e' solo app/. Motore deterministico in app/js/app.js: l'AI
  futura produce parametri e testi, mai numeri (ADR-003).
- P01/S01: docs/architecture.md va aggiornato se cambiano componenti o flussi.
- P02/S02: decisione costosa da invertire -> ADR in docs/decisions/ prima del codice.
- P06/S10: `make check` (lint, check-data, unit) e `make test-integration` prima
  di ogni PR; criteri per release in docs/acceptance-criteria.md.
- Parametri nuovi -> default in norm(): i link ?r= gia' condivisi devono funzionare.
- Dataset nuovo -> DATASETS (dash-shim.js) + SHELL (sw.js) + mappa D (app.js).
- P08/S12: commit '<type>(<scope>): desc' + 'Refs: #issue'; branch da main, PR.
- Funzioni AI: scenari in tests/evals/, docs/agent-perimeter.md, docs/tools-registry.md.

Utility: /adr /architecture-doc /runbook /agent-perimeter /tool-registry /handover
/commit /compliance-check; subagent compliance-auditor, architecture-reviewer,
eval-designer, reproducibility-validator, agentic-safety-reviewer.
Hook attivi: protezione data/raw e .env, scansione secret, commit convention.
"""


def main() -> int:
    sys.stdout.write(CONTEXT)
    return 0


if __name__ == "__main__":
    sys.exit(main())
