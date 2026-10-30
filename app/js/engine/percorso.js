/* Costruzione del percorso: dalle mete scelte a basi, notti, ordine delle tappe e costi.
   `dati` = { catalogo, basi, tratte, parametri, partenze, eventi } (array dei JSON di app/data).
   Il risultato R è la base di tutto quello che l'app mostra. */
import { num, split, sum, yes } from './util.js';
import { yen } from './formato.js';
import { AIR, LONG_LEG, STILI } from './costanti.js';
import { dayOf, parametriMap } from './parametri.js';
import { order, shortest } from './grafo.js';
import { during } from './calendario.js';

export function build(p, dati) {
  const cat = dati.catalogo || [],
    basi = dati.basi || [],
    tratte = dati.tratte || [],
    pm = parametriMap(dati.parametri);
  const sel = new Set(p.sel),
    pern = new Set(p.pernotto),
    gcit = new Set(p.gcit);
  const bInfo = new Map(basi.map((b) => [b.base, { ordine: num(b.ordine), prio: num(b.priorita_extra), zona: b.zona }]));
  const bases = new Map();
  const ensure = (name) => {
    if (!bases.has(name)) bases.set(name, { base: name, need: 0, city: [], trips: [], own: false, tipoNotte: 'hotel' });
    return bases.get(name);
  };
  const A0 = AIR[p.arrivo],
    A1 = AIR[p.ritorno],
    roundTrip = p.arrivo === p.ritorno;
  ensure(A0.city);
  const items = cat.filter((c) => sel.has(c.id));
  const overnight = (i) => yes(i.notte_possibile) && pern.has(i.id);
  const dayCity = (i) => i.tipo === 'citta' && i.basi_giornata && gcit.has(i.id);
  // 1. mete in cui si dorme sul posto, poi città, poi gite assegnate alla base più vicina tra quelle presenti
  items.filter(overnight).forEach((i) => {
    const b = ensure(i.base_notte);
    b.need += num(i.giorni);
    b.trips.push({ ...i, sulPosto: true });
    b.own = true;
    b.tipoNotte = i.tipo_notte || 'hotel';
  });
  items
    .filter((i) => i.tipo === 'citta' && !dayCity(i))
    .forEach((i) => {
      const d = dayOf(i, p);
      const b = ensure(split(i.basi)[0]);
      b.need += d;
      b.city.push({ ...i, gg: d });
    });
  items
    .filter((i) => (i.tipo === 'gita' && !overnight(i)) || dayCity(i))
    .forEach((i) => {
      const isCity = dayCity(i);
      const opts = isCity ? split(i.basi_giornata) : split(i.basi);
      const present = opts.filter((o) => bases.has(o) && !bases.get(o).own);
      const effOre = (o) => (o === opts[0] ? 0 : (shortest(tratte, o, opts[0]) || { ore: 99 }).ore);
      const name = present.length ? present.slice().sort((a, c) => effOre(a) - effOre(c))[0] : opts[0];
      const b = ensure(name);
      const d = isCity ? dayOf(i, p) : num(i.giorni);
      b.need += d;
      let t;
      if (isCity) {
        const leg = shortest(tratte, name, split(i.basi)[0]);
        t = { ...i, giorni: d, ore_tratta: leg ? leg.ore : 1, yen_ar: leg ? leg.yen * 2 : 0, cittaInGiornata: true };
      } else if (name === opts[0]) t = i;
      else {
        const leg = shortest(tratte, name, opts[0]);
        t = { ...i, ore_tratta: num(i.ore_tratta) + (leg ? leg.ore : 0), yen_ar: num(i.yen_ar) + (leg ? leg.yen * 2 : 0), via: opts[0] };
      }
      b.trips.push(t);
    });
  // 2. ordine delle tappe
  const rank = (name) => (bInfo.get(name) || {}).ordine || 99;
  const first = bases.get(A0.city);
  const stops = order([first].concat(Array.from(bases.values()).filter((s) => s !== first)), roundTrip ? A1.city : A1.air, tratte, rank);
  const endHome = roundTrip ? 1 : 0;
  // 3. tratte prima (l'ordine è noto), poi notti.
  // Mezze giornate utili il giorno di arrivo: con l'atterraggio al mattino resta il pomeriggio
  const arrSlots = p.oraArrivo === 'mattina' ? 1 : 0;
  stops.forEach((s, i) => {
    s.from = i === 0 ? A0.air : stops[i - 1].base;
    s.legIn = shortest(tratte, s.from, s.base);
    s.ts = i === 0 ? arrSlots : s.legIn && s.legIn.ore > LONG_LEG ? 1 : 2;
    s.zona = (bInfo.get(s.base) || {}).zona;
  });
  stops.forEach((s) => {
    s.minN = Math.max(1, 1 + Math.ceil(s.need - s.ts / 2 - 1e-9));
    s.nights = s.minN;
  });
  const minTotal = sum(stops, (s) => s.nights) + endHome;
  const maxN = (pm.get('max_notti') || { min: 5 }).min;
  let extra = p.notti - minTotal;
  // notti in più: a chi ne ha avute meno rispetto a quanto c'è da fare, poi alle basi con più mete;
  // priorita_extra di basi.json serve solo da ultimo spareggio
  const prio = (s) => (bInfo.get(s.base) || { prio: 99 }).prio;
  const share = (s) => (s.nights - s.minN) / (s.need + 1);
  const pick = (a, b) => share(a) - share(b) || b.need - a.need || prio(a) - prio(b);
  while (extra > 0) {
    let c = stops.filter((s) => s.nights < maxN).sort(pick);
    if (!c.length) c = stops.slice().sort((a, b) => a.nights - b.nights || pick(a, b));
    c[0].nights += 1;
    extra -= 1;
  }
  const deficit = Math.max(0, minTotal - p.notti);
  let day = 1;
  stops.forEach((s, i) => {
    s.ordine = i + 1;
    s.dal = day;
    s.al = day + s.nights;
    day += s.nights;
    s.free = (s.ts + 2 * (s.nights - 1) - 2 * s.need) / 2;
  });
  let endStop = null;
  if (endHome) {
    const from = stops[stops.length - 1].base,
      leg = shortest(tratte, from, A1.city);
    endStop = {
      base: A1.city,
      ordine: stops.length + 1,
      nights: 1,
      dal: day,
      al: day + 1,
      need: 0,
      city: [],
      trips: [],
      free: 0,
      finale: true,
      tipoNotte: 'hotel',
      from,
      legIn: leg,
      ts: leg && leg.ore > LONG_LEG ? 1 : 2,
      zona: (bInfo.get(A1.city) || {}).zona,
    };
    day += 1;
  }
  const all = stops.concat(endStop ? [endStop] : []);
  const airport = A1.air;
  const last = shortest(tratte, all[all.length - 1].base, airport);
  const moving = all
    .slice(1)
    .map((s) => s.legIn)
    .filter(Boolean);
  // 4. costi a persona, min e max per categoria
  const rate = p.cambio || (pm.get('cambio') || { min: 176 }).min;
  const G = p.notti + 1;
  const g = (id) => pm.get(id) || { min: 0, max: 0 };
  // il prezzo base è a persona in camera doppia: da soli si paga di più, in gruppo (appartamenti, camere familiari) meno
  const sty = STILI[p.stile],
    solo = p.persone === 1 ? g('camera_singola') : p.persone >= 3 ? g('camera_gruppo') : { min: 1, max: 1 };
  const deps = dati.partenze || [];
  const dep = deps.find((d) => d.id === p.da) || deps[0] || { nome: '?', min: 0, max: 0 };
  const alta = during((dati.eventi || []).filter((e) => yes(e.voli_alta)), p);
  const fAlta = alta.length ? g('alta_stagione') : { min: 1, max: 1 };
  const oj = roundTrip ? { min: 0, max: 0 } : g('open_jaw');
  const ryN = sum(
    all.filter((s) => s.tipoNotte === 'ryokan'),
    (s) => s.nights
  );
  const hoN = p.notti - ryN;
  const trainYen = sum(all, (s) => (s.legIn ? s.legIn.yen : 0)) + (last ? last.yen : 0);
  const tripYen = sum(all, (s) =>
    sum(
      s.trips.filter((t) => !t.sulPosto),
      (t) => num(t.yen_ar)
    )
  );
  const cambi = all.length - 1;
  const cost = [
    {
      cat: 'Voli',
      min: dep.min * fAlta.min + oj.min,
      max: dep.max * fAlta.max + oj.max,
      how:
        'Da ' +
        dep.nome +
        ', ' +
        (roundTrip ? 'andata e ritorno su ' + A0.nome : 'arrivo a ' + A0.nome + ' e ritorno da ' + A1.nome) +
        (alta.length ? '; alta stagione (' + alta.map((e) => e.nome).join(', ') + ')' : ''),
    },
    {
      cat: 'Alloggi',
      min: (solo.min * (hoN * sty.hotel * g('notte_hotel').min + ryN * sty.ryokan * g('notte_ryokan').min)) / rate,
      max: (solo.max * (hoN * sty.hotel * g('notte_hotel').max + ryN * sty.ryokan * g('notte_ryokan').max)) / rate,
      how:
        hoN +
        ' notti in ' +
        sty.how +
        (ryN ? ' + ' + ryN + ' in ryokan o minshuku' : '') +
        (p.persone === 1 ? ', camera singola' : p.persone >= 3 ? ', appartamento o camera familiare' : ''),
    },
    { cat: 'Treni tra le basi', min: trainYen / rate, max: trainYen / rate, how: 'Aeroporti inclusi, circa ' + yen(trainYen) },
    { cat: 'Gite in giornata', min: tripYen / rate, max: tripYen / rate, how: 'Andata e ritorno dalle basi, circa ' + yen(tripYen) },
    { cat: 'Trasporti locali', min: (G * g('locali').min) / rate, max: (G * g('locali').max) / rate, how: G + ' giorni di metro e bus' },
    {
      cat: 'Cibo',
      min: (G * sty.cibo * g('cibo').min) / rate,
      max: (G * sty.cibo * g('cibo').max) / rate,
      how: G + ' giorni, stile ' + sty.nome.toLowerCase(),
    },
    { cat: 'Ingressi', min: (G * g('ingressi').min) / rate, max: (G * g('ingressi').max) / rate, how: G + ' giorni' },
    {
      cat: 'Assicurazione',
      min: (g('assicurazione').min * G) / 15,
      max: (g('assicurazione').max * G) / 15,
      how: 'Riproporzionata su ' + G + ' giorni',
    },
    {
      cat: 'eSIM e varie',
      min: g('esim').min + (G * g('varie').min) / rate,
      max: g('esim').max + (G * g('varie').max) / rate,
      how: 'eSIM, bibite, snack, armadietti',
    },
  ];
  if (p.bagagli === 'spedizioni')
    cost.splice(7, 0, {
      cat: 'Takkyubin',
      min: cambi * g('takkyubin').min,
      max: cambi * g('takkyubin').max,
      how: cambi + ' spedizioni dei bagagli, una per cambio',
    });
  const tot = { min: sum(cost, (c) => c.min), max: sum(cost, (c) => c.max) };
  return {
    p,
    A0,
    A1,
    dep,
    rate,
    stops,
    all,
    endStop,
    last,
    airport,
    deficit,
    minTotal,
    items,
    moving,
    cost,
    tot,
    cambi,
    G,
    maxN,
    oreBagagli: sum(moving, (l) => l.ore),
    free: sum(stops, (s) => Math.max(0, s.free)) + (p.oraRitorno === 'sera' ? 0.5 : 0),
    overMax: stops.filter((s) => s.nights > maxN && s.nights > s.minN),
  };
}
