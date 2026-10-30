---
description: Crea o aggiorna il runbook operativo (S15) per la consegna
argument-hint: [nome sistema]
allowed-tools: Bash, Read, Write, Glob, Grep
---

Crea o aggiorna `docs/runbook.md` secondo lo standard **S15** (principio P10: la
consegna e' un sistema, non un artefatto).

Sistema: `$ARGUMENTS`

## Criterio da soddisfare

Un operatore che non ha mai visto il sistema deve riuscire ad **avviarlo**,
**verificarne il funzionamento** e **gestire un failure comune** seguendo solo il
runbook, senza contattare il team di sviluppo.

## Istruzioni

1. Se `templates/runbook-template.md` esiste, usalo come base; altrimenti la
   struttura minima e':

```markdown
# Runbook — <sistema>

## Avvio
<Comandi esatti per avviare il sistema, prerequisiti, variabili d'ambiente.>

## Verifica di funzionamento (health check)
<Come confermare che il sistema sta funzionando: endpoint, comando, output atteso.>

## Aggiornamento
<Procedura per rilasciare una nuova versione, incluso rollback.>

## Troubleshooting — failure mode piu' probabili
### 1. <failure>
- Sintomo: ...
- Causa probabile: ...
- Risoluzione: <passi concreti>
### 2. <failure>
...
### 3. <failure>
...

## Monitoring e alert
<Dove guardare log e metriche; quali alert esistono e cosa significano (S16).>

## Contatti e escalation
<Chi contattare, come, in quali casi.>
```

2. Esplora il repo (Makefile, scripts/, docker, config) per dedurre comandi reali
   di avvio/verifica invece di scrivere placeholder generici.
3. Includi **almeno i 3 failure mode piu' probabili** con procedura di risoluzione
   verificabile (requisito S15).
4. Marca con TODO cio' che richiede conferma operativa umana.
