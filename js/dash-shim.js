/* Piccolo runtime che fornisce all'app i dati (cartella data/) e lo stato del percorso.
   Lo stato vive nell'URL (?r=...) per poterlo condividere, e nel browser per ritrovarlo. */
(function () {
  const DATASETS = ['catalogo', 'basi', 'tratte', 'parametri', 'giappone', 'citta', 'info', 'eventi', 'stagione', 'percorsi', 'partenze'];
  const store = {};
  DATASETS.forEach((id) => { store[id] = { status: 'loading', data: [] }; });
  const callbacks = [];
  let defaults = {};
  let params = {};

  const fire = () => callbacks.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
  const b64 = (obj) => btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64 = (s) => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const KEY = 'japan-tour-planner:percorso';

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(params)); } catch (e) { /* storage non disponibile */ }
    try {
      const url = new URL(location.href);
      url.searchParams.set('r', b64(params));
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch (e) { /* ignora */ }
  }

  window.dash = {
    colors: ['#0e8c83', '#c8553d', '#7a9e3a', '#b5838d', '#e0a458', '#5c6bc0', '#8d6e63', '#26a69a'],
    data: (id) => store[id] || { status: 'missing', data: [] },
    onData: (fn) => { callbacks.push(fn); fn(); },
    params: () => params,
    setParams: (o) => { params = Object.assign({}, params, o); persist(); fire(); },
    resetParams: () => { params = clone(defaults); persist(); fire(); },
    setLink: (name) => { try { history.replaceState(null, '', location.pathname + location.search + '#' + name); } catch (e) { /* ignora */ } },
    shareUrl: () => location.origin + location.pathname + '?r=' + b64(params),
    colorsReady: true
  };

  let t = null;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(fire, 150); });

  async function load() {
    try {
      const res = await fetch('data/params.json', { cache: 'no-cache' });
      defaults = await res.json();
    } catch (e) { defaults = {}; }
    params = clone(defaults);
    try {
      const r = new URL(location.href).searchParams.get('r');
      if (r) params = Object.assign(clone(defaults), unb64(r));
      else {
        const saved = localStorage.getItem(KEY);
        if (saved) params = Object.assign(clone(defaults), JSON.parse(saved));
      }
    } catch (e) { params = clone(defaults); }
    await Promise.all(DATASETS.map(async (id) => {
      try {
        const res = await fetch('data/' + id + '.json', { cache: 'no-cache' });
        if (!res.ok) throw new Error(res.status);
        store[id] = { status: 'ok', data: await res.json() };
      } catch (e) {
        store[id] = { status: 'error', data: [], message: String(e) };
      }
    }));
    fire();
  }
  load();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
    // quando una versione nuova dell'app prende il controllo, ricarica una volta per non mescolare file vecchi e nuovi
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
  }
})();
