# ADR-001 — Adozione degli standard AI/ML Engineering e loro adattamento a una web app statica

**Data:** 2026-10-30
**Autore:** Giacomo Del Prato
**Stato:** Accettato
**Issue di riferimento:** PR #4

---

## Contesto

Il progetto adotta il modello operativo del repository `gdelprato/ai-ml-engineering-standards` (principi P01–P10, standard S01–S23, livelli Foundation / Production-Ready). Gli standard sono scritti per progetti Python (pyproject, Poetry, ruff, pytest, notebook) e per GitLab. Japan Tour Planner è una web app statica in JavaScript vanilla, senza build step, pubblicata su GitHub Pages, e il piano la porterà a usare modelli linguistici tramite un proxy serverless.

S03 richiede che la struttura rispecchi lo standard "senza deviazioni non documentate": questo ADR documenta le deviazioni e dichiara gli equivalenti.

---

## Decisione

> **Decidiamo di adottare integralmente principi e standard, sostituendo gli artefatti specifici di Python con l'equivalente dello stack JavaScript, uno per uno, e di mantenere l'app senza build step.**

| Standard | Richiede | Equivalente in questo progetto |
|---|---|---|
| S03 | `src/` moduli Python | `app/js/` (codice servito), `scripts/` (automazione Node). `app/` è il sito pubblicato (ADR-002) |
| S03 | `data/raw/`, `data/processed/` | `data/raw/` per snapshot immutabili scaricati dalla pipeline dei prezzi (non versionati, `.gitkeep`); `app/data/` sono i dati curati e versionati che l'app serve, validati da `scripts/check-data.mjs` |
| S03 | `notebooks/` | `notebooks/` per analisi esplorative dei prezzi; mai importato dall'app |
| S03 | `tests/unit`, `integration`, `evals` | `tests/unit/` (`node --test`), `tests/integration/` (Playwright nel browser), `tests/evals/` (scenari delle funzioni AI) |
| S03 | `configs/` | `configs/` con soglie degli script; l'app non ha ambienti perché è statica |
| S04 | `pyproject.toml` + lock | `package.json` con versioni esatte + `package-lock.json`; `npm ci` ricostruisce |
| S05 | `.env.example` | `.env.example` per script, test e Worker; l'app non legge variabili |
| S06 | ruff, pre-commit | ESLint, Prettier, `.pre-commit-config.yaml` con hook locali |
| S07 | `.python-version`, Makefile | `.nvmrc`, Makefile con `setup`, `run`, `test`, `lint`, `check` |
| S11–S13 | GitLab Issues, MR, GitFlow | GitHub Issues con template, pull request con template, trunk-based (ADR-005) |
| S16 | logging strutturato, alert | Non applicabile a un sito statico senza server. Si applicherà al Worker e alla pipeline (log JSON, alert su costo e tasso di errore) |

---

## Alternative considerate

| Alternativa | Motivo del rifiuto |
|---|---|
| Riscrivere il progetto come applicazione Python (FastAPI + frontend) per seguire gli standard alla lettera | Introduce un server e costi fissi, contraddice il vincolo "gratis, offline, senza account"; il valore dell'app è nel motore JavaScript che gira sul telefono |
| Adottare solo i documenti (architettura, ADR, runbook) e ignorare struttura e tooling | Lascia il progetto senza test, lint e validazione: proprio ciò che gli standard vogliono rendere indipendente dalle persone |
| Introdurre un bundler (Vite) per avere moduli, test e minificazione "standard" | Aggiunge un build step che oggi non serve; si riconsidera quando il motore sarà estratto in moduli ES (piano, Fase 0.1) |

---

## Conseguenze

### Positive
- Ogni criterio Foundation ha un artefatto verificabile nel repository.
- Dati e codice vengono validati prima di ogni commit e di ogni deploy.
- Un nuovo collaboratore sa dove trovare architettura, decisioni, comandi e definizione di fatto.

### Negative
- Prettier non viene applicato a `app/js/app.js` e `dash-shim.js` (stile compatto esistente) finché il motore non viene estratto: il check di formato copre solo `scripts/`, `tests/`, `configs/`.
- Due sistemi di dipendenze da conoscere: npm per gli strumenti e, per chi li vuole, `pre-commit` da pip.

### Rischi
- Divergenza tra standard e pratica se il tooling non viene usato: mitigato dalla CI, che esegue gli stessi comandi del Makefile su ogni PR.

---

## Note

Gli standard stessi sono il riferimento normativo: questo ADR va riletto quando quel repository cambia versione (oggi v1.0.0).
