---
description: Crea la struttura di repository standard (S03) per un nuovo progetto AI/ML o agentico
argument-hint: [nome-progetto] [--agentic]
allowed-tools: Bash, Write, Read
---

Scaffolda un nuovo progetto conforme allo standard **S03 — Repository Structure**.

Argomenti: `$ARGUMENTS`
- primo token = nome del progetto (se assente, chiedilo o usa la dir corrente)
- flag `--agentic` = includi anche l'estensione per sistemi LLM/agentici

## Struttura da creare

```
configs/                  # config per ambiente (dev/staging/prod)
data/raw/                 # dati originali, immutabili (con .gitkeep)
data/processed/           # dati trasformati da codice (con .gitkeep)
src/                      # codice di produzione (moduli Python)
tests/unit/
tests/integration/
tests/evals/              # eval LLM/agentiche
notebooks/                # esplorazione, mai in produzione
docs/decisions/           # ADR
docs/architecture.md      # (placeholder, S01)
docs/runbook.md           # (placeholder, S15)
docs/definition-of-done.md
scripts/
.env.example
pyproject.toml
Makefile                  # target: setup, test, run
README.md                 # con sezione Setup (S07)
.python-version
.gitignore                # include .env, data/processed se opportuno
```

Se `--agentic`, aggiungi anche:
```
src/prompts/              # prompt template versionati
src/tools/                # tool definition
src/agents/               # agent definition
docs/tools-registry.md    # (placeholder, S18)
docs/agent-perimeter.md   # (placeholder, S22)
```

## Istruzioni

1. Crea le cartelle (usa `.gitkeep` nelle dir vuote che vanno versionate;
   ricorda che `data/raw/` va versionato come cartella ma i dati no).
2. Genera file iniziali **minimi ma validi**, non vuoti:
   - `.env.example` con commento esplicativo per ogni variabile (nessun valore reale).
   - `.gitignore` con almeno `.env`, `__pycache__/`, `.venv/`, `*.pyc`, `data/processed/`.
   - `pyproject.toml` con sezione progetto e dipendenze pinnate (placeholder con TODO).
   - `Makefile` con i target `setup`, `test`, `run` (S07).
   - `README.md` con titolo, descrizione, e una sezione **Setup** con i passi.
   - `.python-version` con una versione recente (chiedi se incerto).
   - I placeholder dei doc richiamano i template del repo standard (`/adr`,
     `/architecture-doc`, `/runbook`, `/agent-perimeter`, `/tool-registry`).
3. NON scrivere mai un file `.env` reale (lo blocca anche il guard hook).
4. Alla fine stampa un albero della struttura creata e i prossimi passi suggeriti
   (definire l'architettura con `/architecture-doc` prima di scrivere codice — P01).
