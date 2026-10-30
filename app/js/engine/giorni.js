/* Programma giorno per giorno, in mezze giornate, e note del calendario (feste, ciliegi, foliage). */
import { DAY, num, split, sum } from './util.js';
import { hrs } from './formato.js';
import { onDay } from './calendario.js';

// Riempie i giorni di ogni tappa con città e gite. Imposta anche `overflow` su ogni tappa:
// mezze giornate di mete che non ci stanno (da mostrare come avviso).
export function planDays(r) {
  const start = Date.parse(r.p.partenza + 'T00:00:00Z');
  const dateOf = (n) => new Date(start + (n - 1) * DAY);
  const days = [];
  r.all.forEach((s, idx) => {
    const q = [];
    if (s.finale) q.push({ t: 'Ultima serata a ' + s.base, kind: 'libero', units: 1, split: true });
    s.city.forEach((c) => {
      for (let k = 0; k < Math.round(c.gg * 2); k++) q.push({ t: c.nome, kind: 'citta', units: 1, split: true });
    });
    s.trips.forEach((t) => {
      const h = Math.max(1, Math.round(num(t.giorni) * 2));
      q.push({ t: t.nome, kind: t.sulPosto ? 'posto' : t.cittaInGiornata ? 'citta' : 'gita', units: h, split: !!t.cittaInGiornata });
    });
    // a city visited as a day trip is split in halves like a city
    for (let i = q.length - 1; i >= 0; i--)
      if (q[i].split && q[i].units > 1) {
        const it = q[i];
        q.splice(i, 1, ...Array.from({ length: it.units }, () => ({ ...it, units: 1 })));
      }
    const take = (rem, transfer, preferCity) => {
      if (!transfer && !preferCity && rem >= 2) {
        const i = q.findIndex((x) => x.units === 2);
        if (i >= 0) return q.splice(i, 1)[0];
      }
      let i = q.findIndex((x) => x.units === 1);
      if (i >= 0) return q.splice(i, 1)[0];
      if (rem >= 2) {
        i = q.findIndex((x) => x.units === 2);
        if (i >= 0) return q.splice(i, 1)[0];
      }
      return null;
    };
    let lastTrip = idx === 0;
    for (let d = s.dal; d < s.al; d++) {
      const day = { n: d, date: dateOf(d), stop: s, first: d === s.dal, parts: [] };
      let slots = 2;
      if (d === s.dal) {
        if (idx === 0) {
          day.travel =
            'Atterraggio a ' +
            r.A0.air +
            (r.p.oraArrivo === 'mattina' ? ' al mattino' : ' nel pomeriggio o la sera') +
            (s.legIn ? ', poi ' + hrs(s.legIn.ore) + ' fino in città' : '');
          slots = s.ts;
        } else {
          day.travel = (s.legIn && s.legIn.volo ? 'Volo o treno da ' : 'Treno da ') + s.from + ' (' + (s.legIn ? hrs(s.legIn.ore) : '?') + ')';
          slots = s.ts;
        }
      }
      const taken = [];
      let rem = slots;
      const transfer = d === s.dal && idx > 0;
      while (rem > 0) {
        const x = take(
          rem,
          transfer,
          lastTrip && q.some((y) => y.units === 1)
        );
        if (!x) {
          taken.push({ t: 'Tempo libero', kind: 'libero', units: 1 });
          rem -= 1;
          continue;
        }
        taken.push(x);
        rem -= x.units;
      }
      if (!(idx === 0 && d === s.dal)) lastTrip = taken.some((x) => x.kind === 'gita' || x.units === 2);
      taken.forEach((x) => {
        const lastp = day.parts[day.parts.length - 1];
        if (x.units === 2) day.parts.push({ ...x, full: true });
        else if (lastp && lastp.t === x.t && !lastp.full) lastp.full = true;
        else day.parts.push({ ...x, full: false });
      });
      if (idx === 0 && d === s.dal && !slots) day.parts.push({ t: 'Serata libera e riposo', kind: 'libero', full: false });
      days.push(day);
    }
    s.overflow =
      sum(
        q.filter((x) => x.kind !== 'libero'),
        (x) => x.units
      ) / 2;
  });
  const lastStop = r.all[r.all.length - 1];
  const late = r.p.oraRitorno === 'sera';
  days.push({
    n: r.p.notti + 1,
    date: dateOf(r.p.notti + 1),
    stop: null,
    first: true,
    travel: (late ? 'Nel pomeriggio treno per ' : 'Treno per ') + r.A1.nome + (r.last ? ' (' + hrs(r.last.ore) + ')' : '') + ' e volo di ritorno',
    parts: late ? [{ t: 'Mattina libera a ' + lastStop.base, kind: 'libero', full: false }] : [],
  });
  return days;
}

// Feste, ciliegi e foliage di un giorno nei luoghi in cui si è quel giorno.
// `dati` = { catalogo, eventi, stagione }.
export function notesFor(day, dati) {
  const out = [];
  const iso = day.date.toISOString().slice(0, 10);
  const here = new Set();
  if (day.stop) {
    here.add(day.stop.base);
    day.parts.forEach((pt) => {
      const it = (dati.catalogo || []).find((c) => c.nome === pt.t);
      if (it) split(it.luoghi).forEach((l) => here.add(l));
    });
  }
  (dati.eventi || []).forEach((e) => {
    if (onDay(e, iso) && (!e.luogo || here.has(e.luogo))) out.push({ kind: 'ev', t: e.nome, nota: e.nota });
  });
  (dati.stagione || []).forEach((s) => {
    if (s.tipo === 'clima' || !here.has(s.luogo) || !day.parts.some((pt) => pt.kind !== 'libero' || day.stop.base === s.luogo)) return;
    if (onDay(s, iso)) out.push({ kind: s.tipo === 'sakura' ? 'sk' : 'fo', t: (s.tipo === 'sakura' ? 'Ciliegi a ' : 'Foliage a ') + s.luogo });
  });
  return out;
}
