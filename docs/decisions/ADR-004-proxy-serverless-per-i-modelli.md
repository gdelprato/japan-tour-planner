# ADR-004 — Le chiamate ai modelli passano da un proxy serverless con quote; chiave propria come alternativa

**Data:** 2026-10-30
**Autore:** Giacomo Del Prato
**Stato:** Proposto (da confermare prima della v1.0 del piano)
**Issue di riferimento:** piano di sviluppo §3, §6 (infrastruttura comune)

---

## Contesto

Le funzioni AI richiedono una chiave API che non può stare nel browser. L'app non ha backend, non ha account e deve restare gratuita per chi la usa. Serve un componente che custodisca la chiave, limiti i costi e non introduca identità degli utenti.

---

## Decisione

> **Decidiamo di esporre le funzioni AI tramite un Cloudflare Worker (piano gratuito) con un endpoint per funzione, chiave nel segreto del Worker, quota per IP e giornaliera totale in KV, CORS limitato all'origine dell'app, e di offrire in alternativa l'uso della propria chiave (BYOK) salvata solo nel browser.**

Regole del Worker:
- Schema di richiesta validato; nessuna conservazione di richieste o risposte; log JSON con solo funzione, token, costo stimato, esito.
- Modello scelto per funzione (piano §6) con cache dei prompt sui dati del repository; `fallbacks` lato server attivo.
- Interruttore globale per spegnere le funzioni AI senza nuova versione dell'app.
- Messaggi chiari quando la quota è finita: riprovare domani o usare la propria chiave.

---

## Alternative considerate

| Alternativa | Motivo del rifiuto |
|---|---|
| Solo BYOK, nessun proxy | Taglia fuori la quasi totalità degli utenti, che non hanno una chiave |
| Backend con account e piani a pagamento | Contraddice "gratis e senza account"; costi fissi e dati personali da proteggere |
| Modelli nel browser (WebLLM) | Pesanti sul telefono, qualità insufficiente per output strutturato affidabile |
| Funzioni Netlify o Vercel | Equivalenti; Cloudflare scelto per KV incluso nel piano gratuito e latenza bassa dall'Europa. Decisione reversibile |

---

## Conseguenze

### Positive
- Nessun segreto nel client; costi limitati per costruzione; nessun dato personale.
- Lo stesso Worker può ricevere i prezzi pagati in forma anonima (piano §5.9).

### Negative
- Un componente in più da mantenere e da documentare nel runbook (deploy con Wrangler, segreti, quote).
- Le quote per IP penalizzano chi è dietro NAT condivisi: mitigato dal BYOK.

### Rischi
- Abuso del proxy: Turnstile invisibile, quota totale giornaliera, interruttore globale.
- Il piano gratuito di Cloudflare cambia: il Worker è piccolo e portabile su altri provider.
