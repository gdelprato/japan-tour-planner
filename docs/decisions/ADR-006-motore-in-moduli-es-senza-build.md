# ADR-006 — Il motore diventa una libreria di moduli ES puri, caricati dal browser senza build

**Data:** 2026-10-30
**Autore:** Giacomo Del Prato
**Stato:** Accettato
**Issue di riferimento:** piano di sviluppo §4, voce 0.1

---

## Contesto

Il motore (`norm`, `build`, `planDays`, `shortest`, `order`, `notesFor`, gli avvisi) vive dentro `app/js/app.js`, un'unica IIFE da circa 1.060 righe che mescola calcolo e disegno. Dipende da variabili della closure (`D` con i dataset, `adjCache`), dalla libreria globale `d3` per le somme e dalla data di oggi (`norm` propone una partenza fra 180 giorni). Per questo non si può eseguire in Node né testare, e ogni funzione futura del piano (budget §5.8, assistente §6.1, revisore §6.3) dovrebbe infilarsi nello stesso file.

ADR-001 rimandava a questo momento la scelta tra moduli ES nativi e un bundler.

---

## Decisione

> **Decidiamo di estrarre il motore in `app/js/engine/` come moduli ES nativi, puri e senza dipendenze, e di caricare `app.js` come `<script type="module">` che li importa, senza introdurre un build step.**

Regole del motore:
- **Nessun accesso al DOM, a `window`, a `localStorage` o a `d3`.** Le somme usano un helper locale con la stessa semantica di `d3.sum` (valori non numerici ignorati).
- **Nessuno stato globale.** I dataset arrivano come argomento (`dati = { catalogo, basi, tratte, parametri, partenze, eventi, stagione }`); la cache del grafo è una `WeakMap` per array di tratte.
- **Nessuna dipendenza dall'orologio.** `norm(p, oggi)` riceve la data di riferimento; l'app passa `Date.now()`, i test una data fissa.
- **Stesso comportamento di prima.** Il primo rilascio del motore estratto deve produrre risultati identici al codice precedente: lo verifica `tests/unit/motore.test.mjs` contro una fotografia (`tests/unit/fixtures/motore-riferimento.json`) generata eseguendo il codice di prima nel browser.

Organizzazione: `util.js` (helper numerici e date), `formato.js` (testi: notti, giorni, ore, euro, yen), `costanti.js` (aeroporti, stili, limiti), `parametri.js` (`norm`, `dayOf`), `grafo.js` (`shortest`, `order`), `calendario.js` (`onDay`, `during`), `percorso.js` (`build`), `giorni.js` (`planDays`, `notesFor`), `avvisi.js`, `index.js` che riesporta tutto.

---

## Alternative considerate

| Alternativa | Motivo del rifiuto |
|---|---|
| Bundler (Vite, esbuild) con moduli e minificazione | Introduce un build step e un artefatto diverso dal sorgente; i browser di riferimento (Safari e Chrome su telefono) supportano già i moduli ES. Si riconsidera se i moduli superano qualche decina o serve TypeScript |
| Lasciare il motore in `app.js` ed esporlo su `window` per i test | I test richiederebbero un browser per ogni caso; il motore resterebbe accoppiato a `D` e `d3` |
| Estrarre in script classici che scrivono un oggetto globale (`window.Motore`) | Funziona anche senza moduli, ma Node non li importa senza trucchi e l'ordine dei `<script>` torna a essere un contratto implicito |

---

## Conseguenze

### Positive
- Il motore si testa in Node in millisecondi, senza browser.
- Le funzioni del piano (budget, revisore, assistente) aggiungono moduli al motore invece di righe all'interfaccia.
- Un domani il proxy o l'agente dati possono usare lo stesso motore lato server.

### Negative
- `app.js` diventa un modulo: viene eseguito dopo il parsing della pagina (come `defer`) e in strict mode. `dash-shim.js` e `d3` restano script classici e vengono eseguiti prima.
- Il service worker deve elencare ogni file del motore in `SHELL`: `scripts/check-data.mjs` ora verifica che ogni file in `app/js/` e `app/css/` sia in `SHELL`.
- Il browser fa una richiesta per modulo (una decina di file piccoli): accettabile perché dopo la prima visita tutto arriva dalla cache del service worker.

### Rischi
- Un browser molto vecchio senza moduli ES non carica l'interfaccia. Supporto dei moduli: Safari 11, Chrome 61, Firefox 60 (tutti del 2017–2018); accettato.
