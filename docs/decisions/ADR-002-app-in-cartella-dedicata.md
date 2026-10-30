# ADR-002 — L'app pubblicata vive in `app/`, il resto del repository non viene servito

**Data:** 2026-10-30
**Autore:** Giacomo Del Prato
**Stato:** Accettato
**Issue di riferimento:** PR #4

---

## Contesto

Fino alla versione 0.3 il sito stava nella radice del repository e il workflow pubblicava l'intera radice su GitHub Pages. Con l'adozione degli standard arrivano `docs/`, `tests/`, `scripts/`, `configs/`, `.claude/`, `node_modules/` locale, `Makefile`: tutto finirebbe online, e il service worker, che elenca i file da mettere in cache, convivrebbe con file che non c'entrano con l'app.

---

## Decisione

> **Decidiamo di spostare tutto ciò che il browser scarica in `app/` (`index.html`, `css/`, `js/`, `data/`, `icons/`, `sw.js`, `manifest.webmanifest`, `.nojekyll`) e di pubblicare solo quella cartella.**

Il workflow carica `app/` come artefatto di Pages e sostituisce `__BUILD__` in `app/sw.js`. L'URL pubblico non cambia, perché la radice dell'artefatto resta quella che contiene `index.html`. I percorsi dentro l'app sono relativi e non cambiano.

---

## Alternative considerate

| Alternativa | Motivo del rifiuto |
|---|---|
| Lasciare il sito nella radice ed escludere le altre cartelle al deploy con uno script di copia | È un build step mascherato e va mantenuto a mano a ogni cartella nuova |
| Spostare in `app/` solo `docs/` e strumenti, cioè creare `site/` con una copia | Duplica i file sorgente |
| Usare un branch `gh-pages` separato | Separa la storia del sito da quella del codice e complica la retrocompatibilità dei link |

---

## Conseguenze

### Positive
- Online va solo ciò che serve; `tests/`, `docs/` e strumenti restano privati del repository.
- `scripts/check-data.mjs` può verificare che `DATASETS`, `SHELL` e i file in `app/data/` coincidano.

### Negative
- Chi prova l'app in locale deve servire `app/` (`make run`), non la radice. Netlify Drop richiede di trascinare `app/`.
- Documenti e link del piano che citavano `js/app.js` ora citano `app/js/app.js`.

### Rischi
- Un link relativo sbagliato dopo lo spostamento: mitigato dallo smoke test nel browser, che apre l'app servita da `app/` e verifica che non ci siano errori in console.
