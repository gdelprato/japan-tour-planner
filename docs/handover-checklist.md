# Handover Checklist — Japan Tour Planner

**Data consegna:** da compilare
**Versione sistema:** da compilare
**Team di sviluppo:** Giacomo Del Prato
**Referente destinatario:** da compilare (chi prende in carico il progetto, o se stessi a distanza di mesi)

Questo progetto non ha un "cliente" esterno: la checklist serve a garantire che chiunque, anche l'autore dopo una pausa, possa riprendere e operare l'app leggendo solo il repository (P05, P10). Si compila a ogni release maggiore.

---

## SISTEMA

```
□ https://gdelprato.github.io/japan-tour-planner/ risponde 200 e sw.js contiene il commit pubblicato
□ make check e make test-integration verdi sul commit taggato
□ Criteri di accettazione della release verificati: docs/acceptance-criteria.md
□ Report di validazione scritto: docs/validation-report-AAAA-MM-GG.md
□ Eval delle funzioni AI eseguite senza regressioni (se presenti): tests/evals/reports/
```

**Note:**

---

## DOCUMENTAZIONE

```
□ docs/architecture.md riflette il sistema reale (componenti pianificati marcati come tali)
□ docs/runbook.md provato da una persona non coinvolta: avvio locale, verifica, rollback
□ docs/decisions/ contiene gli ADR delle decisioni prese dalla release precedente
□ docs/definition-of-done.md applicata alle PR della release
□ README.md: sezione Setup verificata da zero in meno di 30 minuti
□ CLAUDE.md aggiornato (comandi, percorsi, convenzioni)
□ CHANGELOG.md con la sezione della versione
```

**Note:**

---

## ACCESSI E CREDENZIALI

```
□ Nessun segreto nel repository (scan_secrets, detect-private-key)
□ .env.example completo: ogni variabile usata da script, CI o Worker è documentata
□ Segreti di GitHub Actions e del Worker elencati per nome (non per valore) qui sotto
□ Accesso al repository, a Pages e a Cloudflare (se attivo) in mano al destinatario
```

| Sistema | Segreto o accesso | Dove vive | Trasferito a | Data |
|---|---|---|---|---|
| GitHub Pages | nessun segreto | Settings → Pages | | |
| Cloudflare Worker (pianificato) | `ANTHROPIC_API_KEY`, quote KV | Segreti del Worker | | |
| Pipeline prezzi (pianificata) | `RAKUTEN_APP_ID`, `TRAVELPAYOUTS_TOKEN` | Segreti di Actions | | |

---

## TRASFERIMENTO DI CONOSCENZA

```
□ Walkthrough dell'architettura (30 minuti) fatto o registrato
□ Walkthrough del runbook con un rollback simulato
□ Domande aperte elencate qui sotto con owner e scadenza
```

| # | Domanda | Owner | Scadenza |
|---|---|---|---|
| 1 | | | |

---

## POST-CONSEGNA

```
□ Canale di supporto: GitHub Issues
□ Periodo di osservazione definito (consigliato: 2 settimane dopo una release maggiore)
□ Procedura di escalation del runbook comunicata
```

---

## SIGN-OFF

| Nome | Ruolo | Firma | Data |
|---|---|---|---|
| | Sviluppo | | |
| | Destinatario | | |

## ALLEGATI

- [ ] `docs/validation-report-AAAA-MM-GG.md`
- [ ] `tests/evals/reports/eval-report-AAAA-MM-GG.json` (se applicabile)
- [ ] Screenshot di `test-results/` della run di CI
