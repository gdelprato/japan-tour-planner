# Japan Tour Planner

Costruttore del percorso per qualsiasi viaggio in Giappone: scegli date, notti, numero di viaggiatori, città di partenza, arrivo e ritorno (Tokyo o Osaka) con l'orario dei voli, bagagli spediti o sempre con sé, stile di viaggio, cambio yen/euro e mete, e l'app calcola basi, notti, l'ordine delle tappe con meno ore di treno, calendario con feste, ciliegi e foliage, scadenze di prenotazione e budget.

È una web app statica (HTML, CSS, JavaScript e dati JSON), senza server né account. Si può installare sul telefono come un'app e funziona anche offline.

L'app è su https://gdelprato.github.io/japan-tour-planner/

## Setup

### Prerequisiti
- Node 22 (versione in `.nvmrc`; con nvm: `nvm use`)
- Python 3 (per servire l'app in locale e per gli hook)
- Facoltativo: `pre-commit` (`pip install pre-commit`) per i controlli automatici prima di ogni commit

### Installazione

```bash
git clone https://github.com/gdelprato/japan-tour-planner.git
cd japan-tour-planner
make setup        # npm ci, Chromium per i test, hook di pre-commit se disponibile
```

Le variabili d'ambiente servono solo a script e servizi futuri (pipeline dei prezzi, proxy dei modelli), non all'app: sono documentate in `.env.example`.

### Esecuzione

```bash
make run          # http://localhost:8000
```

Aprire `index.html` con un doppio clic non funziona: il browser blocca il caricamento dei dati.

### Test e controlli

```bash
make check              # lint, formato, validazione dei dati, unit test
make test-integration   # apre l'app in Chromium: console pulita, calcolo, link ?r=, 390 px
make check-data         # solo la validazione di app/data/
```

## Struttura

| Cartella / file | A cosa serve |
|---|---|
| `app/` | **L'app pubblicata**: `index.html`, `css/`, `js/`, `data/`, `icons/`, `sw.js`, `manifest.webmanifest`. È l'unica cartella che va online |
| `app/js/engine/` | Il motore: percorso, notti, ordine, giornate, avvisi, costi. Funzioni pure, testate in Node |
| `app/js/app.js` | L'interfaccia: schede, mappa, controlli |
| `app/js/dash-shim.js` | Carica i dati e salva le scelte nel link e nel browser |
| `app/data/*.json` | Tutti i dati: mete, treni, basi, costi, feste, foliage, percorsi salvati |
| `scripts/check-data.mjs` | Validazione dei dati e della loro coerenza con il codice |
| `tests/` | `unit/`, `integration/` (browser), `evals/` (funzioni AI future) |
| `configs/` | Soglie e liste usate dagli script |
| `docs/` | Architettura, decisioni (ADR), runbook, piano di sviluppo, criteri di accettazione |
| `data/raw/`, `notebooks/` | Dati grezzi scaricati e analisi esplorative (non versionati, non pubblicati) |
| `.claude/`, `CLAUDE.md` | Hook, comandi e guida per sviluppare con Claude Code |

Il progetto segue gli standard [AI/ML Engineering](https://github.com/gdelprato/ai-ml-engineering-standards); gli adattamenti a una web app statica sono in `docs/decisions/ADR-001-standard-adattati-a-web-app-statica.md`.

## Pubblicare

**GitHub Pages (configurato).** In *Settings → Pages* la sorgente è **GitHub Actions**. Ogni merge su `main` valida i dati, mette il commit nel nome della cache offline e pubblica la cartella `app/`. Procedure, verifica e rollback in `docs/runbook.md`.

**Netlify Drop o Cloudflare Pages.** Trascinare la cartella `app/` (non la radice del repository).

## Installarla sul telefono

- **iPhone (Safari):** apri il link → pulsante Condividi → **Aggiungi alla schermata Home**.
- **Android (Chrome):** apri il link → menu ⋮ → **Installa app** (o "Aggiungi a schermata Home").

## Condividere un percorso

Il pulsante **Copia link** crea un link che contiene tutte le scelte (mete, notti, data, viaggiatori, partenza, arrivo, ritorno e stile): chi lo apre vede esattamente lo stesso viaggio.
Le scelte e i percorsi aggiunti al confronto restano salvati sul dispositivo di ciascuno. I link creati con le versioni precedenti continuano a funzionare.

## Aggiornare i dati

- Mete: `app/data/catalogo.json` · treni: `app/data/tratte.json` · costi: `app/data/parametri.json` · voli per città di partenza: `app/data/partenze.json`
- Feste e periodi affollati: `app/data/eventi.json` (`MM-GG` si ripete ogni anno, `regola: "lun:2:10"` è il weekend lungo del secondo lunedì di ottobre, `voli_alta` segna l'alta stagione dei voli)
- Ciliegi, foliage e clima: `app/data/stagione.json`
- Modelli di viaggio: `app/data/percorsi.json` · percorso di esempio al primo avvio: `app/data/params.json`
- Dopo ogni modifica: `make check-data`. Il deploy non parte se i dati non sono validi.
- Non serve cambiare nulla in `app/sw.js`: a ogni pubblicazione il workflow mette il commit nel nome della cache (`__BUILD__`), così i telefoni scaricano la versione nuova e propongono "Aggiorna". I dati si aggiornano anche senza pubblicare codice nuovo, appena c'è rete.

Prezzi, tempi dei treni, ciliegi e foliage sono stime aggiornate a ottobre 2026, da verificare quando prenotate.

## Contribuire

Ogni attività parte da un'issue (template in `.github/ISSUE_TEMPLATE/`), si sviluppa su un branch `feature/<issue>-<nome>` o `fix/<issue>-<nome>` e arriva su `main` con una pull request a CI verde (ADR-005). Commit nel formato `<type>(<scope>): descrizione` con `Refs: #issue`. Checklist in `docs/definition-of-done.md`; storia delle versioni in `CHANGELOG.md`; prossimi passi in `docs/PIANO_DI_SVILUPPO.md`.
