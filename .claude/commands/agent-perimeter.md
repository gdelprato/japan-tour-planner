---
description: Crea il documento di perimetro operativo per un sistema agentico (S22)
argument-hint: [nome agente]
allowed-tools: Bash, Read, Write, Glob, Grep
---

Crea o aggiorna `docs/agent-perimeter.md` secondo lo standard **S22 — Perimeter
Definition**.

Agente: `$ARGUMENTS`

## Cosa deve definire (obbligatorio)

- **In scope** — lista esplicita dei task supportati, con criterio di completamento.
- **Out of scope** — lista esplicita dei task NON supportati, con motivo.
- **Comportamento fuori perimetro** — risposta standard esatta (testo definito,
  NON delegato all'LLM) + escalation path.
- **Edge case** e **limiti operativi** (timeout, max step, lingue, lunghezza input).
- **Monitoring fuori perimetro** — formato di log per le richieste out-of-scope.

## Istruzioni

1. Se `templates/agent-perimeter.md` esiste, usalo come base (e' il template
   ufficiale di questo repo).
2. Esplora il codice dell'agente (`src/agents/`, `src/tools/`) per derivare uno
   scope realistico e coerente con le capacita' effettive.
3. La "risposta standard fuori perimetro" deve essere un testo fisso e citabile,
   non un'istruzione generica al modello.
4. Definisci i limiti operativi in coerenza con il cost control (S23): max step,
   timeout per task, max lunghezza input.
5. Ricorda che servono **test espliciti** per le richieste fuori perimetro:
   suggerisci di aggiungerli in `tests/evals/` (collegabile a `/compliance-check`
   e all'agente `eval-designer`).
6. Marca con TODO cio' che richiede una decisione di prodotto.
