#!/usr/bin/env node
/* Rigenera tests/unit/fixtures/motore-riferimento.json dal motore attuale.
   Da usare SOLO quando un cambio di comportamento del motore è voluto: il diff della fotografia va letto
   e spiegato nella pull request, perché mostra esattamente quali percorsi, notti e costi cambiano.
   La prima versione della fotografia è stata generata dal codice precedente all'estrazione (ADR-006). */
import { writeFileSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as M from '../app/js/engine/index.js';
import { SCENARI, OGGI } from '../tests/unit/scenari-motore.mjs';
import { proietta } from '../tests/unit/proiezione-motore.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const leggi = (f) => JSON.parse(readFileSync(path.join(ROOT, 'app/data', f + '.json'), 'utf8'));
const dati = Object.fromEntries(
  ['catalogo', 'basi', 'tratte', 'parametri', 'partenze', 'eventi', 'stagione'].map((k) => [k, leggi(k)])
);
const OUT = path.join(ROOT, 'tests/unit/fixtures/motore-riferimento.json');

const scenari = SCENARI.map((sc) => {
  const p = M.norm(structuredClone(sc.params), OGGI);
  const r = M.build(p, dati);
  const giorni = M.planDays(r);
  const note = giorni.map((g) => M.notesFor(g, dati));
  return { nome: sc.nome, risultato: JSON.parse(JSON.stringify(proietta(r, giorni, note, M.avvisi(r, dati)))) };
});
let sha = 'sconosciuto';
try {
  sha = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
} catch {
  /* fuori da git */
}
const prima = JSON.parse(readFileSync(OUT, 'utf8'));
writeFileSync(
  OUT,
  JSON.stringify(
    { descrizione: prima.descrizione, generato_da: 'app/js/engine al commit ' + sha + ' (Node)', scenari },
    null,
    1
  ) + '\n'
);
console.log(
  `Scritti ${scenari.length} scenari in ${path.relative(ROOT, OUT)}. Controllare il diff con: git diff -- tests/unit/fixtures`
);
