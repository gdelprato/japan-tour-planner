/* Helper numerici, liste e date usati da tutto il motore. Nessuna dipendenza. */

export const DAY = 86400000;

export const num = (x) => Number(x) || 0;
export const yes = (x) => x === true || x === 'sì' || x === 'si' || x === 'true';
// "a, b,c" oppure ["a","b"] → ["a","b","c"]
export const split = (s) => (Array.isArray(s) ? s.map(String) : String(s || '').split(',').map((x) => x.trim()).filter(Boolean));
export const isoDay = (t) => new Date(t).toISOString().slice(0, 10);

// stessa semantica di d3.sum: somma f(x) ignorando i valori che non sono numeri
export function sum(list, f = (x) => x) {
  let s = 0;
  for (const x of list) {
    const v = +f(x);
    if (v === v) s += v; // esclude NaN
  }
  return s;
}
