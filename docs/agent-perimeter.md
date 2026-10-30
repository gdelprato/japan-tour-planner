# Perimetro Operativo — Assistente di viaggio e agente dati

**Versione:** 0.1 (bozza scritta prima dell'implementazione, da confermare con la v1.0 del piano)
**Ultima modifica:** 2026-10-30
**Autore:** Giacomo Del Prato
**Sistema di riferimento:** Japan Tour Planner, funzioni AI del piano §6

Due componenti con perimetri distinti. L'**assistente di viaggio** (§6.1–6.6, 6.9–6.10) è un sistema GenAI con output strutturato e nessun tool con effetti: S22 e S23 si applicano come "consigliato" e qui li adottiamo. L'**agente dati** (§6.7) apre pull request: è agentico e S18–S23 si applicano per intero.

---

## Assistente di viaggio

### In scope

| # | Task | Descrizione | Criterio di completamento |
|---|---|---|---|
| 1 | Costruire un viaggio da una frase | Da desideri in linguaggio naturale a parametri (`sel`, `notti`, `persone`, `partenza`, `arrivo`, `ritorno`, `stile`, `bagagli`, `pernotto`) | Parametri validi secondo lo schema, tutte le mete nel catalogo, coerenti con la richiesta |
| 2 | Modificare il viaggio corrente | "Togli Hiroshima", "una notte in più a Kyoto", "spostalo a novembre" | Diff di parametri applicato, il resto invariato |
| 3 | Spiegare il percorso calcolato | Racconto del perché di ordine, notti, avvisi, con le fonti dei dati | Nessun numero che non sia nel risultato del motore |
| 4 | Criticare il piano e proporre alternative | Alternative come parametri valutati dal motore | Ogni alternativa è applicabile con un clic e confrontabile |
| 5 | Mappare interessi in parole sui tag del catalogo | Pesi sui tag esistenti | Solo tag esistenti |
| 6 | Leggere conferme di volo, hotel, treni | Campi con confidenza | Sotto soglia si chiede conferma; nessun campo applicato in silenzio |
| 7 | Rispondere a domande sul viaggio e sul Giappone ancorate ai dati | Con fonte; ricerca web solo su richiesta esplicita e su domini consentiti | Dice quando il dato non c'è |
| 8 | Tradurre frasi utili in giapponese | Frase, lettura, uso | Solo testo |

### Out of scope

| # | Task | Motivo dell'esclusione |
|---|---|---|
| 1 | Prenotare, acquistare, pagare qualsiasi cosa | Nessun tool con effetti: l'app non ha account né pagamenti (ADR-003, ADR-004) |
| 2 | Inventare notti, ordini, prezzi | Li calcola il motore (ADR-003) |
| 3 | Mete non presenti nel catalogo | Si propone la più vicina esistente e si invita ad aprire un'issue per aggiungerla |
| 4 | Viaggi fuori dal Giappone | Fuori dal dominio dei dati |
| 5 | Consigli medici, legali, su visti e immigrazione | Rinvio alle fonti ufficiali |
| 6 | Previsioni meteo puntuali oltre 14 giorni | Non esistono dati affidabili; si mostrano medie stagionali |
| 7 | Conservare conversazioni o dati personali | Il proxy non conserva nulla |

### Comportamento fuori perimetro

**Risposta standard** (testo fisso nel client, non generato dal modello):

> "Questo non rientra in quello che il planner può fare: costruisce e spiega il viaggio, ma non prenota né dà consigli fuori dai suoi dati. Posso aiutarti a cambiare mete, notti, date o stile."

**Escalation path:** log anonimo dell'evento `out_of_scope` con categoria (prenotazione, fuori Giappone, medico/legale, altro) e i primi 100 caratteri; nessuna notifica; revisione trimestrale del perimetro sulla base delle categorie più frequenti.

### Edge cases documentati

| Caso | Input esempio | Comportamento atteso |
|---|---|---|
| Input vuoto | "" | Il pulsante è disabilitato; nessuna chiamata |
| Input molto lungo | > 2.000 caratteri | Troncato con avviso prima dell'invio |
| Ambiguo | "un bel viaggio" | Domande su periodo e durata, nessun parametro applicato |
| Lingua non italiana | "two weeks in Japan in May" | Accettata; risposta in italiano finché l'interfaccia non ha l'inglese |
| Risposta non conforme allo schema | — | Messaggio fisso e proposta del wizard; parametri invariati |
| Quota esaurita | — | "Hai finito le richieste di oggi: riprova domani o usa la tua chiave" |

### Limiti operativi

| Parametro | Valore | Note |
|---|---|---|
| Lunghezza massima input | 2.000 caratteri | |
| Timeout per richiesta | 30 s | Poi messaggio e fallback |
| Richieste per IP al giorno | 30 | Quota del proxy (ADR-004); BYOK senza quota |
| Richieste totali al giorno | 2.000 | Interruttore globale sopra la soglia |
| Token massimi in uscita | 2.000 (parametri), 1.500 (spiegazioni) | |
| Lingue | italiano (inglese con la v1.0) | |

---

## Agente dati (pipeline dei prezzi con AI)

### In scope

| # | Task | Criterio di completamento |
|---|---|---|
| 1 | Verificare prezzi e tempi in `parametri.json`, `partenze.json`, `tratte.json` con ricerca web su fonti ufficiali e guide affidabili | Ogni valore proposto ha URL della fonte e data |
| 2 | Verificare le date delle festività dell'anno successivo in `eventi.json` | Fonte ufficiale |
| 3 | Aprire una pull request con il diff e le fonti | PR aperta, `check-data` verde, nessun merge |

### Out of scope

| # | Task | Motivo |
|---|---|---|
| 1 | Unire la PR o scrivere su `main` | Human-in-the-loop obbligatorio (S19); il tool di merge non esiste nel registro |
| 2 | Modificare `catalogo.json`, `basi.json`, `citta.json`, codice o documenti | Solo valori numerici e date delle voci in scope |
| 3 | Inventare un valore quando la fonte manca | Resta il valore precedente e un commento nella PR |

### Comportamento fuori perimetro e budget

- Un valore senza fonte verificabile non entra nel JSON: va in un commento della PR con la motivazione.
- Budget per esecuzione: massimo 20 ricerche web, 15 chiamate al modello, 10 minuti; superato il budget la run si ferma e apre comunque la PR con quanto raccolto e un avviso (S23).
- Costo per run loggato nel riepilogo della PR; alert (issue automatica) se supera 2× la media delle ultime quattro run.

---

## Monitoring fuori perimetro

```json
{ "event": "out_of_scope_request", "component": "assistente", "request_category": "prenotazione", "request_preview": "primi 100 caratteri", "timestamp": "ISO8601" }
```

Nessun identificativo dell'utente. Questo log, aggregato nel Worker, è la fonte della revisione periodica del perimetro.

## Review del perimetro

| Data review | Modifiche | Autore |
|---|---|---|
| 2026-10-30 | Bozza iniziale, prima dell'implementazione | Giacomo Del Prato |
