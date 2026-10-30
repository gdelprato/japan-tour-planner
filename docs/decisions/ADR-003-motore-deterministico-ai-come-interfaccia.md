# ADR-003 — Il motore resta deterministico; l'AI è l'interfaccia, non la fonte dei numeri

**Data:** 2026-10-30
**Autore:** Giacomo Del Prato
**Stato:** Accettato
**Issue di riferimento:** PR #4 (piano di sviluppo §2, §6)

---

## Contesto

Il piano introduce funzioni basate su modelli linguistici: assistente che costruisce il viaggio da una frase, spiegazione del percorso, revisore con alternative, lettura di prenotazioni, agente dati. La tentazione è lasciare che il modello produca direttamente il piano (notti, ordine, prezzi). Il valore dell'app oggi è un motore che da pochi parametri calcola tutto in modo riproducibile, anche offline, con ogni numero riconducibile a un dato con fonte.

---

## Decisione

> **Decidiamo che ogni funzione AI produca solo parametri, testi o letture, e che notti, ordine delle tappe, giornate e costi siano sempre calcolati dal motore deterministico sui dati del repository.**

In pratica:
- L'assistente restituisce un oggetto parametri conforme a uno schema (output strutturato), validato dal client contro il catalogo prima di essere applicato con `dash.setParams()`. Nessun id che non esista in `app/data/catalogo.json` viene accettato.
- La spiegazione e la revisione ricevono il risultato di `build()` e `planDays()` e non possono introdurre numeri nuovi; le alternative del revisore sono di nuovo parametri, valutati dal motore.
- La lettura di prenotazioni produce campi con confidenza; sotto soglia l'app chiede conferma.
- Ogni funzione AI ha un equivalente senza rete (wizard, regole deterministiche, frasario statico).

---

## Alternative considerate

| Alternativa | Motivo del rifiuto |
|---|---|
| Il modello genera l'itinerario completo in linguaggio naturale | Non riproducibile, non verificabile, non confrontabile tra percorsi, inutile offline, costi per ogni ricalcolo |
| Il modello genera l'itinerario e il motore lo "corregge" | Due fonti di verità in conflitto; l'utente non capisce perché un numero cambia |
| Nessuna AI, solo wizard | Perde il modo più naturale di esprimere un desiderio di viaggio e la lettura di documenti |

---

## Conseguenze

### Positive
- Si può misurare la qualità dell'AI con criteri oggettivi: parametri validi al primo colpo, mete inventate (devono essere zero), costo per richiesta (`tests/evals/`).
- Il motore si testa in isolamento; l'AI si può spegnere con un interruttore senza perdere funzioni.
- Il costo per utente resta basso: il modello lavora su pochi token, il calcolo è gratis.

### Negative
- Alcune richieste ("un viaggio bello") non sono traducibili in parametri senza chiedere chiarimenti: l'assistente deve saper fare domande.
- Lo schema dei parametri diventa un contratto pubblico da versionare insieme a `norm()`.

### Rischi
- Un modello che "aggira" lo schema restituendo testo libero: mitigato da output strutturato e validazione lato client, con fallback al wizard.
