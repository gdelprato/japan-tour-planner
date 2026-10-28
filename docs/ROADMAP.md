# Roadmap: Japan Tour Planner per qualsiasi viaggio in Giappone

## Contesto
Oggi l'app è cucita sul viaggio di Giacomo: ottobre 2027, 5 persone, partenza da Milano, arrivo a Tokyo, percorso di partenza già scelto. L'obiettivo è un **planner generico per il Giappone**: chiunque (amici e conoscenti, gratis, senza account, link condivisibile) crea il proprio viaggio scegliendo date, durata, numero di viaggiatori, città di partenza e stile. Il punto di forza resta il Giappone (mete, treni, foliage, eventi), quindi si riusa quasi tutto il codice.

Architettura attuale da riusare: logica in `js/app.js` (`build()` → `planDays()` → `drawMap/drawRoute/drawCalendar/drawCompare/drawBudget/drawInfo`), dati in `data/*.json` caricati da `js/dash-shim.js` (stato in URL `?r=` + localStorage), PWA offline (`sw.js`), deploy GitHub Pages.

---

## Fase 1 — Togliere il "viaggio di Giacomo" dal codice (fondamenta) ✅ fatta
Valori oggi fissi e cosa diventano:

| Dove | Oggi | Diventa |
|---|---|---|
| `app.js:69` `norm()` | partenza default `2027-10-13` | nessuna data: onboarding la chiede (default proposto: tra ~6 mesi) |
| `index.html:53` input `#arrivo` | `min/max` 2027 | da oggi a +2 anni, calcolati in JS |
| `app.js:816, 830-832` `drawBudget()` | "In 5 persone", `* 5` | nuovo parametro `persone` (1–10) in `params` |
| `app.js:147` `build()` | `ensure('Tokyo')`, aeroporti Haneda/Kansai | parametri `arrivo` / `ritorno` scelti tra aeroporti (`data/aeroporti.json`: NRT, HND, KIX, NGO, FUK, CTS) |
| `parametri.json` voce `voli` | "Volo Milano-Giappone" | `data/partenze.json`: città di partenza → range prezzo volo per stagione |
| `parametri.json` hotel | "camere condivise" fisso | parametro `stile` (economico / medio / comfort) che sceglie i range min/max |
| `eventi.json` | date 2027 fisse | eventi ricorrenti (`MM-DD` come già `stagione.json`) + festività per anno |
| `info.json` | "in 5 persone", "maggio-luglio 2027" | testi generici; scadenze calcolate dalla data di partenza (es. "3-5 mesi prima → da marzo a maggio") |
| `params.json`, `percorsi.json` | percorso di Giacomo | **modelli di viaggio**: "Classico 10 giorni", "Prima volta 14 giorni", "Alpi e onsen", "Kyushu"… |
| `index.html:163` footer, `README.md`, `manifest.webmanifest` | riferimenti al viaggio | testi generici + data di aggiornamento dei dati |

- **Stagionalità generica**: oggi foliage soltanto. Aggiungere `stagione.json` per sakura, piogge (tsuyu), tifoni, neve, così avvisi e consigli valgono per qualsiasi mese.
- **Retrocompatibilità link**: `norm()` completa i parametri mancanti, così i link `?r=` già condivisi continuano a funzionare.

## Appunti dal test della Fase 1
- [x] **Durata massima**: notti da 3 a 365, con il numero anche scrivibile a mano nel pannello del viaggio.
- [x] **Mappa per regioni**: accanto a Percorso e Giappone un menu "Regioni" con una vista per ogni regione del catalogo (Hokkaido, Tohoku, Tokyo e dintorni, Alpi e Giappone centrale, Kansai, Chugoku e Shikoku, Kyushu, Okinawa), inquadrata in automatico sulle sue mete.

## Preconcetti ereditati dalla dashboard iniziale ✅ corretti
- Takkyubin non più sempre nel budget: scelta "Bagagli" (spediti tra gli hotel / sempre con voi).
- Notti in più distribuite in base a quanto c'è da fare, non ai gusti del gruppo originale (`priorita_extra` solo come spareggio).
- Alloggio: sconto a persona da 3 persone in su (`camera_gruppo`), oltre al rincaro per chi viaggia da solo.
- Orario di atterraggio e del volo di ritorno (mattina / pomeriggio o sera) invece del solo arrivo serale.
- Cambio yen/euro modificabile nel budget.
- Descrizioni del catalogo senza riferimenti a ottobre; tolto il campo `default` del vecchio percorso.
- Tratte stimate e tratte in aereo segnalate nelle tappe e nel calendario.
- Rimossi i residui della dashboard (`mark()`, attributi `data-*`, `colorsReady`, testo inglese "Failed to load").
- Restano da valutare: più valute, tono al singolare per chi viaggia da solo.

## Fase 2 — Onboarding e modelli
- Primo avvio: wizard in 4 passi (date e durata → quanti siete e da dove partite → stile e interessi → modello di partenza o "da zero"). Riusa il pannello `#settings`.
- **Interessi** (templi, natura, onsen, cibo, città, anime, famiglia) come tag in `catalogo.json` → il picker evidenzia le mete adatte.
- **Più viaggi** sullo stesso dispositivo (lista viaggi in localStorage, riusando la logica di `PKEY` del confronto).

## Fase 3 — Voli e posti
- Tab "Voli": stima per città di partenza e mese, confronto **open-jaw** (arrivo Tokyo / ripartenza Osaka vs ritorno in treno, con `shortest()` su `tratte`), link di ricerca precompilati (Google Flights / Skyscanner con date e aeroporti).
- Consigli posti statici (`data/posti.json`) per tipo di aereo e numero di persone; Shinkansen: lato Fuji, posti con spazio bagagli.

## Fase 4 — Prenotazioni e scadenze
- Tab "Da fare" generato dal percorso e dalla data: ryokan, musei a prenotazione (Ghibli, teamLab), posti Shinkansen nei giorni festivi, eSIM, assicurazione, JR Pass sì/no.
- Stato per voce (da fare / prenotato + codice), countdown in `#takeaway`, export **.ics**.
- **Calcolatore JR Pass e pass regionali**: somma i biglietti delle tratte vs prezzo dei pass.

## Fase 5 — Giornata per giornata e "in viaggio"
- `planDays()` esteso con attività (`data/attivita.json`), orari, chiusure, piano B per pioggia; stampa/PDF ed export .ics.
- Modalità "Oggi" durante il viaggio: treni del giorno, indirizzo hotel in giapponese, frasi utili.

## Fase 6 — Gruppo (opzionale)
- Voti sulle mete e spese condivise con saldo "chi deve a chi". Prima versione senza server (voti via link); backend leggero solo se serve davvero.

## Trasversale "da app professionale"
- Dividere `app.js` (58 KB) in moduli per tab man mano che si aggiungono sezioni.
- Controllo automatico dei JSON nel workflow `.github/workflows/pages.yml` prima del deploy; versione `CACHE` di `sw.js` generata al deploy.
- Data di aggiornamento visibile su ogni prezzo, avviso se il dato è vecchio.
- Inglese oltre all'italiano (testi in un dizionario `i18n`), accessibilità.
- Agente prezzi (attività programmata settimanale che aggiorna i range dei voli in `partenze.json`): dopo la fase 3.

---

## Ordine di lavoro
Fase 1 → 2 → 3 → 4 → 5 → 6. Ogni fase è un commit separato sul branch `claude/peaceful-mendel-ildi8u`, pubblicabile da sola. **Fase 1 completata, prossima la Fase 2.** Nota: aeroporti e stili sono costanti in `js/app.js` (`AIR`, `STILI`) invece di file JSON separati; l'ordine delle tappe ora è calcolato per avere meno ore di treno tra arrivo e ritorno.

## Verifica (per ogni fase)
- `python3 -m http.server 8000` + Playwright (Chromium preinstallato): nessun errore in console, rendering a 390px e desktop.
- Fase 1: `grep -n "2027\|Milano\|\* 5\|5 persone"` su `js/`, `index.html`, `data/` non trova più valori fissi; cambiando persone/date/aeroporti budget, calendario e avvisi cambiano coerentemente.
- Un vecchio link `?r=` (percorso di partenza attuale) si apre ancora con lo stesso percorso.
- Offline: il service worker serve anche i nuovi JSON (`aeroporti`, `partenze`, ecc.).
