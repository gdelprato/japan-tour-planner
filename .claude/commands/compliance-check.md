---
description: Audit rapido di conformita' agli standard (S01-S23) con verdetto sul livello di maturita'
argument-hint: [--foundation | --production | --enterprise]
allowed-tools: Bash, Read, Grep, Glob, Task
---

Esegui un controllo di conformita' del progetto corrente contro gli standard della
practice e restituisci il livello di maturita' raggiunto.

Livello target (se specificato): `$ARGUMENTS`
(default: verifica il livello **Foundation**, quello non negoziabile per la consegna)

## Come procedere

Per un audit **approfondito**, delega all'agente `compliance-auditor` tramite il
Task tool, passandogli il contesto del progetto e il livello target. Per un check
**rapido inline**, verifica direttamente i criteri qui sotto.

## Criteri Foundation (non negoziabili — un solo FAIL = non pronto per la consegna)

Verifica con evidenza concreta dal repo:

```
ARCHITETTURA & DECISIONI
□ docs/architecture.md esiste ed e' sostanziale (S01)
□ docs/decisions/ contiene almeno un ADR (S02)

QUALITA' DEL CODICE
□ Struttura repo conforme a S03 (configs/ data/ src/ tests/ notebooks/ docs/)
□ Nessun notebook in src/ (S03)
□ pyproject.toml con versioni pinnate + lock file committato (S04)
□ .env.example presente; .env NON tracciato da git; nessun secret hardcoded (S05)
□ Linting/pre-commit configurati (S06)

RIPRODUCIBILITA' & VALIDAZIONE
□ README con sezione Setup; Makefile con setup/test/run; .python-version (S07)
□ data/raw/ senza modifiche manuali; trasformazioni in script (S08)
□ Suite di validazione/eval presente con criteri documentati (S10)

GESTIONE DEL LAVORO
□ Commit recenti conformi alla convention (S12) — campiona `git log --oneline -20`
□ docs/definition-of-done.md presente (S14)

CONSEGNA
□ docs/runbook.md presente e completo (S15)

SE AGENTICO (presenza di src/agents/ o src/tools/)
□ docs/tools-registry.md con classificazione (S18)
□ Gate HITL per WRITE-IRR nel codice (S19)
□ tests/evals/ con i 4 scenari (S20)
□ Observability per-step (S21)
□ docs/agent-perimeter.md (S22)
□ Cost control: budget + interruzione nel codice (S23)
```

## Output

Stampa:
1. Tipo di progetto rilevato (ML classico / LLM-GenAI / Agentico).
2. Tabella criterio -> stato (PASS/FAIL/N/A) con evidenza (path).
3. **Verdetto sul livello**: Foundation raggiunto? Production-Ready? Enterprise?
4. Elenco ordinato dei blocchi da risolvere, con l'azione concreta per ciascuno
   (e quale slash command o agente usare: /scaffold-project, /adr, /runbook,
   /tool-registry, agente reproducibility-validator, agentic-safety-reviewer...).

Non dichiarare un criterio PASS senza aver trovato l'evidenza. In caso di dubbio,
marca PARZIALE e spiega cosa verificare.
