/* Motore di Japan Tour Planner: funzioni pure, senza DOM, senza d3, senza stato globale (ADR-006).
   Uso tipico:
     const p = norm(parametriGrezzi);              // completa e sana i parametri
     const R = build(p, dati);                     // basi, notti, ordine, costi
     const giorni = planDays(R);                   // programma giorno per giorno
     const note = giorni.map((g) => notesFor(g, dati));
     const msgs = avvisi(R, dati);
   dove dati = { catalogo, basi, tratte, parametri, partenze, eventi, stagione } con gli array di app/data. */
export { DAY, num, yes, split, isoDay, sum } from './util.js';
export { nf, eur, yen, nn, gg, hrs, fmtDate } from './formato.js';
export { LONG_LEG, NMIN, NMAX, PMAX, AIR, STILI } from './costanti.js';
export { norm, defaultStart, dayOf, parametriMap } from './parametri.js';
export { shortest, order } from './grafo.js';
export { onDay, tripDays, during } from './calendario.js';
export { build } from './percorso.js';
export { planDays, notesFor } from './giorni.js';
export { avvisi } from './avvisi.js';
