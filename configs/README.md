# configs/

Configurazione separata dal codice (S05). Qui vivono i parametri che cambiano tra ambienti o che si
vogliono poter modificare senza toccare gli script.

| File | Letto da | Contenuto |
|---|---|---|
| `check-data.json` | `scripts/check-data.mjs` | Soglie e liste usate per validare i dati in `app/data/` |

Non contiene segreti: quelli stanno in `.env` (documentati in `.env.example`).
I dati dell'app (`app/data/*.json`) non sono configurazione ma contenuto versionato: vedere `docs/architecture.md`.
