# ADR-008 — Il font Zen Kaku Gothic New è ospitato sul sito, solo alfabeto latino

**Data:** 2026-10-30
**Autore:** Giacomo Del Prato
**Stato:** Accettato
**Issue di riferimento:** #10

---

## Contesto

L'interfaccia usa Zen Kaku Gothic New caricato da Google Fonts. Il foglio CSS di Google per questo font elenca 484 blocchi `@font-face` (tutti i sottoinsiemi giapponesi): 449 KB, 114 KB compressi, più i file dei font da `fonts.gstatic.com`. Nelle misure Lighthouse era la prima causa di rendering bloccato e di lavoro sul thread principale. Inoltre:
- offline il font non è disponibile, perché il service worker non mette in cache risorse di altri domini;
- ogni visita contatta i server di Google, cosa che in Europa ha anche implicazioni di privacy.

L'interfaccia e i dati sono in italiano: fuori dall'alfabeto latino si usano solo cinque simboli (✈ → ≤ ✕ ✓).

---

## Decisione

> **Decidiamo di servire dal sito i quattro pesi usati (400, 500, 700, 900) del solo sottoinsieme latino di Zen Kaku Gothic New, in `app/fonts/`, con `font-display: swap`, e di togliere ogni richiesta a Google Fonts.**

I quattro file woff2 pesano circa 9,6 KB ciascuno, sono nella `SHELL` del service worker e quindi disponibili offline. La licenza SIL Open Font License 1.1 consente la redistribuzione; il testo è in `app/fonts/OFL.txt`. L'`unicode-range` è lo stesso del sottoinsieme latino di Google: i caratteri fuori intervallo usano i font di sistema.

---

## Alternative considerate

| Alternativa | Motivo del rifiuto |
|---|---|
| Google Fonts caricato senza bloccare (`media="print"`) | Riduce il blocco del rendering ma restano 114 KB, il lavoro sul thread principale, la dipendenza esterna e l'assenza offline |
| Solo font di sistema | Cambia l'identità visiva dell'app senza necessità |
| Tutti i sottoinsiemi, anche giapponesi, sul sito | Centinaia di file per caratteri che l'interfaccia non usa |

---

## Conseguenze

### Positive
- Nessuna richiesta a server esterni (verificato da uno smoke test); stesso aspetto online e offline.
- Lighthouse: Total Blocking Time da circa 330 a circa 150 ms.

### Negative
- Aggiornare il font significa scaricare di nuovo i file a mano.
- Se in futuro l'interfaccia mostrerà testo giapponese, servirà il relativo sottoinsieme (o resterà il font di sistema).

### Rischi
- Nessuno rilevante: il font è decorativo e ha un fallback di sistema.
