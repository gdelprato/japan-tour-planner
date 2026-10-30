#!/usr/bin/env node
/* Riepilogo dei punteggi dell'ultima esecuzione di `make lighthouse` (lighthouse-report/manifest.json), in Markdown.
   In CI va nel sommario del job: lhci non stampa i punteggi quando le soglie sono rispettate (runbook, monitoraggio). */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.join(ROOT, 'lighthouse-report', 'manifest.json');
if (!existsSync(MANIFEST)) {
  console.log('Nessun rapporto Lighthouse: eseguire prima `make lighthouse`.');
  process.exit(0);
}
// un rapporto per esecuzione; si leggono le metriche dai JSON completi
const runs = JSON.parse(readFileSync(MANIFEST, 'utf8')).map((m) => JSON.parse(readFileSync(m.jsonPath, 'utf8')));
const mediana = (v) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
const righe = [
  ['Prestazioni', (r) => Math.round(r.categories.performance.score * 100), '≥ 90'],
  ['Accessibilità', (r) => Math.round(r.categories.accessibility.score * 100), '≥ 95'],
  ['Buone pratiche', (r) => Math.round(r.categories['best-practices'].score * 100), '≥ 95'],
  ['SEO', (r) => Math.round(r.categories.seo.score * 100), '≥ 90 (avviso)'],
  ['CLS', (r) => r.audits['cumulative-layout-shift'].numericValue.toFixed(3), '≤ 0,1'],
  ['LCP (ms)', (r) => Math.round(r.audits['largest-contentful-paint'].numericValue), '≤ 3000 (avviso)'],
  ['TBT (ms)', (r) => Math.round(r.audits['total-blocking-time'].numericValue), '≤ 300 (avviso)'],
];
console.log(`### Lighthouse, profilo mobile, ${runs.length} esecuzioni\n`);
console.log('| Misura | Mediana | Esecuzioni | Soglia |\n|---|---|---|---|');
for (const [nome, f, soglia] of righe) {
  const v = runs.map(f);
  console.log(`| ${nome} | ${mediana(v.map(Number))} | ${v.join(' / ')} | ${soglia} |`);
}
