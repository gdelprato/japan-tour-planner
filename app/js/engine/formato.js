/* Testi e numeri in formato italiano. Usati dal motore nei testi del calendario e dall'interfaccia. */

export const nf = new Intl.NumberFormat('it-IT');
export const eur = (n) => nf.format(Math.round(Number(n))) + ' €';
export const yen = (n) => nf.format(Math.round(Number(n))) + ' ¥';
export const nn = (n) => n + (Number(n) === 1 ? ' notte' : ' notti');
export const gg = (n) => (n === 0.5 ? 'mezza giornata' : n === 1 ? '1 giorno' : String(n).replace('.', ',') + ' giorni');
// ore decimali → "2h05", "45 min" (arrotondate a 5 minuti)
export const hrs = (h) => {
  const t = Math.round((h * 60) / 5) * 5;
  const H = Math.floor(t / 60),
    M = t % 60;
  return H ? H + 'h' + (M ? String(M).padStart(2, '0') : '') : M + ' min';
};
export const fmtDate = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
