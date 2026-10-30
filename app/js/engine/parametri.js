/* Parametri del viaggio: da quelli grezzi (URL, localStorage, params.json) a quelli usati dal motore.
   Ogni parametro nuovo va aggiunto qui con un default: i link ?r= già condivisi devono continuare a funzionare. */
import { DAY, isoDay, num, split } from './util.js';
import { AIR, NMAX, NMIN, PMAX, STILI } from './costanti.js';

// partenza proposta quando l'utente non ne ha scelta una: fra circa sei mesi
export const defaultStart = (oggi = Date.now()) => {
  const d = new Date(oggi);
  d.setUTCHours(0, 0, 0, 0);
  return isoDay(d.getTime() + 180 * DAY);
};

// `oggi` (millisecondi) serve solo se manca la data di partenza; i test lo fissano
export const norm = (p, oggi = Date.now()) => ({
  sel: split(p.sel),
  notti: Math.min(NMAX, Math.max(NMIN, Math.round(Number(p.notti)) || 12)),
  arrivo: AIR[p.arrivo] ? p.arrivo : 'tokyo',
  ritorno: AIR[p.ritorno] ? p.ritorno : 'osaka',
  persone: Math.min(PMAX, Math.max(1, Math.round(Number(p.persone)) || 2)),
  da: String(p.da || 'milano'),
  stile: STILI[p.stile] ? p.stile : 'medio',
  bagagli: p.bagagli === 'valigia' ? 'valigia' : 'spedizioni',
  oraArrivo: p.ora_arrivo === 'mattina' ? 'mattina' : 'sera',
  oraRitorno: p.ora_ritorno === 'sera' ? 'sera' : 'mattina',
  cambio: Number(p.cambio) > 0 ? Number(p.cambio) : null,
  pernotto: split(p.pernotto),
  gc: split(p.giorni_citta),
  gcit: split(p.giornata_citta),
  partenza: /^\d{4}-\d{2}-\d{2}$/.test(String(p.partenza || '')) ? String(p.partenza) : defaultStart(oggi),
});

// giorni in una città: quelli scelti dall'utente ("kyoto:3" in giorni_citta) o quelli consigliati dal catalogo
export const dayOf = (it, p) => {
  const o = p.gc.map((s) => String(s).split(':')).find(([k]) => k === it.id);
  return o ? Number(o[1]) : num(it.giorni);
};

// i prezzi di parametri.json indicizzati per id
export function parametriMap(parametri) {
  const m = new Map();
  (parametri || []).forEach((r) => m.set(r.id, { min: num(r.min), max: num(r.max), voce: r.voce }));
  return m;
}
