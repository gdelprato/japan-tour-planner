/* Japan Tour Planner: interfaccia (percorso, calendario, confronto, budget, info).
   Il calcolo vive nel motore app/js/engine (ADR-006); qui si disegna e si reagisce ai comandi. */
import {
  num, yes, split, isoDay, DAY, nf, eur, yen, nn, gg, hrs, fmtDate,
  NMIN, NMAX, PMAX, norm, dayOf, parametriMap, during, planDays,
  build as buildPercorso, notesFor as noteDelGiorno, avvisi,
} from './engine/index.js';

(function () {
  const root = document.getElementById('jproot');
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const fail = (box) => { box.textContent = ''; box.appendChild(el('div', 'jp-fail', 'Impossibile caricare i dati')); };
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const accent = () => dash.colors[0];

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

  // ---------- side panel tabs ----------
  document.querySelectorAll('.side-tab').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.side-tab').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    ['mete', 'tappe'].forEach(k => { const e = document.getElementById('side-' + k); if (e) e.hidden = b.dataset.side !== k; });
  }));

  // ---------- settings sheet ----------
  const sheet = document.getElementById('settings'), scrim = document.getElementById('scrim'), openBtn = document.getElementById('opensettings');
  const setSheet = (open) => {
    if (!sheet) return;
    sheet.hidden = !open; if (scrim) scrim.hidden = !open;
    if (openBtn) openBtn.setAttribute('aria-expanded', String(open));
    if (open) { const f = sheet.querySelector('input'); if (f) f.focus(); } else if (openBtn) openBtn.focus();
  };
  if (openBtn) openBtn.addEventListener('click', () => setSheet(sheet.hidden));
  const closeBtn = document.getElementById('closesettings'); if (closeBtn) closeBtn.addEventListener('click', () => setSheet(false));
  if (scrim) scrim.addEventListener('click', () => setSheet(false));
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && sheet && !sheet.hidden) setSheet(false); });

  // ---------- tabs ----------
  const tabs = Array.from(document.querySelectorAll('.jp-tab'));
  function showTab(name, push) {
    if (!document.getElementById(name)) return;
    tab = name;
    tabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
    document.querySelectorAll('.jp-pane').forEach(p => { p.hidden = p.id !== name; });
    if (push) { dash.setLink(name); window.scrollTo({ top: 0 }); }
    if (name === 'percorso') animateNext = true;
    render();
  }
  tabs.forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab, true)));

  // ---------- params ----------
  // la data proposta cambia col passare dei giorni: la si fissa prima di condividere o salvare
  const fixDate = () => { if (!(dash.params() || {}).partenza) dash.setParams({ partenza: P().partenza }); };
  const P = () => norm(dash.params() || {});
  const setP = (o) => { animateNext = true; dash.setParams(o); };
  const setDays = (it, v) => { const p = P(); const rest = p.gc.filter(s => String(s).split(':')[0] !== it.id); setP({ giorni_citta: v === num(it.giorni) ? rest : rest.concat([it.id + ':' + v]) }); };
  const toggleSel = (id) => {
    const p = P(); const s = new Set(p.sel);
    if (s.has(id)) { s.delete(id); setP({ sel: Array.from(s), pernotto: p.pernotto.filter(x => x !== id), giornata_citta: p.gcit.filter(x => x !== id) }); }
    else { s.add(id); setP({ sel: Array.from(s) }); }
  };
  const toggleList = (key, list, id) => { const s = new Set(list); if (s.has(id)) s.delete(id); else s.add(id); setP({ [key]: Array.from(s) }); };
  document.getElementById('nminus').addEventListener('click', () => { const n = P().notti; if (n > NMIN) setP({ notti: n - 1 }); });
  document.getElementById('nplus').addEventListener('click', () => { const n = P().notti; if (n < NMAX) setP({ notti: n + 1 }); });
  const nval = document.getElementById('nval');
  nval.addEventListener('change', () => { const n = Math.round(Number(nval.value)); if (n) setP({ notti: Math.min(NMAX, Math.max(NMIN, n)) }); else nval.value = P().notti; });
  document.getElementById('pminus').addEventListener('click', () => { const n = P().persone; if (n > 1) setP({ persone: n - 1 }); });
  document.getElementById('pplus').addEventListener('click', () => { const n = P().persone; if (n < PMAX) setP({ persone: n + 1 }); });
  document.querySelectorAll('#arrseg button').forEach(b => b.addEventListener('click', () => setP({ arrivo: b.dataset.arr })));
  document.querySelectorAll('#retseg button').forEach(b => b.addEventListener('click', () => setP({ ritorno: b.dataset.rit })));
  document.querySelectorAll('#stileseg button').forEach(b => b.addEventListener('click', () => setP({ stile: b.dataset.stile })));
  document.querySelectorAll('#bagseg button').forEach(b => b.addEventListener('click', () => setP({ bagagli: b.dataset.bag })));
  document.querySelectorAll('#oraarrseg button').forEach(b => b.addEventListener('click', () => setP({ ora_arrivo: b.dataset.ora })));
  document.querySelectorAll('#orarSeg button').forEach(b => b.addEventListener('click', () => setP({ ora_ritorno: b.dataset.ora })));
  const cambioIn = document.getElementById('cambio');
  cambioIn.addEventListener('change', () => { const v = Number(String(cambioIn.value).replace(',', '.')); setP({ cambio: v > 0 ? v : null }); });
  const daSel = document.getElementById('da');
  daSel.addEventListener('change', () => setP({ da: daSel.value }));
  document.getElementById('reset').addEventListener('click', () => { animateNext = true; dash.resetParams(); });
  const arrivo = document.getElementById('arrivo');
  arrivo.min = isoDay(Date.now()); arrivo.max = isoDay(Date.now() + 730 * DAY);
  arrivo.addEventListener('change', () => { if (arrivo.value && arrivo.validity.valid) setP({ partenza: arrivo.value }); });
  arrivo.addEventListener('blur', () => { arrivo.value = P().partenza; });
  document.querySelectorAll('#viewseg button').forEach(b => b.addEventListener('click', () => { view = b.dataset.view; frameView(view); }));
  const regSel = document.getElementById('regsel');
  regSel.addEventListener('change', () => { if (regSel.value) { view = regSel.value; frameView(view); } });
  const zoomBy = (f) => { MAPZ.user = true; if (MAPZ.svg && MAPZ.zoom) MAPZ.svg.transition().duration(reduce ? 0 : 300).call(MAPZ.zoom.scaleBy, f); };
  document.getElementById('zplus').addEventListener('click', () => zoomBy(1.8));
  document.getElementById('zminus').addEventListener('click', () => zoomBy(1 / 1.8));
  const shareBtn = document.getElementById('sharebtn');
  if (shareBtn) shareBtn.addEventListener('click', async () => {
    fixDate();
    const url = dash.shareUrl();
    let ok = false;
    try { await navigator.clipboard.writeText(url); ok = true; } catch (e) { ok = false; }
    if (!ok && navigator.share) { try { await navigator.share({ title: 'Japan Tour Planner', url }); ok = true; } catch (e) { /* annullato */ } }
    const lab = document.getElementById('sharelabel') || shareBtn;
    if (!ok) window.prompt('Copiate questo link e mandatelo agli altri:', url);
    lab.textContent = ok ? 'Link copiato' : 'Copia link';
    setTimeout(() => { lab.textContent = 'Copia link'; }, 1800);
  });
  const saveBtn = document.getElementById('savebtn'), saveName = document.getElementById('savename');
  saveBtn.addEventListener('click', () => {
    fixDate();
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
  // il motore (app/js/engine) riceve i dataset come argomento: qui li prende da D
  const dati = () => ({ catalogo: D.cat.data || [], basi: D.basi.data || [], tratte: D.tratte.data || [], parametri: D.par.data || [], partenze: D.dep.data || [], eventi: D.ev.data || [], stagione: D.st.data || [] });
  const par = () => parametriMap(D.par.data);
  const build = (p) => buildPercorso(p, dati());

  // ---------- day by day ----------
  const notesFor = (day) => noteDelGiorno(day, dati());

  // ---------- header ----------
  function drawTakeaway() {
    const p = document.getElementById('takeaway');
    p.textContent = '';
    if (!R) return;
    const a = Date.parse(R.p.partenza + 'T00:00:00Z');
    const z = a + R.p.notti * DAY;
    const f = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: new Date(a).getUTCFullYear() !== new Date(z).getUTCFullYear() ? 'numeric' : undefined, timeZone: 'UTC' });
    const chip = (t, cls) => p.appendChild(el('span', 'chip' + (cls ? ' ' + cls : ''), t));
    chip(f.format(new Date(a)) + ' – ' + f.format(new Date(z)));
    chip(nn(R.p.notti));
    chip(R.p.persone + (R.p.persone === 1 ? ' persona' : ' persone'));
    chip(R.all.length + ' alloggi');
    chip(R.items.length + ' mete');
    if (R.deficit > 0) chip('mancano ' + nn(R.deficit), 'alert');
    chip(eur(R.tot.min) + '–' + eur(R.tot.max) + ' a testa', 'strong');
  }

  // ---------- controls ----------
  function drawControls() {
    const p = P();
    if (nval !== document.activeElement) nval.value = p.notti;
    document.getElementById('nminus').disabled = p.notti <= NMIN;
    document.getElementById('nplus').disabled = p.notti >= NMAX;
    document.getElementById('pval').textContent = p.persone;
    document.getElementById('pminus').disabled = p.persone <= 1;
    document.getElementById('pplus').disabled = p.persone >= PMAX;
    document.querySelectorAll('#arrseg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.arr === p.arrivo)));
    document.querySelectorAll('#retseg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.rit === p.ritorno)));
    document.querySelectorAll('#stileseg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.stile === p.stile)));
    document.querySelectorAll('#bagseg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.bag === p.bagagli)));
    document.querySelectorAll('#oraarrseg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ora === p.oraArrivo)));
    document.querySelectorAll('#orarSeg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ora === p.oraRitorno)));
    const deps = D.dep.data || [];
    if (daSel.options.length !== deps.length) { daSel.textContent = ''; deps.forEach(d => { const o = el('option', null, d.nome); o.value = d.id; daSel.appendChild(o); }); }
    daSel.value = deps.some(d => d.id === p.da) ? p.da : (deps[0] || {}).id || '';
    if (arrivo !== document.activeElement) arrivo.value = p.partenza;
  }

  // ---------- picker ----------
  function drawPicker() {
    const box = document.getElementById('picker');
    box.textContent = '';
    if (D.cat.status !== 'ok') { if (D.cat.status === 'error') fail(box); else box.classList.add('jp-skeleton'); return; }
    box.classList.remove('jp-skeleton');
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
        const on = sel.has(it.id);
        const row = el('div', 'jp-item' + (on ? ' on' : ''));
        row.addEventListener('mouseenter', () => setHL(split(it.luoghi)[0]));
        row.addEventListener('mouseleave', () => setHL(null));
        const cb = el('input'); cb.type = 'checkbox'; cb.id = 'cb-' + it.id; cb.checked = on;
        cb.addEventListener('change', () => toggleSel(it.id));
        const lab = el('label'); lab.htmlFor = cb.id;
        lab.appendChild(el('span', null, it.nome));
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
          if (d !== num(it.giorni)) m.append(' · consigliati ', el('span', null, String(num(it.giorni))));
        } else {
          m.append(el('span', null, gg(num(it.giorni))));
          const b = where.get(it.id);
          const sulPosto = yes(it.notte_possibile) && pern.has(it.id) && on;
          if (sulPosto) m.append(' · dormite lì');
          else m.append(' · ', el('span', null, hrs(num(it.ore_tratta))), ' di viaggio da ' + (on && b ? b : split(it.basi)[0]));
        }
        row.appendChild(m);
        row.appendChild(el('div', 'x', it.descrizione));
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
  const warnings = (r) => avvisi(r, dati());
  function drawKpis() {
    const box = document.getElementById('kpis'); box.textContent = '';
    if (!R) { for (let i = 0; i < 5; i++) box.appendChild(el('div', 'jp-kpibox jp-skeleton')); return; }
    kpi(box, 'Notti', String(R.p.notti), (R.p.notti + 1) + ' giorni');
    kpi(box, 'Alloggi', String(R.all.length), R.cambi + (R.cambi === 1 ? ' cambio' : ' cambi'));
    kpi(box, 'Treno tra le basi', hrs(R.oreBagagli), R.p.bagagli === 'valigia' ? 'con i bagagli' : 'bagagli spediti');
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
  // una vista per regione del catalogo, inquadrata sulle sue mete
  function regionViews() {
    if (VIEWS.regReady || D.cat.status !== 'ok' || D.ct.status !== 'ok') return;
    const pos = new Map(D.ct.data.map(c => [c.luogo, c]));
    d3.group(D.cat.data, c => c.regione).forEach((items, reg) => {
      const pts = items.flatMap(i => split(i.luoghi)).map(l => pos.get(l)).filter(Boolean);
      if (!pts.length) return;
      const lon = d3.extent(pts, q => Number(q.lon)), lat = d3.extent(pts, q => Number(q.lat));
      const pl = Math.max(0.25, (0.8 - (lon[1] - lon[0])) / 2), pa = Math.max(0.2, (0.6 - (lat[1] - lat[0])) / 2);
      VIEWS['r:' + reg] = { lon0: lon[0] - pl, lon1: lon[1] + pl, lat0: lat[0] - pa, lat1: lat[1] + pa, title: reg, reg: true };
    });
    regSel.length = 1;
    Object.keys(VIEWS).filter(k => VIEWS[k].reg).forEach(k => { const o = el('option', null, VIEWS[k].title); o.value = k; regSel.appendChild(o); });
    VIEWS.regReady = true;
  }
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
      if ([jp, ct].some(x => x.status === 'error')) { box.classList.remove('jp-skeleton'); fail(box); }
      return;
    }
    box.classList.remove('jp-skeleton');
    const W = Math.max(300, box.clientWidth || 700);
    if (MAPZ.w && MAPZ.w !== W) MAPZ.t = null;
    MAPZ.w = W;
    const vw = VIEWS.all;
    regionViews();
    const mx = (lon) => lon * Math.PI / 180;
    const my = (lat) => -Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
    const pad = 10;
    const H = Math.round(box.clientHeight > 200 ? box.clientHeight : Math.min(Math.max(W * 0.66, 340), 660));
    if (MAPZ.h && MAPZ.h !== H) MAPZ.t = null;
    MAPZ.h = H;
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
    [R.A0.air, R.airport].forEach(addPt);
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
    const firstP = PT(R.A0.air), lastAir = PT(R.airport);
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
        else if (kind === 'air') tip.append('div').attr('class', 't').text(p.luogo === R.airport && p.luogo === R.A0.air ? 'Aeroporto di arrivo e ritorno' : p.luogo === R.airport ? 'Aeroporto di ritorno' : (p.luogo === R.A0.air ? 'Aeroporto di arrivo' : 'Aeroporto'));
        if (it && kind !== 'air') { tip.append('div').attr('class', 't').text(it.descrizione); tip.append('div').text(sel.has(it.id) ? 'Clic per toglierla' : 'Clic per aggiungerla'); }
        const tw = tip.node().offsetWidth;
        tip.style('left', Math.min(Math.max(0, px + 12), box.clientWidth - tw) + 'px').style('top', (py + 14) + 'px');
        setHL(p.luogo);
      }).on('mouseleave', () => { tip.style('opacity', 0); setHL(null); });
      const major = kind === 'stop';
      let label = null;
      if (!(kind === 'air' && p.luogo !== R.airport && p.luogo !== R.A0.air)) {
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
    MAPZ.focus = (name) => {
      const pl = byName.get(name); if (!pl) return;
      const k = Math.max(MAPZ.t ? MAPZ.t.k : 1, 7);
      MAPZ.user = true;
      svg.transition().duration(reduce ? 0 : 600).call(zoom.transform, d3.zoomIdentity.translate(W / 2, H / 2).scale(k).translate(-pl.x0, -pl.y0));
    };
    svg.call(zoom.transform, t0);
    place(t0);
    updateZoomUi(t0.k);
    if (MAPZ.wantView) { const v = MAPZ.wantView; MAPZ.wantView = null; frameView(v); }
    setHL(hl);
  }
  function updateZoomUi(k) {
    const cur = MAPZ.t || { x: 0, y: 0 };
    const near = (t) => t && Math.abs(k - t.k) / t.k < 0.04 && Math.abs(cur.x - t.x) < 24 && Math.abs(cur.y - t.y) < 24;
    const keys = Object.keys(VIEWS).filter(n => VIEWS[n].title && n !== 'kansai');
    const v = (!MAPZ.user && near(MAPZ.routeT) ? 'route' : (MAPZ.frame ? keys.find(n => near(MAPZ.frame(VIEWS[n]))) : null)) || null;
    document.querySelectorAll('#viewseg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
    regSel.value = v && VIEWS[v] && VIEWS[v].reg ? v : '';
    const tl = document.getElementById('maptitle');
    if (tl) tl.textContent = v === 'route' ? 'Il vostro percorso' : (v ? VIEWS[v].title : 'Zoom ×' + k.toFixed(1).replace('.', ','));
    const zm = document.getElementById('zminus'); if (zm) zm.disabled = k <= 0.95;
    const zp = document.getElementById('zplus'); if (zp) zp.disabled = k >= 39;
  }
  function setHL(name) {
    hl = name;
    document.querySelectorAll('#map .jp-stop').forEach(g => g.classList.toggle('on', g.getAttribute('data-city') === name));
    document.querySelectorAll('#route .jp-stopcard').forEach(c => c.classList.toggle('on', c.getAttribute('data-city') === name));
    document.querySelectorAll('#line .st').forEach(c => c.classList.toggle('on', c.getAttribute('data-city') === name));
  }

  // ---------- the route as a railway line ----------
  function drawLine() {
    const box = document.getElementById('line');
    if (!box) return;
    box.textContent = '';
    if (!R) return;
    const track = el('div', 'line-track');
    const station = (cls, num, code, name, subs, city) => {
      const s = el('button', 'st' + (cls ? ' ' + cls : '')); s.type = 'button';
      if (city) s.setAttribute('data-city', city);
      s.append(el('span', 'dot', num), el('span', 'code', code), el('span', 'nm', name));
      subs.forEach(t => s.appendChild(el('span', 'sub', t)));
      s.addEventListener('mouseenter', () => setHL(city));
      s.addEventListener('mouseleave', () => setHL(null));
      s.addEventListener('click', () => { if (MAPZ.focus) MAPZ.focus(city); });
      return s;
    };
    const seg = (leg, cls) => { const d = el('div', 'seg' + (cls ? ' ' + cls : '')); if (leg) d.appendChild(el('span', 't', hrs(leg.ore))); return d; };
    track.appendChild(station('air', '✈', R.A0.code, R.A0.air, ['Giorno 1', 'Arrivo'], R.A0.air));
    R.all.forEach((s, i) => {
      track.appendChild(seg(s.legIn, i === 0 ? 'air' : null));
      const trips = s.trips.filter(t => !t.sulPosto).length;
      track.appendChild(station(null, String(s.ordine), 'JT' + String(s.ordine).padStart(2, '0'), s.base,
        ['Giorni ' + s.dal + '–' + s.al, nn(s.nights) + (trips ? ' · ' + trips + (trips === 1 ? ' gita' : ' gite') : '')], s.base));
    });
    track.appendChild(seg(R.last, 'air'));
    track.appendChild(station('air', '✈', R.A1.code, R.A1.air, ['Giorno ' + (R.p.notti + 1), 'Volo di ritorno'], R.airport));
    box.appendChild(track);
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
      if (s.legIn) {
        const lg = el('div', 'leg', (s.from === R.A0.air ? 'Atterraggio a ' + R.A0.air + ', poi ' : 'Da ' + s.from + ': ') + (s.legIn.volo ? 'volo o treno ' : 'treno ') + hrs(s.legIn.ore) + ' · ~' + yen(s.legIn.yen));
        if (s.legIn.stima) { lg.append(' '); lg.appendChild(el('span', 'jp-tag', 'stima')); }
        c.appendChild(lg);
      }
      const hd = el('div', 'hd');
      const n = el('span', 'jp-num', String(s.ordine)); n.style.background = A; n.style.width = '1.7rem'; n.style.height = '1.7rem';
      hd.append(n, el('b', null, s.base));
      if (s.tipoNotte === 'ryokan') hd.appendChild(el('span', 'jp-tag', 'ryokan'));
      c.appendChild(hd);
      c.appendChild(el('div', 'dd', 'Giorni ' + s.dal + '–' + s.al + ' · ' + nn(s.nights)));
      const ul = el('ul');
      if (s.ordine === 1) ul.appendChild(el('li', null, R.p.oraArrivo === 'mattina' ? 'Arrivo al mattino' : 'Arrivo e prima serata'));
      s.city.forEach(it => { const li = el('li'); li.append(el('b', null, it.nome), el('span', null, ' · ' + gg(it.gg) + ' in città')); ul.appendChild(li); });
      s.trips.forEach(it => { const li = el('li'); li.append(el('b', null, it.nome), el('span', null, it.sulPosto ? ' · dormite lì' : ' · in giornata, ' + hrs(num(it.ore_tratta)) + ' a tratta')); ul.appendChild(li); });
      if (s.finale) ul.appendChild(el('li', null, 'Ultima serata a ' + s.base));
      if (ul.children.length) c.appendChild(ul);
      if (s.free >= 0.5) c.appendChild(el('div', 'free', (s.free === 0.5 ? 'Mezza giornata libera' : String(s.free).replace('.', ',') + ' giorni liberi')));
      if (s.zona) { const z = el('div', 'zona'); z.append(el('span', null, 'Dove dormire: '), el('span', null, s.zona)); z.lastChild.style.color = 'var(--color-fg)'; c.appendChild(z); }
      box.appendChild(c);
    });
    const end = el('div', 'jp-end');
    end.append(el('b', null, 'Giorno ' + (R.p.notti + 1) + ' · volo da ' + R.A1.nome));
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
        if (nt.kind === 'ev') { d.append(el('span', 'jp-tag ev', nt.t)); d.append(' ', el('span', null, nt.nota)); }
        else d.append(el('span', 'jp-tag ' + nt.kind, nt.t));
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
    // un modello porta solo il percorso: date, viaggiatori, partenza e stile restano quelli scelti
    const params = { sel: split(r.sel), notti: num(r.notti), arrivo: r.arrivo, ritorno: r.ritorno, pernotto: split(r.pernotto), giorni_citta: split(r.giorni_citta), giornata_citta: split(r.giornata_citta) };
    Object.keys(params).forEach(k => { if (params[k] == null) delete params[k]; });
    return { nome: r.nome, note: r.note, params };
  }
  function drawCompare() {
    const tb = document.querySelector('#cmptab tbody'); tb.textContent = '';
    if (!R) return;
    const list = [];
    if (D.per.status === 'ok') D.per.data.forEach(r => list.push({ ...routeFromSaved(r), saved: true }));
    pinned.forEach((x, i) => list.push({ ...x, idx: i }));
    list.push({ nome: 'Percorso attuale', params: dash.params() || {}, current: true });
    const rows = list.map(x => ({ ...x, r: build(norm(Object.assign({}, dash.params(), x.params))) }));
    const best = (f, dir) => { const v = rows.map(x => f(x.r)); return dir === 'min' ? Math.min(...v) : Math.max(...v); };
    const bAll = best(r => r.all.length, 'min'), bOre = best(r => r.oreBagagli, 'min'), bFree = best(r => r.free, 'max'), bMete = best(r => r.items.length, 'max'), bCost = best(r => r.tot.min, 'min');
    const catName = new Map((D.cat.data || []).map(c => [c.id, c.nome]));
    rows.forEach(x => {
      const r = x.r;
      const tr = el('tr', x.current ? 'cur' : null);
      const td0 = el('td');
      td0.appendChild(x.saved ? el('b', null, x.nome) : el('b', null, x.nome));
      td0.appendChild(el('div', 'jp-note', x.saved ? (x.note || 'Modello di viaggio') : (x.current ? 'Quello che state costruendo' : 'Salvato su questo dispositivo')));
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
      const tr = el('tr');
      [r.voce, nf.format(num(r.min)), nf.format(num(r.max)), r.unita, r.fonte].forEach(v => tr.appendChild(el('td', null, v)));
      pt.appendChild(tr);
    });
    if (!R) return;
    const N = R.p.persone;
    const base = (par().get('cambio') || { min: 176 }).min;
    if (cambioIn !== document.activeElement) cambioIn.value = R.rate;
    const cr = (D.par.data || []).find(x => x.id === 'cambio');
    document.getElementById('cambionote').textContent = R.p.cambio ? 'scelto da voi (stima dell\'app: ' + base + ')' : 'stima dell\'app' + (cr && cr.fonte ? ', ' + cr.fonte : '') + ': cambiatelo con quello del giorno';
    const dtr = el('tr');
    ['Volo da ' + R.dep.nome + ' andata e ritorno, bassa stagione', nf.format(num(R.dep.min)), nf.format(num(R.dep.max)), 'eur', 'Stima: ' + (R.dep.nota || '')].forEach(v => dtr.appendChild(el('td', null, v)));
    pt.insertBefore(dtr, pt.firstChild);
    const th = document.querySelectorAll('#btab thead th');
    th[3].textContent = 'Min in ' + N; th[4].textContent = 'Max in ' + N;
    kpi(k, 'A persona', eur(R.tot.min), 'fino a ' + eur(R.tot.max));
    kpi(k, N === 1 ? 'Da soli' : 'In ' + N + ' persone', eur(R.tot.min * N), 'fino a ' + eur(R.tot.max * N));
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
    R.cost.forEach(c => { const tr = el('tr'); [c.cat, eur(c.min), eur(c.max), eur(c.min * N), eur(c.max * N), c.how].forEach(v => tr.appendChild(el('td', null, v))); tb.appendChild(tr); });
    const tr = el('tr'); tr.style.fontWeight = '600';
    ['Totale', eur(R.tot.min), eur(R.tot.max), eur(R.tot.min * N), eur(R.tot.max * N), 'Shopping e souvenir esclusi'].forEach(v => tr.appendChild(el('td', null, v)));
    tb.appendChild(tr);
  }

  // ---------- logistica ----------
  function drawInfo() {
    const box = document.getElementById('info');
    box.textContent = '';
    const inf = D.inf;
    if (inf.status !== 'ok') { const c = el('div', 'jp-card'); if (inf.status === 'error') fail(c); else c.classList.add('jp-skeleton'); box.appendChild(c); return; }
    if (R) box.appendChild(tripCard(R));
    d3.group(inf.data, r => r.sezione).forEach((items, sez) => {
      const c = el('div', 'jp-card');
      c.appendChild(el('h3', null, sez));
      const dl = el('dl');
      items.forEach(r => {
        dl.appendChild(el('dt', null, r.voce));
        const dd = el('dd');
        dd.appendChild(el('span', null, r.valore));
        dd.appendChild(el('small', null, r.fonte));
        dl.appendChild(dd);
      });
      c.appendChild(dl);
      box.appendChild(c);
    });
  }

  // scadenze e avvisi calcolati dalla data di arrivo del percorso
  function tripCard(r) {
    const c = el('div', 'jp-card');
    c.appendChild(el('h3', null, 'Per il vostro viaggio'));
    const start = Date.parse(r.p.partenza + 'T00:00:00Z'), now = Date.now();
    const mf = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const df = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    const back = (months) => { const d = new Date(start); d.setUTCMonth(d.getUTCMonth() - months); return d; };
    const from = (d) => d.getTime() <= now ? 'da subito' : 'da ' + mf.format(d);
    const span = (a, b) => b.getTime() <= now ? 'il prima possibile' : (a.getTime() <= now ? 'da subito, entro ' + mf.format(b) : 'tra ' + mf.format(a) + ' e ' + mf.format(b));
    const alta = during((D.ev.data || []).filter(e => yes(e.voli_alta)), r.p);
    const rows = [
      ['Arrivo', df.format(new Date(start)) + ', ' + nn(r.p.notti) + ', ' + r.p.persone + (r.p.persone === 1 ? ' persona' : ' persone')],
      ['Avvisi di prezzo sui voli', from(back(11)) + ', da ' + r.dep.nome + (r.dep.nota ? ' (' + r.dep.nota.charAt(0).toLowerCase() + r.dep.nota.slice(1) + ')' : '')],
      ['Prenotare i voli', alta.length ? span(back(7), back(5)) + ': il viaggio cade in alta stagione' : span(back(5), back(3))],
      ['Prenotare gli alloggi', span(back(6), back(3)) + (r.all.some(s => s.tipoNotte === 'ryokan') ? ', prima i ryokan' : '')],
      ['Posti sugli Shinkansen', 'Si prenotano da un mese prima: ' + from(back(1))]
    ];
    const busy = during((D.ev.data || []).filter(e => !e.luogo), r.p);
    if (busy.length) rows.push(['Periodi affollati', busy.map(e => e.nome).join(', ')]);
    const clima = during((D.st.data || []).filter(s => s.tipo === 'clima'), r.p);
    if (clima.length) rows.push(['Clima', clima.map(s => s.nome + ': ' + s.nota).join('. ')]);
    if (r.p.persone >= 5) rows.push(['Taxi', 'In ' + r.p.persone + ' servono due auto o un taxi grande']);
    const dl = el('dl');
    rows.forEach(([k, v]) => { dl.appendChild(el('dt', null, k)); dl.appendChild(el('dd', null, v)); });
    c.appendChild(dl);
    return c;
  }

  // ---------- render ----------
  function render() {
    if (!D) return;
    root.style.setProperty('--jp-accent', accent());
    const ready = ['cat', 'basi', 'tratte', 'par', 'dep'].every(k => D[k].status === 'ok');
    R = ready ? build(P()) : null;
    drawTakeaway();
    drawControls();
    if (tab === 'percorso') { drawPicker(); drawKpis(); drawMap(); drawLine(); drawRoute(); }
    if (tab === 'calendario') drawCalendar();
    if (tab === 'confronto') drawCompare();
    if (tab === 'budget') drawBudget();
    if (tab === 'logistica') drawInfo();
  }

  dash.onData(() => {
    D = { cat: dash.data('catalogo'), basi: dash.data('basi'), tratte: dash.data('tratte'), par: dash.data('parametri'),
      jp: dash.data('giappone'), ct: dash.data('citta'), inf: dash.data('info'), ev: dash.data('eventi'), st: dash.data('stagione'), per: dash.data('percorsi'), dep: dash.data('partenze') };
    render();
  });

  const named = location.hash.slice(1);
  if (named && document.getElementById(named) && document.getElementById(named).classList.contains('jp-pane')) showTab(named, false);
})();
