#!/usr/bin/env node
/* Validazione dei dati dell'app (app/data/*.json) e della loro coerenza con il codice.
   È il controllo che precede ogni deploy (S10) e gira anche come unit test e come hook di pre-commit.
   Uso:  node scripts/check-data.mjs            → stampa esito, exit 1 se ci sono errori
         import { runChecks } from './check-data.mjs'  → { errors, warnings }
   Le soglie stanno in configs/check-data.json (S05). */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(ROOT, 'app');
const DATA = path.join(APP, 'data');

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const split = (s) =>
  Array.isArray(s)
    ? s.map(String)
    : String(s || '')
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
const isMMDD = (s) => /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(s);
const isISO = (s) => /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(s);

export function runChecks(cfgPath = path.join(ROOT, 'configs', 'check-data.json')) {
  const cfg = readJson(cfgPath);
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);

  // 1. Ogni file JSON deve essere leggibile
  const files = readdirSync(DATA).filter((f) => f.endsWith('.json'));
  const J = {};
  for (const f of files) {
    try {
      J[f.replace(/\.json$/, '')] = readJson(path.join(DATA, f));
    } catch (e) {
      err(`${f}: JSON non valido (${e.message})`);
    }
  }
  if (errors.length) return { errors, warnings };

  // 2. Coerenza tra i file in app/data, DATASETS in dash-shim.js e SHELL in sw.js
  const shim = readFileSync(path.join(APP, 'js', 'dash-shim.js'), 'utf8');
  const sw = readFileSync(path.join(APP, 'sw.js'), 'utf8');
  const datasets =
    (shim.match(/const DATASETS = \[([^\]]+)\]/)?.[1] ?? '').match(/'([^']+)'/g)?.map((s) => s.replace(/'/g, '')) ?? [];
  const shellData = [...sw.matchAll(/'data\/([a-z_]+)\.json'/g)].map((m) => m[1]);
  for (const d of datasets) {
    if (!J[d]) err(`dash-shim.js carica "${d}" ma app/data/${d}.json non esiste`);
    if (!shellData.includes(d)) err(`sw.js: "data/${d}.json" manca in SHELL (non funzionerebbe offline)`);
  }
  for (const d of Object.keys(J)) {
    if (d !== 'params' && !datasets.includes(d)) warn(`app/data/${d}.json non è caricato da dash-shim.js`);
  }
  if (!shellData.includes('params')) err('sw.js: "data/params.json" manca in SHELL');

  const {
    catalogo = [],
    basi = [],
    tratte = [],
    parametri = [],
    eventi = [],
    stagione = [],
    percorsi = [],
    partenze = [],
    citta = [],
    params = {},
  } = J;

  // 3. Basi e coordinate
  const baseNames = new Set(basi.map((b) => b.base));
  const dup = (arr, key, label) => {
    const seen = new Set();
    for (const v of arr.map((x) => x[key])) {
      if (seen.has(v)) err(`${label}: "${v}" duplicato`);
      seen.add(v);
    }
  };
  dup(basi, 'base', 'basi.json');
  const coords = new Map(citta.map((c) => [c.luogo, c]));
  const [latMin, latMax] = cfg.coordinate.lat;
  const [lonMin, lonMax] = cfg.coordinate.lon;
  for (const c of citta) {
    if (!(c.lat >= latMin && c.lat <= latMax && c.lon >= lonMin && c.lon <= lonMax))
      err(`citta.json: "${c.luogo}" ha coordinate fuori dal Giappone (${c.lat}, ${c.lon})`);
  }
  for (const b of basi) {
    if (!coords.has(b.base)) err(`basi.json: "${b.base}" non ha coordinate in citta.json`);
    if (!b.zona) warn(`basi.json: "${b.base}" senza "zona" (consiglio su dove dormire)`);
  }

  // 4. Catalogo
  dup(catalogo, 'id', 'catalogo.json');
  const catIds = new Set(catalogo.map((c) => c.id));
  for (const c of catalogo) {
    const where = `catalogo.json "${c.id}"`;
    if (!/^[a-z0-9_-]+$/.test(c.id)) err(`${where}: id non valido (solo minuscole, cifre, - e _)`);
    if (!['citta', 'gita'].includes(c.tipo)) err(`${where}: tipo "${c.tipo}" sconosciuto`);
    if (!(Number(c.giorni) > 0)) err(`${where}: "giorni" deve essere > 0`);
    for (const b of split(c.basi)) if (!baseNames.has(b)) err(`${where}: base "${b}" non esiste in basi.json`);
    for (const b of split(c.basi_giornata))
      if (!baseNames.has(b)) err(`${where}: basi_giornata "${b}" non esiste in basi.json`);
    if (c.notte_possibile === 'sì' || c.notte_possibile === 'si') {
      if (!c.base_notte) err(`${where}: notte_possibile senza base_notte`);
      else if (!baseNames.has(c.base_notte)) err(`${where}: base_notte "${c.base_notte}" non esiste in basi.json`);
      if (!['ryokan', 'hotel'].includes(c.tipo_notte))
        err(`${where}: tipo_notte "${c.tipo_notte}" deve essere ryokan o hotel`);
    }
    if (!c.descrizione) warn(`${where}: senza descrizione`);
    if (!c.regione) err(`${where}: senza regione`);
    for (const l of split(c.luoghi))
      if (!coords.has(l)) warn(`${where}: luogo "${l}" non ha coordinate in citta.json (non appare sulla mappa)`);
  }

  // 5. Tratte: grafo non orientato, ogni base raggiungibile dagli aeroporti
  const adj = new Map();
  for (const t of tratte) {
    if (!(Number(t.ore) > 0)) err(`tratte.json ${t.da}→${t.a}: "ore" deve essere > 0`);
    if (!(Number(t.yen) >= 0)) err(`tratte.json ${t.da}→${t.a}: "yen" deve essere ≥ 0`);
    for (const [a, b] of [
      [t.da, t.a],
      [t.a, t.da],
    ]) {
      if (!adj.has(a)) adj.set(a, new Set());
      adj.get(a).add(b);
    }
  }
  for (const air of cfg.aeroporti) {
    if (!adj.has(air)) {
      err(`tratte.json: aeroporto "${air}" non compare in nessuna tratta`);
      continue;
    }
    const seen = new Set([air]);
    const q = [air];
    while (q.length) for (const n of adj.get(q.shift()) || []) if (!seen.has(n)) (seen.add(n), q.push(n));
    for (const b of baseNames) if (!seen.has(b)) err(`tratte.json: la base "${b}" non è raggiungibile da ${air}`);
  }
  for (const n of adj.keys())
    if (!baseNames.has(n) && !cfg.aeroporti.includes(n))
      warn(`tratte.json: nodo "${n}" non è una base né un aeroporto`);

  // 6. Parametri di costo
  dup(parametri, 'id', 'parametri.json');
  const parIds = new Set(parametri.map((p) => p.id));
  for (const id of cfg.parametri_richiesti)
    if (!parIds.has(id)) err(`parametri.json: manca la voce "${id}" usata dal motore`);
  for (const p of parametri) {
    if (!(Number(p.min) <= Number(p.max))) err(`parametri.json "${p.id}": min > max`);
    if (!p.fonte) err(`parametri.json "${p.id}": senza fonte`);
    if (cfg.richiedi_data_aggiornamento && !p.aggiornato) err(`parametri.json "${p.id}": senza data di aggiornamento`);
  }
  for (const d of partenze) {
    if (!(Number(d.min) <= Number(d.max))) err(`partenze.json "${d.id}": min > max`);
    if (!d.nome) err(`partenze.json "${d.id}": senza nome`);
  }
  dup(partenze, 'id', 'partenze.json');

  // 7. Date ricorrenti e regole
  const checkDates = (list, label) => {
    for (const e of list) {
      const w = `${label} "${e.nome || e.luogo}"`;
      if (e.regola) {
        if (!/^lun:[1-5]:(1[0-2]|[1-9])$/.test(e.regola)) err(`${w}: regola "${e.regola}" non valida (atteso lun:N:M)`);
        continue;
      }
      const ok = (isMMDD(e.dal) && isMMDD(e.al)) || (isISO(e.dal) && isISO(e.al));
      if (!ok) err(`${w}: date "${e.dal}"–"${e.al}" non valide (MM-GG o AAAA-MM-GG, stesso formato)`);
    }
  };
  checkDates(eventi, 'eventi.json');
  checkDates(stagione, 'stagione.json');
  for (const s of stagione) {
    if (!['sakura', 'foliage', 'clima'].includes(s.tipo))
      err(`stagione.json "${s.luogo}": tipo "${s.tipo}" sconosciuto`);
    if (s.tipo !== 'clima' && !coords.has(s.luogo))
      warn(`stagione.json: "${s.luogo}" non è un luogo noto in citta.json`);
  }

  // 8. Modelli di viaggio e percorso di partenza
  const checkTrip = (t, label) => {
    for (const id of split(t.sel)) if (!catIds.has(id)) err(`${label}: meta "${id}" non esiste nel catalogo`);
    for (const id of split(t.pernotto)) if (!catIds.has(id)) err(`${label}: pernotto "${id}" non esiste nel catalogo`);
    for (const k of ['arrivo', 'ritorno'])
      if (t[k] && !cfg.arrivi_ammessi.includes(t[k])) err(`${label}: ${k} "${t[k]}" non ammesso`);
    if (t.notti !== undefined && !(Number(t.notti) >= 3 && Number(t.notti) <= 365))
      err(`${label}: notti fuori da 3–365`);
  };
  for (const t of percorsi) checkTrip(t, `percorsi.json "${t.nome}"`);
  checkTrip(params, 'params.json');
  if (params.da && !partenze.some((d) => d.id === params.da))
    err(`params.json: città di partenza "${params.da}" non esiste in partenze.json`);

  // 9. Il segnaposto della cache offline deve restare nel sorgente (lo sostituisce il deploy)
  if (!sw.includes('__BUILD__')) err('sw.js: manca il segnaposto __BUILD__ nel nome della cache');

  return { errors, warnings };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (!existsSync(DATA)) {
    console.error('Cartella app/data non trovata');
    process.exit(2);
  }
  const { errors, warnings } = runChecks();
  for (const w of warnings) console.log('AVVISO  ' + w);
  for (const e of errors) console.log('ERRORE  ' + e);
  console.log(`\n${errors.length ? 'FAIL' : 'PASS'}: ${errors.length} errori, ${warnings.length} avvisi`);
  process.exit(errors.length ? 1 : 0);
}
