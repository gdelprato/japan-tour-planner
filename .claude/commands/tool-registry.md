---
description: Genera o aggiorna il registro dei tool agentici con classificazione di sicurezza (S18)
argument-hint: [percorso dei tool, default src/tools]
allowed-tools: Bash, Read, Write, Glob, Grep
---

Genera o aggiorna `docs/tools-registry.md` secondo lo standard **S18 — Tool Safety
Definition**.

Percorso tool da analizzare: `$ARGUMENTS` (default: `src/tools/`)

## Classificazione obbligatoria

| Classe | Significato | Vincolo |
|---|---|---|
| **READ** | sola lettura, nessun effetto collaterale | nessun vincolo aggiuntivo |
| **WRITE-REV** | scrittura reversibile (annullabile) | logging obbligatorio di ogni esecuzione |
| **WRITE-IRR** | scrittura irreversibile (non annullabile) | human-in-the-loop obbligatorio in produzione |

## Istruzioni

1. Scansiona il percorso indicato (default `src/tools/`) e individua tutti i tool
   esposti all'agente: cerca decoratori, registrazioni, function/tool schema,
   definizioni di tool del framework in uso.
2. Per ogni tool deduci dalla sua implementazione cosa fa realmente e **classificalo**
   in READ / WRITE-REV / WRITE-IRR. In caso di dubbio, scegli la classe piu'
   restrittiva e segnalalo.
3. Verifica se i vincoli previsti sono effettivamente presenti nel codice (logging
   per WRITE-REV, gate HITL per WRITE-IRR). Annota gli scostamenti.
4. Produci `docs/tools-registry.md`:

```markdown
# Tools Registry — <sistema>

> Classificazione di sicurezza dei tool agentici (S18). I vincoli sono
> implementati nel codice, non delegati all'LLM.

| Tool | Classe | Cosa fa | Effetto | Vincolo richiesto | Implementato? | Riferimento codice |
|---|---|---|---|---|---|---|
| <nome> | WRITE-IRR | ... | invio email reale | HITL gate | ⚠ solo prompt | src/tools/email.py:42 |

## Tool che richiedono attenzione
<elenco dei WRITE-IRR senza vincolo nel codice e dei tool non classificabili con certezza>
```

5. Se trovi tool WRITE-IRR senza gate nel codice, evidenzialo chiaramente come
   rischio e suggerisci di farlo verificare dall'agente `agentic-safety-reviewer`.
