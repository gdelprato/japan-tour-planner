/* Scenari usati per verificare il motore. Ogni scenario ha parametri "grezzi", come arrivano dall'URL o da
   params.json, sempre con una data di partenza esplicita: il risultato non deve dipendere dal giorno in cui
   gira il test. Coprono i cinque modelli di viaggio, ogni opzione dei parametri e i casi limite. */

const base = { persone: 2, da: 'milano', stile: 'medio', bagagli: 'spedizioni', partenza: '2027-10-13' };

// come routeFromSaved() in app.js: un modello porta solo il percorso, il resto resta quello scelto
const modello = (sel, notti, arrivo, ritorno, pernotto = '', extra = {}) => ({
  ...base,
  sel: sel.split(','),
  notti,
  arrivo,
  ritorno,
  pernotto: pernotto ? pernotto.split(',') : [],
  giorni_citta: [],
  giornata_citta: [],
  ...extra,
});

export const OGGI = Date.UTC(2026, 9, 30); // 30 ottobre 2026, per i parametri senza data

export const SCENARI = [
  {
    nome: 'percorso di esempio in Golden Week',
    params: {
      sel: ['tokyo', 'nikko', 'hakone', 'kyoto', 'nara', 'osaka', 'hiroshima'],
      notti: 12,
      arrivo: 'tokyo',
      ritorno: 'osaka',
      persone: 2,
      da: 'milano',
      stile: 'medio',
      pernotto: [],
      giorni_citta: [],
      giornata_citta: [],
      partenza: '2027-04-28',
    },
  },
  { nome: 'modello Prima volta', params: modello('tokyo,kamakura,kyoto,nara,osaka', 10, 'tokyo', 'osaka') },
  {
    nome: 'modello Classico completo',
    params: modello('tokyo,nikko,hakone,kanazawa,shirakawa,kyoto,nara,osaka,hiroshima', 14, 'tokyo', 'osaka', 'hakone'),
  },
  {
    nome: 'modello Alpi e onsen',
    params: modello(
      'tokyo,hakone,matsumoto,kamikochi,takayama,shirakawa,kanazawa,kyoto,osaka',
      14,
      'tokyo',
      'osaka',
      'hakone,shirakawa'
    ),
  },
  {
    nome: 'modello Kansai e Kyushu, andata e ritorno su Osaka',
    params: modello('kyoto,nara,osaka,himeji,hiroshima,fukuoka,nagasaki,beppu', 12, 'osaka', 'osaka', 'beppu'),
  },
  {
    nome: 'modello Hokkaido e Tokyo, andata e ritorno su Tokyo',
    params: modello('tokyo,sapporo,otaru,biei,hakodate,noboribetsu', 12, 'tokyo', 'tokyo', 'noboribetsu'),
  },
  {
    nome: 'da soli, economico, valigia sempre con sé, partenza da Roma',
    params: modello('tokyo,kamakura,kyoto,nara,osaka', 10, 'tokyo', 'osaka', '', {
      persone: 1,
      stile: 'economico',
      bagagli: 'valigia',
      da: 'roma',
    }),
  },
  {
    nome: 'in cinque, comfort, cambio scelto a mano',
    params: modello('tokyo,nikko,kyoto,nara,osaka', 11, 'tokyo', 'osaka', '', {
      persone: 5,
      stile: 'comfort',
      cambio: 160,
      da: 'europa',
    }),
  },
  {
    nome: 'Osaka→Tokyo, atterraggio al mattino, ritorno di sera',
    params: modello('osaka,kyoto,nara,tokyo,kamakura', 9, 'osaka', 'tokyo', '', {
      ora_arrivo: 'mattina',
      ora_ritorno: 'sera',
    }),
  },
  {
    nome: 'Kyoto in giornata da Osaka, più giorni a Kyoto',
    params: modello('osaka,kyoto,nara,kobe,himeji', 8, 'osaka', 'osaka', '', {
      giornata_citta: ['kyoto'],
      giorni_citta: ['kyoto:3'],
    }),
  },
  {
    nome: 'troppe mete per poche notti',
    params: modello('tokyo,nikko,hakone,kanazawa,kyoto,nara,osaka,hiroshima', 4, 'tokyo', 'osaka'),
  },
  { nome: 'viaggio lungo, basi oltre il massimo di notti', params: modello('tokyo,kyoto,osaka', 40, 'tokyo', 'osaka') },
  {
    nome: 'a cavallo di Capodanno',
    params: modello('tokyo,nikko,kyoto,osaka', 10, 'tokyo', 'osaka', '', { partenza: '2027-12-26' }),
  },
  {
    nome: 'ciliegi a fine marzo',
    params: modello('tokyo,kawagoe,kyoto,nara,osaka,himeji', 11, 'tokyo', 'osaka', '', { partenza: '2028-03-27' }),
  },
  {
    nome: 'Tohoku, Alpi e Shikoku con pernottamenti sul posto',
    params: modello(
      'tokyo,sendai,matsushima,ginzan,kanazawa,takayama,kyoto,osaka,naoshima,iya,matsuyama',
      18,
      'tokyo',
      'osaka',
      'ginzan,iya'
    ),
  },
  { nome: 'nessuna meta scelta', params: modello('', 5, 'tokyo', 'osaka') },
  { nome: 'una sola meta', params: modello('kyoto', 3, 'osaka', 'osaka') },
  { nome: 'Okinawa e Kyushu', params: modello('tokyo,fukuoka,kagoshima,naha,churaumi', 12, 'tokyo', 'tokyo') },
  {
    nome: 'parametri grezzi e sbagliati da un vecchio link',
    params: {
      sel: 'tokyo, kyoto,osaka',
      notti: '7',
      arrivo: 'nagoya',
      ritorno: 'xx',
      persone: 99,
      da: 'milano',
      stile: 'lusso',
      bagagli: 'zaino',
      ora_arrivo: 'notte',
      cambio: -3,
      pernotto: '',
      partenza: '2027-06-01',
    },
  },
  {
    nome: 'parametri minimi senza data: la partenza è oggi + 180 giorni',
    params: { sel: ['tokyo', 'kyoto'], notti: 6 },
  },
];
