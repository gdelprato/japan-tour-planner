---
description: Crea o aggiorna il documento di architettura (S01) prima di scrivere codice
argument-hint: [nome sistema]
allowed-tools: Bash, Read, Write, Glob, Grep
---

Crea o aggiorna `docs/architecture.md` secondo lo standard **S01** (principio P01:
l'architettura viene prima del codice di produzione).

Sistema: `$ARGUMENTS`

## Istruzioni

1. Se `docs/architecture.md` esiste gia', leggilo e proponi un aggiornamento
   coerente invece di sovrascriverlo alla cieca.
2. Se nel repo esiste `templates/architecture-template.md`, usalo come base.
3. Esplora `src/` (se presente) per riflettere la struttura reale ed evitare drift.
4. Il documento deve permettere a un nuovo arrivato di capire **cosa fa** il
   sistema, **com'e' strutturato** e **perche'**. Struttura minima:

```markdown
# Architettura — <sistema>

## Scopo e contesto
<Cosa risolve, per chi, in che contesto. Cosa NON fa.>

## Vista d'insieme
<Diagramma a blocchi o descrizione dei componenti principali e responsabilita'.>

## Componenti
| Componente | Responsabilita' | Tecnologia |
|---|---|---|

## Flusso dei dati / del controllo
<Come si muovono dati e controllo tra i componenti, end-to-end.>

## Integrazioni esterne e dipendenze
<Servizi, API, database, modelli usati.>

## Scelte tecnologiche principali
<Le decisioni chiave, ciascuna con rimando all'ADR corrispondente (docs/decisions/).>

## (Solo sistemi LLM/agentici)
- Modello/i e motivazione
- Prompt strategy e versionamento
- Tool disponibili (rimando a docs/tools-registry.md, S18)
- Perimetro operativo (rimando a docs/agent-perimeter.md, S22)
- Gate human-in-the-loop e cost control (S19, S23)

## Vincoli e rischi noti
<Limiti tecnici, assunzioni, rischi architetturali.>
```

5. Riempi ogni sezione con quanto deducibile; segna TODO dove serve input umano.
   Evita genericita': niente "usiamo le best practice" senza spiegare quali e perche'.
6. Per ogni scelta tecnologica rilevante che non ha ancora un ADR, suggerisci di
   crearlo con `/adr`.
