/* Service worker: rende l'app installabile e utilizzabile anche offline.
   - Guscio (pagina, stili, script, icone): risponde dalla copia della versione installata, così i file
     sono sempre della stessa versione. Una versione nuova arriva quando cambia questo file: il nome
     della cache contiene __BUILD__, che la pubblicazione sostituisce con il commit.
   - Dati (data/*.json): prima la rete, ma se tarda più di 3 secondi o risponde con un errore si usa la
     copia salvata, che intanto si aggiorna. */
const CACHE = 'japan-tour-planner-__BUILD__';
const SHELL = [
  'index.html', 'css/app.css', 'css/shell.css', 'js/dash-shim.js', 'js/d3.v7.min.js', 'js/app.js',
  'js/engine/index.js', 'js/engine/util.js', 'js/engine/formato.js', 'js/engine/costanti.js', 'js/engine/parametri.js', 'js/engine/grafo.js', 'js/engine/calendario.js', 'js/engine/percorso.js', 'js/engine/giorni.js', 'js/engine/avvisi.js',
  'manifest.webmanifest',
  'fonts/zen-kaku-gothic-new-400-latin.woff2', 'fonts/zen-kaku-gothic-new-500-latin.woff2', 'fonts/zen-kaku-gothic-new-700-latin.woff2', 'fonts/zen-kaku-gothic-new-900-latin.woff2',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'data/params.json', 'data/catalogo.json', 'data/basi.json', 'data/tratte.json', 'data/parametri.json',
  'data/giappone.json', 'data/citta.json', 'data/info.json', 'data/eventi.json', 'data/stagione.json', 'data/percorsi.json', 'data/partenze.json'
];
const DATA_TIMEOUT = 3000;

self.addEventListener('install', (e) => {
  // cache: 'reload' salta la cache HTTP del browser, che potrebbe contenere file della versione precedente
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
});

const offline = () => new Response('', { status: 503, statusText: 'Offline' });
// salva solo risposte complete e non rediritte, senza far fallire la richiesta se lo spazio è finito
const save = (cache, key, res) => (res.ok && !res.redirected ? cache.put(key, res.clone()).catch(() => {}) : Promise.resolve());

async function handle(req, key, isData) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(key);
  if (!isData) {
    if (cached) return { res: cached };
    try { const res = await fetch(req); return { res, bg: save(cache, key, res) }; } catch (err) { return { res: offline() }; }
  }
  const net = fetch(req).then((res) => ({ res, bg: save(cache, key, res) }));
  const first = cached
    ? await Promise.race([net.catch(() => null), new Promise((r) => setTimeout(r, DATA_TIMEOUT, null))])
    : await net.catch(() => null);
  if (first && first.res.ok) return first;
  if (cached) return { res: cached, bg: net.then((x) => x.bg, () => {}) };
  return first || { res: offline() };
}

self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // le navigazioni (anche con ?r=...) usano tutte la stessa copia della pagina; gli altri file la loro, senza query
  const key = req.mode === 'navigate' ? new URL('index.html', self.registration.scope).href : url.origin + url.pathname;
  const isData = url.pathname.includes('/data/');
  let settle;
  e.waitUntil(new Promise((r) => { settle = r; }));
  e.respondWith(handle(req, key, isData).then(
    ({ res, bg }) => { Promise.resolve(bg).then(settle, settle); return res; },
    () => { settle(); return offline(); }
  ));
});
