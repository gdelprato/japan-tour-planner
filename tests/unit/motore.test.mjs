/* Test del motore (app/js/engine). Il primo blocco confronta ogni scenario con la fotografia di riferimento,
   generata eseguendo nel browser il codice di prima dell'estrazione (ADR-006): qualsiasi differenza è un cambio
   di comportamento. Se il cambio è voluto, rigenerare con `npm run aggiorna-riferimento-motore` e spiegarlo
   nella PR. Gli altri blocchi fissano regole che devono valere sempre. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as M from '../../app/js/engine/index.js';
import { SCENARI, OGGI } from './scenari-motore.mjs';
import { proietta } from './proiezione-motore.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const leggi = (f) => JSON.parse(readFileSync(path.join(ROOT, f), 'utf8'));
export const caricaDati = () => ({
  catalogo: leggi('app/data/catalogo.json'),
  basi: leggi('app/data/basi.json'),
  tratte: leggi('app/data/tratte.json'),
  parametri: leggi('app/data/parametri.json'),
  partenze: leggi('app/data/partenze.json'),
  eventi: leggi('app/data/eventi.json'),
  stagione: leggi('app/data/stagione.json'),
});
const dati = caricaDati();
const riferimento = leggi('tests/unit/fixtures/motore-riferimento.json');

export function esegui(params, d = dati) {
  const p = M.norm(structuredClone(params), OGGI);
  const r = M.build(p, d);
  const giorni = M.planDays(r);
  const note = giorni.map((g) => M.notesFor(g, d));
  return { r, giorni, note, avvisi: M.avvisi(r, d) };
}

test('la fotografia copre tutti gli scenari', () => {
  assert.deepEqual(
    riferimento.scenari.map((s) => s.nome),
    SCENARI.map((s) => s.nome)
  );
});

for (const sc of SCENARI) {
  test(`stesso risultato del codice di riferimento: ${sc.nome}`, () => {
    const { r, giorni, note, avvisi } = esegui(sc.params);
    const atteso = riferimento.scenari.find((s) => s.nome === sc.nome).risultato;
    assert.deepEqual(JSON.parse(JSON.stringify(proietta(r, giorni, note, avvisi))), atteso);
  });
}

test('il motore è deterministico: due esecuzioni danno lo stesso risultato', () => {
  for (const sc of SCENARI) {
    const a = esegui(sc.params),
      b = esegui(sc.params);
    assert.deepEqual(proietta(a.r, a.giorni, a.note, a.avvisi), proietta(b.r, b.giorni, b.note, b.avvisi));
  }
});

test('le notti del percorso sommano sempre a quelle richieste quando non mancano notti', () => {
  for (const sc of SCENARI) {
    const { r } = esegui(sc.params);
    if (r.deficit) continue;
    assert.equal(
      M.sum(r.all, (s) => s.nights),
      r.p.notti,
      sc.nome
    );
  }
});

test('il calendario ha un giorno per ogni notte più il giorno del rientro, con date consecutive', () => {
  for (const sc of SCENARI) {
    const { r, giorni } = esegui(sc.params);
    if (r.deficit) continue;
    assert.equal(giorni.length, r.p.notti + 1, sc.nome);
    giorni.forEach((g, i) => assert.equal(g.date.getTime() - giorni[0].date.getTime(), i * M.DAY, sc.nome));
    assert.equal(M.isoDay(giorni[0].date), r.p.partenza);
  }
});

test('ogni categoria di costo ha min ≤ max e il totale è la somma delle categorie', () => {
  for (const sc of SCENARI) {
    const { r } = esegui(sc.params);
    for (const c of r.cost) assert.ok(c.min <= c.max + 1e-9, `${sc.nome}: ${c.cat}`);
    assert.ok(Math.abs(M.sum(r.cost, (c) => c.min) - r.tot.min) < 1e-9);
  }
});

test('norm completa i parametri mancanti e corregge quelli fuori intervallo', () => {
  const p = M.norm({ notti: 999, persone: 0, arrivo: 'nagoya', stile: 'lusso', cambio: '0' }, OGGI);
  assert.equal(p.notti, M.NMAX);
  assert.equal(p.persone, 2); // 0 non è un numero valido di persone: si usa il default
  assert.equal(p.arrivo, 'tokyo');
  assert.equal(p.ritorno, 'osaka');
  assert.equal(p.stile, 'medio');
  assert.equal(p.cambio, null);
  assert.deepEqual(p.sel, []);
  assert.equal(p.partenza, '2027-04-28'); // OGGI + 180 giorni
  assert.equal(M.norm({ notti: 1 }, OGGI).notti, M.NMIN);
  assert.equal(M.norm({ persone: 40 }, OGGI).persone, M.PMAX);
  assert.deepEqual(M.norm({ sel: 'tokyo, kyoto,,osaka' }, OGGI).sel, ['tokyo', 'kyoto', 'osaka']);
});

test('norm non dipende dall’orologio quando la data è indicata', () => {
  assert.equal(M.norm({ partenza: '2027-05-01' }, 0).partenza, '2027-05-01');
  assert.equal(M.norm({ partenza: '1/5/2027' }, OGGI).partenza, M.defaultStart(OGGI));
});

test('shortest trova il collegamento più rapido ed è simmetrico', () => {
  const a = M.shortest(dati.tratte, 'Haneda', 'Kyoto');
  const b = M.shortest(dati.tratte, 'Kyoto', 'Haneda');
  assert.ok(a && a.ore > 0);
  assert.equal(a.ore, b.ore);
  assert.deepEqual(M.shortest(dati.tratte, 'Kyoto', 'Kyoto'), { ore: 0, yen: 0 });
  assert.equal(M.shortest(dati.tratte, 'Kyoto', 'Atlantide'), null);
});

test('order tiene ferma la prima tappa e non perde né duplica basi', () => {
  const stops = ['Tokyo', 'Osaka', 'Kanazawa', 'Kyoto', 'Hiroshima'].map((base) => ({ base }));
  const rank = (b) => ({ Tokyo: 1, Kanazawa: 2, Kyoto: 3, Osaka: 4, Hiroshima: 5 })[b] || 99;
  const out = M.order(stops, 'Kansai', dati.tratte, rank);
  assert.equal(out[0].base, 'Tokyo');
  assert.deepEqual(out.map((s) => s.base).sort(), stops.map((s) => s.base).sort());
});

test('onDay gestisce date ricorrenti, a cavallo dell’anno, di un solo anno e weekend lunghi', () => {
  assert.ok(M.onDay({ dal: '12-29', al: '01-03' }, '2028-01-02'));
  assert.ok(!M.onDay({ dal: '12-29', al: '01-03' }, '2028-01-05'));
  assert.ok(M.onDay({ dal: '2027-04-29', al: '2027-05-05' }, '2027-05-01'));
  assert.ok(!M.onDay({ dal: '2027-04-29', al: '2027-05-05' }, '2028-05-01'));
  // secondo lunedì di ottobre 2027 = 11 ottobre: weekend lungo 9–11
  assert.ok(M.onDay({ regola: 'lun:2:10' }, '2027-10-09'));
  assert.ok(M.onDay({ regola: 'lun:2:10' }, '2027-10-11'));
  assert.ok(!M.onDay({ regola: 'lun:2:10' }, '2027-10-12'));
});

test('il motore non usa DOM, window, localStorage né d3', () => {
  const dir = path.join(ROOT, 'app/js/engine');
  for (const f of [
    'util.js',
    'formato.js',
    'costanti.js',
    'parametri.js',
    'grafo.js',
    'calendario.js',
    'percorso.js',
    'giorni.js',
    'avvisi.js',
    'index.js',
  ]) {
    // i commenti possono citare d3 o il DOM: si controlla solo il codice
    const src = readFileSync(path.join(dir, f), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    for (const vietato of [/\bdocument\./, /\bwindow\./, /\blocalStorage\b/, /\bd3\./, /\bdash\./])
      assert.ok(!vietato.test(src), `${f} usa ${vietato}`);
  }
});
