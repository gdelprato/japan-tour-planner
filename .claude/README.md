# Claude Code Utilities — AI/ML Engineering Standards

Questa cartella contiene utility per Claude Code che applicano e fanno rispettare
gli standard della practice (principi P01–P10, standard S01–S23) durante lo
sviluppo. L'obiettivo: la conformità non dipende dalla disciplina del singolo, ma
è guidata e in parte applicata automaticamente dal tooling.

Le utility sono pensate per essere **copiate in un progetto reale** (la cartella
`.claude/` alla radice del repo di progetto). In questo repository normativo
fungono anche da riferimento e da scaffolding di partenza.

## Cosa contiene

```
.claude/
├── settings.json        # registra gli hook
├── hooks/               # vincoli applicati automaticamente
├── agents/              # subagent specializzati per review/audit
└── commands/            # slash command per scaffolding conforme
```

## Hooks — vincoli automatici

Implementano i vincoli "nel codice, non delegati all'LLM" (la stessa filosofia
degli S18/S19). Sono in Python 3 (nessuna dipendenza esterna).

| Hook | Evento | Cosa fa | Standard |
|---|---|---|---|
| `session_context.py` | SessionStart | Inietta un promemoria di principi, standard e utility disponibili | — |
| `guard_paths.py` | PreToolUse (Write/Edit) | Blocca modifiche a `data/raw/`, scrittura di `.env`, notebook in `src/` | S03, S04, S05, S08 |
| `scan_secrets.py` | PostToolUse (Write/Edit) | Scansiona secret hardcoded nei file appena scritti | S05 |
| `check_commit.py` | PreToolUse (Bash) | Valida la commit convention sui `git commit` | S12 |

I blocchi usano exit code 2 (l'azione viene impedita e Claude riceve la
motivazione). Gli avvisi non bloccanti escono 0. La scansione secret ignora i
placeholder evidenti (`your_`, `os.environ`, `${...}`, `.env.example`, ...).

## Subagent — review specializzate

Invocabili tramite il Task tool (o spontaneamente da Claude quando pertinenti).

| Agente | Quando usarlo | Standard |
|---|---|---|
| `compliance-auditor` | Audit completo prima della consegna; livello di maturità | S01–S23 |
| `agentic-safety-reviewer` | Sistemi con agent/tool prima della produzione | S18–S23 |
| `reproducibility-validator` | "Si fa girare da zero in <30 min?"; scan secret | S04, S05, S07, S08 |
| `architecture-reviewer` | Prima di scrivere codice; review di architettura/ADR | S01, S02 |
| `eval-designer` | Progettare/rivedere la suite di eval e i validation gate | S10, S20 |

## Slash command — scaffolding conforme

| Comando | Cosa genera | Standard |
|---|---|---|
| `/scaffold-project [nome] [--agentic]` | Struttura repo standard | S03 |
| `/architecture-doc [sistema]` | `docs/architecture.md` | S01 |
| `/adr [titolo]` | Nuovo ADR numerato in `docs/decisions/` | S02 |
| `/runbook [sistema]` | `docs/runbook.md` | S15 |
| `/agent-perimeter [agente]` | `docs/agent-perimeter.md` | S22 |
| `/tool-registry [path]` | `docs/tools-registry.md` con classificazione | S18 |
| `/handover` | `docs/handover-checklist.md` precompilata | S17 |
| `/commit [#issue]` | Commit conforme alla convention | S12 |
| `/compliance-check [--livello]` | Audit rapido + verdetto sul livello | S01–S23 |

## Come usarle in un nuovo progetto

1. Copia questa cartella `.claude/` nella radice del progetto.
2. Apri il progetto con Claude Code: il SessionStart hook caricherà il contesto.
3. Parti da `/architecture-doc` (P01: architettura prima del codice), poi
   `/scaffold-project` per la struttura, e procedi.
4. Prima di una consegna lancia `/compliance-check` o l'agente `compliance-auditor`.

## Requisiti

- `python3` disponibile nel PATH (usato dagli hook; nessuna libreria esterna).
- Gli hook usano `$CLAUDE_PROJECT_DIR` per risolvere i path: funzionano finché la
  cartella `.claude/` è alla radice del progetto.

## Personalizzazione

Gli hook sono volutamente semplici e leggibili. Per adattarli a un progetto:
- aggiungi pattern di secret in `scan_secrets.py` (`PATTERNS`);
- estendi i path protetti in `guard_paths.py`;
- modifica i tipi di commit ammessi in `check_commit.py` (`VALID_TYPES`).

Se rendi un avviso più restrittivo (es. bloccare i commit senza `Refs:`),
documenta la scelta — idealmente con un ADR, coerentemente con S02.
