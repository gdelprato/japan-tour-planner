# Runbook — Japan Tour Planner

**Versione sistema:** 0.4.0
**Ultimo aggiornamento:** 2026-10-30
**Owner:** Giacomo Del Prato
**Canale di supporto:** GitHub Issues del repository `gdelprato/japan-tour-planner`

---

## Prerequisiti operativi

- Accessi richiesti: scrittura sul repository GitHub; impostazioni del repository per Pages e branch protection.
- Tool richiesti: Git, Node 22 (`.nvmrc`), Python 3 (solo per servire l'app in locale e per gli hook), opzionale `pre-commit`.
- Documentazione correlata: `architecture.md`, `definition-of-done.md`, `PIANO_DI_SVILUPPO.md`.

Il sistema in produzione è un sito statico su GitHub Pages: non ci sono processi da avviare, database o segreti. Le operazioni sono tutte "pubblica una nuova versione" e "verifica che la pagina funzioni".

---

## Avvio del sistema

### Ambiente di produzione

Non si avvia: è servito da GitHub Pages all'indirizzo https://gdelprato.github.io/japan-tour-planner/. Si pubblica una nuova versione unendo su `main` (vedere Aggiornamento).

### In locale

```bash
make setup      # una volta: npm ci, Chromium per i test, pre-commit se installato
make run        # serve app/ su http://localhost:8000
```

### Verifica avvio corretto

Aprire http://localhost:8000. **Output atteso:** la scheda Percorso con mappa, KPI (notti, alloggi, mete) e tappe; nessun errore nella console del browser.

**Output che indica problema:** il testo "Impossibile caricare i dati" in una scheda → un JSON in `app/data/` non risponde o non è valido (vedere Troubleshooting 1).

---

## Verifica operatività

```bash
# dalla radice del repository
make check                 # lint, validazione dati, unit test
make test-integration      # apre l'app in Chromium: console pulita, calcolo, link ?r=, 390 px
curl -sI https://gdelprato.github.io/japan-tour-planner/ | head -1     # HTTP/2 200
curl -s  https://gdelprato.github.io/japan-tour-planner/sw.js | grep -o "japan-tour-planner-[0-9a-f]\{8\}"   # nome cache con il commit pubblicato
```

**Risposta attesa:** `PASS: 0 errori` dal controllo dati, tutti i test `ok`, HTTP 200, un nome di cache con 8 caratteri esadecimali (non `__BUILD__`).

---

## Aggiornamento

### Pre-aggiornamento

- [ ] Branch creato da `main`, issue collegata, PR aperta con la checklist compilata
- [ ] CI "Controlli" verde sulla PR
- [ ] Se cambiano i parametri del viaggio: verificato che un vecchio link `?r=` si apra uguale
- [ ] `CHANGELOG.md` aggiornato in "Non rilasciato"

### Procedura di aggiornamento

1. Unire la PR su `main`. Il workflow "Pubblica su GitHub Pages" esegue `scripts/check-data.mjs`, sostituisce `__BUILD__` con il commit in `app/sw.js` e pubblica `app/`.
2. Attendere il completamento del workflow (circa 1 minuto) nella scheda Actions.
3. Per una release: tag `vX.Y.Z` su `main` e sezione corrispondente nel changelog.

### Verifica post-aggiornamento

```bash
curl -s https://gdelprato.github.io/japan-tour-planner/sw.js | grep -o "japan-tour-planner-[0-9a-f]\{8\}"
```

Deve mostrare i primi 8 caratteri del commit appena pubblicato. Sul telefono con l'app già installata compare la barra "È disponibile una nuova versione" alla prima apertura con rete; dopo "Aggiorna" si vede la versione nuova.

### Rollback

```bash
git checkout main && git pull
git revert -m 1 <sha-del-merge>      # oppure git revert <sha> per un commit singolo
git push origin main                 # ripubblica la versione precedente
```

In alternativa, da Actions → "Pubblica su GitHub Pages" → *Run workflow* su un commit precedente non è possibile: il workflow pubblica sempre `main`, quindi il rollback passa sempre da un revert.

---

## Troubleshooting

### 1 — "Impossibile caricare i dati" in una o più schede

**Sintomo:** la scheda mostra il messaggio al posto dei contenuti; in console un errore su `data/<nome>.json`.

**Causa probabile:** un JSON non valido o un file rinominato senza aggiornare `DATASETS` in `dash-shim.js` e `SHELL` in `sw.js`.

**Risoluzione:**

```bash
node scripts/check-data.mjs          # indica file e riga del problema
make test                            # conferma
```

Correggere, aprire PR, unire. Il deploy non parte se il controllo fallisce, quindi in produzione questo caso capita solo con dati pubblicati prima del controllo.

**Se non risolto:** verificare in Actions che il deploy sia completato e che `curl .../data/<nome>.json` risponda 200.

---

### 2 — Dopo un deploy l'app installata mostra errori in console o una versione mista

**Sintomo:** errori su funzioni non definite, stile parzialmente vecchio.

**Causa probabile:** il service worker non ha ancora installato la versione nuova, oppure `__BUILD__` non è stato sostituito (il nome della cache è uguale a quello precedente).

**Risoluzione:**

```bash
curl -s https://gdelprato.github.io/japan-tour-planner/sw.js | grep -c "__BUILD__"   # deve essere 0
```

Se è 1, il passo "Versione della cache offline" del workflow è fallito: controllare il log in Actions e ripubblicare. Se è 0, sul dispositivo basta ricaricare due volte o premere "Aggiorna" nella barra; in casi estremi, nelle impostazioni del sito, "Cancella dati".

---

### 3 — Un link condiviso si apre con il percorso di esempio invece del viaggio

**Sintomo:** chi apre il link vede il percorso di default.

**Causa probabile:** `?r=` troncato dall'app di messaggistica, oppure parametro non decodificabile (`norm()` ripiega sui default).

**Risoluzione:** verificare che il link finisca con la stringa base64url completa; aprirlo in una scheda anonima; se il problema è sistematico dopo una modifica ai parametri, eseguire `make test-integration` (il test "link ?r=" fallisce) e correggere `norm()`.

---

### 4 — GitHub Pages non pubblica

**Sintomo:** il workflow fallisce su `deploy-pages` o l'URL risponde 404.

**Causa probabile:** in Settings → Pages la sorgente non è "GitHub Actions", oppure il repository è diventato privato con un piano che non include Pages.

**Risoluzione:** impostare la sorgente su GitHub Actions e rilanciare il workflow con *Run workflow*.

---

## Monitoraggio

Oggi non esistono componenti server: le metriche sono quelle della CI e, quando attivate (piano §4, voce 0.8), le pagine viste e gli errori JavaScript anonimi.

| Metrica | Valore normale | Soglia di alert | Azione |
|---|---|---|---|
| Esito CI su `main` | verde | un rosso | Revert e correzione |
| `check-data` | 0 errori | 1 errore | Correggere i dati prima di qualsiasi deploy |
| Errori JavaScript per 100 sessioni (quando attivo) | < 1 | ≥ 1 | Aprire issue `type::bug` con il messaggio e il link `?r=` |
| Età dei prezzi (piano §5.9) | < 6 mesi | ≥ 6 mesi | Far girare o correggere la pipeline dei prezzi |

Per il Worker e la pipeline dei prezzi (pianificati): log JSON con funzione, token, costo, esito; alert quando il costo giornaliero supera 2× la media della settimana precedente (S23).

---

## Escalation

| Situazione | Contatto | Canale | SLA risposta |
|---|---|---|---|
| Sito non raggiungibile o dati rotti in produzione | Owner | Issue con etichetta `type::bug` + `priority::high` | 1 giorno lavorativo |
| Errore di calcolo segnalato da un utente | Owner | Issue con link `?r=` | 3 giorni lavorativi |
| Domanda sull'uso dei dati o richiesta di meta nuova | Owner | Issue `type::feature` | Best effort |

---

## Changelog runbook

| Data | Modifica | Autore |
|---|---|---|
| 2026-10-30 | Versione iniziale | Giacomo Del Prato |
