# Registro dei tool — funzioni AI (S18)

**Versione:** 0.1 (bozza scritta prima dell'implementazione)
**Ultima modifica:** 2026-10-30

Classificazione secondo S18: **READ** (nessun effetto), **WRITE-REV** (reversibile, log obbligatorio), **WRITE-IRR** (irreversibile, approvazione umana obbligatoria). I vincoli sono implementati nel codice, non affidati al modello.

## Assistente di viaggio (nel browser, tramite proxy)

L'assistente **non ha tool**: riceve dati nel prompt e restituisce output strutturato. Gli effetti li applica il client, dopo validazione.

| Operazione | Chi la esegue | Classe | Vincolo nel codice |
|---|---|---|---|
| Lettura di catalogo, basi, eventi, piano corrente | Il client la mette nel prompt | READ | Dati del repository, in cache sul proxy |
| Applicazione dei parametri proposti | Il client (`dash.setParams`) | WRITE-REV | Validazione contro lo schema e il catalogo; "Annulla" ripristina i parametri precedenti; nulla lascia il dispositivo |
| Ricerca web (§6.5) | Strumento server dell'API, solo su richiesta esplicita | READ | `max_uses` ≤ 3, domini consentiti (JR, Japan Guide, siti ufficiali) |
| Lettura di immagini e PDF di prenotazioni (§6.4) | Contenuto della richiesta | READ | Il proxy non conserva il file; campi applicati solo sopra la soglia di confidenza o con conferma |

## Agente dati (GitHub Actions, settimanale)

| Tool | Classe | Vincolo nel codice | Log |
|---|---|---|---|
| Lettura dei JSON del repository | READ | Sola lettura del checkout | — |
| Ricerca web su fonti di prezzo | READ | `max_uses` 20 per run, domini consentiti per categoria | URL e data di ogni risultato usato |
| Chiamata alle API prezzi (Rakuten, Travelpayouts/Amadeus) | READ | Chiavi nei segreti di Actions; quota giornaliera | Conteggio chiamate |
| Scrittura dei JSON in `app/data/` sul branch dell'agente | WRITE-REV | Solo voci numeriche e date delle liste in scope (`agent-perimeter.md`); `check-data` deve passare | Diff completo nella PR |
| Apertura della pull request | WRITE-REV | Branch dedicato `chore/prezzi-AAAA-MM-GG`; una PR per run; chiusa se non unita entro 4 settimane | Corpo della PR con fonti e costo della run |
| Merge su `main` | **non disponibile** | Il token di Actions ha solo permesso `contents: write` sul branch e `pull-requests: write`; il merge è umano (S19) | — |
| Invio di email, notifiche esterne, cancellazioni | **non disponibile** | Nessun tool di questo tipo nel registro | — |

Nessun tool WRITE-IRR è previsto. Se in futuro ne servisse uno, questo registro va aggiornato prima dell'implementazione e il gate umano va implementato nel codice (S19), con un ADR.

## Changelog

| Data | Modifica | Autore |
|---|---|---|
| 2026-10-30 | Bozza iniziale | Giacomo Del Prato |
