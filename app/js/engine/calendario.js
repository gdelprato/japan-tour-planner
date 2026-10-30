/* Date di eventi e stagioni rispetto ai giorni del viaggio. */
import { DAY, isoDay } from './util.js';

// "MM-GG" vale ogni anno (anche a cavallo di capodanno), "AAAA-MM-GG" solo quell'anno,
// "regola": "lun:N:M" è il weekend lungo (sabato-lunedì) dell'N-esimo lunedì del mese M
export function onDay(e, iso) {
  const y = Number(iso.slice(0, 4));
  if (e.regola) {
    const [, n, m] = String(e.regola).split(':').map(Number);
    const w = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    const mon = Date.UTC(y, m - 1, 1 + ((8 - w) % 7) + (n - 1) * 7);
    return iso >= isoDay(mon - 2 * DAY) && iso <= isoDay(mon);
  }
  if (/^\d{4}-/.test(e.dal)) return iso >= e.dal && iso <= e.al;
  const md = iso.slice(5);
  return e.al < e.dal ? md >= e.dal || md <= e.al : md >= e.dal && md <= e.al;
}

// i giorni del viaggio, dal giorno di arrivo al giorno del volo di ritorno
export const tripDays = (p) => {
  const a = Date.parse(p.partenza + 'T00:00:00Z');
  return Array.from({ length: p.notti + 1 }, (_, i) => isoDay(a + i * DAY));
};

// gli elementi della lista che cadono in almeno un giorno del viaggio
export const during = (list, p) => {
  const ds = tripDays(p);
  return (list || []).filter((e) => ds.some((d) => onDay(e, d)));
};
