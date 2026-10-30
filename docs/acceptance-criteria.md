# Criteri di accettazione

Definiti prima dell'implementazione (P06, S10). Ogni release del piano (`PIANO_DI_SVILUPPO.md` §7) si considera pronta quando i criteri della sua riga sono verificati, e il risultato è registrato in `docs/validation-report-AAAA-MM-GG.md`.

## Criteri permanenti (ogni versione pubblicata)

| # | Criterio | Come si verifica | Soglia |
|---|---|---|---|
| A1 | I dati sono validi e coerenti con il codice | `node scripts/check-data.mjs` | 0 errori |
| A2 | L'app si apre senza errori nel browser | `make test-integration`, test "pagina si apre" | 0 errori in console |
| A3 | Il motore risponde ai parametri | test "aggiungere una notte" | notti +1, budget presente |
| A4 | I link condivisi restano validi | test "link ?r=" con parametri della versione precedente | stesso numero di notti, persone, mete |
| A5 | Rendering mobile | test a 390 px | nessuno scorrimento orizzontale |
| A6 | Codice conforme | `make lint` | 0 errori ESLint, Prettier `--check` ok |
| A7 | Nessun segreto nel repository | hook `scan_secrets.py`, `detect-private-key` | 0 rilevamenti |
| A8 | Pubblicazione corretta | `sw.js` pubblicato contiene il commit | `__BUILD__` assente online |
| A9 | Qualità della pagina | `make lighthouse` (job `lighthouse` in CI) | prestazioni ≥ 90, accessibilità ≥ 95, buone pratiche ≥ 95, CLS ≤ 0,1 (mediana di 3) |
| A10 | PWA installabile | `check-data` (manifest e icone) e smoke test (service worker) | 0 errori |
| A11 | Nessuna dipendenza esterna a runtime | smoke test "nessuna richiesta a server esterni" | 0 richieste |

## Criteri per release

| Release | Criteri aggiuntivi |
|---|---|
| v0.5 Fondamenta | Motore estratto in `app/js/engine/` con test di snapshot sui 5 modelli di `percorsi.json` (2, 5 e 1 persone, round trip e open-jaw) tutti verdi, più 15 scenari limite e il confronto del testo di tutte le schede tra app vecchia e nuova (**verificato il 2026-10-30**); Lighthouse prestazioni ≥ 90 e accessibilità ≥ 95 su mobile (**verificato il 2026-10-30**: prestazioni 92–95, accessibilità 100, buone pratiche 100, CLS 0,03; job `lighthouse` in CI); cambio dalla BCE con fallback verificato spegnendo la rete; ogni prezzo con data visibile |
| v0.6 Primo avvio | Il wizard porta a un percorso valido in ≤ 4 passi; più viaggi salvati e riaperti senza perdita; test del wizard in `tests/integration/` |
| v1.0 Assistente | Sulle 50 richieste di `tests/evals/scenari/`: parametri validi al primo colpo ≥ 90%, mete inventate = 0, costo medio ≤ 0,05 € per richiesta; quota del proxy verificata (31ª richiesta rifiutata con messaggio previsto); interruttore globale testato; perimetro (`agent-perimeter.md`) con test out-of-scope verdi |
| v1.1 Prenotazioni | Esportazione `.ics` importata senza errori in Google Calendar e Apple Calendar; lettura di 10 conferme di volo di esempio con campi corretti ≥ 9/10 e nessun campo sbagliato applicato senza conferma |
| v1.2 Dati vivi | Pipeline prezzi: una PR automatica a settimana con fonti; età mediana dei prezzi di voli e hotel < 2 settimane; voci con fonte "Stima" in `parametri.json` = 0 |
| v1.5 In viaggio | Modalità Oggi funziona offline (test con rete spenta dopo una prima apertura); meteo con fallback |

## Report di validazione

Ogni release ha un file `docs/validation-report-AAAA-MM-GG.md` con: versione, data, chi ha eseguito, tabella criterio → esito → evidenza (log, screenshot in `test-results/`, link alla run di CI), verdetto PASS/FAIL e firma.
