---
description: Genera la handover checklist di consegna e verifica lo stato di ogni voce (S17)
allowed-tools: Bash, Read, Write, Glob, Grep
---

Crea `docs/handover-checklist.md` secondo lo standard **S17** e **pre-compila** lo
stato di ogni voce verificabile guardando il repository.

## Istruzioni

1. Se `templates/handover-checklist.md` esiste, usalo come base per le voci.
2. Per ogni voce verificabile automaticamente, controlla nel repo e marca lo stato:
   `[x]` fatto · `[ ]` mancante · `[~]` parziale · `[?]` richiede verifica umana.
   Aggiungi una nota con l'evidenza (path) o cosa manca.
3. Le voci non verificabili da codice (trasferimento accessi, walkthrough col
   cliente, firma) restano `[?]` con nota "verifica umana richiesta".

Struttura (sezioni minime dello standard S17):

```markdown
# Handover Checklist — <progetto>
Data: <oggi> · Compilata da: <auto + revisione umana>

## Sistema
- [ ] Ambiente di produzione funzionante e verificato
- [ ] Tutti i test passanti — risultati documentati
- [ ] Validation gate eseguito e documentato (S10)
- [ ] Performance in linea con i criteri di accettazione

## Documentazione
- [ ] Architecture document aggiornato (S01)
- [ ] Runbook completo e testato (S15)
- [ ] ADR aggiornati (S02)
- [ ] Definition of Done verificata su tutti i task (S14)

## Accessi e credenziali
- [ ] Accessi trasferiti al cliente
- [ ] Secret trasferiti in modo sicuro
- [ ] Accessi del team rimossi o documentati

## Trasferimento di conoscenza
- [ ] Walkthrough completato col cliente
- [ ] Documentazione operativa consegnata e revisionata
- [ ] Domande aperte risolte o documentate

## Post-consegna
- [ ] Piano di supporto definito e comunicato
- [ ] Canale di escalation definito
- [ ] Periodo di hypercare definito (se applicabile)
```

4. Alla fine stampa un riepilogo: quante voci PASS / mancanti / da verificare, e
   l'elenco dei blocchi alla consegna. Suggerisci di lanciare l'agente
   `compliance-auditor` per un audit completo prima della firma.
