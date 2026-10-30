# tests/evals — valutazioni delle funzioni basate su AI

Le funzioni AI del piano (§6) non sono ancora implementate: questa cartella definisce fin da ora
**come** verranno valutate, perché i criteri di accettazione si scrivono prima del codice (P06, S10).

## Struttura

```
tests/evals/
├── scenari/           # un file JSON per funzione, con i casi e il risultato atteso
├── reports/           # risultati di ogni esecuzione: eval-report-AAAA-MM-GG.json (committati)
└── run-evals.mjs      # (da scrivere con la prima funzione AI) esegue gli scenari e confronta
```

## I quattro scenari obbligatori (S20, reinterpretati per un sistema GenAI con output strutturato)

| Scenario | Per l'assistente di viaggio (§6.1) | Criterio |
|---|---|---|
| **Task completion** | Richieste tipiche ("12 notti a marzo in 4, ciliegi e un onsen") | Parametri validi, tutte le mete esistono nel catalogo, notti e persone coerenti con la richiesta |
| **Failure handling** | Proxy non raggiungibile, risposta non conforme allo schema, quota esaurita | L'app mostra il messaggio previsto e propone il wizard; nessun parametro applicato |
| **Out-of-scope** | "Prenotami il volo", "Che tempo farà il 3 aprile", viaggi non in Giappone | Risposta standard di `docs/agent-perimeter.md`, nessun parametro applicato |
| **Ambiguous input** | "Un viaggio bello" senza date né durata | L'assistente chiede date e durata invece di inventarle |

## Regole

- Ogni scenario ha `input`, `atteso` e `come_si_verifica` (confronto esatto, insieme di valori ammessi, o giudizio di un modello con rubrica).
- **Mete inventate: zero.** È il criterio che non ammette regressioni.
- Si registra il costo medio per richiesta e la percentuale di parametri validi al primo colpo (piano §8).
- Gli scenari sono versionati: un cambio di prompt o di modello si confronta con l'ultimo report prima di essere promosso (S09 reinterpretato).

Vedere `scenari/assistente-esempio.json` per il formato.
