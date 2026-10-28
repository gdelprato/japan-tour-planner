/* Japan Tour Planner: costruttore del percorso, calendario, confronto e budget. */
(function () {
  const root = document.getElementById('jproot');
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const mark = (e, src, field, where) => { e.setAttribute('data-source', src); if (field) e.setAttribute('data-field', field); if (where) e.setAttribute('data-where', where); return e; };
  const fail = (box) => { box.textContent = ''; box.appendChild(el('div', 'jp-fail', 'Failed to load')); };
  const enc = (s) => String(s).replace(/%/g, '%25').replace(/&/g, '%26').replace(/=/g, '%3D');
  const num = (x) => Number(x) || 0;
  const yes = (x) => x === true || x === 'sì' || x === 'si' || x === 'true';
  const split = (s) => Array.isArray(s) ? s.map(String) : String(s || '').split(',').map(x => x.trim()).filter(Boolean);
  const nf = new Intl.NumberFormat('it-IT');
  const eur = (n) => nf.format(Math.round(Number(n))) + ' €';
  const yen = (n) => nf.format(Math.round(Number(n))) + ' ¥';
  const nn = (n) => n + (Number(n) === 1 ? ' notte' : ' notti');
  const gg = (n) => (n === 0.5 ? 'mezza giornata' : (n === 1 ? '1 giorno' : String(n).replace('.', ',') + ' giorni'));
  const hrs = (h) => { const t = Math.round(h * 60 / 5) * 5; const H = Math.floor(t / 60), M = t % 60; return H ? H + 'h' + (M ? String(M).padStart(2, '0') : '') : M + ' min'; };
  const fmtDate = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const accent = () => dash.colors[0];
  const LONG_LEG = 2.5;

  let tab = 'percorso';
  let view = 'route';
  let D = null;
  let R = null;
  let hl = null;
  let animateNext = true;
  const PKEY = 'japan-tour-planner:confronto';
  const pinned = (() => { try { return JSON.parse(localStorage.getItem(PKEY) || '[]'); } catch (e) { return []; } })();
  const savePinned = () => { try { localStorage.setItem(PKEY, JSON.stringify(pinned)); } catch (e) { /* ignora */ } };
  const openRegs = { init: new Set(), open: new Set() };

  // ---------- tabs ----------
  const tabs = Array.from(document.querySelectorAll('.jp-tab'));
  function showTab(name, push) {
    if (!document.getElementById(name)) return;
    tab = name;
    tabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
    document.querySelectorAll('.jp-pane').forEach(p => { p.hidden = p.id !== name; });
    if (push) dash.setLink(name);
    if (name === 'percorso') animateNext = true;
    render();
  }
  tabs.forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab, true)));

  // ---------- params ----------
  const norm = (p) => ({
    sel: split(p.sel), notti: Number(p.notti) || 14, ritorno: p.ritorno === 'tokyo' ? 'tokyo' : 'osaka',
    pernotto: split(p.pernotto), gc: split(p.giorni_citta), gcit: split(p.giornata_citta),
    partenza: /^\d{4}-\d{2}-\d{2}$/.test(String(p.partenza || '')) ? String(p.partenza) : '2027-10-13'
  });
  const P = () => norm(dash.params() || {});
  const setP = (o) => { animateNext = true; dash.setParams(o); };
  const dayOf = (it, p) => { const o = p.gc.map(s => String(s).split(':')).find(([k]) => k === it.id); return o ? Number(o[1]) : num(it.giorni); };
  const setDays = (it, v) => { const p = P(); const rest = p.gc.filter(s => String(s).split(':')[0] !== it.id); setP({ giorni_citta: v === num(it.giorni) ? rest : rest.concat([it.id + ':' + v]) }); };
  const toggleSel = (id) => {
    const p = P(); const s = new Set(p.sel);
    if (s.has(id)) { s.delete(id); setP({ sel: Array.from(s), pernotto: p.pernotto.filter(x => x !== id), giornata_citta: p.gcit.filter(x => x !== id) }); }
    else { s.add(id); setP({ sel: Array.from(s) }); }
  };
  const toggleList = (key, list, id) => { const s = new Set(list); if (s.has(id)) s.delete(id); else s.add(id); setP({ [key]: Array.from(s) }); };
  document.getElementById('nminus').addEventListener('click', () => { const n = P().notti; if (n > 10) setP({ notti: n - 1 }); });
  document.getElementById('nplus').addEventListener('click', () => { const n = P().notti; if (n < 21) setP({ notti: n + 1 }); });
  document.querySelectorAll('#retseg button').forEach(b => b.addEventListener('click', () => setP({ ritorno: b.dataset.rit })));
  document.getElementById('reset').addEventListener('click', () => { animateNext = true; dash.resetParams(); });
  const arrivo = document.getElementById('arrivo');
  arrivo.addEventListener('change', () => { if (arrivo.value && arrivo.validity.valid) setP({ partenza: arrivo.value }); });
  arrivo.addEventListener('blur', () => { arrivo.value = P().partenza; });
  document.querySelectorAll('#viewseg button').forEach(b => b.addEventListener('click', () => { view = b.dataset.view; frameView(view); }));
  const zoomBy = (f) => { MAPZ.user = true; if (MAPZ.svg && MAPZ.zoom) MAPZ.svg.transition().duration(reduce ? 0 : 300).call(MAPZ.zoom.scaleBy, f); };
  document.getElementById('zplus').addEventListener('click', () => zoomBy(1.8));
  document.getElementById('zminus').addEventListener('click', () => zoomBy(1 / 1.8));
  const shareBtn = document.getElementById('sharebtn');
  if (shareBtn) shareBtn.addEventListener('click', async () => {
    const url = dash.shareUrl();
    let ok = false;
    try { await navigator.clipboard.writeText(url); ok = true; } catch (e) { ok = false; }
    if (!ok && navigator.share) { try { await navigator.share({ title: 'Japan Tour Planner', url }); ok = true; } catch (e) { /* annullato */ } }
    shareBtn.textContent = ok ? 'Link copiato ✓' : 'Copia non riuscita';
    if (!ok) { const i = document.getElementById('savename'); if (i) { i.value = url; i.select(); } }
    setTimeout(() => { shareBtn.textContent = 'Copia link del percorso'; }, 1800);
  });
  const saveBtn = document.getElementById('savebtn'), saveName = document.getElementById('savename');
  saveBtn.addEventListener('click', () => {
    const p = dash.params() || {};
    const name = (saveName.value || '').trim() || ('Percorso ' + (pinned.length + 1));
    pinned.push({ nome: name, params: JSON.parse(JSON.stringify(p)), pinned: true });
    savePinned();
    saveName.value = '';
    saveBtn.textContent = 'Aggiunto ✓';
    setTimeout(() => { saveBtn.textContent = 'Aggiungi al confronto'; }, 1500);
    render();
  });

  // ---------- route builder ----------
  let adjCache = null;
  function graph(tratte) {
    if (adjCache && adjCache.src === tratte) return adjCache.adj;
    const adj = new Map();
    tratte.forEach(t => [[t.da, t.a], [t.a, t.da]].forEach(([a, b]) => { if (!adj.has(a)) adj.set(a, []); adj.get(a).push({ to: b, ore: num(t.ore), yen: num(t.yen) }); }));
    adjCache = { src: tratte, adj };
    return adj;
  }
  function shortest(tratte, from, to) {
    if (from === to) return { ore: 0, yen: 0 };
    const adj = graph(tratte);
    const dist = new Map([[from, 0]]), prev = new Map(), done = new Set();
    while (true) {
      let u = null, best = Infinity;
      dist.forEach((d, k) => { if (!done.has(k) && d < best) { best = d; u = k; } });
      if (u === null || u === to) break;
      done.add(u);
      (adj.get(u) || []).forEach(e => { const nd = best + e.ore; if (nd < (dist.has(e.to) ? dist.get(e.to) : Infinity)) { dist.set(e.to, nd); prev.set(e.to, { from: u, e }); } });
    }
    if (!dist.has(to)) return null;
    const legs = []; let cur = to;
    while (cur !== from) { const pv = prev.get(cur); legs.unshift(pv.e); cur = pv.from; }
    return { ore: d3.sum(legs, l => l.ore), yen: d3.sum(legs, l => l.yen) };
  }
  function par() { const m = new Map(); (D.par.data || []).forEach(r => m.set(r.id, { min: num(r.min), max: num(r.max), voce: r.voce })); return m; }

  function build(p) {
    const cat = D.cat.data, basi = D.basi.data, tratte = D.tratte.data, pm = par();
    const sel = new Set(p.sel), pern = new Set(p.pernotto), gcit = new Set(p.gcit);
    const bInfo = new Map(basi.map(b => [b.base, { ordine: num(b.ordine), prio: num(b.priorita_extra), zona: b.zona }]));
    const bases = new Map();
    const ensure = (name) => { if (!bases.has(name)) bases.set(name, { base: name, need: 0, city: [], trips: [], own: false, tipoNotte: 'hotel' }); return bases.get(name); };
    ensure('Tokyo');
    const items = cat.filter(c => sel.has(c.id));
    const overnight = (i) => yes(i.notte_possibile) && pern.has(i.id);
    const dayCity = (i) => i.tipo === 'citta' && i.basi_giornata && gcit.has(i.id);
    items.filter(overnight).forEach(i => { const b = ensure(i.base_notte); b.need += num(i.giorni); b.trips.push({ ...i, sulPosto: true }); b.own = true; b.tipoNotte = i.tipo_notte || 'hotel'; });
    items.filter(i => i.tipo === 'citta' && !dayCity(i)).forEach(i => { const d = dayOf(i, p); const b = ensure(split(i.basi)[0]); b.need += d; b.city.push({ ...i, gg: d }); });
    items.filter(i => (i.tipo === 'gita' && !overnight(i)) || dayCity(i)).forEach(i => {
      const isCity = dayCity(i);
      const opts = isCity ? split(i.basi_giornata) : split(i.basi);
      const present = opts.filter(o => bases.has(o) && !bases.get(o).own);
      const effOre = (o) => o === opts[0] ? 0 : ((shortest(tratte, o, opts[0]) || { ore: 99 }).ore);
      const name = present.length ? present.slice().sort((a, c) => effOre(a) - effOre(c))[0] : opts[0];
      const b = ensure(name);
      const d = isCity ? dayOf(i, p) : num(i.giorni);
      b.need += d;
      let t;
      if (isCity) { const leg = shortest(tratte, name, split(i.basi)[0]); t = { ...i, giorni: d, ore_tratta: leg ? leg.ore : 1, yen_ar: leg ? leg.yen * 2 : 0, cittaInGiornata: true }; }
      else if (name === opts[0]) t = i;
      else { const leg = shortest(tratte, name, opts[0]); t = { ...i, ore_tratta: num(i.ore_tratta) + (leg ? leg.ore : 0), yen_ar: num(i.yen_ar) + (leg ? leg.yen * 2 : 0), via: opts[0] }; }
      b.trips.push(t);
    });
    const stops = Array.from(bases.values()).sort((a, b) => ((bInfo.get(a.base) || {}).ordine || 99) - ((bInfo.get(b.base) || {}).ordine || 99));
    const endTokyo = p.ritorno === 'tokyo' ? 1 : 0;
    // legs first (order is known), then nights
    stops.forEach((s, i) => { s.from = i === 0 ? 'Haneda' : stops[i - 1].base; s.legIn = shortest(tratte, s.from, s.base); s.ts = i === 0 ? 0 : (s.legIn && s.legIn.ore > LONG_LEG ? 1 : 2); s.zona = (bInfo.get(s.base) || {}).zona; });
    stops.forEach((s, i) => {
      s.minN = i === 0 ? Math.ceil(s.need - 1e-9) + 1 : Math.max(1, 1 + Math.ceil(s.need - s.ts / 2 - 1e-9));
      s.nights = s.minN;
    });
    const minTotal = d3.sum(stops, s => s.nights) + endTokyo;
    const maxN = (pm.get('max_notti') || { min: 5 }).min;
    let extra = p.notti - minTotal;
    const prio = (s) => (bInfo.get(s.base) || { prio: 99 }).prio;
    while (extra > 0) {
      let c = stops.filter(s => s.nights < maxN).sort((a, b) => prio(a) - prio(b));
      if (!c.length) c = stops.slice().sort((a, b) => (a.nights - b.nights) || (prio(a) - prio(b)));
      c[0].nights += 1; extra -= 1;
    }
    const deficit = Math.max(0, minTotal - p.notti);
    let day = 1;
    stops.forEach((s, i) => {
      s.ordine = i + 1; s.dal = day; s.al = day + s.nights; day += s.nights;
      s.free = (s.ts + 2 * (s.nights - 1) - 2 * s.need) / 2;
    });
    let endStop = null;
    if (endTokyo) {
      const from = stops[stops.length - 1].base, leg = shortest(tratte, from, 'Tokyo');
      endStop = { base: 'Tokyo', ordine: stops.length + 1, nights: 1, dal: day, al: day + 1, need: 0, city: [], trips: [], free: 0, finale: true, tipoNotte: 'hotel', from, legIn: leg, ts: leg && leg.ore > LONG_LEG ? 1 : 2, zona: (bInfo.get('Tokyo') || {}).zona };
      day += 1;
    }
    const all = stops.concat(endStop ? [endStop] : []);
    const airport = p.ritorno === 'tokyo' ? 'Haneda' : 'Kansai';
    const last = shortest(tratte, all[all.length - 1].base, airport);
    const moving = all.slice(1).map(s => s.legIn).filter(Boolean);
    const rate = (pm.get('cambio') || { min: 176 }).min;
    const G = p.notti + 1;
    const g = (id) => pm.get(id) || { min: 0, max: 0 };
    const ryN = d3.sum(all.filter(s => s.tipoNotte === 'ryokan'), s => s.nights);
    const hoN = p.notti - ryN;
    const trainYen = d3.sum(all, s => s.legIn ? s.legIn.yen : 0) + (last ? last.yen : 0);
    const tripYen = d3.sum(all, s => d3.sum(s.trips.filter(t => !t.sulPosto), t => num(t.yen_ar)));
    const cambi = all.length - 1;
    const cost = [
      { cat: 'Voli', min: g('voli').min, max: g('voli').max, how: 'Andata e ritorno ' + (p.ritorno === 'tokyo' ? 'su Haneda' : 'Haneda / Kansai (open-jaw)') },
      { cat: 'Alloggi', min: (hoN * g('notte_hotel').min + ryN * g('notte_ryokan').min) / rate, max: (hoN * g('notte_hotel').max + ryN * g('notte_ryokan').max) / rate, how: hoN + ' notti in hotel o appartamento' + (ryN ? ' + ' + ryN + ' in ryokan o minshuku' : '') },
      { cat: 'Treni tra le basi', min: trainYen / rate, max: trainYen / rate, how: 'Aeroporti inclusi, circa ' + yen(trainYen) },
      { cat: 'Gite in giornata', min: tripYen / rate, max: tripYen / rate, how: 'Andata e ritorno dalle basi, circa ' + yen(tripYen) },
      { cat: 'Trasporti locali', min: G * g('locali').min / rate, max: G * g('locali').max / rate, how: G + ' giorni di metro e bus' },
      { cat: 'Cibo', min: G * g('cibo').min / rate, max: G * g('cibo').max / rate, how: G + ' giorni' },
      { cat: 'Ingressi', min: G * g('ingressi').min / rate, max: G * g('ingressi').max / rate, how: G + ' giorni' },
      { cat: 'Takkyubin', min: cambi * g('takkyubin').min, max: cambi * g('takkyubin').max, how: cambi + ' spedizioni dello zaino, una per cambio' },
      { cat: 'Assicurazione', min: g('assicurazione').min * G / 15, max: g('assicurazione').max * G / 15, how: 'Riproporzionata su ' + G + ' giorni' },
      { cat: 'eSIM e varie', min: g('esim').min + G * g('varie').min / rate, max: g('esim').max + G * g('varie').max / rate, how: 'eSIM, bibite, snack, armadietti' },
    ];
    const tot = { min: d3.sum(cost, c => c.min), max: d3.sum(cost, c => c.max) };
    return { p, stops, all, endStop, last, airport, deficit, minTotal, items, moving, cost, tot, cambi, G, maxN,
      oreBagagli: d3.sum(moving, l => l.ore), free: d3.sum(stops, s => Math.max(0, s.free)), overMax: stops.filter(s => s.nights > maxN && s.nights > s.minN) };
  }

  // ---------- day by day ----------
  function planDays(r) {
    const start = Date.parse(r.p.partenza + 'T00:00:00Z');
    const dateOf = (n) => new Date(start + (n - 1) * 86400000);
    const days = [];
    r.all.forEach((s, idx) => {
      const q = [];
      if (s.finale) q.push({ t: 'Ultima serata a Tokyo', kind: 'libero', units: 1, split: true });
      s.city.forEach(c => { for (let k = 0; k < Math.round(c.gg * 2); k++) q.push({ t: c.nome, kind: 'citta', units: 1, split: true }); });
      s.trips.forEach(t => { const h = Math.max(1, Math.round(num(t.giorni) * 2)); q.push({ t: t.nome, kind: t.sulPosto ? 'posto' : (t.cittaInGiornata ? 'citta' : 'gita'), units: h, split: !!t.cittaInGiornata }); });
      // a city visited as a day trip is split in halves like a city
      for (let i = q.length - 1; i >= 0; i--) if (q[i].split && q[i].units > 1) { const it = q[i]; q.splice(i, 1, ...Array.from({ length: it.units }, () => ({ ...it, units: 1 }))); }
      const take = (rem, transfer, preferCity) => {
        if (!transfer && !preferCity && rem >= 2) { const i = q.findIndex(x => x.units === 2); if (i >= 0) return q.splice(i, 1)[0]; }
        let i = q.findIndex(x => x.units === 1);
        if (i >= 0) return q.splice(i, 1)[0];
        if (rem >= 2) { i = q.findIndex(x => x.units === 2); if (i >= 0) return q.splice(i, 1)[0]; }
        return null;
      };
      let lastTrip = idx === 0;
      for (let d = s.dal; d < s.al; d++) {
        const day = { n: d, date: dateOf(d), stop: s, first: d === s.dal, parts: [] };
        let slots = 2;
        if (d === s.dal) {
          if (idx === 0) { day.travel = 'Atterraggio a Haneda' + (s.legIn ? ', poi ' + hrs(s.legIn.ore) + ' fino in città' : ''); slots = 0; }
          else { day.travel = 'Treno da ' + s.from + ' (' + (s.legIn ? hrs(s.legIn.ore) : '?') + ')'; slots = s.ts; }
        }
        const taken = [];
        let rem = slots;
        const transfer = d === s.dal && idx > 0;
        while (rem > 0) {
          const x = take(rem, transfer, lastTrip && q.some(y => y.units === 1));
          if (!x) { taken.push({ t: 'Tempo libero', kind: 'libero', units: 1 }); rem -= 1; continue; }
          taken.push(x); rem -= x.units;
        }
        if (!(idx === 0 && d === s.dal)) lastTrip = taken.some(x => x.kind === 'gita' || x.units === 2);
        taken.forEach(x => { const lastp = day.parts[day.parts.length - 1]; if (x.units === 2) day.parts.push({ ...x, full: true }); else if (lastp && lastp.t === x.t && !lastp.full) lastp.full = true; else day.parts.push({ ...x, full: false }); });
        if (idx === 0 && d === s.dal) day.parts.push({ t: 'Serata libera e riposo', kind: 'libero', full: false });
        days.push(day);
      }
      s.overflow = d3.sum(q.filter(x => x.kind !== 'libero'), x => x.units) / 2;
    });
    const lastStop = r.all[r.all.length - 1];
    days.push({ n: r.p.notti + 1, date: dateOf(r.p.notti + 1), stop: null, first: true, travel: 'Treno per ' + (r.airport === 'Kansai' ? 'Osaka Kansai' : 'Tokyo Haneda') + (r.last ? ' (' + hrs(r.last.ore) + ')' : '') + ' e volo di ritorno', parts: [] });
    return days;
  }
  function notesFor(day) {
    const out = [];
    const iso = day.date.toISOString().slice(0, 10), md = iso.slice(5);
    const here = new Set();
    if (day.stop) { here.add(day.stop.base); day.parts.forEach(pt => { const it = (D.cat.data || []).find(c => c.nome === pt.t); if (it) split(it.luoghi).forEach(l => here.add(l)); }); }
    if (D.ev.status === 'ok') D.ev.data.forEach(e => {
      if (iso >= e.dal && iso <= e.al && (!e.luogo || here.has(e.luogo))) out.push({ kind: 'ev', t: e.nome, nota: e.nota, w: 'nome=' + enc(e.nome) });
    });
    if (D.st.status === 'ok') D.st.data.forEach(s => {
      if (!here.has(s.luogo) || !day.parts.some(pt => pt.kind !== 'libero' || day.stop.base === s.luogo)) return;
      if (md >= s.dal && md <= s.al) out.push({ kind: 'fo', t: 'Foliage a ' + s.luogo, w: 'luogo=' + enc(s.luogo) });
    });
    return out;
  }

  // ---------- header ----------
  function drawTakeaway() {
    const p = document.getElementById('takeaway');
    p.textContent = '';
    if (!R) return;
    p.classList.remove('dash-skeleton');
    const a = Date.parse(R.p.partenza + 'T00:00:00Z');
    const f = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', timeZone: 'UTC' });
    p.append('Il vostro percorso: dal ', el('b', null, f.format(new Date(a))), ' al ', el('b', null, f.format(new Date(a + R.p.notti * 86400000))), ', ',
      el('b', null, nn(R.p.notti)), ', ', el('b', null, R.all.length + ' alloggi'), ', ', el('b', null, R.items.length + ' mete'),
      ', circa ', el('b', null, eur(R.tot.min) + '–' + eur(R.tot.max)), ' a persona. Ritorno da ' + (R.p.ritorno === 'tokyo' ? 'Tokyo' : 'Osaka') + '.');
  }

  // ---------- controls ----------
  function drawControls() {
    const p = P();
    document.getElementById('nval').textContent = p.notti;
    document.getElementById('nminus').disabled = p.notti <= 10;
    document.getElementById('nplus').disabled = p.notti >= 21;
    document.querySelectorAll('#retseg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.rit === p.ritorno)));
    if (arrivo !== document.activeElement) arrivo.value = p.partenza;
  }

  // ---------- picker ----------
  function drawPicker() {
    const box = document.getElementById('picker');
    box.textContent = '';
    if (D.cat.status !== 'ok') { if (D.cat.status === 'error') fail(box); else box.classList.add('dash-skeleton'); return; }
    box.classList.remove('dash-skeleton');
    const p = P(); const sel = new Set(p.sel), pern = new Set(p.pernotto), gcit = new Set(p.gcit);
    const where = new Map();
    if (R) R.all.forEach(s => { s.city.forEach(c => where.set(c.id, s.base)); s.trips.forEach(t => where.set(t.id, s.base)); });
    d3.group(D.cat.data, r => r.regione).forEach((items, reg) => {
      const nSel = items.filter(i => sel.has(i.id)).length;
      if (!openRegs.init.has(reg)) { openRegs.init.add(reg); if (nSel) openRegs.open.add(reg); }
      const sec = el('details', 'jp-reg'); sec.open = openRegs.open.has(reg);
      sec.addEventListener('toggle', () => { if (sec.open) openRegs.open.add(reg); else openRegs.open.delete(reg); });
      const sm = el('summary'); sm.append(el('span', 'rn', reg), el('span', 'jp-tag', nSel ? nSel + ' su ' + items.length : items.length + ' mete'));
      sec.appendChild(sm);
      items.forEach(it => {
        const w = 'id=' + enc(it.id);
        const on = sel.has(it.id);
        const row = el('div', 'jp-item' + (on ? ' on' : ''));
        row.addEventListener('mouseenter', () => setHL(split(it.luoghi)[0]));
        row.addEventListener('mouseleave', () => setHL(null));
        const cb = el('input'); cb.type = 'checkbox'; cb.id = 'cb-' + it.id; cb.checked = on;
        cb.addEventListener('change', () => toggleSel(it.id));
        const lab = el('label'); lab.htmlFor = cb.id;
        lab.appendChild(mark(el('span', null, it.nome), 'catalogo', 'nome', w));
        if (it.tipo === 'citta') lab.appendChild(el('span', 'jp-tag', 'città'));
        row.append(cb, lab);
        const m = el('div', 'm');
        if (it.tipo === 'citta') {
          const d = dayOf(it, p);
          const st = el('span', 'jp-step'); st.style.marginRight = '6px'; st.style.verticalAlign = 'middle';
          const mi = el('button', null, '−'); mi.type = 'button'; mi.disabled = d <= 1; mi.setAttribute('aria-label', 'Un giorno in meno a ' + it.nome);
          const pl = el('button', null, '+'); pl.type = 'button'; pl.disabled = d >= 6; pl.setAttribute('aria-label', 'Un giorno in più a ' + it.nome);
          mi.addEventListener('click', () => setDays(it, d - 1)); pl.addEventListener('click', () => setDays(it, d + 1));
          [mi, pl].forEach(x => { x.style.width = '1.6rem'; x.style.height = '1.5rem'; });
          const v = el('span', null, String(d)); v.style.minWidth = '1.4rem';
          st.append(mi, v, pl);
          m.append(st, (d === 1 ? 'giorno' : 'giorni') + ' in città');
          if (on && gcit.has(it.id) && where.get(it.id)) m.append(' · in giornata da ' + where.get(it.id));
          if (d !== num(it.giorni)) m.append(' · consigliati ', mark(el('span', null, String(num(it.giorni))), 'catalogo', 'giorni', w));
        } else {
          m.append(mark(el('span', null, gg(num(it.giorni))), 'catalogo', 'giorni', w));
          const b = where.get(it.id);
          const sulPosto = yes(it.notte_possibile) && pern.has(it.id) && on;
          if (sulPosto) m.append(' · dormite lì');
          else m.append(' · ', mark(el('span', null, hrs(num(it.ore_tratta))), 'catalogo', 'ore_tratta', w), ' di viaggio da ' + (on && b ? b : split(it.basi)[0]));
        }
        row.appendChild(m);
        row.appendChild(mark(el('div', 'x', it.descrizione), 'catalogo', 'descrizione', w));
        if (yes(it.notte_possibile)) {
          const lb = el('label', 'pn' + (on ? '' : ' off'));
          const pc = el('input'); pc.type = 'checkbox'; pc.checked = on && pern.has(it.id); pc.disabled = !on;
          pc.addEventListener('change', () => toggleList('pernotto', P().pernotto, it.id));
          lb.append(pc, it.tipo_notte === 'ryokan' ? 'Dormire lì una notte (ryokan o casa tradizionale)' : 'Dormire lì una notte');
          row.appendChild(lb);
        }
        if (it.tipo === 'citta' && it.basi_giornata) {
          const other = (D.cat.data || []).find(c => c.tipo === 'citta' && split(c.basi)[0] === it.basi_giornata);
          const otherDay = other && gcit.has(other.id) && sel.has(other.id);
          const lb = el('label', 'pn' + (on && !otherDay ? '' : ' off'));
          const pc = el('input'); pc.type = 'checkbox'; pc.checked = on && !gcit.has(it.id); pc.disabled = !on || otherDay;
          pc.addEventListener('change', () => toggleList('giornata_citta', P().gcit, it.id));
          lb.append(pc, 'Dormire lì' + (pc.checked ? '' : ' (ora in giornata da ' + it.basi_giornata + ')'));
          if (otherDay) lb.title = 'Anche ' + it.basi_giornata + ' è in giornata: una delle due deve essere una base';
          row.appendChild(lb);
        }
        sec.appendChild(row);
      });
      box.appendChild(sec);
    });
  }

  // ---------- KPIs and warnings ----------
  function kpi(box, label, value, sub) {
    const d = el('div', 'jp-kpibox'); d.append(el('span', 'l', label), el('span', 'v', value)); if (sub) d.append(el('span', 's', sub)); box.appendChild(d);
  }
  function warnings(r) {
    const msgs = [];
    if (r.deficit > 0) msgs.push(['Mancano notti. ', 'Con queste mete servono almeno ' + nn(r.minTotal) + ': aggiungete ' + nn(r.deficit) + ' o togliete qualche meta.']);
    if (r.overMax.length && !r.deficit) msgs.push(['Base lunga. ', r.overMax.map(s => s.base + ' ' + nn(s.nights)).join(', ') + ': più di ' + r.maxN + ' notti nello stesso posto. Potete aggiungere una meta o una tappa.']);
    const longs = [];
    r.all.forEach(s => s.trips.filter(t => !t.sulPosto && num(t.ore_tratta) > 2).forEach(t => longs.push(t.nome + ' da ' + s.base + ' (' + hrs(num(t.ore_tratta)) + ' a tratta)')));
    if (longs.length) msgs.push(['Giornate lunghe in treno. ', longs.join(', ') + '. Valutate di dormire lì, dove possibile, o una base più vicina.']);
    if (!r.last) msgs.push(['Collegamento mancante. ', 'Non trovo un treno per l\'aeroporto scelto.']);
    return msgs;
  }
  function drawKpis() {
    const box = document.getElementById('kpis'); box.textContent = '';
    if (!R) { for (let i = 0; i < 5; i++) box.appendChild(el('div', 'jp-kpibox dash-skeleton')); return; }
    kpi(box, 'Notti', String(R.p.notti), (R.p.notti + 1) + ' giorni');
    kpi(box, 'Alloggi', String(R.all.length), R.cambi + (R.cambi === 1 ? ' cambio' : ' cambi'));
    kpi(box, 'Treno con i bagagli', hrs(R.oreBagagli), 'tra le basi');
    kpi(box, 'Giorni liberi', String(R.free).replace('.', ','), 'oltre alle mete scelte');
    kpi(box, 'A persona', eur(R.tot.min), 'fino a ' + eur(R.tot.max));
    const w = document.getElementById('warn'); w.textContent = '';
    const msgs = warnings(R);
    msgs.forEach(([b, t], i) => { if (i) w.appendChild(el('br')); w.append(el('b', null, b), t); });
    w.hidden = !msgs.length;
  }

  // ---------- map ----------
  const VIEWS = {
    all: { lon0: 127.4, lon1: 146.0, lat0: 26.0, lat1: 45.6, title: 'Tutto il Giappone' },
    kansai: { lon0: 134.5, lon1: 136.15, lat0: 34.12, lat1: 35.12, title: 'Kansai: Kyoto, Osaka, Nara, Kobe e dintorni' }
  };
  const MAPZ = { t: null, w: 0, zoom: null, svg: null, frame: null, wantView: null, user: false, routeT: null, routeKey: '' };
  function frameView(name) {
    if (!MAPZ.svg || !MAPZ.frame) { MAPZ.wantView = name; return; }
    if (name === 'route') MAPZ.user = false; else MAPZ.user = true;
    const t = name === 'route' ? MAPZ.routeT : MAPZ.frame(VIEWS[name]);
    if (!t) return;
    MAPZ.svg.transition().duration(reduce ? 0 : 650).call(MAPZ.zoom.transform, t);
  }
  function drawMap() {
    const box = document.getElementById('map');
    box.textContent = '';
    MAPZ.svg = null;
    const { jp, ct } = D;
    if (jp.status !== 'ok' || ct.status !== 'ok' || !R) {
      if ([jp, ct].some(x => x.status === 'error')) { box.classList.remove('dash-skeleton'); fail(box); }
      return;
    }
    box.classList.remove('dash-skeleton');
    const W = Math.max(300, box.clientWidth || 700);
    if (MAPZ.w && MAPZ.w !== W) MAPZ.t = null;
    MAPZ.w = W;
    const vw = VIEWS.all;
    const mx = (lon) => lon * Math.PI / 180;
    const my = (lat) => -Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
    const pad = 10;
    const H = Math.round(Math.min(Math.max(W * 0.66, 340), 660));
    const dxr = mx(vw.lon1) - mx(vw.lon0), dyr = my(vw.lat0) - my(vw.lat1);
    const k0 = Math.min((W - 2 * pad) / dxr, (H - 2 * pad) / dyr);
    const ox = (W - k0 * dxr) / 2, oy = (H - k0 * dyr) / 2;
    const X = (lon) => ox + (mx(lon) - mx(vw.lon0)) * k0;
    const Y = (lat) => oy + (my(lat) - my(vw.lat1)) * k0;
    const KMAX = 40;
    const frameBox = (x0, y0, x1, y1, m, kmax) => {
      const k = Math.max(1, Math.min(kmax || KMAX, (W - 2 * m) / Math.max(1, x1 - x0), (H - 2 * m) / Math.max(1, y1 - y0)));
      return d3.zoomIdentity.translate(W / 2, H / 2).scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
    };
    MAPZ.frame = (v) => frameBox(X(v.lon0), Y(v.lat1), X(v.lon1), Y(v.lat0), 16);
    const svg = d3.select(box).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).style('overflow', 'hidden').style('touch-action', 'none')
      .attr('role', 'img').attr('aria-label', 'Mappa del Giappone con il percorso, ingrandibile');
    svg.append('rect').attr('width', W).attr('height', H).attr('fill', 'transparent');
    const gMap = svg.append('g');
    const ns = (s) => s.attr('vector-effect', 'non-scaling-stroke');
    jp.data.forEach(r => {
      const pts = String(r.coords).trim().split(/\s+/).map(s => s.split(',').map(Number));
      if (pts.length < 3) return;
      ns(gMap.append('path').attr('d', 'M' + pts.map(([lo, la]) => X(lo).toFixed(2) + ',' + Y(la).toFixed(2)).join('L') + 'Z')
        .attr('fill', 'var(--jp-land)').attr('stroke', 'var(--jp-coast)').attr('stroke-width', 0.9).attr('stroke-linejoin', 'round'));
    });
    const places = ct.data.map(p => ({ ...p, lat: Number(p.lat), lon: Number(p.lon), x0: X(Number(p.lon)), y0: Y(Number(p.lat)) }));
    const byName = new Map(places.map(p => [p.luogo, p]));
    const PT = (n) => { const p = byName.get(n); return p ? [p.x0, p.y0] : null; };
    const A = accent();
    // frame of the route: bases, day trips and airports
    const fpts = [];
    const addPt = (n) => { const q = PT(n); if (q) fpts.push(q); };
    ['Haneda', R.airport].forEach(addPt);
    R.all.forEach(s => { addPt(s.base); s.trips.forEach(t => split(t.luoghi).forEach(addPt)); });
    const fx = fpts.map(q => q[0]), fy = fpts.map(q => q[1]);
    const routeT = fpts.length ? frameBox(Math.min(...fx), Math.min(...fy), Math.max(...fx), Math.max(...fy), 44, 14) : d3.zoomIdentity;
    MAPZ.routeT = routeT;
    const t0 = (MAPZ.user && MAPZ.t) ? MAPZ.t : routeT;
    const anim = animateNext && !reduce; animateNext = false;
    const gR = gMap.append('g').attr('fill', 'none').attr('stroke-linecap', 'round'), gT = gMap.append('g');
    const curve = (a, b, side) => {
      const [x1, y1] = a, [x2, y2] = b, len = Math.hypot(x2 - x1, y2 - y1) || 1;
      const nx = -(y2 - y1) / len, ny = (x2 - x1) / len, off = Math.min(60, len * 0.2) * side;
      return `M${x1},${y1} Q${(x1 + x2) / 2 + nx * off},${(y1 + y2) / 2 + ny * off} ${x2},${y2}`;
    };
    const firstP = PT('Haneda'), lastAir = PT(R.airport);
    const seq = R.all.map(s => PT(s.base));
    if (firstP && seq[0]) ns(gR.append('path').attr('d', curve(firstP, seq[0], 1)).attr('stroke', A).attr('stroke-width', 1.4).attr('stroke-dasharray', '2 4').attr('opacity', .7));
    if (lastAir && seq[seq.length - 1]) ns(gR.append('path').attr('d', curve(seq[seq.length - 1], lastAir, 1)).attr('stroke', A).attr('stroke-width', 1.4).attr('stroke-dasharray', '2 4').attr('opacity', .7));
    for (let i = 0; i < seq.length - 1; i++) {
      if (!seq[i] || !seq[i + 1]) continue;
      const back = R.all[i + 1].finale;
      const path = ns(gR.append('path').attr('d', curve(seq[i], seq[i + 1], back ? -1 : 1)).attr('stroke', A).attr('stroke-width', 3.2));
      if (anim) { const L = path.node().getTotalLength() * t0.k; path.attr('stroke-dasharray', L).style('--len', L).attr('class', 'jp-draw').style('animation-delay', (i * 160) + 'ms').on('animationend', function () { this.removeAttribute('stroke-dasharray'); this.classList.remove('jp-draw'); }); }
    }
    const tripOf = new Map(), cityStop = new Map();
    R.all.forEach(s => {
      s.trips.filter(t => !t.sulPosto).forEach(t => split(t.luoghi).forEach(l => tripOf.set(l, { base: s.base, item: t })));
      if (!cityStop.has(s.base)) cityStop.set(s.base, []);
      cityStop.get(s.base).push(s);
    });
    tripOf.forEach((v, l) => { const a = PT(v.base), b = PT(l); if (a && b) ns(gT.append('line').attr('x1', a[0]).attr('y1', a[1]).attr('x2', b[0]).attr('y2', b[1]).attr('stroke', A).attr('stroke-width', 1.5).attr('stroke-dasharray', '3 3').attr('opacity', .8)); });

    // screen-space layers: sea names, markers, labels keep their size while zooming
    const gSea = svg.append('g').attr('fill', 'var(--color-fg-muted)').attr('opacity', .5).attr('font-size', W < 520 ? 9 : 11).attr('font-style', 'italic').attr('letter-spacing', '.12em').attr('pointer-events', 'none');
    const seaNames = [
      { t: 'MAR DEL GIAPPONE', lon: 135.0, lat: 38.6, min: 0, max: 5 },
      { t: 'OCEANO PACIFICO', lon: 140.2, lat: 32.4, min: 0, max: 5 },
      { t: 'MAR CINESE ORIENTALE', lon: 128.2, lat: 29.6, min: 0, max: 4 },
      { t: 'BAIA DI OSAKA', lon: 135.0, lat: 34.32, min: 8, max: 99 },
      { t: 'MARE INTERNO DI SETO', lon: 133.3, lat: 34.15, min: 4, max: 99 }
    ].map(s => ({ ...s, x0: X(s.lon), y0: Y(s.lat), node: gSea.append('text').attr('text-anchor', 'middle').text(s.t) }));
    const gP = svg.append('g'), gL = svg.append('g');
    const itemOf = new Map();
    (D.cat.data || []).forEach(it => split(it.luoghi).forEach(l => itemOf.set(l, it)));
    const tip = d3.select(box).append('div').attr('class', 'jp-tip');
    const small = W < 560;
    const sel = new Set(R.p.sel);
    const kb = VIEWS.kansai;
    const marks = [];
    places.forEach(p => {
      const stopsHere = cityStop.get(p.luogo) || [];
      const trip = tripOf.get(p.luogo);
      const it = itemOf.get(p.luogo);
      let kind = 'off';
      if (p.tipo === 'aeroporto') kind = 'air'; else if (stopsHere.length) kind = 'stop'; else if (trip) kind = 'trip';
      const g = gP.append('g').attr('class', 'jp-stop').attr('data-city', p.luogo);
      if (kind === 'air') {
        g.append('rect').attr('x', -4.5).attr('y', -4.5).attr('width', 9).attr('height', 9).attr('rx', 1.5).attr('fill', 'var(--color-fg-muted)');
      } else if (kind === 'stop') {
        const t = stopsHere.map(s => s.ordine).join('·');
        const rr = t.length > 1 ? 12 : 10;
        g.append('circle').attr('class', 'jp-hl').attr('r', rr + 6).attr('fill', 'none').attr('stroke', A).attr('stroke-width', 2);
        const inner = g.append('g').attr('class', anim ? 'jp-pop' : null).style('animation-delay', anim ? (stopsHere[0].ordine * 160) + 'ms' : null);
        inner.append('circle').attr('r', rr).attr('fill', A).attr('stroke', 'var(--color-bg)').attr('stroke-width', 2);
        inner.append('text').attr('text-anchor', 'middle').attr('dominant-baseline', 'central').attr('font-size', t.length > 1 ? 9 : 11).attr('font-weight', 700).attr('fill', 'var(--color-bg)').text(t);
      } else if (kind === 'trip') {
        g.append('circle').attr('class', 'jp-hl').attr('r', 9).attr('fill', 'none').attr('stroke', A).attr('stroke-width', 1.5);
        g.append('circle').attr('r', 4.2).attr('fill', 'var(--color-bg)').attr('stroke', A).attr('stroke-width', 2);
      } else {
        g.append('circle').attr('class', 'jp-hl').attr('r', 8).attr('fill', 'none').attr('stroke', 'var(--color-fg-muted)').attr('stroke-width', 1.2);
        g.append('circle').attr('r', 3.2).attr('fill', 'var(--color-fg-muted)').attr('opacity', .45);
      }
      g.append('circle').attr('r', kind === 'stop' ? 16 : 11).attr('fill', 'transparent');
      if (it && kind !== 'air') g.style('cursor', 'pointer').on('click', (ev) => { ev.stopPropagation(); toggleSel(it.id); });
      g.on('mousemove', (ev) => {
        const [px, py] = d3.pointer(ev, box);
        tip.html('').style('opacity', 1);
        tip.append('div').style('font-weight', 600).text(p.luogo);
        if (kind === 'stop') stopsHere.forEach(s => tip.append('div').attr('class', 't').text('Tappa ' + s.ordine + ' · giorni ' + s.dal + '–' + s.al + ' · ' + nn(s.nights)));
        else if (kind === 'trip') tip.append('div').attr('class', 't').text('In giornata da ' + trip.base + ' · ' + hrs(num(trip.item.ore_tratta)) + ' a tratta');
        else if (kind === 'air') tip.append('div').attr('class', 't').text(p.luogo === R.airport ? 'Aeroporto di ritorno' : (p.luogo === 'Haneda' ? 'Aeroporto di arrivo' : 'Aeroporto'));
        if (it && kind !== 'air') { tip.append('div').attr('class', 't').text(it.descrizione); tip.append('div').text(sel.has(it.id) ? 'Clic per toglierla' : 'Clic per aggiungerla'); }
        const tw = tip.node().offsetWidth;
        tip.style('left', Math.min(Math.max(0, px + 12), box.clientWidth - tw) + 'px').style('top', (py + 14) + 'px');
        setHL(p.luogo);
      }).on('mouseleave', () => { tip.style('opacity', 0); setHL(null); });
      const major = kind === 'stop';
      let label = null;
      if (!(kind === 'air' && p.luogo !== R.airport && p.luogo !== 'Haneda')) {
        let txt = p.luogo;
        if (major && !small) txt += ' · ' + nn(d3.sum(stopsHere, s => s.nights));
        label = gL.append('text').attr('font-size', major ? (small ? 11 : 12.5) : 10.5).attr('font-weight', major ? 600 : 400)
          .attr('fill', 'var(--color-fg)').attr('opacity', kind === 'off' ? .6 : 1)
          .attr('paint-order', 'stroke').attr('stroke', 'var(--jp-sea)').attr('stroke-width', 3.5).attr('stroke-linejoin', 'round')
          .attr('pointer-events', 'none').text(txt);
      }
      const inKansai = p.lon > kb.lon0 && p.lon < kb.lon1 && p.lat > kb.lat0 && p.lat < kb.lat1;
      marks.push({ p, g, label, kind, major, inKansai });
    });
    const POS = (e, dd) => ({ n: [0, -dd, 'middle', 'auto'], s: [0, dd, 'middle', 'hanging'], e: [dd, 0, 'start', 'central'], w: [-dd, 0, 'end', 'central'], se: [dd * .7, dd * .55, 'start', 'hanging'], sw: [-dd * .7, dd * .55, 'end', 'hanging'] }[e] || [dd, 0, 'start', 'central']);
    function place(t) {
      const k = t.k;
      marks.forEach(m => {
        const x = t.applyX(m.p.x0), y = t.applyY(m.p.y0);
        const out = x < -20 || x > W + 20 || y < -20 || y > H + 20;
        m.g.attr('transform', `translate(${x},${y})`).style('display', out ? 'none' : null);
        if (!m.label) return;
        let show = !out;
        if (!m.major && m.kind !== 'air') {
          if (m.kind === 'off' && k < (small ? 5 : 3.2)) show = false;
          if (m.inKansai && k < 7) show = false;
        }
        const [dx, dy, anchor, base] = POS(m.p.etichetta, m.major ? 17 : 10);
        m.label.attr('x', x + dx).attr('y', y + dy).attr('text-anchor', anchor).attr('dominant-baseline', base).style('display', show ? null : 'none');
      });
      // hide lower-priority labels that collide with ones already kept
      const rank = { stop: 0, air: 1, trip: 2, off: 3 };
      const kept = [];
      marks.filter(m => m.label && m.label.style('display') !== 'none').sort((a, b) => rank[a.kind] - rank[b.kind]).forEach(m => {
        let bb; try { bb = m.label.node().getBBox(); } catch (e) { return; }
        if (!bb || !bb.width) return;
        // keep labels inside the map: nudge the main ones, hide the others
        const offX = bb.x < 2 ? 2 - bb.x : (bb.x + bb.width > W - 2 ? (W - 2) - (bb.x + bb.width) : 0);
        const offY = bb.y < 2 ? 2 - bb.y : (bb.y + bb.height > H - 2 ? (H - 2) - (bb.y + bb.height) : 0);
        if (offX || offY) {
          const inside = m.g.style('display') !== 'none';
          if (m.kind === 'stop' && inside && Math.abs(offX) < 160 && Math.abs(offY) < 40) {
            m.label.attr('x', +m.label.attr('x') + offX).attr('y', +m.label.attr('y') + offY);
            bb = { x: bb.x + offX, y: bb.y + offY, width: bb.width, height: bb.height };
          } else { m.label.style('display', 'none'); return; }
        }
        const hit = kept.some(o => bb.x < o.x + o.width + 2 && bb.x + bb.width + 2 > o.x && bb.y < o.y + o.height && bb.y + bb.height > o.y);
        if (hit && m.kind !== 'stop') m.label.style('display', 'none'); else kept.push(bb);
      });
      seaNames.forEach(s => {
        s.node.attr('x', t.applyX(s.x0)).attr('y', t.applyY(s.y0)).style('display', k >= s.min && k < s.max ? null : 'none');
        if (k >= s.min && k < s.max) { let bb; try { bb = s.node.node().getBBox(); } catch (e) { bb = null; } if (bb && (bb.x < 0 || bb.y < 0 || bb.x + bb.width > W || bb.y + bb.height > H || kept.some(o => bb.x < o.x + o.width && bb.x + bb.width > o.x && bb.y < o.y + o.height && bb.y + bb.height > o.y))) s.node.style('display', 'none'); }
      });
      gMap.attr('transform', t.toString());
    }
    const zoom = d3.zoom().scaleExtent([0.9, KMAX]).translateExtent([[-W * 0.15, -H * 0.15], [W * 1.15, H * 1.15]]).extent([[0, 0], [W, H]])
      .filter((ev) => (ev.type === 'wheel' ? (ev.ctrlKey || ev.metaKey) : true) && !ev.button)
      .on('zoom', (ev) => { if (ev.sourceEvent) MAPZ.user = true; MAPZ.t = ev.transform; place(ev.transform); updateZoomUi(ev.transform.k); });
    svg.call(zoom).on('dblclick.zoom', null);
    svg.on('dblclick', (ev) => { const [x, y] = d3.pointer(ev, svg.node()); svg.transition().duration(reduce ? 0 : 350).call(zoom.scaleBy, 2, [x, y]); });
    MAPZ.zoom = zoom; MAPZ.svg = svg;
    svg.call(zoom.transform, t0);
    place(t0);
    updateZoomUi(t0.k);
    if (MAPZ.wantView) { const v = MAPZ.wantView; MAPZ.wantView = null; frameView(v); }
    setHL(hl);
  }
  function updateZoomUi(k) {
    const near = (t) => t && Math.abs(k - t.k) / t.k < 0.04;
    const v = !MAPZ.user && near(MAPZ.routeT) ? 'route' : (MAPZ.frame && near(MAPZ.frame(VIEWS.kansai)) ? 'kansai' : (MAPZ.frame && near(MAPZ.frame(VIEWS.all)) ? 'all' : null));
    document.querySelectorAll('#viewseg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
    const tl = document.getElementById('maptitle');
    if (tl) tl.textContent = v === 'route' ? 'Il vostro percorso' : (v ? VIEWS[v].title : 'Zoom ×' + k.toFixed(1).replace('.', ','));
    const zm = document.getElementById('zminus'); if (zm) zm.disabled = k <= 0.95;
    const zp = document.getElementById('zplus'); if (zp) zp.disabled = k >= 39;
  }
  function setHL(name) {
    hl = name;
    document.querySelectorAll('#map .jp-stop').forEach(g => g.classList.toggle('on', g.getAttribute('data-city') === name));
    document.querySelectorAll('#route .jp-stopcard').forEach(c => c.classList.toggle('on', c.getAttribute('data-city') === name));
  }

  // ---------- route cards ----------
  function drawRoute() {
    const box = document.getElementById('route');
    box.textContent = '';
    if (D.tratte.status !== 'ok' || D.basi.status !== 'ok') { if ([D.tratte, D.basi].some(x => x.status === 'error')) fail(box); return; }
    if (!R) return;
    const A = accent();
    R.all.forEach(s => {
      const c = el('article', 'jp-stopcard'); c.setAttribute('data-city', s.base);
      c.addEventListener('mouseenter', () => setHL(s.base)); c.addEventListener('mouseleave', () => setHL(null));
      if (s.legIn) c.appendChild(el('div', 'leg', (s.from === 'Haneda' ? 'Atterraggio a Haneda, poi ' : 'Da ' + s.from + ': ') + 'treno ' + hrs(s.legIn.ore) + ' · ~' + yen(s.legIn.yen)));
      const hd = el('div', 'hd');
      const n = el('span', 'jp-num', String(s.ordine)); n.style.background = A; n.style.width = '1.7rem'; n.style.height = '1.7rem';
      hd.append(n, el('b', null, s.base));
      if (s.tipoNotte === 'ryokan') hd.appendChild(el('span', 'jp-tag', 'ryokan'));
      c.appendChild(hd);
      c.appendChild(el('div', 'dd', 'Giorni ' + s.dal + '–' + s.al + ' · ' + nn(s.nights)));
      const ul = el('ul');
      if (s.ordine === 1) ul.appendChild(el('li', null, 'Arrivo e prima serata'));
      s.city.forEach(it => { const li = el('li'); li.append(mark(el('b', null, it.nome), 'catalogo', 'nome', 'id=' + enc(it.id)), el('span', null, ' · ' + gg(it.gg) + ' in città')); ul.appendChild(li); });
      s.trips.forEach(it => { const li = el('li'); li.append(mark(el('b', null, it.nome), 'catalogo', 'nome', 'id=' + enc(it.id)), el('span', null, it.sulPosto ? ' · dormite lì' : ' · in giornata, ' + hrs(num(it.ore_tratta)) + ' a tratta')); ul.appendChild(li); });
      if (s.finale) ul.appendChild(el('li', null, 'Ultima serata a Tokyo'));
      if (ul.children.length) c.appendChild(ul);
      if (s.free >= 0.5) c.appendChild(el('div', 'free', (s.free === 0.5 ? 'Mezza giornata libera' : String(s.free).replace('.', ',') + ' giorni liberi')));
      if (s.zona) { const z = el('div', 'zona'); z.append(el('span', null, 'Dove dormire: '), mark(el('span', null, s.zona), 'basi', 'zona', 'base=' + enc(s.base))); z.lastChild.style.color = 'var(--color-fg)'; c.appendChild(z); }
      box.appendChild(c);
    });
    const end = el('div', 'jp-end');
    end.append(el('b', null, 'Giorno ' + (R.p.notti + 1) + ' · volo da ' + (R.airport === 'Kansai' ? 'Osaka Kansai' : 'Tokyo Haneda')));
    if (R.last) end.append(el('span', null, 'Da ' + R.all[R.all.length - 1].base + ': ' + hrs(R.last.ore) + ' · ~' + yen(R.last.yen)));
    box.appendChild(end);
  }

  // ---------- calendar ----------
  function drawCalendar() {
    const tb = document.querySelector('#caltab tbody'); tb.textContent = '';
    const cw = document.getElementById('calwarn'); cw.textContent = ''; cw.hidden = true;
    if (!R) return;
    const days = planDays(R);
    const flags = [];
    days.forEach(day => {
      const tr = el('tr');
      const dow = day.date.getUTCDay();
      if (dow === 0 || dow === 6) tr.classList.add('we');
      if (day.first) tr.classList.add('newbase');
      const td0 = el('td', 'n'); td0.append(el('b', null, fmtDate.format(day.date)), el('br'), 'Giorno ' + day.n);
      tr.appendChild(td0);
      const td1 = el('td'); td1.textContent = day.stop ? day.stop.base + (day.stop.tipoNotte === 'ryokan' ? ' (ryokan)' : '') : '—';
      tr.appendChild(td1);
      const td2 = el('td');
      if (day.travel) td2.appendChild(el('div', 'tr', day.travel));
      day.parts.forEach(pt => {
        const d = el('div', pt.kind === 'libero' ? 'lib' : null);
        d.textContent = (pt.kind === 'gita' ? 'Gita: ' : '') + pt.t + (day.parts.length > 1 && !pt.full && pt.kind !== 'libero' ? ' (mezza giornata)' : '');
        td2.appendChild(d);
      });
      tr.appendChild(td2);
      const td3 = el('td');
      const notes = notesFor(day);
      notes.forEach(nt => {
        const d = el('div');
        if (nt.kind === 'ev') { d.append(mark(el('span', 'jp-tag ev', nt.t), 'eventi', 'nome', nt.w)); d.append(' ', mark(el('span', null, nt.nota), 'eventi', 'nota', nt.w)); }
        else d.append(mark(el('span', 'jp-tag fo', nt.t), 'stagione', 'luogo', nt.w));
        td3.appendChild(d);
        if (nt.kind === 'ev' && day.travel && day.stop && !day.stop.finale && day.n > 1) flags.push(fmtDate.format(day.date) + ': spostamento durante "' + nt.t + '"');
      });
      tr.appendChild(td3);
      tb.appendChild(tr);
    });
    R.all.forEach(s => { if (s.overflow > 0) flags.push(s.base + ': manca ' + (s.overflow === 0.5 ? 'mezza giornata' : gg(s.overflow)) + ' per fare tutto, aggiungete una notte'); });
    if (flags.length) { cw.append(el('b', null, 'Da controllare. '), flags.join('; ') + '.'); cw.hidden = false; }
  }

  // ---------- compare ----------
  function routeFromSaved(r) {
    return { nome: r.nome, note: r.note, params: { sel: split(r.sel), notti: num(r.notti), ritorno: r.ritorno, partenza: r.partenza, pernotto: split(r.pernotto), giorni_citta: split(r.giorni_citta), giornata_citta: split(r.giornata_citta) } };
  }
  function drawCompare() {
    const tb = document.querySelector('#cmptab tbody'); tb.textContent = '';
    if (!R) return;
    const list = [];
    if (D.per.status === 'ok') D.per.data.forEach(r => list.push({ ...routeFromSaved(r), saved: true, w: 'nome=' + enc(r.nome) }));
    pinned.forEach((x, i) => list.push({ ...x, idx: i }));
    list.push({ nome: 'Percorso attuale', params: dash.params() || {}, current: true });
    const rows = list.map(x => ({ ...x, r: build(norm(x.params)) }));
    const best = (f, dir) => { const v = rows.map(x => f(x.r)); return dir === 'min' ? Math.min(...v) : Math.max(...v); };
    const bAll = best(r => r.all.length, 'min'), bOre = best(r => r.oreBagagli, 'min'), bFree = best(r => r.free, 'max'), bMete = best(r => r.items.length, 'max'), bCost = best(r => r.tot.min, 'min');
    const catName = new Map((D.cat.data || []).map(c => [c.id, c.nome]));
    rows.forEach(x => {
      const r = x.r;
      const tr = el('tr', x.current ? 'cur' : null);
      const td0 = el('td');
      td0.appendChild(x.saved ? mark(el('b', null, x.nome), 'percorsi', 'nome', x.w) : el('b', null, x.nome));
      td0.appendChild(el('div', 'jp-note', x.saved ? 'Salvato per tutti' : (x.current ? 'Quello che state costruendo' : 'Salvato su questo dispositivo')));
      td0.lastChild.style.margin = '0';
      tr.appendChild(td0);
      const cell = (txt, good) => { const td = el('td', good ? 'best' : null, txt); tr.appendChild(td); };
      cell(String(r.p.notti));
      cell(r.all.length + ' (' + r.cambi + (r.cambi === 1 ? ' cambio)' : ' cambi)'), rows.length > 1 && r.all.length === bAll);
      cell(hrs(r.oreBagagli), rows.length > 1 && r.oreBagagli === bOre);
      cell(String(r.free).replace('.', ','), rows.length > 1 && r.free === bFree);
      cell(String(r.items.length), rows.length > 1 && r.items.length === bMete);
      cell(eur(r.tot.min) + ' – ' + eur(r.tot.max), rows.length > 1 && r.tot.min === bCost);
      const tdm = el('td', 'mete'); tdm.textContent = r.items.map(i => catName.get(i.id) || i.id).join(', ') + (r.deficit ? ' · mancano ' + nn(r.deficit) : '');
      tr.appendChild(tdm);
      const tda = el('td'); const acts = el('span', 'acts');
      if (!x.current) {
        const open = el('button', 'jp-btn', 'Apri'); open.type = 'button';
        open.addEventListener('click', () => { setP(x.params); showTab('percorso', true); });
        acts.appendChild(open);
      }
      if (x.idx != null) {
        const rm = el('button', 'jp-link', 'Rimuovi'); rm.type = 'button';
        rm.addEventListener('click', () => { pinned.splice(x.idx, 1); savePinned(); render(); });
        acts.appendChild(rm);
      }
      tda.appendChild(acts); tr.appendChild(tda);
      tb.appendChild(tr);
    });
  }

  // ---------- budget ----------
  function drawBudget() {
    const k = document.getElementById('bkpis'); k.textContent = '';
    const bars = document.getElementById('bbars'); bars.textContent = '';
    const tb = document.querySelector('#btab tbody'); tb.textContent = '';
    const pt = document.querySelector('#ptab tbody'); pt.textContent = '';
    if (D.par.status !== 'ok') { if (D.par.status === 'error') fail(bars); }
    else D.par.data.forEach(r => {
      const tr = el('tr'); tr.setAttribute('data-key', r.id);
      [r.voce, nf.format(num(r.min)), nf.format(num(r.max)), r.unita, r.fonte].forEach(v => tr.appendChild(el('td', null, v)));
      pt.appendChild(tr);
    });
    if (!R) return;
    kpi(k, 'A persona', eur(R.tot.min), 'fino a ' + eur(R.tot.max));
    kpi(k, 'In 5 persone', eur(R.tot.min * 5), 'fino a ' + eur(R.tot.max * 5));
    kpi(k, 'Al giorno a persona', eur(R.tot.min / R.G), 'fino a ' + eur(R.tot.max / R.G));
    kpi(k, 'Viaggio', nn(R.p.notti), R.all.length + ' alloggi');
    const mx = d3.max(R.cost, c => c.max) || 1;
    R.cost.forEach(c => {
      const row = el('div', 'jp-bar');
      row.appendChild(el('span', null, c.cat));
      const tr = el('div', 'track');
      const rg = el('div', 'rng'); rg.style.left = '0'; rg.style.width = (c.max / mx * 100) + '%';
      const lo = el('div', 'lo'); lo.style.left = '0'; lo.style.width = Math.max(0.6, c.min / mx * 100) + '%';
      tr.append(rg, lo); row.appendChild(tr);
      row.appendChild(el('span', 'val', Math.round(c.min) === Math.round(c.max) ? eur(c.min) : eur(c.min) + ' – ' + eur(c.max)));
      bars.appendChild(row);
    });
    R.cost.forEach(c => { const tr = el('tr'); [c.cat, eur(c.min), eur(c.max), eur(c.min * 5), eur(c.max * 5), c.how].forEach(v => tr.appendChild(el('td', null, v))); tb.appendChild(tr); });
    const tr = el('tr'); tr.style.fontWeight = '600';
    ['Totale', eur(R.tot.min), eur(R.tot.max), eur(R.tot.min * 5), eur(R.tot.max * 5), 'Shopping e souvenir esclusi'].forEach(v => tr.appendChild(el('td', null, v)));
    tb.appendChild(tr);
  }

  // ---------- logistica ----------
  function drawInfo() {
    const box = document.getElementById('info');
    box.textContent = '';
    const inf = D.inf;
    if (inf.status !== 'ok') { const c = el('div', 'jp-card'); if (inf.status === 'error') fail(c); else c.classList.add('dash-skeleton'); box.appendChild(c); return; }
    d3.group(inf.data, r => r.sezione).forEach((items, sez) => {
      const c = el('div', 'jp-card');
      c.appendChild(el('h3', null, sez));
      const dl = el('dl');
      items.forEach(r => {
        const w = 'voce=' + enc(r.voce);
        dl.appendChild(mark(el('dt', null, r.voce), 'info', 'voce', w));
        const dd = el('dd');
        dd.appendChild(mark(el('span', null, r.valore), 'info', 'valore', w));
        dd.appendChild(mark(el('small', null, r.fonte), 'info', 'fonte', w));
        dl.appendChild(dd);
      });
      c.appendChild(dl);
      box.appendChild(c);
    });
  }

  // ---------- render ----------
  function render() {
    if (!D) return;
    root.style.setProperty('--jp-accent', accent());
    const ready = ['cat', 'basi', 'tratte', 'par'].every(k => D[k].status === 'ok');
    R = ready ? build(P()) : null;
    drawTakeaway();
    drawControls();
    if (tab === 'percorso') { drawPicker(); drawKpis(); drawMap(); drawRoute(); }
    if (tab === 'calendario') drawCalendar();
    if (tab === 'confronto') drawCompare();
    if (tab === 'budget') drawBudget();
    if (tab === 'logistica') drawInfo();
  }

  dash.onData(() => {
    D = { cat: dash.data('catalogo'), basi: dash.data('basi'), tratte: dash.data('tratte'), par: dash.data('parametri'),
      jp: dash.data('giappone'), ct: dash.data('citta'), inf: dash.data('info'), ev: dash.data('eventi'), st: dash.data('stagione'), per: dash.data('percorsi') };
    render();
  });

  const named = location.hash.slice(1);
  if (named && document.getElementById(named) && document.getElementById(named).classList.contains('jp-pane')) showTab(named, false);
})();
