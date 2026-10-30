# ADR-007 — Soglie di qualità della pagina con Lighthouse CI; installabilità verificata dai nostri controlli

**Data:** 2026-10-30
**Autore:** Giacomo Del Prato
**Stato:** Accettato
**Issue di riferimento:** #10 (piano di sviluppo §4, voce 0.6)

---

## Contesto

Il piano chiede soglie misurate per prestazioni, accessibilità e installabilità della PWA, controllate a ogni pull request (criteri v0.5 in `docs/acceptance-criteria.md`). La prima misura con Lighthouse 12.6 (profilo mobile, rete e CPU simulate) dava prestazioni 66 e accessibilità 79.

Lighthouse dalla versione 12 non ha più la categoria PWA, e Chromium dalle versioni recenti non segnala più i criteri di installabilità mancanti: `Page.getInstallabilityErrors` resta vuoto anche con un manifest senza icone o con `display: browser` (verificato).

---

## Decisione

> **Decidiamo di eseguire Lighthouse CI (`@lhci/cli`, versione fissata) su ogni pull request, profilo mobile, mediana di 3 esecuzioni, con soglie bloccanti, e di verificare l'installabilità con controlli nostri.**

| Controllo | Soglia | Tipo |
|---|---|---|
| Prestazioni | ≥ 90 | bloccante |
| Accessibilità | ≥ 95 | bloccante |
| Buone pratiche | ≥ 95 | bloccante |
| Cumulative Layout Shift | ≤ 0,1 | bloccante |
| SEO | ≥ 90 | avviso |
| Largest Contentful Paint | ≤ 3 s | avviso |
| Total Blocking Time | ≤ 300 ms | avviso |

Configurazione in `configs/lighthouserc.json`; comando `make lighthouse`; job `lighthouse` in `.github/workflows/ci.yml`; rapporti HTML come artefatto della CI, salvati su file e non caricati su servizi esterni.

Installabilità: `scripts/check-data.mjs` verifica i criteri classici del manifest (nome, `start_url`, `display` da app, icone PNG 192 e 512 esistenti, link nella pagina); uno smoke test verifica nel browser che il manifest sia letto senza errori e che il service worker controlli la pagina e risponda alle richieste.

Per rientrare nelle soglie sono stati corretti: ruoli `tab`/`tabpanel` delle schede laterali, nome accessibile dei pulsanti della barra su telefono, contrasto del verde (`#0a7069`), `defer` sugli script classici, altezze riservate per riepilogo, KPI e linea e avvisi spostati sotto la mappa (CLS da 0,92 a 0,04), primo disegno della scheda Percorso a tappe, sfondo della mappa in un solo tracciato, doppio calcolo delle etichette eliminato, dati scaricati tutti insieme, `modulepreload` del motore, font ospitato sul sito (ADR-008).

---

## Alternative considerate

| Alternativa | Motivo del rifiuto |
|---|---|
| Lighthouse da riga di comando senza LHCI | Si riscriverebbero a mano più esecuzioni, mediana e asserzioni, che LHCI già fornisce |
| PageSpeed Insights API sul sito pubblicato | Misura solo dopo il deploy, non blocca la pull request, richiede una chiave |
| Soglie più basse (80/90) per evitare falsi rossi | Il piano le ha fissate prima del lavoro (P06); con le correzioni le misure locali stanno tra 92 e 95 |
| `throttlingMethod: devtools` invece della simulazione | Cambierebbe il metro di misura rispetto ai valori di riferimento di Lighthouse |
| Caricare i rapporti su `temporary-public-storage` | Link pubblici a pagine dell'app; non serve, basta l'artefatto della CI |

---

## Conseguenze

### Positive
- Una regressione di prestazioni, accessibilità o stabilità del layout blocca la pull request.
- L'accessibilità è a 100: navigazione con lettore di schermo corretta su telefono.

### Negative
- Il punteggio prestazioni simulato varia di qualche punto tra esecuzioni e tra macchine (misure locali 92–95): la mediana di 3 esecuzioni attenua ma non elimina il rumore.
- Il job aggiunge circa un minuto alla CI.

### Rischi
- I runner di GitHub più lenti possono portare il punteggio vicino a 90. Se succede, prima si cercano le cause nel rapporto (task lunghi, byte); abbassare la soglia richiede un nuovo ADR con le misure.
