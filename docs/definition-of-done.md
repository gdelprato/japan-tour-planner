# Definition of Done

Un task è **Done** quando soddisfa tutti i criteri che lo riguardano. La checklist è anche nel template delle pull request.

## Criteri generali

- [ ] Esiste un'issue collegata (`Closes #N` nella PR, `Refs: #N` nei commit)
- [ ] `make check` passa: lint, validazione dei dati, unit test
- [ ] Nessuna regressione nei test esistenti; test nuovi per il comportamento nuovo
- [ ] Commit nel formato `<type>(<scope>): descrizione` (S12)
- [ ] Documentazione aggiornata se cambia un comportamento visibile: `README.md`, `CLAUDE.md`, `docs/architecture.md`, `docs/runbook.md`
- [ ] `CHANGELOG.md` aggiornato nella sezione "Non rilasciato"
- [ ] PR revisionata (auto-revisione esplicita se si è da soli: rileggere il diff come se fosse di un altro) e CI verde
- [ ] Branch cancellata dopo il merge

## Criteri per modifiche a `app/`

- [ ] `make test-integration` passa: nessun errore in console, calcolo corretto, link `?r=` retrocompatibile, nessuno scorrimento orizzontale a 390 px
- [ ] Se cambia un parametro del viaggio: `norm()` ha un default e un vecchio link si apre uguale
- [ ] Se cambia un dataset: `DATASETS` (`dash-shim.js`), `SHELL` (`sw.js`), tabella del README allineati (lo verifica `check-data`)
- [ ] Testi dell'interfaccia in italiano, con gli helper esistenti per plurali, valute e date

## Criteri per modifiche ai dati (`app/data/`)

- [ ] Ogni prezzo ha `fonte` e, dove previsto, data di aggiornamento
- [ ] Nessun id del catalogo rinominato (sono nei link condivisi)
- [ ] `node scripts/check-data.mjs` → `PASS`

## Criteri per decisioni e architettura

- [ ] ADR in `docs/decisions/` per ogni decisione costosa da invertire, scritto prima di implementarla (S02)
- [ ] `docs/architecture.md` aggiornato se cambiano componenti, flussi o integrazioni

## Criteri per funzioni basate su AI (piano §6)

- [ ] Scenari in `tests/evals/scenari/` per i quattro tipi (task completion, failure handling, out-of-scope, ambiguous input)
- [ ] Report dell'esecuzione in `tests/evals/reports/` senza regressioni rispetto all'ultimo; mete inventate: zero
- [ ] `docs/agent-perimeter.md` e `docs/tools-registry.md` aggiornati se cambiano perimetro o strumenti
- [ ] Costo stimato per richiesta registrato; quota e interruttore verificati sul proxy
