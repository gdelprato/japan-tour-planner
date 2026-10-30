# Japan Tour Planner

Costruttore del percorso per qualsiasi viaggio in Giappone: scegli date, notti, numero di viaggiatori, città di partenza, arrivo e ritorno (Tokyo o Osaka) con l'orario dei voli, bagagli spediti o sempre con sé, stile di viaggio, cambio yen/euro e mete, e l'app calcola basi, notti, l'ordine delle tappe con meno ore di treno, calendario con feste, ciliegi e foliage, scadenze di prenotazione e budget.

È una web app statica (HTML, CSS, JavaScript e dati JSON), senza server né account. Si può installare sul telefono come un'app e funziona anche offline.

## Cosa c'è dentro

| Cartella / file | A cosa serve |
|---|---|
| `index.html` | La pagina |
| `css/app.css` | Stile dei contenuti, con tema chiaro e scuro automatico |
| `css/shell.css` | Guscio da app: barra, navigazione laterale o in basso, mappa a tutta altezza, linea del percorso |
| `js/app.js` | La logica: costruzione del percorso, mappa, calendario, confronto, budget |
| `js/dash-shim.js` | Carica i dati e salva le scelte nel link e nel browser |
| `js/d3.v7.min.js` | Libreria per mappa e grafici (inclusa, così funziona offline) |
| `data/*.json` | Tutti i dati: mete, treni, basi, costi, feste, foliage, percorsi salvati |
| `manifest.webmanifest`, `sw.js`, `icons/` | Installazione come app e funzionamento offline |
| `docs/PIANO_DI_SVILUPPO.md` | Piano di sviluppo: release, funzioni di prodotto e basate su AI; `docs/ROADMAP.md` è la storia della prima fase |
| `CLAUDE.md` | Guida per chi sviluppa con Claude Code: architettura, dati, convenzioni e controlli |

## Pubblicarla gratis

Serve un hosting, perché aprendo `index.html` con un doppio clic il browser blocca il caricamento dei dati.

**Netlify Drop (il più veloce, 1 minuto)**
1. Vai su https://app.netlify.com/drop
2. Trascina l'intera cartella `japan-tour-planner`.
3. Ottieni subito un link pubblico. Con un account gratuito puoi tenerlo e dargli un nome.

**GitHub Pages (già configurato in questo repository)**
1. In **Settings → Pages**, alla voce *Source* scegli **GitHub Actions** (si fa una volta sola).
2. Ogni commit su `main` pubblica l'app con il workflow `.github/workflows/pages.yml`.
3. L'app è su https://gdelprato.github.io/japan-tour-planner/

**Cloudflare Pages** funziona allo stesso modo: carichi la cartella e ottieni un link.

## Provarla sul computer

```bash
cd japan-tour-planner
python3 -m http.server 8000
```
Poi apri http://localhost:8000

## Installarla sul telefono

- **iPhone (Safari):** apri il link → pulsante Condividi → **Aggiungi alla schermata Home**.
- **Android (Chrome):** apri il link → menu ⋮ → **Installa app** (o "Aggiungi a schermata Home").

## Condividere un percorso

Il pulsante **Copia link** crea un link che contiene tutte le scelte (mete, notti, data, viaggiatori, partenza, arrivo, ritorno e stile): chi lo apre vede esattamente lo stesso viaggio.
Le scelte e i percorsi aggiunti al confronto restano salvati sul dispositivo di ciascuno. I link creati con le versioni precedenti continuano a funzionare.

## Aggiornare i dati

- Mete: `data/catalogo.json` · treni: `data/tratte.json` · costi: `data/parametri.json` · voli per città di partenza: `data/partenze.json`
- Feste e periodi affollati: `data/eventi.json` (`MM-GG` si ripete ogni anno, `regola: "lun:2:10"` è il weekend lungo del secondo lunedì di ottobre, `voli_alta` segna l'alta stagione dei voli)
- Ciliegi, foliage e clima: `data/stagione.json`
- Modelli di viaggio: `data/percorsi.json` · percorso di esempio al primo avvio: `data/params.json`
- Non serve cambiare nulla in `sw.js`: a ogni pubblicazione il workflow mette il commit nel nome della cache (`__BUILD__`), così i telefoni scaricano la versione nuova e propongono "Aggiorna". I dati in `data/` si aggiornano anche senza pubblicare codice nuovo, appena c'è rete.

Prezzi, tempi dei treni, ciliegi e foliage sono stime aggiornate a ottobre 2026, da verificare quando prenotate.
