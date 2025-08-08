// events_api.js (implementation phase)
(function(){
  console.log('[BOOT] events_api.js loaded');
  const ns = window.EventsAPI = window.EventsAPI || {};

  // Helpers that live in other modules/files
  function _titelopschoner(t){
    return (window.FormUI && window.FormUI.titelopschoner)
      ? window.FormUI.titelopschoner(t)
      : (window.titelopschoner ? window.titelopschoner(t) : t);
  }
  function _parseMeerdere(tekst){
    return window.parseMeerdereAfsprakenInRegel ? window.parseMeerdereAfsprakenInRegel(tekst) : [];
  }
  function _parseSingle(tekst){
    return window.parseTextToEvent ? window.parseTextToEvent(tekst) : { titel: '', datum: null, tijd: null };
  }

  // Check op conflicterende afspraken binnen 30 minuten
  // Controleer of er conflicterende afspraken zijn tussen start en end (timed en hele dag)
  async function checkConflictingEvents(start, end) {
    // start en end zijn Date objecten
    const timeMin = new Date(start.getTime() - 30 * 60000).toISOString();
    const timeMax = new Date(end.getTime() + 30 * 60000).toISOString();
    const res = await gapi.client.calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime'
    });
    if (!res.result.items) return false;
    let conflicts = res.result.items.filter(ev => {
      // Google Calendar API: hele dag events hebben alleen ev.start.date (geen dateTime)
      let evStart = ev.start.dateTime ? new Date(ev.start.dateTime) : new Date(ev.start.date + 'T00:00:00');
      let evEnd = ev.end.dateTime ? new Date(ev.end.dateTime) : new Date(ev.end.date + 'T23:59:59');
      // Overlap: ev eindigt NA start én ev begint VOOR end
      return evEnd > start && evStart < end;
    });
    if (conflicts.length > 0) {
      console.log('Conflicterende afspraken gevonden:', conflicts);
      return true;
    }
    return false;
  }

  function combineDateTime(datum, tijd) {
    if (!datum || !tijd) return undefined;
    const [hh, mm] = tijd.split(':').map(Number);
    const d = new Date(datum);
    d.setHours(hh, mm, 0, 0);
    return d.toISOString();
  }

  function berekenEindtijd(datum, tijd, duur) {
    if (!datum || !tijd) return undefined;
    const [hh, mm] = tijd.split(':').map(Number);
    const d = new Date(datum);
    d.setHours(hh, mm, 0, 0);
    d.setMinutes(d.getMinutes() + parseInt(duur || 60));
    return d.toISOString();
  }

  function getActueleAfspraken() {
    if (window._bewerkteAfspraken && Array.isArray(window._bewerkteAfspraken)) {
      return window._bewerkteAfspraken;
    }
    // Indien geen edits: parse opnieuw uit inputText
    const inputEl = document.getElementById('inputText');
    const tekst = inputEl ? inputEl.value : '';
    const tijdMatches = tekst.match(/(\d{1,2}[:.]\d{2})/g);
    if (tijdMatches && tijdMatches.length > 1) {
      return _parseMeerdere(tekst);
    }
    return [_parseSingle(tekst)];
  }

  async function addEvent() {
    if (!window.accessToken) {
      alert('Log eerst in met Google.');
      return;
    }
    let afspraken = getActueleAfspraken();
    const kleur = document.getElementById('kleur')?.value;
    const duur = parseInt(document.getElementById('duur')?.value);
    const heleDag = document.getElementById('heleDag')?.checked;
    // Hoofd-titel bepalen voor fallback
    let dagNamen = ['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag'];
    let dagRegex2 = dagNamen.join('|');
    const tekst = document.getElementById('inputText')?.value || '';
    let eersteBlok = tekst.split(new RegExp(`[\r\n\.]+|, (?=${dagRegex2})`, 'i')).find(r => new RegExp(`\b(${dagRegex2})\b`, 'i').test(r));
    let hoofdTitel = null;
    if (eersteBlok) {
      let dagMatch = eersteBlok.match(new RegExp(`^(.*?)\b(${dagRegex2})\b`, 'i'));
      if (dagMatch && dagMatch[1].trim().length > 0) {
        hoofdTitel = _titelopschoner(dagMatch[1].trim());
      }
    }
    // Fallback hoofd-titel toepassen
    afspraken = afspraken.map(afspraak => {
      let schoneTitel = _titelopschoner(afspraak.titel);
      if (!schoneTitel || schoneTitel === 'Onbekende afspraak') {
        schoneTitel = hoofdTitel ? hoofdTitel : 'Onbekende afspraak';
      }
      return { ...afspraak, titel: schoneTitel };
    });

    let toegevoegd = 0;
    let details = '';
    for (let afspraak of afspraken) {
      let start, end;
      // Google Calendar colorId moet een string zijn van 1 t/m 11 (geen undefined/null)
      let kleurEvent = undefined;
      if (afspraak.kleur === 'random' || (!afspraak.kleur && kleur === 'random')) {
        // Kies nu pas een random kleur uit ALLE opties van genereerKleurOpties
        const kleuren = ['11','6','5','10','2','9','7','3','4','1','8']; // match dropdown volgorde
        kleurEvent = kleuren[Math.floor(Math.random()*kleuren.length)];
      } else if (afspraak.kleur && afspraak.kleur !== 'random') {
        kleurEvent = String(afspraak.kleur);
      } else if (kleur && kleur !== 'random') {
        kleurEvent = String(kleur);
      } else {
        kleurEvent = '1'; // fallback: roze
      }
      let duurEvent = afspraak.duur ? parseInt(afspraak.duur) : (duur || 60);
      let datum = afspraak.datum instanceof Date ? afspraak.datum : new Date(afspraak.datum);
      let tijd = afspraak.tijd;
      // Gebruik altijd heleDag checkbox om te bepalen of het een all-day event is
      if (heleDag) {
        start = { date: datum.toISOString().slice(0, 10) };
        let endDate = new Date(datum);
        endDate.setDate(endDate.getDate() + 1);
        end = { date: endDate.toISOString().slice(0, 10) };
      } else if (tijd && tijd.match(/^\d{1,2}:\d{2}$/)) {
        let [hh, mm] = tijd.split(':').map(Number);
        datum.setHours(hh, mm, 0, 0);
        start = { dateTime: datum.toISOString(), timeZone: 'Europe/Amsterdam' };
        let eind = new Date(datum.getTime() + duurEvent * 60000);
        end = { dateTime: eind.toISOString(), timeZone: 'Europe/Amsterdam' };
      } else {
        // fallback: geen tijd en niet hele dag, behandel als hele dag
        start = { date: datum.toISOString().slice(0, 10) };
        let endDate = new Date(datum);
        endDate.setDate(endDate.getDate() + 1);
        end = { date: endDate.toISOString().slice(0, 10) };
      }
      let event = {
        summary: afspraak.titel,
        start,
        end,
        colorId: kleurEvent,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 10 },
            { method: 'popup', minutes: 30 },
            { method: 'popup', minutes: 24 * 60 }, // 1 dag
            { method: 'popup', minutes: 2 * 24 * 60 } // 2 dagen
          ]
        }
      };
      // Controleer op conflicten vóór toevoegen
      let conflict = await checkConflictingEvents(
        tijd && tijd.match(/^\d{1,2}:\d{2}$/) ? datum : new Date(datum.toISOString().slice(0,10) + 'T00:00:00'),
        tijd && tijd.match(/^\d{1,2}:\d{2}$/) ? new Date(datum.getTime() + duurEvent * 60000) : new Date(datum.toISOString().slice(0,10) + 'T23:59:59')
      );
      if (conflict) {
        if (!confirm(`Let op: er is al een afspraak rond deze tijd (${afspraak.titel} - ${afspraak.tijd || start.date}). Toch toevoegen?`)) {
          details += `\nNiet toegevoegd (conflict): ${event.summary}`;
          continue;
        }
      }
      try {
        await gapi.client.calendar.events.insert({ calendarId: 'primary', resource: event });
        toegevoegd++;
        details += `\nTitel: ${event.summary}\nDatum: ${heleDag ? start.date : datum.toLocaleString()}\nTijd: ${afspraak.tijd || ''}\nKleur: ${kleur}\nDuur: ${duur} min\n---`;
      } catch (e) {
        details += `\nFout bij toevoegen van afspraak: ${event.summary} (${e.message})`;
      }
    }
    alert(`${toegevoegd} afspraak/afspraken toegevoegd aan je Google Agenda!${details}`);
  }

  // Bind to namespace
  ns.checkConflictingEvents = checkConflictingEvents;
  ns.combineDateTime = combineDateTime;
  ns.berekenEindtijd = berekenEindtijd;
  ns.getActueleAfspraken = getActueleAfspraken;
  ns.addEvent = addEvent;

  // Backward compatibility on window
  window.checkConflictingEvents = window.checkConflictingEvents || checkConflictingEvents;
  window.combineDateTime = window.combineDateTime || combineDateTime;
  window.berekenEindtijd = window.berekenEindtijd || berekenEindtijd;
  window.getActueleAfspraken = window.getActueleAfspraken || getActueleAfspraken;
  window.addEvent = window.addEvent || addEvent;

  console.log('[OK] EventsAPI ready');
})();
