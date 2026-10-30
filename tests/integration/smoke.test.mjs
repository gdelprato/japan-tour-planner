/* Smoke test nel browser (S10): l'app si apre senza errori in console, il motore calcola, i controlli
   cambiano il risultato, un vecchio link ?r= si apre con lo stesso percorso, rendering a 390 px e desktop.
   Serve l'app servita via HTTP (file:// blocca i fetch): qui si avvia `python3 -m http.server` su app/.
   Chromium: quello di Playwright, oppure PLAYWRIGHT_CHROMIUM_EXECUTABLE se già installato. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = 8123 + Math.floor(Math.random() * 500);
const BASE = `http://127.0.0.1:${PORT}/`;
const OUT = path.join(ROOT, 'test-results');
let server, browser;

const b64 = (o) =>
  Buffer.from(JSON.stringify(o), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

before(async () => {
  mkdirSync(OUT, { recursive: true });
  server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
    cwd: path.join(ROOT, 'app'),
    stdio: 'ignore',
  });
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(BASE + 'index.html');
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  const exe = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  browser = await chromium.launch(exe ? { executablePath: exe } : {});
});

after(async () => {
  await browser?.close();
  server?.kill();
});

async function open(url, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(url);
  await page.waitForSelector('#kpis .jp-kpi, #kpis > *', { timeout: 15000 });
  return { page, errors };
}

test('la pagina si apre senza errori e calcola il percorso di esempio', async () => {
  const { page, errors } = await open(BASE, { width: 1280, height: 900 });
  assert.deepEqual(errors, []);
  const chips = await page.locator('#takeaway .chip').allTextContents();
  assert.ok(
    chips.some((c) => /nott/i.test(c)),
    'manca il riepilogo delle notti: ' + chips.join(' | ')
  );
  assert.ok((await page.locator('#route').textContent()).length > 50, 'le tappe non sono state disegnate');
  await page.screenshot({ path: path.join(OUT, 'desktop.png'), fullPage: false });
  await page.close();
});

test('aggiungere una notte cambia il riepilogo e il budget', async () => {
  const { page } = await open(BASE, { width: 1280, height: 900 });
  const nightsOf = async () => Number((await page.locator('#nval').inputValue()) || 0);
  await page.click('#opensettings');
  const n0 = await nightsOf();
  await page.click('#nplus');
  assert.equal(await nightsOf(), n0 + 1);
  await page.click('#closesettings');
  await page.click('.jp-tab[data-tab="budget"]');
  const kpis = await page.locator('#bkpis').textContent();
  assert.match(kpis, /€/);
  await page.close();
});

test('un link ?r= con un percorso definito si apre con quel percorso', async () => {
  const params = {
    sel: ['tokyo', 'kyoto', 'osaka'],
    notti: 8,
    arrivo: 'tokyo',
    ritorno: 'osaka',
    persone: 3,
    da: 'roma',
    stile: 'economico',
    partenza: '2027-04-10',
  };
  const { page, errors } = await open(BASE + '?r=' + b64(params), { width: 1280, height: 900 });
  assert.deepEqual(errors, []);
  const chips = (await page.locator('#takeaway .chip').allTextContents()).join(' | ');
  assert.match(chips, /8 notti/);
  assert.match(chips, /3 persone/);
  assert.match(chips, /3 mete/);
  await page.close();
});

test('a 390 px la pagina non ha scorrimento orizzontale', async () => {
  const { page, errors } = await open(BASE, { width: 390, height: 844 });
  assert.deepEqual(errors, []);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  assert.ok(overflow <= 1, `scorrimento orizzontale di ${overflow}px`);
  await page.screenshot({ path: path.join(OUT, 'mobile.png') });
  await page.close();
});
