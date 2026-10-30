/* Grafo dei treni (tratte.json, non orientato), percorso più breve in ore e ordine delle tappe. */
import { num, sum } from './util.js';

// un grafo per array di tratte: si ricostruisce solo se cambiano i dati
const cache = new WeakMap();
function graph(tratte) {
  if (cache.has(tratte)) return cache.get(tratte);
  const adj = new Map();
  tratte.forEach((t) =>
    [
      [t.da, t.a],
      [t.a, t.da],
    ].forEach(([a, b]) => {
      if (!adj.has(a)) adj.set(a, []);
      adj.get(a).push({ to: b, ore: num(t.ore), yen: num(t.yen), stima: /stima/i.test(t.note || ''), volo: /volo/i.test(t.note || '') });
    })
  );
  cache.set(tratte, adj);
  return adj;
}

// Dijkstra sulle ore: { ore, yen, stima, volo } oppure null se non c'è collegamento
export function shortest(tratte, from, to) {
  if (from === to) return { ore: 0, yen: 0 };
  const adj = graph(tratte);
  const dist = new Map([[from, 0]]),
    prev = new Map(),
    done = new Set();
  while (true) {
    let u = null,
      best = Infinity;
    dist.forEach((d, k) => {
      if (!done.has(k) && d < best) {
        best = d;
        u = k;
      }
    });
    if (u === null || u === to) break;
    done.add(u);
    (adj.get(u) || []).forEach((e) => {
      const nd = best + e.ore;
      if (nd < (dist.has(e.to) ? dist.get(e.to) : Infinity)) {
        dist.set(e.to, nd);
        prev.set(e.to, { from: u, e });
      }
    });
  }
  if (!dist.has(to)) return null;
  const legs = [];
  let cur = to;
  while (cur !== from) {
    const pv = prev.get(cur);
    legs.unshift(pv.e);
    cur = pv.from;
  }
  return { ore: sum(legs, (l) => l.ore), yen: sum(legs, (l) => l.yen), stima: legs.some((l) => l.stima), volo: legs.some((l) => l.volo) };
}

// ordine delle tappe con meno ore di treno: la prima è fissa (città di arrivo), l'ultima tratta va verso `end`.
// A parità di ore vince l'ordine geografico di basi.json. Programmazione dinamica sui sottoinsiemi fino a 12 basi.
export function order(stops, end, tratte, rank) {
  const rest = stops.slice(1),
    n = rest.length;
  const byRank = (a, b) => rank(a.base) - rank(b.base);
  if (n < 2 || n > 12) return stops.slice(0, 1).concat(rest.sort(byRank));
  const memo = new Map();
  const cost = (a, b) => {
    const k = a + '>' + b;
    if (!memo.has(k)) memo.set(k, (shortest(tratte, a, b) || { ore: 99 }).ore + (rank(b) < rank(a) ? 0.001 : 0));
    return memo.get(k);
  };
  const full = (1 << n) - 1,
    dp = Array.from({ length: 1 << n }, () => new Array(n).fill(Infinity)),
    from = Array.from({ length: 1 << n }, () => new Array(n).fill(-1));
  rest.forEach((s, i) => {
    dp[1 << i][i] = cost(stops[0].base, s.base);
  });
  for (let m = 1; m <= full; m++)
    for (let i = 0; i < n; i++) {
      if (!(m & (1 << i)) || dp[m][i] === Infinity) continue;
      for (let j = 0; j < n; j++) {
        if (m & (1 << j)) continue;
        const v = dp[m][i] + cost(rest[i].base, rest[j].base),
          m2 = m | (1 << j);
        if (v < dp[m2][j]) {
          dp[m2][j] = v;
          from[m2][j] = i;
        }
      }
    }
  let last = 0,
    best = Infinity;
  for (let i = 0; i < n; i++) {
    const v = dp[full][i] + cost(rest[i].base, end);
    if (v < best) {
      best = v;
      last = i;
    }
  }
  const seq = [];
  let m = full,
    i = last;
  while (i >= 0) {
    seq.unshift(rest[i]);
    const pi = from[m][i];
    m &= ~(1 << i);
    i = pi;
  }
  return stops.slice(0, 1).concat(seq);
}
