# Changelog

Le modifiche rilevanti al progetto sono documentate qui. Il formato segue [Keep a Changelog](https://keepachangelog.com/it/1.0.0/), il versionamento [Semantic Versioning](https://semver.org/lang/it/).

## [Non rilasciato]

### Added
- Motore estratto in `app/js/engine/` come moduli ES puri (ADR-006), con 31 unit test: 20 scenari confrontati con una fotografia del comportamento precedente, più regole su notti, calendario, costi, parametri, grafo e date.
- Smoke test offline: dopo la prima visita l'app, moduli compresi, funziona senza rete.
- `check-data` verifica che ogni file di `app/js/` e `app/css/` sia nella cache offline.
- `npm run aggiorna-riferimento-motore` per rigenerare la fotografia quando un cambio di comportamento è voluto.
- Adozione degli standard AI/ML Engineering della practice: `docs/architecture.md`, cinque ADR in `docs/decisions/`, `docs/runbook.md`, `docs/definition-of-done.md`, `docs/acceptance-criteria.md`, `docs/handover-checklist.md`, bozze di `docs/agent-perimeter.md` e `docs/tools-registry.md`.
- `scripts/check-data.mjs`: validazione dei dati e della loro coerenza con `dash-shim.js` e `sw.js`, eseguita prima del deploy, nei test e nel pre-commit.
- Unit test (`tests/unit/`), smoke test nel browser con Playwright (`tests/integration/`), struttura delle eval AI (`tests/evals/`).
- `Makefile`, `package.json` con dipendenze fissate e lockfile, ESLint, Prettier, `.pre-commit-config.yaml`, `.nvmrc`, `.env.example`, `configs/`.
- Workflow CI "Controlli" su ogni pull request; template di issue e pull request.
- Tooling `.claude/` (hook, subagent, slash command) e `CLAUDE.md` per lo sviluppo con Claude Code.
- `docs/PIANO_DI_SVILUPPO.md`: piano per release con funzioni di prodotto, budget, pipeline dei prezzi e funzioni basate su AI.

### Added
- Lighthouse CI su ogni pull request con soglie bloccanti: prestazioni ≥ 90, accessibilità ≥ 95, buone pratiche ≥ 95, CLS ≤ 0,1 (ADR-007, #10).
- Controlli di installabilità della PWA (manifest e icone in `check-data`, service worker in uno smoke test) e test "nessuna richiesta a server esterni".

### Fixed
- Accessibilità da 79 a 100: schede laterali con ruoli `tab`/`tabpanel`, pulsanti della barra con nome leggibile anche su telefono, contrasto del verde della linea portato a 5,9:1 (anche nel tema scuro).
- La pagina non salta più quando arrivano i dati (CLS da 0,92 a 0,03): altezze riservate per riepilogo, KPI e linea; avvisi sotto la mappa.
- A parità di ore di treno il percorso sceglie l'ordine delle tappe che fa perdere meno notti: il modello "Kansai e Kyushu, 12 notti" non segnala più notti mancanti (#7).
- Con una sola base e andata e ritorno sulla stessa città l'ultima notte resta nella stessa tappa: niente cambio d'albergo fittizio, né spedizione dei bagagli nel budget, né trasferimento "Osaka → Osaka" nel calendario (#8).

### Changed
- Prestazioni Lighthouse da 66 a 92–95: font Zen Kaku Gothic New ospitato sul sito (solo alfabeto latino, 38 KB invece di 449 KB da Google, ADR-008), script con `defer`, dati scaricati tutti insieme, moduli precaricati, prima schermata disegnata prima di mappa e mete, sfondo della mappa in un solo tracciato.
- Nessuna richiesta a server esterni: niente più Google Fonts; il font è disponibile anche offline.
- `app.js` contiene solo l'interfaccia ed è caricato come modulo ES; nessun cambiamento visibile per chi usa l'app.
- L'app pubblicata vive in `app/`; il workflow di Pages pubblica solo quella cartella e valida i dati prima del deploy (ADR-002).

## [0.4.0] — 2026-10-29

### Changed
- Tolti i preconcetti ereditati dalla dashboard iniziale: bagagli a scelta, notti extra per quanto c'è da fare, sconto gruppo e rincaro singoli, orari dei voli, cambio modificabile.

## [0.3.0] — 2026-10-28

### Added
- Service worker con guscio versionato e dati con timeout; barra "Aggiorna".
- Notti fino a 365, mappa per regioni.

### Changed
- App resa generica per qualsiasi viaggio in Giappone: date, persone, partenza, aeroporti, stile, modelli di viaggio.

## [0.1.0] — 2026-10-27

### Added
- Prima versione: percorso, calendario, confronto, budget, info utili; pubblicazione su GitHub Pages.
