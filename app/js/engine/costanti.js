/* Costanti del motore: limiti dei parametri, aeroporti di arrivo e ritorno, stili di viaggio. */

// tratta oltre la quale il giorno del trasferimento perde una mezza giornata
export const LONG_LEG = 2.5;
export const NMIN = 3;
export const NMAX = 365;
export const PMAX = 10;

// città di arrivo e ritorno: base in cui si dorme e aeroporto collegato nei dati delle tratte
export const AIR = {
  tokyo: { city: 'Tokyo', air: 'Haneda', code: 'HND', nome: 'Tokyo Haneda' },
  osaka: { city: 'Osaka', air: 'Kansai', code: 'KIX', nome: 'Osaka Kansai' },
};

// fattori sui prezzi di alloggi e cibo, rispetto alle stime "medie" di parametri.json
export const STILI = {
  economico: { nome: 'Economico', hotel: 0.6, ryokan: 0.85, cibo: 0.75, how: 'ostelli, capsule e business hotel' },
  medio: { nome: 'Medio', hotel: 1, ryokan: 1, cibo: 1, how: 'hotel o appartamenti' },
  comfort: { nome: 'Comfort', hotel: 1.8, ryokan: 1.3, cibo: 1.5, how: 'hotel di categoria superiore' },
};
