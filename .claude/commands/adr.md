---
description: Crea un nuovo Architecture Decision Record numerato (S02)
argument-hint: [titolo della decisione]
allowed-tools: Bash, Read, Write, Glob
---

Crea un nuovo **ADR — Architecture Decision Record** secondo lo standard **S02**
(principio P02: ogni decisione tecnica rilevante e' tracciata con contesto,
alternative e motivazione).

Titolo della decisione: `$ARGUMENTS`

## Istruzioni

1. Determina la cartella ADR: `docs/decisions/` (creala se non esiste).
2. Calcola il prossimo numero progressivo a 4 cifre guardando i file esistenti
   (`NNNN-*.md`); se non ce ne sono, parti da `0001`.
3. Crea il file `docs/decisions/NNNN-<slug-del-titolo>.md`.
4. Se nel repo esiste `templates/adr-template.md`, usalo come base; altrimenti usa
   questa struttura:

```markdown
# ADR-NNNN: <titolo>

- **Stato:** Proposto
- **Data:** <oggi, YYYY-MM-DD>
- **Decisori:** <chi decide>

## Contesto
<Qual e' il problema o la forza che richiede una decisione? Vincoli, requisiti.>

## Alternative considerate
1. **<opzione A>** — pro / contro
2. **<opzione B>** — pro / contro
3. **<opzione C>** — pro / contro

## Decisione
<Quale opzione e' stata scelta e perche'. Il "perche'" e' la parte essenziale.>

## Conseguenze
- Positive: ...
- Negative / trade-off accettati: ...
- Follow-up necessari: ...
```

5. Compila ogni sezione con quanto puoi dedurre dal contesto della conversazione e
   dal codice; lascia TODO espliciti dove serve input umano. Non lasciare sezioni
   vuote senza almeno una indicazione di cosa va inserito.
6. Stampa il path creato e ricorda di linkare l'ADR dall'architecture document.
