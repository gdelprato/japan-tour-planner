---
description: Crea un commit conforme alla convention della practice (S12)
argument-hint: [riferimento issue, es. #42]
allowed-tools: Bash
---

Crea un commit conforme allo standard **S12 — Commit Convention** (principi P08:
il codice e' sempre collegato a un task).

Riferimento issue (se fornito): `$ARGUMENTS`

## Formato obbligatorio

```
<type>(<scope>): <descrizione breve>

<corpo opzionale: cosa e perche'>

Refs: #<issue-number>
```

Tipi ammessi: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `eval`.

## Istruzioni

1. Esegui `git status` e `git diff --staged` (e `git diff` se nulla e' in stage)
   per capire cosa sta cambiando.
2. Se non c'e' nulla in stage, mostra i file modificati e proponi quali aggiungere;
   non aggiungere tutto alla cieca (no `git add -A` indiscriminato).
3. Determina `type` e `scope` dalla natura reale delle modifiche. Raggruppa per
   modifica coerente: se ci sono cambiamenti non correlati, segnalalo e proponi
   commit separati (S12 vieta i commit che mescolano modifiche scollegate).
4. Scrivi una descrizione che spieghi il **perche'**, non solo il cosa. Evita
   messaggi generici ("wip", "update", "fix", "misc") — verrebbero bloccati dal
   guard hook.
5. Includi `Refs: #<issue>` se l'utente ha fornito un riferimento o se riesci a
   dedurlo dal branch (es. `feature/42-...`). Se manca, avvisa che il commit non
   sara' collegato a un task (P08) e chiedi conferma prima di procedere.
6. Mantieni i trailer richiesti dall'ambiente (Co-Authored-By / Claude-Session)
   se previsti.
7. Mostra il messaggio finale e crea il commit.
