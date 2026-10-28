# Japan Tour Planner

Costruttore del percorso per il viaggio in Giappone di ottobre 2027: scegli le mete, il numero di notti e da dove ripartire, e l'app calcola basi, notti, ordine delle tappe, treni, calendario e budget.

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

Il pulsante **Copia link del percorso** crea un link che contiene le mete scelte, le notti, la data e il ritorno: chi lo apre vede esattamente lo stesso percorso.
Le scelte e i percorsi aggiunti al confronto restano salvati sul dispositivo di ciascuno.

## Aggiornare i dati

- Mete: `data/catalogo.json` · treni e voli: `data/tratte.json` · costi: `data/parametri.json`
- Percorsi salvati per tutti: `data/percorsi.json` · percorso di partenza: `data/params.json`
- Dopo una modifica, cambia il numero in `CACHE = 'japan-tour-planner-v1'` dentro `sw.js` (per esempio `japan-tour-planner-v2`), così i telefoni scaricano i dati nuovi.

Prezzi, tempi dei treni e periodi del foliage sono stime raccolte a ottobre 2026, da verificare quando prenotate.
