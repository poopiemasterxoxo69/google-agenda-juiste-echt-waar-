// Globale accessToken zodat deze overal beschikbaar is (beheerd in index.html)
window.accessToken = window.accessToken || null;

// Login, tokenClient en profiel UI-afhandeling staan nu in index.html

// Start login/init als DOM klaar is en Google geladen is

document.addEventListener('DOMContentLoaded', function() {
  // Voeg listeners toe voor knoppen (login wordt beheerd in index.html)
  const herkenBtn = document.getElementById("herkenButton");
  if (herkenBtn) herkenBtn.addEventListener("click", parseEnToon);
  const voegToeBtn = document.getElementById("voegToeButton");
  if (voegToeBtn) voegToeBtn.addEventListener("click", addEvent);

  // Bottom nav bar functionaliteit
  const navAfspraak = document.getElementById('nav-afspraak');
  const navAgenda = document.getElementById('nav-agenda');
  const agendaView = document.getElementById('agendaView');
  const mainContent = document.querySelector('body > :not(#agendaView):not(nav):not(#bottom-nav)');

  function showAfspraakMaken() {
    if (agendaView) agendaView.style.display = 'none';
    // Toon alle hoofd-content behalve agendaView, nav en houd FAB zichtbaar
    document.querySelectorAll('body > *:not(#agendaView):not(nav):not(#bottom-nav):not(#agenda-plus-btn)').forEach(el => {
      if (el.id !== 'bottom-nav') el.style.display = '';
    });
    if (navAfspraak) navAfspraak.style.color = '#27ae60';
    if (navAgenda) navAgenda.style.color = '#888';
  }
  window.weekOffset = typeof window.weekOffset === 'number' ? window.weekOffset : 0;
  function showAgenda() {
    if (agendaView) agendaView.style.display = '';
    // Verberg alle hoofd-content behalve agendaView, nav en houd FAB zichtbaar
    document.querySelectorAll('body > *:not(#agendaView):not(nav):not(#bottom-nav):not(#agenda-plus-btn)').forEach(el => {
      if (el.id !== 'bottom-nav') el.style.display = 'none';
    });
    if (navAfspraak) navAfspraak.style.color = '#888';
    if (navAgenda) navAgenda.style.color = '#27ae60';
    buildAgendaGrid();
  }

  function buildAgendaGrid() {
    // De echte implementatie staat in agenda_ui.js
    if (window.AgendaUI && typeof window.AgendaUI.buildAgendaGrid === 'function') {
      return window.AgendaUI.buildAgendaGrid();
    }
    if (typeof window.buildAgendaGrid === 'function' && window.buildAgendaGrid !== buildAgendaGrid) {
      return window.buildAgendaGrid();
    }
    console.error('[Agenda] buildAgendaGrid implementation not loaded yet');
  }

  if (navAfspraak) navAfspraak.addEventListener('click', showAfspraakMaken);
  if (navAgenda) navAgenda.addEventListener('click', showAgenda);
  // Start met afspraak-maken scherm
  showAfspraakMaken();
});

// Parsing delegates: forward to Parsing namespace
function todayWithoutTime() {
  if (window.Parsing && typeof window.Parsing.todayWithoutTime === 'function') {
    return window.Parsing.todayWithoutTime();
  }
  console.error('[Parsing] todayWithoutTime not loaded');
  const d = new Date(); d.setHours(0,0,0,0); return d;
}

function opschonenTitel(tekst) {
  if (window.Parsing && typeof window.Parsing.opschonenTitel === 'function') {
    return window.Parsing.opschonenTitel(tekst);
  }
  console.error('[Parsing] opschonenTitel not loaded');
  return (tekst || '').trim();
}

// parseTextToEvent: herkent (een) dag en tijd in de tekst
function typoCorrectieOverVoorKwartHalf(tekst) {
  if (window.Parsing && typeof window.Parsing.typoCorrectieOverVoorKwartHalf === 'function') {
    return window.Parsing.typoCorrectieOverVoorKwartHalf(tekst);
  }
  console.error('[Parsing] typoCorrectieOverVoorKwartHalf not loaded');
  return tekst;
}

function maandTypoCorrectie(tekst) {
  if (window.Parsing && typeof window.Parsing.maandTypoCorrectie === 'function') {
    return window.Parsing.maandTypoCorrectie(tekst);
  }
  console.error('[Parsing] maandTypoCorrectie not loaded');
  return tekst;
}

function corrigeerDagTypo(tekst) {
  if (window.Parsing && typeof window.Parsing.corrigeerDagTypo === 'function') {
    return window.Parsing.corrigeerDagTypo(tekst);
  }
  console.error('[Parsing] corrigeerDagTypo not loaded');
  return tekst;
}

function parseTextToEvent(text, weekContext = null) {
  if (window.Parsing && typeof window.Parsing.parseTextToEvent === 'function') {
    return window.Parsing.parseTextToEvent(text, weekContext);
  }
  console.error('[Parsing] parseTextToEvent not loaded');
  return { titel: opschonenTitel(text), datum: null, tijd: null };
}

// Nieuwe functie: detecteert meerdere afspraken op aparte regels of met punten of dagwissel na komma
function parseMeerdereAfsprakenInRegel(tekst) {
  if (window.Parsing && typeof window.Parsing.parseMeerdereAfsprakenInRegel === 'function') {
    return window.Parsing.parseMeerdereAfsprakenInRegel(tekst);
  }
  console.error('[Parsing] parseMeerdereAfsprakenInRegel not loaded');
  return [];
}

// Titelopschoner: haalt tijden, datums, 'datum', 'tijd' en andere bekende labels uit tekst
function titelopschoner(tekst) {
  if (window.Parsing && typeof window.Parsing.opschonenTitel === 'function') {
    return window.Parsing.opschonenTitel(tekst);
  }
  console.error('[Parsing] titelopschoner not loaded');
  return (tekst || '').trim();
}

// Functie die wordt aangeroepen bij het klikken op "Herken gegevens"
function updateAfsprakenBufferNaEdit(afspraken) {
  if (window.FormUI && typeof window.FormUI.updateAfsprakenBufferNaEdit === 'function') {
    return window.FormUI.updateAfsprakenBufferNaEdit(afspraken);
  }
  console.error('[FormUI] updateAfsprakenBufferNaEdit implementation not loaded yet');
}

function kleurLabelToe(kleur) {
  if (window.FormUI && typeof window.FormUI.kleurLabelToe === 'function') {
    return window.FormUI.kleurLabelToe(kleur);
  }
  console.error('[FormUI] kleurLabelToe implementation not loaded yet');
}

function genereerKleurOpties(geselecteerd) {
  if (window.FormUI && typeof window.FormUI.genereerKleurOpties === 'function') {
    return window.FormUI.genereerKleurOpties(geselecteerd);
  }
  console.error('[FormUI] genereerKleurOpties implementation not loaded yet');
}

function genereerTijdOpties(geselecteerd) {
  if (window.FormUI && typeof window.FormUI.genereerTijdOpties === 'function') {
    return window.FormUI.genereerTijdOpties(geselecteerd);
  }
  console.error('[FormUI] genereerTijdOpties implementation not loaded yet');
}

function deleteAllAfspraken() {
  if (window.FormUI && typeof window.FormUI.deleteAllAfspraken === 'function') {
    return window.FormUI.deleteAllAfspraken();
  }
  console.error('[FormUI] deleteAllAfspraken implementation not loaded yet');
}

function formatDatumNederlands(datum) {
  if (window.FormUI && typeof window.FormUI.formatDatumNederlands === 'function') {
    return window.FormUI.formatDatumNederlands(datum);
  }
  console.error('[FormUI] formatDatumNederlands implementation not loaded yet');
}

function parseEnToon(bewerkte=false) {
  if (window.FormUI && typeof window.FormUI.parseEnToon === 'function') {
    return window.FormUI.parseEnToon(bewerkte);
  }
  console.error('[FormUI] parseEnToon implementation not loaded yet');
}


document.addEventListener("DOMContentLoaded", () => {
  const knop = document.getElementById("herkenButton");
  if (knop) {
    knop.addEventListener("click", parseEnToon);
  }
  const voegToeButton = document.getElementById("voegToeButton");
  if (voegToeButton) {
    voegToeButton.addEventListener("click", addEvent);
  }
});


// Check op conflicterende afspraken binnen 30 minuten
// Controleer of er conflicterende afspraken zijn tussen start en end (timed en hele dag)
async function checkConflictingEvents(start, end) {
  if (window.EventsAPI && typeof window.EventsAPI.checkConflictingEvents === 'function') {
    return window.EventsAPI.checkConflictingEvents(start, end);
  }
  console.error('[EventsAPI] checkConflictingEvents implementation not loaded yet');
}

function combineDateTime(datum, tijd) {
  if (window.EventsAPI && typeof window.EventsAPI.combineDateTime === 'function') {
    return window.EventsAPI.combineDateTime(datum, tijd);
  }
  console.error('[EventsAPI] combineDateTime implementation not loaded yet');
}

function berekenEindtijd(datum, tijd, duur) {
  if (window.EventsAPI && typeof window.EventsAPI.berekenEindtijd === 'function') {
    return window.EventsAPI.berekenEindtijd(datum, tijd, duur);
  }
  console.error('[EventsAPI] berekenEindtijd implementation not loaded yet');
}

// Voeg afspraken toe aan Google Agenda
function getActueleAfspraken() {
  if (window.EventsAPI && typeof window.EventsAPI.getActueleAfspraken === 'function') {
    return window.EventsAPI.getActueleAfspraken();
  }
  console.error('[EventsAPI] getActueleAfspraken implementation not loaded yet');
}

async function addEvent() {
  if (window.EventsAPI && typeof window.EventsAPI.addEvent === 'function') {
    return window.EventsAPI.addEvent();
  }
  console.error('[EventsAPI] addEvent implementation not loaded yet');
}

// Handmatige afspraak toevoegen verplaatst naar manual_plus.js (FAB handler)


(function testTypoCorrectieOverVoorKwartHalf() {
  const testCases = [
    // over
    ["ovr", "over"], ["oveer", "over"], ["oevr", "over"], ["ovre", "over"], ["oevre", "over"], ["ober", "over"], ["ove", "over"], ["iver", "over"], ["obver", "over"],
    // voor
    ["vor", "voor"], ["foor", "voor"], ["vooor", "voor"], ["vooe", "voor"], ["voer", "voor"], ["voof", "voor"], ["voot", "voor"], ["vopr", "voor"], ["v0or", "voor"], ["vorr", "voor"], ["vdor", "voor"],
    // kwart
    ["kwrat", "kwart"], ["kwarrt", "kwart"], ["kwartt", "kwart"], ["kwartd", "kwart"], ["quwart", "kwart"], ["kwwart", "kwart"], ["kwat", "kwart"], ["kqart", "kwart"], ["kwarrd", "kwart"], ["kwakt", "kwart"], ["kwaet", "kwart"],
    // half
    ["hlf", "half"], ["hafl", "half"], ["hallf", "half"], ["hslf", "half"], ["halb", "half"], ["halv", "half"], ["hqlf", "half"], ["halff", "half"], ["hslv", "half"], ["halc", "half"], ["halg", "half"]
  ];
  let allPassed = true;
  for (const [input, expected] of testCases) {
    const result = typoCorrectieOverVoorKwartHalf(input);
    if (result !== expected) {
      console.error(`❌ Fout: '${input}' werd '${result}' i.p.v. '${expected}'`);
      allPassed = false;
    }
  }
  // Test zin met meerdere typos
  const multiResult = typoCorrectieOverVoorKwartHalf('ovr vor kwrat hlf');
  if (multiResult !== 'over voor kwart half') {
    console.error(`❌ Fout: 'ovr vor kwrat hlf' werd '${multiResult}' i.p.v. 'over voor kwart half'`);
    allPassed = false;
  }
  if (allPassed) {
    console.log('✅ Alle typoCorrectieOverVoorKwartHalf tests geslaagd!');
  }
})();