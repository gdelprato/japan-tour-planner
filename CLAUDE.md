# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Cos'è

Web app statica (HTML, CSS, JavaScript vanilla, dati JSON) che costruisce un viaggio in Giappone: da pochi parametri calcola basi, notti, ordine delle tappe, calendario, confronto e budget. Nessun backend, nessun account, nessun build step, nessuna dipendenza npm. `js/d3.v7.min.js` è l'unica libreria, inclusa nel repository per funzionare offline. Lingua del progetto: **italiano** per interfaccia, commenti, dati, commit e documenti. L'interfaccia dà del "voi".

Il piano di lavoro è in `docs/PIANO_DI_SVILUPPO.md` (release, funzioni, sezioni numerate come 5.8, 6.1): quando si implementa qualcosa, citare la sezione nel commit. `docs/ROADMAP.md` è la storia della prima fase.

## Comandi

```bash
python3 -m http.server 8000      # provare l'app su http://localhost:8000 (file:// blocca i fetch dei JSON)
```

Non esistono ancora test, lint o validazione dei dati: sono la Fase 0 del piano. Nel frattempo, verifica minima dopo ogni modifica:

```bash
for f in data/*.json; do python3 -c "import json,sys; json.load(open('$f'))" || echo "JSON rotto: $f"; done
```

Controlli manuali attesi prima di un commit che tocca `js/` o `data/`: nessun errore in console, rendering a 390 px e desktop, cambiando notti/persone/aeroporti cambiano KPI, calendario e budget, un vecchio link `?r=...` si apre con lo stesso percorso. Con Playwright disponibile (Chromium preinstallato negli ambienti cloud), automatizzare questi controlli invece di descriverli.

Deploy: ogni push su `main` pubblica su GitHub Pages con `.github/workflows/pages.yml`, che sostituisce `__BUILD__` in `sw.js` con il commit. Non toccare mai quel segnaposto a mano.

## Architettura

Tre script globali caricati in ordine da `index.html`, tutti IIFE senza moduli:

1. **`js/dash-shim.js`** espone `window.dash`: carica i dataset elencati in `DATASETS` da `data/*.json`, tiene i **parametri del viaggio** e li persiste. Fonte di verità dei parametri, in ordine: `?r=` nell'URL (JSON in base64url) → `localStorage['japan-tour-planner:percorso']` → `data/params.json`. `dash.setParams()` fa merge, salva, riscrive l'URL e richiama tutti i callback `onData`. Registra anche il service worker e mostra la barra "Aggiorna".
2. **`js/d3.v7.min.js`**.
3. **`js/app.js`** (~1.060 righe): motore + interfaccia. Flusso: `dash.onData` → `D = {cat, basi, tratte, par, jp, ct, inf, ev, st, per, dep}` → `render()` → `R = build(P())` → una funzione `draw*` per la scheda attiva (`percorso`, `calendario`, `confronto`, `budget`, `logistica`).

Il **motore** in `app.js` è deterministico e va mantenuto tale (stesso input, stesso output; nessun dato esterno dentro il calcolo):
- `norm(p)` completa e sana i parametri grezzi: ogni nuovo parametro va aggiunto qui con un default, così i link già condivisi continuano a funzionare. Attenzione ai due nomi: nell'URL e in `params.json` sono `ora_arrivo`, `ora_ritorno`, `giorni_citta`, `giornata_citta`; dopo `norm` diventano `oraArrivo`, `oraRitorno`, `gc`, `gcit`.
- `build(p)` → `R`: dalle mete scelte ricava le basi (`ensure`), assegna le notti minime, distribuisce le notti extra (max `max_notti` per base, `priorita_extra` solo come spareggio), ordina le tappe con `order()` (DP sui sottoinsiemi, fino a 12 basi, prima base fissa = città di arrivo, ultima tratta verso l'aeroporto di ritorno), calcola `cost` e `tot`. Costanti `AIR` (tokyo/osaka) e `STILI` (economico/medio/comfort) vivono qui, non in JSON.
- `shortest(tratte, a, b)`: Dijkstra sulle ore sul grafo **non orientato** di `tratte.json`; `note` contenente "stima" o "volo" marca la tratta.
- `planDays(R)`: giornata per giornata in mezze giornate (`units`), con `notesFor()` che aggiunge eventi, ciliegi e foliage da `eventi.json` e `stagione.json` tramite `onDay()`.
- `drawCompare()` ricostruisce ogni percorso salvato con `build(norm(...))`: il confronto è sempre calcolato al volo con le date e le persone correnti.

Lo stato dell'interfaccia non salvato nei parametri: `tab`, `view` della mappa, `hl` (meta evidenziata), percorsi del confronto in `localStorage['japan-tour-planner:confronto']` (`PKEY`).

## Dati (`data/`)

- `catalogo.json`: le mete. `tipo` è `citta` (si dorme nella base `basi`, `giorni` interi o mezzi) o `gita` (dalla base in `basi`, con `ore_tratta` e `yen_ar` andata e ritorno). `notte_possibile: "sì"` con `base_notte` e `tipo_notte` (`ryokan`/`hotel`) permette di dormire sul posto se l'id è in `pernotto`. `basi_giornata` su una città la rende visitabile in giornata da un'altra base se l'id è in `giornata_citta`. `luoghi` collega la meta ai nomi usati in `stagione.json` ed `eventi.json`.
- `basi.json` (`base`, `ordine` geografico, `priorita_extra`, `zona`), `citta.json` (coordinate; `tipo` base/gita/aeroporto, `etichetta` è la posizione del testo sulla mappa), `tratte.json` (grafo), `giappone.json` (geometria della mappa, non toccare).
- `parametri.json`: prezzi min/max con `unita` e `fonte`; gli `id` sono usati direttamente in `build()` tramite `g('id')`. Aggiungendo una voce, aggiornare anche il calcolo che la usa.
- `eventi.json` e `stagione.json`: date `MM-GG` ricorrenti (anche a cavallo dell'anno), `AAAA-MM-GG` per un solo anno, `regola: "lun:N:M"` per i weekend lunghi. `voli_alta` segna l'alta stagione dei voli.
- `percorsi.json`: modelli di viaggio mostrati nel confronto (campi lista come stringhe separate da virgola). `params.json`: percorso al primo avvio.

**Invarianti da rispettare quando si cambiano i dati**: ogni `basi`/`base_notte`/`basi_giornata` del catalogo esiste in `basi.json` e ha coordinate in `citta.json`; ogni base è raggiungibile in `tratte.json` da Haneda e Kansai; ogni prezzo ha `fonte`; gli id del catalogo non si rinominano (sono nei link condivisi).

**Aggiungere un dataset** richiede quattro tocchi: `DATASETS` in `dash-shim.js`, `SHELL` in `sw.js`, la mappa `D` in `app.js`, la tabella del README.

## Convenzioni di codice

- Vanilla JS senza build: niente `import`, niente framework, niente dipendenze npm finché il piano (Fase 0) non introduce i moduli ES per il motore. Se si introducono moduli, aggiornare `SHELL` in `sw.js`.
- DOM costruito con l'helper `el(tag, cls, txt)` e `textContent`, mai `innerHTML` con dati.
- Formattazione con gli helper esistenti: `eur`, `yen`, `nn` (notti), `gg` (giorni), `hrs`, `fmtDate`; numeri in formato `it-IT`.
- CSS con i token `--cds-*` e `--jp-*` di `css/app.css`; tema scuro tramite `prefers-color-scheme`, non classi. `app.css` per i contenuti, `shell.css` per barra, navigazione, mappa e linea del percorso.
- Accessibilità già presente da mantenere: `role="tab"`/`aria-selected`, `aria-live` sui riepiloghi, `aria-label` sui pulsanti con sola icona, `prefers-reduced-motion` rispettato (`reduce`).
- Testi dell'interfaccia in italiano, plurali gestiti con gli helper; il tono è "voi" (il singolare per chi viaggia da solo è una voce del piano).
- Prezzi e tempi sono stime: ogni numero nuovo mostrato all'utente ha fonte e, dove possibile, data.
