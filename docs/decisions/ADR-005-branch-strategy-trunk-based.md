# ADR-005 — Trunk-based: `main` sempre pubblicabile, feature branch con pull request, nessun `develop`

**Data:** 2026-10-30
**Autore:** Giacomo Del Prato
**Stato:** Accettato
**Issue di riferimento:** PR #4

---

## Contesto

S13 prescrive un GitFlow semplificato con `develop` come branch di integrazione. Il progetto ha un solo sviluppatore, ogni merge su `main` viene pubblicato automaticamente su GitHub Pages e la CI esegue gli stessi controlli del Makefile su ogni pull request. La pratica P13 indica il trunk-based development come livello avanzato "per team con CI solida e alta frequenza di deploy".

---

## Decisione

> **Decidiamo di lavorare su branch brevi `feature/<issue>-<nome>`, `fix/<issue>-<nome>`, `docs/…`, `chore/…` creati da `main` e riuniti su `main` tramite pull request con CI verde, senza branch `develop`.**

Regole:
- Nessun commit diretto su `main` (branch protection: PR obbligatoria, check "Controlli" richiesto).
- Ogni PR cita l'issue (`Closes #N`) e compila la checklist della Definition of Done.
- Le branch si cancellano dopo il merge; squash o merge commit a scelta, purché il messaggio rispetti S12.
- Le release sono tag `vX.Y.Z` su `main` con la sezione corrispondente del `CHANGELOG.md`.

---

## Alternative considerate

| Alternativa | Motivo del rifiuto |
|---|---|
| GitFlow con `develop` | Un branch di integrazione in più senza nessuno che integri; ritarda la pubblicazione e duplica le PR |
| Commit diretti su `main` | Nessun gate automatico prima del deploy |

---

## Conseguenze

### Positive
- Ogni merge è pubblicato e verificato: meno drift tra codice e sito.
- La storia di `main` è una sequenza di PR con issue collegata (P08).

### Negative
- Funzioni lunghe vanno spezzate in PR piccole o nascoste dietro un parametro, perché `main` deve restare pubblicabile.

### Rischi
- Una PR unita con CI verde ma app rotta: lo smoke test nel browser e il controllo dei dati riducono il rischio; il rollback è `git revert` e push (runbook).
