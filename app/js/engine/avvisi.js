/* Avvisi sul percorso calcolato: notti mancanti, basi troppo lunghe, gite lunghe, clima, periodi affollati.
   Restituisce coppie [titolo, testo]; l'interfaccia decide come mostrarle. `dati` = { eventi, stagione }. */
import { num } from './util.js';
import { hrs, nn } from './formato.js';
import { during } from './calendario.js';

export function avvisi(r, dati) {
  const msgs = [];
  if (r.deficit > 0) msgs.push(['Mancano notti. ', 'Con queste mete servono almeno ' + nn(r.minTotal) + ': aggiungete ' + nn(r.deficit) + ' o togliete qualche meta.']);
  if (r.overMax.length && !r.deficit)
    msgs.push([
      'Base lunga. ',
      r.overMax.map((s) => s.base + ' ' + nn(s.nights)).join(', ') + ': più di ' + r.maxN + ' notti nello stesso posto. Potete aggiungere una meta o una tappa.',
    ]);
  const longs = [];
  r.all.forEach((s) =>
    s.trips.filter((t) => !t.sulPosto && num(t.ore_tratta) > 2).forEach((t) => longs.push(t.nome + ' da ' + s.base + ' (' + hrs(num(t.ore_tratta)) + ' a tratta)'))
  );
  if (longs.length) msgs.push(['Giornate lunghe in treno. ', longs.join(', ') + '. Valutate di dormire lì, dove possibile, o una base più vicina.']);
  if (!r.last) msgs.push(['Collegamento mancante. ', "Non trovo un treno per l'aeroporto scelto."]);
  during(
    (dati.stagione || []).filter((s) => s.tipo === 'clima'),
    r.p
  ).forEach((s) => msgs.push([s.nome + '. ', s.nota + '.']));
  const busy = during(
    (dati.eventi || []).filter((e) => !e.luogo),
    r.p
  );
  if (busy.length) msgs.push(['Periodi affollati. ', busy.map((e) => e.nome).join(', ') + ': guardate il calendario e prenotate presto treni e alloggi.']);
  return msgs;
}
