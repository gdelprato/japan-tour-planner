/* Unit test sui dati e sulla loro coerenza con il codice (S10).
   Usa lo stesso controllo del deploy (scripts/check-data.mjs): se fallisce qui, fallirebbe il deploy. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runChecks } from '../../scripts/check-data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('i dati in app/data superano tutti i controlli di check-data', () => {
  const { errors, warnings } = runChecks();
  for (const w of warnings) test.diagnostic('avviso: ' + w);
  assert.deepEqual(errors, [], 'errori nei dati:\n' + errors.join('\n'));
});

test('il percorso di esempio ha tutte le mete nel catalogo e un numero di notti sensato', () => {
  const params = JSON.parse(readFileSync(path.join(ROOT, 'app/data/params.json'), 'utf8'));
  const catalogo = JSON.parse(readFileSync(path.join(ROOT, 'app/data/catalogo.json'), 'utf8'));
  const ids = new Set(catalogo.map((c) => c.id));
  for (const id of params.sel) assert.ok(ids.has(id), `meta "${id}" non nel catalogo`);
  assert.ok(params.notti >= 3 && params.notti <= 365);
});

test('ogni modello di viaggio in percorsi.json è distinto per nome', () => {
  const percorsi = JSON.parse(readFileSync(path.join(ROOT, 'app/data/percorsi.json'), 'utf8'));
  const nomi = percorsi.map((p) => p.nome);
  assert.equal(new Set(nomi).size, nomi.length);
});
