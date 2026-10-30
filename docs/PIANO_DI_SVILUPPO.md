# Piano di sviluppo: da progetto personale ad applicazione professionale

Aggiornato al 30 ottobre 2026.

> **Struttura e processo.** Dal 30 ottobre il progetto segue gli standard della practice in `gdelprato/ai-ml-engineering-standards` (principi P01–P10, standard S01–S23). Architettura in `docs/architecture.md`, decisioni in `docs/decisions/`, criteri di accettazione per ogni release in `docs/acceptance-criteria.md`, definizione di fatto in `docs/definition-of-done.md`. Gli adattamenti a una web app statica sono in ADR-001; l'app pubblicata ora vive in `app/` (ADR-002). Le voci 0.1–0.5 della Fase 0 sono fatte: motore in `app/js/engine/` (ADR-006) con 20 scenari confrontati con il comportamento precedente. Questo documento estende `ROADMAP.md` (che resta la storia delle fasi fatte e il dettaglio della Fase 1) e lo sostituisce come guida per le prossime release. Le fasi 2–6 della roadmap sono riprese qui, riordinate per valore e integrate con le fondamenta tecniche e con le funzioni basate su AI.

---

## 1. Dove siamo

**Cosa funziona già bene**
- Un **motore deterministico** (`build()` → `planDays()` in `app/js/app.js`): da pochi parametri (mete, notti, viaggiatori, aeroporti, orari, stile, bagagli, cambio) calcola basi, notti per base, ordine delle tappe con meno ore di treno, giornata per giornata, budget min/max per categoria. È il vero valore dell'app ed è riproducibile: stesso input, stesso output.
- **Dati aperti e leggibili** in `app/data/*.json` (54 KB in tutto senza la geometria della mappa), con la voce `fonte` sui prezzi.
- **Zero costi fissi**: PWA statica su GitHub Pages, offline, installabile, stato nel link condivisibile, nessun account.
- Interfaccia già pensata per telefono e desktop, tema chiaro e scuro, mappa D3 con regioni.

**Cosa manca per dirla "professionale"**
- Nessun test automatico: una modifica al motore può cambiare budget o ordine delle tappe senza che nessuno se ne accorga.
- `app/js/app.js` è un unico file da 1.060 righe che mescola calcolo e disegno: difficile da estendere e da testare.
- I JSON non sono validati: un refuso in `catalogo.json` si scopre solo aprendo l'app.
- Dati statici con data di aggiornamento fissa nel footer; cambio yen/euro fisso.
- Il viaggio finisce con la pianificazione: niente prenotazioni, scadenze, esportazione, uso durante il viaggio.
- Solo italiano; nessuna metrica su chi usa l'app e su cosa si inceppa.
- Il primo avvio butta l'utente davanti a 54 mete e una mappa, senza un percorso guidato.

---

## 2. Visione e principi

**Visione.** Lo strumento di riferimento, gratuito e senza account, per costruire un viaggio in Giappone realistico: quante notti dove, in che ordine, quanto costa, cosa prenotare e quando. Prima lo si usa per decidere, poi per prenotare, poi in viaggio.

**Principi che guidano ogni scelta**
1. **Il motore resta deterministico, l'AI è l'interfaccia.** L'AI traduce desideri in parametri, spiega e critica il risultato, legge documenti. Non inventa mai notti, prezzi o ordini: quelli li calcola `build()` sui dati del repository. Così il risultato è verificabile, riproducibile e funziona anche offline.
2. **Nessun costo fisso, nessun account.** L'app statica resta gratuita. Le funzioni che hanno un costo (chiamate ai modelli) stanno dietro un piccolo proxy serverless con quote, e ogni funzione AI ha un equivalente degradato che funziona senza rete.
3. **Dati con provenienza e data.** Ogni numero mostrato ha una fonte e una data di aggiornamento, e l'app avvisa quando il dato è vecchio.
4. **Semplicità tecnica.** Niente framework e niente build finché non servono davvero. Si aggiungono strumenti di sviluppo (test, lint, validazione) che non cambiano come l'app viene pubblicata.
5. **Privacy per costruzione.** Il proxy riceve solo i parametri del viaggio e la domanda dell'utente, non li conserva, non ci sono identificativi personali.

---

## 3. Architettura di arrivo

```
Telefono / browser
  └─ PWA statica (GitHub Pages)  ── offline con sw.js, stato in ?r= e localStorage
       ├─ app/js/engine/*   motore puro: build, planDays, shortest, order, budget (testabile in Node)
       ├─ js/ui/*       un modulo per scheda: percorso, calendario, confronto, budget, info, voli, da-fare
       ├─ js/ai/*       client del proxy, prompt, fallback offline
       └─ app/data/*.json   dati versionati e validati (schema in app/data/schema/)
              ▲
              │ pull request automatiche
  GitHub Actions (settimanale) ── "agente dati": verifica prezzi e tratte con Claude + ricerca web,
                                  apre una PR con diff e fonti; una persona la approva
  GitHub Actions (al deploy)   ── valida i JSON, esegue i test, sostituisce __BUILD__ in sw.js,
                                  genera i testi "al build" (descrizioni, frasario) se cambiati

  Proxy serverless (Cloudflare Worker, piano gratuito)
    POST /ai/<funzione>  ── chiave API nel segreto del Worker, mai nel browser
                         ── quota per IP e giornaliera (KV), CORS solo dall'origine dell'app
                         ── chiama l'API Claude con prompt caching sui dati del repository
```

**Tre livelli di AI, dal più economico al più costoso**
- **Al build (zero costo a runtime, funziona offline).** Testi generati una volta e committati: descrizioni delle mete in italiano e inglese, "da sapere" per ogni base, frasario, consigli per stagione. Rigenerati solo quando cambiano i dati sorgente.
- **A runtime tramite proxy (online, costo per chiamata).** Assistente, spiegazione del percorso, revisione, lettura di prenotazioni.
- **Chiave propria (BYOK).** Chi vuole può incollare la propria chiave API nelle impostazioni: salvata solo nel suo browser, nessuna quota. Utile per chi usa l'app intensamente o per sviluppare senza proxy.

---

## 4. Fase 0: fondamenta tecniche (prima di aggiungere funzioni)

Obiettivo: poter cambiare il motore e i dati senza paura. Tutto senza build step e senza cambiare come l'app viene pubblicata.

| # | Intervento | Dettaglio | Sforzo |
|---|---|---|---|
| 0.1 | **Estrarre il motore** ✅ | Spostare `build`, `planDays`, `shortest`, `order`, `notesFor`, costanti `AIR`/`STILI` in `app/js/engine/` come moduli ES puri (nessun accesso al DOM né a `d3`: le somme si fanno con `reduce`). `app.js` li importa con `<script type="module">`. Aggiornare `SHELL` in `sw.js`. | M |
| 0.2 | **Test del motore** ✅ | `node --test` (senza dipendenze) su casi d'oro: i 5 modelli di `percorsi.json` con 2, 5 e 1 persone, round trip e open-jaw, atterraggio mattina/sera. Snapshot di `stops`, `nights`, `cost`. Test mirati su `shortest` e `order`. Un test che apre un vecchio link `?r=` e verifica che dia lo stesso percorso. | M |
| 0.3 | **Validazione dei dati in CI** ✅ | Schemi JSON in `app/data/schema/`, uno script `scripts/check-data.mjs` che verifica: id unici, ogni `basi`/`base_notte` esiste in `basi.json`, ogni base ha coordinate in `citta.json`, il grafo delle tratte è connesso, date `MM-GG` valide, ogni prezzo ha `fonte` e `aggiornato`. Gira nel workflow prima del deploy e come check sulle PR. **Fatto** (senza schemi JSON formali e senza il campo `aggiornato`, che arriva con 0.7). | S |
| 0.4 | **Lint e formattazione** ✅ | ESLint (configurazione minima) e Prettier, solo come check in CI; `npm run check` locale. | S |
| 0.5 | **Smoke test del browser** ✅ | Playwright: apre l'app, nessun errore in console, cambia notti e persone, verifica che KPI e budget cambino, screenshot a 390 px e 1280 px come riferimento visivo. | S |
| 0.6 | **Qualità misurata** | Lighthouse CI con soglie (prestazioni ≥ 90, accessibilità ≥ 95, PWA installabile). | S |
| 0.7 | **Dati con data** | Campo `aggiornato` in `parametri.json`, `partenze.json`, `tratte.json`; il footer e le tabelle lo leggono dai dati invece che da testo fisso; avviso giallo se più vecchio di 6 mesi. | S |
| 0.8 | **Osservabilità rispettosa** | Contatore pagine e eventi anonimi senza cookie (Plausible o GoatCounter, piano gratuito) con opt-out; cattura degli errori JavaScript verso un endpoint del Worker (o Sentry gratuito). Senza questo non si sa cosa si rompe sui telefoni degli altri. | S |
| 0.9 | **Versioni e note di rilascio** (CHANGELOG fatto) | `CHANGELOG.md`, tag `v0.x`, la versione mostrata nel pannello "Il viaggio"; la barra "Aggiorna" dice cosa è cambiato. | S |

Risultato atteso: una PR che tocca il motore mostra in CI se cambia un budget o un ordine; un refuso nei dati blocca il deploy.

---

## 5. Funzioni di prodotto (senza AI)

Riprese dalla roadmap e riordinate. Per ognuna: cosa vede l'utente, su cosa si appoggia, sforzo.

### 5.1 Primo avvio e più viaggi (ROADMAP Fase 2)
- **Wizard in 4 passi** al primo avvio: date e notti → quanti siete e da dove → stile, bagagli, interessi → modello di partenza o "da zero". Riusa `#settings`. **M**
- **Interessi come tag** in `catalogo.json` (templi, natura, onsen, cibo, città, anime, famiglia, fotografia, escursioni): il picker ordina ed evidenzia le mete adatte e il wizard propone un modello. **S**
- **Più viaggi** sullo stesso dispositivo: lista in localStorage, duplicazione, rinomina, elimina; il confronto già salva percorsi, si generalizza quella logica. **S**
- Tono al singolare quando si viaggia da soli (un dizionario di stringhe, che serve anche per l'inglese). **S**

### 5.2 Dati vivi, gratis e senza chiavi
- **Cambio yen/euro aggiornato** dall'API pubblica della BCE (frankfurter.app), con cache nel service worker e fallback al valore di `parametri.json`. **S**
- **Meteo previsto** nelle ultime 2 settimane prima della partenza (Open-Meteo, gratuito, senza chiave) per ogni base: nel calendario e nella modalità "Oggi". **S**
- **Festività dell'anno esatto** (Nager.Date) per sostituire le regole `MM-GG` dove la data cambia ogni anno. **S**
- **Link profondi** per ogni tappa e tratta: Google Maps per la base, Jorudan o Navitime per gli orari dei treni, Google Flights e Skyscanner precompilati con aeroporti e date. **S**

### 5.3 Voli (ROADMAP Fase 3)
- Scheda **Voli**: stima per città di partenza e mese, confronto open-jaw contro ritorno in treno (già calcolabile con `shortest()`), effetto dell'alta stagione, link di ricerca precompilati. **M**
- Consigli posti e bagaglio in `app/data/posti.json`: lato Fuji sullo Shinkansen, posti con spazio per valigie grandi (obbligatoria la prenotazione), aereo. **S**

### 5.4 Prenotazioni e scadenze (ROADMAP Fase 4)
- Scheda **Da fare** generata dal percorso e dalla data: voli, ryokan, musei a prenotazione (Ghibli, teamLab, Palazzo Imperiale), posti Shinkansen nei festivi, eSIM, assicurazione, cambio, Suica. Ogni voce ha stato (da fare / prenotato / saltata), codice e nota; countdown delle scadenze in `#takeaway`. **M**
- **Calcolatore pass**: JR Pass nazionale e pass regionali contro la somma dei biglietti singoli delle tratte del percorso (dati in `app/data/pass.json`). **M**
- **Esportazione**: calendario `.ics` (una voce per giorno e per spostamento), **PDF** stampabile del viaggio, **CSV** del budget. Lo `.ics` si genera in JavaScript senza librerie. **M**

### 5.5 Giornata per giornata e in viaggio (ROADMAP Fase 5)
- **Attività** in `app/data/attivita.json` (orari, chiusure settimanali, durata, prezzo): `planDays()` riempie le mezze giornate con proposte concrete invece del solo nome della meta; piano B per la pioggia. **L**
- **Modalità "Oggi"**: durante il viaggio l'app apre direttamente il giorno corrente con treni, indirizzo dell'hotel anche in giapponese da mostrare a un tassista, meteo, frasi utili. Funziona offline. **M**
- **Mappa con sfondo reale** opzionale (tile OpenStreetMap o MapLibre) oltre al disegno D3, utile nella modalità "Oggi". **M**

### 5.6 Gruppo (ROADMAP Fase 6, solo se c'è domanda)
- Voti sulle mete via link (ogni persona vota sul proprio telefono, i voti viaggiano nel link). **M**
- Spese condivise con saldo "chi deve a chi". **M**
- Un backend leggero (Worker + KV o D1) solo se la condivisione via link non basta.

### 5.7 Lingua, accessibilità, visibilità
- **Inglese** oltre all'italiano: dizionario `i18n/it.json`, `i18n/en.json`, lingua dal browser con interruttore; i testi dei dati hanno campi `descrizione_en`. **M**
- **Accessibilità**: verifica con tastiera e screen reader, contrasto, `aria-live` sui KPI, focus nel pannello e nella mappa. **S**
- **SEO e anteprime**: meta Open Graph, immagine di anteprima del percorso condiviso (generata dal Worker come SVG → PNG), pagina di presentazione. **S**

### 5.8 Budget: da forchetta a strumento su cui prenotare
Oggi il budget è una stima min/max per categoria calcolata da `build()` sui parametri di `parametri.json`, di sola lettura. Queste funzioni lo rendono modificabile, più preciso e utile anche in viaggio.

**Modificabile**
- **Valore mio per categoria**: accanto a ogni barra un campo "il mio valore" (il volo già comprato, l'hotel già prenotato). Il totale si ricalcola, la voce è segnata "confermata", il valore viaggia nel link come gli altri parametri. **S**
- **Stile per categoria**: tre selettori indipendenti per alloggio, cibo e ryokan al posto dell'unico `STILI` (dormire economico e mangiare bene). **S**
- **Tetto di spesa**: inserito il massimo a persona, l'app mostra lo sforo, in quale categoria, e cosa cambierebbe togliendo una notte, un ryokan o un cambio base (ricalcoli del motore con parametri alternativi). **M**
- **Shopping e souvenir** come voce opzionale a importo libero o per giorno, oggi esclusa dal totale. **S**

**Più preciso**
- **Costi per base** in `basi.json` (`costo_alloggio`, `costo_cibo`): Tokyo e Kyoto costano più di Takayama o Beppu; il calendario mostra la spesa prevista giorno per giorno. **M**
- **Stagionalità degli alloggi**: fattore per notte che cade in ciliegi, foliage, Golden Week e Capodanno, riusando `eventi.json` e `stagione.json` (oggi l'alta stagione rincara solo i voli). **S**
- **Ingressi reali per meta**: campo `yen_ingresso` in `catalogo.json` (Ghibli, teamLab, castelli, templi gratuiti) al posto del forfait giornaliero. **S**
- **Pass contro biglietti singoli**: JR Pass 7/14/21 giorni e pass regionali (Kansai, Hokuriku Arch, Kyushu) confrontati con la somma delle tratte del percorso, con il verdetto "conviene / non conviene" e di quanto (dati in `app/data/pass.json`; coincide con il calcolatore di 5.4). **M**
- **Sensibilità al cambio**: quanto varia il totale a ±10% di cambio, accanto al cambio dal vivo (5.2). **S**

**Gestione prima e durante il viaggio**
- **Tre colonne: stimato, prenotato, speso**. Lo stimato c'è già; il prenotato arriva dalle voci della scheda Da fare (5.4) che hanno un importo; lo speso si registra in viaggio con un modulo veloce (importo, categoria, chi ha pagato) che funziona offline. Il delta dice se si sta sforando. **M**
- **Curva prevista contro reale** giorno per giorno, da aprire la sera in hotel nella modalità Oggi (5.5). **S**
- **Fondo di contingenza** suggerito (10–15%) e **cassa comune** con saldo "chi deve a chi" (si collega a 5.6). **S** / **M**
- **Valuta mista**: ogni spesa in yen o euro con il cambio del giorno salvato per voce; riepilogo di quanto contante cambiare e dove. **S**
- **Esportazione** del budget in CSV e nel PDF del viaggio (5.4). **S**

**Confronto e simulazione**
- **Scenari "e se"** a parità di percorso cambiando una sola leva: 2 contro 4 persone, economico contro medio, round trip contro open-jaw, bagagli spediti o no. Tre righe nella scheda Confronto, zero dati nuovi. **S**
- **Costo di una notte in più o in meno** per ogni base, mostrato nelle Tappe ("una notte in più a Kyoto: 95–180 € a persona"). **S**
- **Distribuzione del costo per base** sulla mappa (cerchio proporzionale) e sulla linea del percorso. **S**

Le funzioni AI legate al budget sono in 6.10.

### 5.9 Pipeline dei prezzi: dati sempre aggiornati, il browser legge sempre JSON statici
Oggi 9 voci su 15 di `parametri.json` hanno fonte "Stima" e la data di aggiornamento è scritta a mano nel footer. Non esiste una fonte unica, quindi la soluzione combina più canali per tipo di prezzo. Il principio: le chiavi delle API non stanno nel client e nessuna chiamata a pagamento parte dal telefono. I prezzi si aggiornano **a monte**, con job programmati in GitHub Actions che scrivono in `app/data/`; l'app resta gratuita, statica e offline. L'unica eccezione è il cambio, gratuito e senza chiave.

| Voce | Cambia ogni | Fonte gratuita realistica | Metodo |
|---|---|---|---|
| Cambio yen/euro | giorno | BCE via frankfurter.app, senza chiave | chiamata dal browser, cache nel service worker, fallback statico |
| Voli per città e mese | settimana | Travelpayouts Data API (prezzi minimi per mese, gratuita con account affiliato) o Amadeus Self-Service (quota mensile gratuita) | job settimanale → `app/data/prezzi/voli.json` |
| Hotel per base e periodo | settimana | Rakuten Travel API (gratuita con ID applicazione, copre tutto il Giappone) | job settimanale → `app/data/prezzi/alloggi.json`, mediana per base e mese, per 2 e 4 persone |
| Treni e pass JR | 1–2 volte l'anno | pagine ufficiali JR | verifica trimestrale con AI e ricerca web (6.7), PR da approvare |
| Cibo, ingressi, locali, varie | pochi mesi | guide e siti ufficiali delle attrazioni | verifica mensile con AI e ricerca web (6.7), PR da approvare |
| Takkyubin, eSIM, assicurazione | anno | tariffari Yamato, siti dei fornitori | verifica trimestrale con AI (6.7), PR da approvare |
| Prezzi davvero pagati | sempre | gli utenti dell'app | raccolta anonima, vedi sotto |

Disponibilità e quote gratuite di Travelpayouts, Amadeus e Rakuten vanno verificate al momento dell'implementazione: cambiano spesso.

**Come funziona**
1. Un workflow settimanale interroga le API strutturate (voli, hotel) e scrive `app/data/prezzi/*.json`; ogni valore porta `fonte`, `rilevato_il` e `campione` (quante offerte dietro la mediana). Dopo la validazione dello schema (0.3) si committa direttamente. **M**
2. I valori ricavati con AI e ricerca web (treni, cibo, ingressi, tariffe) aprono una **pull request** con diff e link alle fonti: li approva una persona. È l'agente dati di 6.7. **M**
3. Il motore legge `app/data/prezzi/` con priorità sulle forchette di `parametri.json`, che restano come fallback quando un dato manca o è più vecchio di una soglia. **S**
4. Il service worker già aggiorna i dati in rete anche senza una nuova versione dell'app: i telefoni ricevono i prezzi nuovi al primo avvio online. Nessun lavoro aggiuntivo.

**Prezzi pagati davvero, in forma anonima** (richiede il proxy serverless)
Quando un utente inserisce un valore reale nel budget (5.8), l'app chiede se condividerlo in forma anonima. Il Worker riceve solo categoria, città, mese e importo, senza identificativi, e aggrega mediane in KV. Sopra una soglia minima di contributi (per esempio 20 per base e mese) il valore entra in `app/data/prezzi/` tramite il job settimanale. È un dato che nessuna API fornisce. **M**

**Freschezza visibile**
Ogni prezzo con data e fonte accanto, un colore per età (verde sotto 1 mese, giallo sotto 6, grigio oltre), un riepilogo nel budget ("voli rilevati il 24 ottobre, hotel stimati, treni verificati a giugno") e, accanto a ogni voce, il link alla ricerca reale (Google Flights, Booking, Rakuten): al momento di prenotare il prezzo giusto è quello del giorno. **S**

Costi: GitHub Actions gratuito per un repository pubblico, API con piano gratuito, parte AI qualche decina di centesimi a settimana.

**Ordine consigliato**: cambio dal vivo con fallback → `rilevato_il` e fonte su ogni prezzo con la freschezza visibile → job hotel (la voce più grossa e variabile) → job voli → agente AI trimestrale per treni, pass e tariffe → raccolta anonima dei prezzi pagati quando il proxy esiste.

---

## 6. Funzioni basate su AI

Ogni funzione rispetta il principio 1: il modello produce parametri, testi o letture; i numeri li fa il motore. Per ogni funzione: cosa fa, come funziona, modello consigliato, costo indicativo per uso, fallback offline. I costi sono stime ai listini di ottobre 2026 (Claude Haiku 5.5: 0,10 $ per milione di token in ingresso, 0,50 $ in uscita; Claude Sonnet 5.5: 2 $ e 10 $; Claude Opus 5.5: 4 $ e 20 $; le letture dalla cache dei prompt costano un decimo). I dati del repository nel prompt pesano circa 15–20 mila token e si mettono in cache.

### 6.1 Assistente di viaggio: "descrivi il viaggio, il planner lo costruisce"  ★ priorità massima
- **Cosa fa.** Una casella di testo (e il microfono del telefono): *"Siamo in 4 con due bambini, 12 notti a fine marzo, vorremmo ciliegi, un onsen e poco treno"*. L'assistente restituisce i **parametri** (`sel`, `notti`, `persone`, `partenza`, `arrivo`, `ritorno`, `stile`, `bagagli`, `pernotto`) e due righe di motivazione; l'app li applica e il motore calcola tutto il resto. Successive richieste modificano il viaggio: *"togli Hiroshima e aggiungi una notte a Kyoto"*.
- **Come funziona.** Chiamata all'API Claude con **output strutturato** (schema JSON dei parametri, validato dal client prima di applicarlo) e con il catalogo, le basi e gli eventi nel prompt in cache. Il modello sceglie solo tra id esistenti; se chiede una meta non in catalogo, l'app lo dice e propone la più vicina.
- **Modello.** Claude Sonnet 5.5 per qualità delle scelte; Claude Haiku 5.5 per le modifiche incrementali. **Costo**: 1–3 centesimi a richiesta con cache attiva.
- **Fallback offline.** Il wizard in 4 passi (5.1): stesso risultato, più clic.
- **Sforzo.** L (include proxy, quote, interfaccia e test con 30 richieste di esempio).

### 6.2 "Perché così?": spiegazione del percorso in linguaggio naturale
- **Cosa fa.** Un pulsante nella scheda Tappe produce un racconto del viaggio: perché Kyoto prima di Osaka, perché 3 notti a Takayama, cosa cade nei giorni di festa, dove il budget è più incerto. Letto a voce alta per chi preferisce.
- **Come funziona.** Il risultato di `build()` e `planDays()` (già pronto, già corretto) va al modello con l'istruzione di spiegare solo ciò che c'è, citando le `fonte` dei dati. Nessun numero nuovo.
- **Modello.** Claude Haiku 5.5. **Costo**: meno di 1 centesimo. **Fallback**: le note già mostrate nelle Tappe. **Sforzo.** S.

### 6.3 Revisore del piano: critiche con un clic per applicarle
- **Cosa fa.** *"5 cambi di base in 10 notti: ogni spostamento costa mezza giornata"*, *"Kyoto cade nella Golden Week: hotel a +60%, valuta di spostarlo di 4 giorni"*, *"con atterraggio alle 20 la prima notte vicino all'aeroporto"*. Ogni critica ha un pulsante **Applica** che cambia i parametri e un **Confronta** che mette i due percorsi fianco a fianco nella scheda Confronto.
- **Come funziona.** Due strati: regole deterministiche nel motore (oggi già `warnings()`, da estendere: cambi troppo frequenti, festività, notti sopra il massimo, tratte stimate) e il modello che le arricchisce e propone i parametri alternativi in output strutturato. Il confronto lo fa il motore.
- **Modello.** Claude Sonnet 5.5. **Costo**: 2–4 centesimi. **Fallback**: le sole regole deterministiche. **Sforzo.** M.

### 6.4 Lettura delle prenotazioni: da screenshot o PDF ai parametri
- **Cosa fa.** L'utente incolla lo screenshot della conferma del volo o il PDF: l'app imposta date, aeroporti, orari di atterraggio e ritorno; dalla conferma di un hotel imposta base e notti; dal biglietto JR aggiunge la tratta alla scheda Da fare come "prenotato".
- **Come funziona.** Immagine o PDF come contenuto della richiesta, output strutturato con confidenza per campo; sotto una certa soglia l'app chiede conferma. Il file non viene conservato dal proxy.
- **Modello.** Claude Sonnet 5.5 (lettura di documenti). **Costo**: 1–3 centesimi. **Fallback**: inserimento manuale. **Sforzo.** M.

### 6.5 Chiedi al planner: domande sul viaggio e sul Giappone, con fonti
- **Cosa fa.** *"Conviene il JR Pass?"*, *"Che tempo fa a Takayama a fine ottobre?"*, *"Posso spedire le valigie da Kyoto a Hiroshima in un giorno?"*. Risposte ancorate ai dati del repository e al viaggio corrente, con la fonte di ogni affermazione; quando la domanda esce dai dati lo dice e offre una ricerca web.
- **Come funziona.** Prompt con i JSON in cache, il piano corrente e, su richiesta esplicita, lo strumento di ricerca web dell'API con domini consentiti (JR, Japan Guide, siti ufficiali). Risposta in streaming.
- **Modello.** Claude Sonnet 5.5. **Costo**: 2–5 centesimi, di più con la ricerca web. **Fallback**: la scheda Info utili. **Sforzo.** M.

### 6.6 Interessi in parole, mete in punteggio
- **Cosa fa.** Nel wizard, invece delle sole caselle, si può scrivere *"ci piacciono i mercati, la fotografia notturna e i giardini zen, non amiamo i parchi divertimento"*: le mete vengono ordinate di conseguenza e i tag si attivano da soli.
- **Come funziona.** Il modello mappa il testo libero sui tag di `catalogo.json` con pesi; il punteggio delle mete lo calcola il client. Una sola chiamata, leggera.
- **Modello.** Claude Haiku 5.5. **Costo**: meno di 1 centesimo. **Fallback**: i tag a mano. **Sforzo.** S.

### 6.7 Agente dati: i prezzi si aggiornano da soli, una persona approva
- **Cosa fa.** Ogni settimana un'attività programmata verifica `partenze.json` (voli per città e stagione), `parametri.json` (hotel, cibo, pass), `tratte.json` (tempi e prezzi), `eventi.json` (date festive dell'anno prossimo) e apre una **pull request** con il diff, la fonte e la data per ogni valore cambiato. Nessun merge automatico.
- **Come funziona.** GitHub Actions con cron, uno script Node che usa l'SDK Anthropic con lo strumento di ricerca web e output strutturato; `scripts/check-data.mjs` (0.3) valida il risultato prima di aprire la PR. I valori con fonte debole restano come commento nella PR, non nel JSON.
- **Modello.** Claude Opus 5.5 (poche chiamate, serve giudizio sulle fonti). **Costo**: qualche decina di centesimi a settimana. **Sforzo.** M. Dipende da 0.3 e 0.7.

### 6.8 Contenuti generati al build: più ricchi, in due lingue, offline
- **Cosa fa.** Per ogni meta: descrizione lunga, "quando andare", "da sapere" (chiusure, prenotazioni, costume); per ogni base: quartieri dove dormire con pro e contro; **frasario** per la modalità Oggi con pronuncia; descrizioni in inglese. Tutto committato in `app/data/generati/` e quindi disponibile offline e senza costo a runtime.
- **Come funziona.** Script Node eseguito a mano o dal workflow quando cambia `catalogo.json`; usa l'API Batches (metà prezzo, nessuna fretta). Ogni testo riporta la data di generazione e passa da una PR, così si rilegge prima di pubblicare.
- **Modello.** Claude Opus 5.5 via Batches. **Costo**: pochi euro per l'intero catalogo, una tantum. **Sforzo.** S.

### 6.9 Traduzione e frasario contestuale in viaggio
- **Cosa fa.** Nella modalità Oggi: *"chiedi se hanno posto per 4 senza prenotazione"* → frase in giapponese, lettura in romaji, pulsante per mostrarla a schermo grande. L'indirizzo dell'hotel in giapponese pronto da mostrare.
- **Come funziona.** Frasario statico generato al build (6.8) per le situazioni comuni, chiamata al modello solo per frasi nuove.
- **Modello.** Claude Haiku 5.5. **Costo**: meno di 1 centesimo. **Fallback**: frasario statico. **Sforzo.** S.

### 6.10 AI sul budget
- **Spiegazione delle differenze**: "Perché il percorso Alpi costa 400 € in più del Classico?" La differenza è calcolabile dal motore (più ryokan, più treni, basi più care); il modello la racconta in due frasi con i numeri già pronti. Claude Haiku 5.5, meno di 1 centesimo. **S**
- **Taglia il budget**: "porta il viaggio sotto i 2.000 € a persona toccando il meno possibile". Il modello propone 2–3 alternative come set di parametri in output strutturato, il motore le valuta, l'app le mostra con Applica e Confronta. È il revisore del piano (6.3) applicato ai soldi. Claude Sonnet 5.5, 2–4 centesimi. **M**
- **Lettura degli scontrini**: foto dello scontrino o del riepilogo della carta e la spesa entra nella categoria giusta, in yen, con il cambio del giorno (stessa infrastruttura di 6.4). Claude Sonnet 5.5, 1–2 centesimi. **S** dopo 6.4
- **Agente dati sui prezzi**: estensione di 6.7 alle voci oggi con fonte "Stima" (hotel medi per città, cibo, ingressi, pass), con la cadenza della tabella in 5.9. Nessun costo aggiuntivo rispetto a 6.7.

### Infrastruttura comune alle funzioni AI (prerequisito di 6.1–6.6, 6.9)
- **Proxy**: Cloudflare Worker in `worker/` nel repository, deploy con Wrangler da GitHub Actions. Un endpoint per funzione, schema di richiesta validato, chiave nel segreto del Worker.
- **Quote**: per IP e giornaliera totale in Workers KV (per esempio 30 richieste al giorno per IP, 2.000 totali); Turnstile invisibile contro i bot; messaggi chiari quando la quota è finita ("riprova domani oppure usa la tua chiave").
- **Cache dei prompt**: dati del repository e istruzioni fisse all'inizio del prompt, domanda e piano corrente alla fine; si verifica `cache_read_input_tokens` nei log del Worker.
- **Fallback di modello**: parametro `fallbacks` lato server attivo, così un rifiuto del classificatore di sicurezza non lascia l'utente senza risposta.
- **Valutazione**: 30–50 richieste di esempio per funzione con risultato atteso (`tests/ai/*.json`), eseguite a mano prima di cambiare prompt o modello; si misurano parametri corretti, mete inventate (devono essere zero), costo medio.
- **Trasparenza**: ogni risposta AI è etichettata, mostra il costo stimato nei log del Worker, e un'impostazione la disattiva del tutto.

---

## 7. Roadmap per release

Ordine per valore percepito e dipendenze. Ogni release è pubblicabile da sola e termina con test verdi, Lighthouse sopra soglia, changelog.

### v0.5 "Fondamenta" (2–3 settimane)
- Fase 0 completa (0.1–0.9).
- Cambio aggiornato dalla BCE (5.2), link profondi (5.2), dati con data e freschezza visibile su ogni prezzo (0.7, 5.9).
- Budget: valore mio per categoria, stile per categoria, shopping, sensibilità al cambio, scenari "e se" (5.8).
- Risultato: stessa app di oggi, ma testata, validata, misurata.

### v0.6 "Primo avvio" (2 settimane)
- Wizard, interessi come tag, più viaggi, singolare (5.1).
- Contenuti generati al build in italiano (6.8) per descrizioni e "da sapere".
- Budget più preciso: costi per base, stagionalità degli alloggi, ingressi per meta, costo di una notte in più per base (5.8).
- Pipeline dei prezzi: job settimanale hotel con Rakuten Travel e lettura di `app/data/prezzi/` con fallback (5.9).

### v1.0 "Assistente" (3–4 settimane)  ← prima release da far provare a un pubblico allargato
- Proxy, quote, BYOK (infrastruttura AI).
- Assistente di viaggio (6.1), "Perché così?" (6.2), interessi in parole (6.6).
- Scheda Voli (5.3) e meteo (5.2); job settimanale voli (5.9).
- Tetto di spesa (5.8) e "Taglia il budget" (6.10).
- Pagina di presentazione, Open Graph, inglese dell'interfaccia (5.7).

### v1.1 "Prenotazioni" (3 settimane)
- Scheda Da fare, calcolatore pass, esportazioni `.ics`, PDF, CSV (5.4).
- Lettura delle prenotazioni da screenshot e PDF (6.4).
- Revisore del piano (6.3).
- Budget: pass contro biglietti singoli, colonne stimato/prenotato/speso, esportazione CSV (5.8).

### v1.2 "Dati vivi" (2 settimane)
- Agente dati settimanale con PR (6.7); festività dell'anno esatto (5.2).
- Chiedi al planner con fonti (6.5).
- Agente dati esteso alle voci "Stima" del budget (6.10); raccolta anonima dei prezzi pagati (5.9).

### v1.5 "In viaggio" (4 settimane)
- Attività e piano B (5.5), modalità Oggi con meteo e frasario (5.5, 6.9), mappa con sfondo reale.
- Budget in viaggio: registrazione delle spese offline, curva prevista contro reale, valuta mista, lettura degli scontrini (5.8, 6.10).

### v2.0 "Insieme" (da decidere in base all'uso)
- Voti e spese di gruppo (5.6), cassa comune con saldo "chi deve a chi" (5.8); backend leggero solo se necessario.

---

## 8. Come misuriamo il successo

| Metrica | Oggi | Obiettivo v1.0 |
|---|---|---|
| Copertura test del motore (`app/js/engine/`) | 0 | ≥ 80% delle funzioni, snapshot dei 5 modelli |
| Errori JavaScript per 100 sessioni | sconosciuto | < 1 |
| Lighthouse (prestazioni / accessibilità) | da misurare | ≥ 90 / ≥ 95 |
| Utenti che completano il primo viaggio (wizard finito) | sconosciuto | ≥ 60% di chi apre l'app |
| Richieste all'assistente con parametri validi al primo colpo | n/d | ≥ 90% sulle 50 di esempio; mete inventate: 0 |
| Costo AI per utente attivo al mese | n/d | < 0,10 € |
| Dati più vecchi di 6 mesi | tutti dall'ottobre 2026 | nessuno (agente dati) |
| Voci di prezzo con fonte "Stima" | 9 su 15 | 0: ogni voce da API, fonte verificata o prezzi pagati |
| Età mediana dei prezzi di voli e hotel | fissa | < 2 settimane |

---

## 9. Rischi e come li gestiamo

- **Costi AI fuori controllo** → quote per IP e totali, Haiku dove basta, cache dei prompt, interruttore globale nel Worker, BYOK per gli utenti intensivi.
- **Il modello "inventa" mete o prezzi** → output strutturato con soli id esistenti, validazione client, numeri sempre dal motore, test con richieste di esempio prima di ogni cambio di prompt.
- **Dati sbagliati pubblicati** → validazione in CI, PR dell'agente dati sempre riviste da una persona, fonte e data su ogni valore.
- **Rottura dei link già condivisi** → test di retrocompatibilità su `?r=` in CI; `norm()` completa i parametri mancanti.
- **Complessità tecnica che cresce** → nessun framework finché i moduli ES bastano; si riconsidera (per esempio Vite) solo se i moduli superano una decina o serve TypeScript.
- **Dipendenze esterne gratuite che cambiano** (BCE, Open-Meteo, Nager) → ogni dato vivo ha il suo fallback statico nel repository e una cache nel service worker.

---

## 10. Prossimi passi concreti (le prime due settimane)

1. Creare `app/js/engine/` ed estrarre `build`, `planDays`, `shortest`, `order` con un primo file di test `tests/engine.test.mjs` sui 5 modelli di `percorsi.json` (0.1, 0.2).
2. Scrivere `scripts/check-data.mjs` e aggiungerlo al workflow come job che precede il deploy (0.3).
3. Aggiungere Playwright smoke test e Lighthouse CI (0.5, 0.6).
4. Campo `rilevato_il` e fonte su ogni prezzo con la freschezza visibile (0.7, 5.9); cambio dalla BCE con fallback (5.2); primo campo "il mio valore" nel budget (5.8).
5. Aprire la discussione di design dell'assistente: schema JSON dei parametri, 30 richieste di esempio con il risultato atteso, bozza del prompt. Questo lavoro non costa nulla e rende la v1.0 molto più rapida.
