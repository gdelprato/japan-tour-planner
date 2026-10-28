/* Service worker: rende l'app installabile e utilizzabile anche offline.
   Prima chiede alla rete (verificando con il server, così pagina, script e stili sono sempre della
   stessa versione) e aggiorna la copia; senza rete risponde dalla copia salvata. */
const CACHE = 'japan-tour-planner-v5';
const SHELL = [
  './', 'index.html', 'css/app.css', 'css/shell.css', 'js/dash-shim.js', 'js/d3.v7.min.js', 'js/app.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'data/params.json', 'data/catalogo.json', 'data/basi.json', 'data/tratte.json', 'data/parametri.json',
  'data/giappone.json', 'data/citta.json', 'data/info.json', 'data/eventi.json', 'data/stagione.json', 'data/percorsi.json', 'data/partenze.json'
];

self.addEventListener('install', (e) => {
  // cache: 'reload' salta la cache HTTP del browser, che potrebbe contenere file della versione precedente
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then((cache) =>
    fetch(req.url, { cache: 'no-cache' })
      .then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; })
      .catch(() => cache.match(req, { ignoreSearch: true }).then((c) => c || (req.mode === 'navigate' ? cache.match('index.html') : undefined)))
  ));
});
