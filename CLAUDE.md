# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Cos'è

Web app statica (HTML, CSS, JavaScript vanilla, dati JSON) che costruisce un viaggio in Giappone: da pochi parametri calcola basi, notti, ordine delle tappe, calendario, confronto e budget. Nessun backend, nessun account, nessun build step. Il sito pubblicato è **solo la cartella `app/`**; tutto il resto (docs, test, script, tooling) resta nel repository. Lingua del progetto: **italiano** per interfaccia, commenti, dati, commit e documenti. L'interfaccia dà del "voi".

Il progetto segue gli standard della practice `gdelprato/ai-ml-engineering-standards` (P01–P10, S01–S23). Gli adattamenti a uno stack JavaScript senza build sono in `docs/decisions/ADR-001-standard-adattati-a-web-app-statica.md`: leggerlo prima di proporre strutture "Python" (pyproject, src/, ruff). Il lavoro futuro è in `docs/PIANO_DI_SVILUPPO.md` (sezioni numerate come §5.8, §6.1): citare la sezione nella issue e nella PR.

## Comandi

```bash
make setup               # npm ci + Chromium per i test + pre-commit se installato
make run                 # serve app/ su http://localhost:8000 (file:// blocca i fetch)
make check               # eslint + prettier --check + check-data + unit test
make test                # solo unit test
make test-integration    # smoke test Playwright sull'app servita da app/ (screenshot in test-results/)
make check-data          # validazione di app/data/ e coerenza con dash-shim.js e sw.js
node --test --test-name-pattern="link" 'tests/integration/*.test.mjs'   # un singolo test
```

`node --test` vuole un pattern di file, non una cartella (Node 22). Negli ambienti cloud Chromium è già in `/opt/pw-browsers`: non rilanciare `playwright install`. Prettier non si applica a `app/` (stile compatto esistente, ADR-001): formatta solo `scripts/`, `tests/`, `configs/`, `.github/`.

Deploy: ogni merge su `main` esegue `.github/workflows/pages.yml`, che valida i dati, sostituisce `__BUILD__` in `app/sw.js` con il commit e pubblica `app/`. Non toccare mai quel segnaposto a mano (`check-data` fallisce se manca). La CI "Controlli" (`ci.yml`) esegue gli stessi comandi del Makefile su ogni PR.

## Processo (standard S11–S14, ADR-005)

- Issue prima del lavoro; branch `feature/<issue>-<nome>`, `fix/…`, `docs/…`, `chore/…` da `main`; PR con la checklist di `docs/definition-of-done.md`; nessun commit diretto su `main`.
- Commit `<type>(<scope>): descrizione` con type in `feat fix refactor test docs chore eval` e trailer `Refs: #N`. Gli hook in `.claude/hooks/` bloccano i messaggi non conformi e la scrittura di `.env`, e cercano segreti dopo ogni scrittura.
- Decisioni costose da invertire: ADR in `docs/decisions/ADR-NNN-titolo.md` **prima** di implementare (comando `/adr`). Le ADR non si modificano a posteriori: una revisione è un ADR nuovo.
- Ogni cambiamento visibile aggiorna `CHANGELOG.md` ("Non rilasciato"); cambi di componenti o flussi aggiornano `docs/architecture.md`; cambi operativi `docs/runbook.md`.
- Criteri di accettazione per release in `docs/acceptance-criteria.md`, definiti prima del codice.
- Funzioni AI (piano §6): prima scenari in `tests/evals/scenari/` (quattro tipi di S20), perimetro in `docs/agent-perimeter.md`, strumenti in `docs/tools-registry.md`.

## Architettura

`app/index.html` carica due script classici e poi un modulo ES:

1. **`app/js/dash-shim.js`** espone `window.dash`: carica i dataset elencati in `DATASETS` da `app/data/*.json`, tiene i **parametri del viaggio** e li persiste. Fonte di verità dei parametri, in ordine: `?r=` nell'URL (JSON in base64url) → `localStorage['japan-tour-planner:percorso']` → `data/params.json`. `dash.setParams()` fa merge, salva, riscrive l'URL e richiama tutti i callback `onData`. Registra anche il service worker e mostra la barra "Aggiorna".
2. **`app/js/d3.v7.min.js`**, inclusa per l'offline; la usa solo l'interfaccia (mappa, zoom, raggruppamenti).
3. **`app/js/app.js`** (`type="module"`, ~800 righe): solo interfaccia. Importa il motore da `./engine/index.js`. Flusso: `dash.onData` → `D = {cat, basi, tratte, par, jp, ct, inf, ev, st, per, dep}` → `render()` → `R = build(P())` → una funzione `draw*` per la scheda attiva (`percorso`, `calendario`, `confronto`, `budget`, `logistica`). I wrapper `build`, `notesFor`, `warnings`, `par` passano al motore `dati()`, cioè gli array di `D`.

Il **motore** sta in `app/js/engine/` (ADR-006): moduli ES puri, senza DOM, `window`, `localStorage`, `d3` o stato globale (ESLint lo vieta con `no-restricted-globals`, un test lo ricontrolla). Riceve i dataset come argomento `dati = { catalogo, basi, tratte, parametri, partenze, eventi, stagione }` e la data di oggi come argomento di `norm`. È deterministico e va mantenuto tale. L'AI futura produce solo parametri e testi, mai numeri (ADR-003). Moduli: `util`, `formato`, `costanti` (`AIR`, `STILI`, limiti), `parametri` (`norm`, `dayOf`, `parametriMap`), `grafo` (`shortest`, `order`), `calendario` (`onDay`, `during`), `percorso` (`build`), `giorni` (`planDays`, `notesFor`), `avvisi`; `index.js` riesporta tutto. **Ogni modulo nuovo va aggiunto a `SHELL` in `app/sw.js`** (lo verifica `check-data`).

Funzioni del motore:
- `norm(p, oggi)` completa e sana i parametri grezzi: ogni nuovo parametro va aggiunto qui con un default, così i link già condivisi continuano a funzionare (lo verifica lo smoke test "link ?r="). Attenzione ai due nomi: nell'URL e in `params.json` sono `ora_arrivo`, `ora_ritorno`, `giorni_citta`, `giornata_citta`; dopo `norm` diventano `oraArrivo`, `oraRitorno`, `gc`, `gcit`.
- `build(p, dati)` → `R`: dalle mete scelte ricava le basi (`ensure`), assegna le notti minime, distribuisce le notti extra (max `max_notti` per base, `priorita_extra` solo come spareggio), ordina le tappe con `order()` (DP sui sottoinsiemi, fino a 12 basi, prima base fissa = città di arrivo, ultima tratta verso l'aeroporto di ritorno; a parità di ore vince chi perde meno notti per tratte oltre `LONG_LEG`, poi l'ordine geografico: gli spareggi assumono ore multiple di 0,05, regola in `check-data`), calcola `cost` e `tot`. Con andata e ritorno sulla stessa città aggiunge la notte finale lì (`endStop`), salvo che l'ultima tappa sia già quella città. Costanti `AIR` (tokyo/osaka) e `STILI` (economico/medio/comfort) vivono qui, non in JSON.
- `shortest(tratte, a, b)`: Dijkstra sulle ore sul grafo **non orientato** di `tratte.json`; `note` contenente "stima" o "volo" marca la tratta.
- `planDays(R)`: giornata per giornata in mezze giornate (`units`); imposta anche `overflow` sulle tappe. `notesFor(day, dati)` aggiunge eventi, ciliegi e foliage da `eventi.json` e `stagione.json` tramite `onDay()`. `avvisi(R, dati)` produce gli avvisi mostrati sopra la mappa.

**Test del motore** (`tests/unit/motore.test.mjs`): 20 scenari (`scenari-motore.mjs`) confrontati con una fotografia (`fixtures/motore-riferimento.json`), generata dal codice di prima dell'estrazione e ridotta con `proiezione-motore.mjs`. Se un test di confronto fallisce, il comportamento è cambiato: se il cambio è voluto, `npm run aggiorna-riferimento-motore`, rileggere il diff della fotografia e spiegarlo nella PR. Uno scenario nuovo va aggiunto a `scenari-motore.mjs` e poi si rigenera.
- `drawCompare()` ricostruisce ogni percorso salvato con `build(norm(...))`: il confronto è sempre calcolato al volo con le date e le persone correnti.

Stato dell'interfaccia non salvato nei parametri: `tab`, `view` della mappa, `hl` (meta evidenziata), percorsi del confronto in `localStorage['japan-tour-planner:confronto']` (`PKEY`).

## Dati (`app/data/`)

- `catalogo.json`: le mete. `tipo` è `citta` (si dorme nella base `basi`, `giorni` interi o mezzi) o `gita` (dalla base in `basi`, con `ore_tratta` e `yen_ar` andata e ritorno). `notte_possibile: "sì"` con `base_notte` e `tipo_notte` (`ryokan`/`hotel`) permette di dormire sul posto se l'id è in `pernotto`. `basi_giornata` su una città la rende visitabile in giornata da un'altra base se l'id è in `giornata_citta`. `luoghi` collega la meta ai nomi usati in `stagione.json` ed `eventi.json`.
- `basi.json` (`base`, `ordine` geografico, `priorita_extra`, `zona`), `citta.json` (coordinate; `tipo` base/gita/aeroporto, `etichetta` è la posizione del testo sulla mappa), `tratte.json` (grafo), `giappone.json` (geometria della mappa, non toccare).
- `parametri.json`: prezzi min/max con `unita` e `fonte`; gli `id` sono usati direttamente in `build()` tramite `g('id')` ed elencati in `configs/check-data.json` (`parametri_richiesti`).
- `eventi.json` e `stagione.json`: date `MM-GG` ricorrenti (anche a cavallo dell'anno), `AAAA-MM-GG` per un solo anno, `regola: "lun:N:M"` per i weekend lunghi. `voli_alta` segna l'alta stagione dei voli.
- `percorsi.json`: modelli di viaggio mostrati nel confronto (campi lista come stringhe separate da virgola). `params.json`: percorso al primo avvio.

Gli invarianti (basi esistenti, coordinate, grafo raggiungibile dagli aeroporti, prezzi con fonte, date valide, mete dei modelli nel catalogo) sono tutti in `scripts/check-data.mjs`: se si aggiunge una regola sui dati, va lì, non in un commento. Gli id del catalogo non si rinominano (sono nei link condivisi).

**Aggiungere un dataset** richiede: il file in `app/data/`, `DATASETS` in `dash-shim.js`, `SHELL` in `sw.js`, la mappa `D` in `app.js`, la tabella del README. `check-data` segnala i primi due disallineamenti.

`data/raw/` (radice) è per snapshot scaricati dalla futura pipeline dei prezzi: immutabile (l'hook `guard_paths.py` blocca la modifica di file esistenti) e non versionato.

## Convenzioni di codice

- Vanilla JS senza build nell'app: moduli ES nativi (`app.js`, `engine/`), niente bundler, niente framework; `dash-shim.js` resta uno script classico. Script e test in `scripts/` e `tests/` sono moduli ES per Node 22. Dipendenze di sviluppo solo con versione esatta (`npm install --save-dev --save-exact`).
- DOM costruito con l'helper `el(tag, cls, txt)` e `textContent`, mai `innerHTML` con dati.
- Formattazione con gli helper esistenti: `eur`, `yen`, `nn` (notti), `gg` (giorni), `hrs`, `fmtDate`; numeri in formato `it-IT`.
- CSS con i token `--cds-*` e `--jp-*` di `app/css/app.css`; tema scuro tramite `prefers-color-scheme`. `app.css` per i contenuti, `shell.css` per barra, navigazione, mappa e linea del percorso.
- Accessibilità già presente da mantenere: `role="tab"`/`aria-selected`, `aria-live` sui riepiloghi, `aria-label` sui pulsanti con sola icona, `prefers-reduced-motion` rispettato (`reduce`).
- Ogni numero nuovo mostrato all'utente ha fonte e, dove possibile, data.
- Nessun segreto nel codice né nel browser: le chiavi future vivono nei segreti di Actions o del Worker e sono documentate in `.env.example`.
