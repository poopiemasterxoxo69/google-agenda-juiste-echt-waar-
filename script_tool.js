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

// Hulpfuncties blijven ongewijzigd:
function todayWithoutTime() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function opschonenTitel(tekst) {
  let t = tekst.toLowerCase();
  const woordenWeg = [
    "januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december",
    "kwart","over","voor","half","uur","u","om","tijd","datum",
    "’s ochtends","’s middags","’s avonds","s ochtends","s middags","s avonds"
  ];
  for (let woord of woordenWeg) {
    const re = new RegExp("\\b" + woord + "\\b", "gi");
    t = t.replace(re, "");
  }
  t = t.replace(/\b\d+\b/g, "");
  t = t.replace(/\d{1,2}[:.]\d{2}/g, "");
  t = t.replace(/[:\\-]/g, "");
  t = t.replace(/\s+/g, " ").trim();
  if (t.length > 0) {
    t = t.charAt(0).toUpperCase() + t.slice(1);
  } else {
    t = "Onbekende afspraak";
  }
  return t;
}

// parseTextToEvent: herkent (een) dag en tijd in de tekst
function typoCorrectieOverVoorKwartHalf(tekst) {
  // Stap 1: Voeg spaties toe tussen getal en tijdwoord als ze aan elkaar geplakt zijn of ontbreken
  tekst = tekst.replace(/(\d+)\s*([a-z]{2,8})\s*(\d+)/gi, (match, p1, p2, p3) => {
    // Corrigeer typo in tijdwoord vóór spatieherkenning
    const tijdwoorden = [
      "over", "ovr", "oveer", "oevr", "ovre", "oevre", "ober", "ove", "ive", "obver", "iver",
      "voor", "vor", "foor", "vooor", "vooe", "voer", "voof", "voot", "vopr", "v0or", "vorr", "vdor",
      "kwart", "kwrat", "kwarrt", "kwartt", "kwartd", "quwart", "kwwart", "kwat", "kqart", "kwrat", "kwarrd", "kwakt", "kwaet",
      "half", "hlf", "hafl", "hallf", "hslf", "halb", "halv", "hqlf", "halff", "hslv", "halc", "halg"
    ];
    if (tijdwoorden.includes(p2.toLowerCase())) {
      return `${p1} ${p2} ${p3}`;
    }
    return match;
  });
  const typoMap = {
    over: ["over", "ovr", "oveer", "oevr", "ovre", "oevre", "ober", "ove", "oveer", "iver", "obver", "iver"],
    voor: ["voor", "vor", "foor", "vooor", "vooe", "voer", "voof", "voot", "vopr", "v0or", "vorr", "vdor"],
    kwart: ["kwart", "kwrat", "kwarrt", "kwartt", "kwartd", "quwart", "kwwart", "kwat", "kqart", "kwrat", "kwarrd", "kwakt", "kwaet"],
    half: ["half", "hlf", "hafl", "hallf", "hslf", "halb", "halv", "hqlf", "halff", "hslv", "halc", "halg"],
    maandag: ["maandag","mandag","manndag","maandaag","maadng","maanadg","maadng","mandaag","maanadg","manndag","maadnag","maadnng","maadnaag","maadan","manndaag","maanndag","manadg","manadng","maanadg","mannddg","mandaag"],
    dinsdag: ["dinsdag","dinsdaag","dinsdg","dinsdahg","dinsdaag","dinsdagg","dinsdg","dinstag","dinsdsg","dinsddag","dinsdah","dinstag","dinsdg","dinsag","dinsdagh","dinsdagg","dinsdg","dinsadg","dinsdagh","dinsdgg"],
    woensdag: ["woensdag","woensdaag","woensdg","woensdahg","woensdag","woensddag","wonsdag","woensadg","woensdga","woensdg","woendag","woensdag","woensdgg","woendsag","woenstag","woensdg","woensdg","woensddag","woensdahg"],
    donderdag: ["donderdag","donerdag","donderdga","donderdahg","donderdgg","donderdah","donderdahg","donerdgg","donedrag","donderdgg","donderdgh","dondardag","donerdag","donderdgg","donderdahg","donderdgg","donerdg","donderdgg","donderdahg"],
    vrijdag: ["vrijdag","vriijdag","vriidag","vrijdagg","vrijdagh","vrijdag","vriidag","vrijdagh","vrijdagg","vrijdajg","vrijdag","vrijdaj","vrijdag","vrjidag","vrijdagh","vrijdajg","vrjidag","vrijdja","vrijdajg","vrijdagh"],
    zaterdag: ["zaterdag","zaterdahg","zaterdg","zaterddag","zaaterdag","zatterdag","zateradg","zaterdagg","zaterdga","zaterdgg","zatedrag","zateerdag","zaterdga","zaterdgg","zaterdagh","zateerdag","zaterdga","zaterdag","zaterdgg","zateradg"],
    zondag: ["zondag","zonddag","zondag","zondagg","zondahg","zondag","zonndag","zodnag","zondag","zonndag","zondgg","zondag","zodnag","zondahg","zonndagg","zondag","zonddagg","zonndag","zondg","zondahg"]
  };
  let t = tekst;
  for (const [correct, typos] of Object.entries(typoMap)) {
    for (const typo of typos) {
      t = t.replace(new RegExp("\\b" + typo + "\\b", "gi"), correct);
    }
  }
  return t;
}

function maandTypoCorrectie(tekst) {
  const maandTypoMap = {
    januari: ["januri", "januai", "janurai", "jnauari", "januarie", "janari", "janueri", "januair", "janurari"],
    februari: ["feburari", "februai", "febrauri", "febuary", "februrai", "februarie", "ferbruari", "febraui", "febuari", "febrari"],
    maart: ["mart", "maert", "maartt", "marrrt", "maat", "maaat", "maar", "maars", "maatr", "mraat"],
    april: ["aprl", "appril", "arpil", "apirl", "aprill", "aprli", "aprril", "aprel", "aprik"],
    mei: ["mi", "meei", "meii", "mey", "meie", "mii", "meiee", "mee"],
    juni: ["jni", "juuni", "junni", "jnui", "juniie", "juno", "jui", "junu", "jnni"],
    juli: ["julli", "juuli", "jly", "jli", "julliie", "juliie", "julie", "julii", "juil"],
    augustus: ["augstus", "augusts", "agustus", "augustsu", "agusts", "augutus", "augusuts", "augst", "agustuss", "auggustus"],
    september: ["septmber", "septemer", "septermber", "septembr", "septmbr", "setember", "septembrer", "septembe", "septber", "seotember"],
    oktober: ["oktber", "ocotber", "okotber", "oktobr", "oktoer", "okober", "octber", "oktobber", "oktobeer", "otkober"],
    november: ["novmber", "novembr", "novemer", "novmebr", "noveber", "novembe", "novembrer", "nvoember", "novebmer", "novemebr"],
    december: ["decmber", "descember", "decembre", "desembre", "deecember", "deceber", "desmber", "decemebr", "decembber", "decembee"]
  };
  let t = tekst;
  for (const [maand, typos] of Object.entries(maandTypoMap)) {
    for (const typo of typos) {
      t = t.replace(new RegExp("\\b" + typo + "\\b", "gi"), maand);
    }
  }
  return t;
}

function corrigeerDagTypo(tekst) {
  // Mapping van typo's naar correcte dag
  const dagTypoMap = {
    // maandag
    'mandag': 'maandag', 'maandg': 'maandag', 'maadnag': 'maandag',
    // dinsdag
    'dindsdag': 'dinsdag', 'dinsdaag': 'dinsdag', 'dinsag': 'dinsdag',
    // woensdag
    'woensdg': 'woensdag', 'woensag': 'woensdag', 'woensdah': 'woensdag', 'wonsdag': 'woensdag',
    // donderdag
    'donderdg': 'donderdag', 'donderag': 'donderdag', 'donderdaag': 'donderdag', 'donerdag': 'donderdag',
    // vrijdag
    'vrydag': 'vrijdag', 'vijrdag': 'vrijdag', 'vijdaag': 'vrijdag', 'vrjidag': 'vrijdag',
    // zaterdag
    'zaterag': 'zaterdag', 'zaterdg': 'zaterdag', 'zaterdah': 'zaterdag', 'zaterdaag': 'zaterdag',
    // zondag
    'zondg': 'zondag', 'zondagg': 'zondag'
  };
  let t = tekst;
  for (const [typo, goed] of Object.entries(dagTypoMap)) {
    const re = new RegExp(`\\b${typo}\\b`, 'gi');
    t = t.replace(re, goed);
  }
  return t;
}

function parseTextToEvent(text, weekContext = null) {
  text = corrigeerDagTypo(text);
  text = typoCorrectieOverVoorKwartHalf(text);
  text = maandTypoCorrectie(text);
  const origineleTekst = text.toLowerCase();
  let datum = null;
  let weeknr = null;
  const dagen = {
    zondag: 0, maandag: 1, dinsdag: 2, woensdag: 3, donderdag: 4,
    vrijdag: 5, zaterdag: 6
  };
  const vandaag = new Date();
  // Weeknummer parsing
  const weekMatch = text.match(/week\s*(\d{1,2})/i);
  if (weekMatch) {
    weeknr = parseInt(weekMatch[1]);
  }
  let gevondenDag = null;
  for (let dagNaam in dagen) {
    if (origineleTekst.includes(dagNaam)) {
      const vandaagDag = vandaag.getDay();
      const doelDag = dagen[dagNaam];
      let verschil = doelDag - vandaagDag;
      if (verschil <= 0) verschil += 7;
      gevondenDag = dagNaam;
      datum = new Date(todayWithoutTime());
      datum.setDate(datum.getDate() + verschil);
      break;
    }
  }
  // Flexibele datum/tijd parsing
  const datumRegex = /(?:datum[:\s]*)?(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?|(?:datum[:\s]*)?(\d{1,2})\s+(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)(?:\s+(\d{4}))?/i;
  const tijdLabelRegex = /tijd[:\s]*([0-9]{1,2}[:.][0-9]{2})/i;
  const dateMatch = datumRegex.exec(origineleTekst);
  let tijdLabelMatch = tijdLabelRegex.exec(origineleTekst);
  let tijdLabel = tijdLabelMatch ? tijdLabelMatch[1].replace('.', ':') : null;
  if (dateMatch) {
    if (dateMatch[1] && dateMatch[2]) {
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]) - 1;
      const year = dateMatch[3] ? parseInt(dateMatch[3]) : new Date().getFullYear();
      datum = new Date(year, month, day);
    } else if (dateMatch[4] && dateMatch[5]) {
      const maanden = {
        januari: 0, februari: 1, maart: 2, april: 3, mei: 4, juni: 5,
        juli: 6, augustus: 7, september: 8, oktober: 9, november: 10, december: 11
      };
      const day = parseInt(dateMatch[4]);
      const month = maanden[dateMatch[5].toLowerCase()];
      const year = dateMatch[6] ? parseInt(dateMatch[6]) : new Date().getFullYear();
      datum = new Date(year, month, day);
    }
  }
  const woordNaarGetal = {
    // een
    'een': 1, 'en': 1, 'eehn': 1, 'ean': 1, 'eemm': 1, 'eej': 1, 'eenn': 1, 'eeen': 1, 'eenm': 1, 'e3n': 1, 'enn': 1, 'eeb': 1,
    // twee
    'twee': 2, 'twe': 2, 'twei': 2, 'twwe': 2, 'twie': 2, 'tww': 2, 'tw3e': 2, 'twre': 2, 'twew': 2, 'tweeë': 2, 'tweee': 2,
    // drie
    'drie': 3, 'driee': 3, 'driei': 3, 'driey': 3, 'drieh': 3, 'dree': 3, 'driej': 3, 'drrie': 3, 'drieee': 3, 'drieé': 3, 'd4ie': 3, 'drje': 3, 'drieu': 3,
    // vier
    'vier': 4, 'vieer': 4, 'viir': 4, 'vvier': 4, 'fiir': 4, 'vuer': 4, 'vire': 4, 'viehr': 4, 'vi3r': 4, 'viee': 4, 'vie4': 4, 'virr': 4, 'vuer': 4,
    // vijf
    'vijf': 5, 'vijv': 5, 'viv': 5, 'viev': 5, 'vijg': 5, 'vujf': 5, 'vyjf': 5, 'vjif': 5, 'v9jf': 5, 'vjhf': 5, 'vijjf': 5, 'vijff': 5, 'vjvf': 5,
    // zes
    'zes': 6, 'zss': 6, 'zess': 6, 'zesz': 6, 'zs': 6, 'zees': 6, 'zws': 6, 'zesx': 6, 'zesz': 6, 'zesr': 6, 'zrs': 6, '2es': 6,
    // zeven
    'zeven': 7, 'zven': 7, 'zevenn': 7, 'zevven': 7, 'zeen': 7, 'zevn': 7, 'z3ven': 7, 'zewen': 7, 'zeve': 7, 'zeevn': 7, 'zeveh': 7, 'xeven': 7,
    // acht
    'acht': 8, 'ahct': 8, 'accht': 8, 'aacht': 8, 'achtg': 8, 'achtt': 8, 'achy': 8, 'axht': 8, 'aght': 8, 'acgt': 8, 'achtz': 8,
    // negen
    'negen': 9, 'negenn': 9, 'neegn': 9, 'neven': 9, 'neggn': 9, 'neegn': 9, 'negee': 9, 'nehem': 9, 'neegem': 9, 'negeb': 9, 'negem': 9,
    // tien
    'tien': 10, 'tienn': 10, 'tienm': 10, 'tein': 10, 'tiien': 10, 'tieen': 10, 'tjien': 10, 'tlen': 10, 'tjeen': 10, 'tioen': 10, 'tine': 10, 'tian': 10,
    // elf
    'elf': 11, 'elff': 11, 'elv': 11, 'elg': 11, 'elfj': 11, 'eelf': 11, 'elrf': 11, 'elgf': 11, 'elkf': 11, 'e,f': 11, 'elfe': 11, 'elk': 11,
    // twaalf
    'twaalf': 12, 'twalf': 12, 'twaalv': 12, 'twwaalf': 12, 'twalef': 12, 'twwalf': 12, 'tuaalf': 12, 'twaaaf': 12, 'twalfh': 12, 'twallf': 12, 'twazlf': 12, 'twaalg': 12,
    // dertien
    'dertien': 13, 'dertin': 13, 'deritien': 13, 'dertieen': 13, 'dertine': 13, 'd3rtien': 13, 'dertjen': 13, 'dertioen': 13, 'drrtien': 13, 'dertinm': 13, 'dertlen': 13,
    // veertien
    'veertien': 14, 'veertin': 14, 'veerien': 14, 'veerteen': 14, 'veertjan': 14, 'veertlen': 14, 'veetien': 14, 'veertine': 14, 'veertiem': 14, 've3rtien': 14, 'veertinm': 14,
    // vijftien
    'vijftien': 15, 'vijftin': 15, 'vijftjen': 15, 'vijvteen': 15, 'vijvtiem': 15, 'vyjftien': 15, 'vijgtien': 15, 'vjjftien': 15, 'vujftien': 15, 'vijftlen': 15, 'vijrteen': 15,
    // zestien
    'zestien': 16, 'zesstien': 16, 'zestjan': 16, 'zestin': 16, 'zesyien': 16, 'zestiem': 16, 'zestjeen': 16, 'zesrien': 16, 'zestieen': 16, 'zeszien': 16,
    // zeventien
    'zeventien': 17, 'zewentien': 17, 'zeventin': 17, 'zevenntien': 17, 'z3ventien': 17, 'zeeventien': 17, 'zevenrien': 17, 'zeventjeen': 17, 'sevntien': 17, 'zevenien': 17,
    // achttien
    'achttien': 18, 'achtien': 18, 'ahtttien': 18, 'achtteen': 18, 'achttjan': 18, 'achtjeen': 18, 'achttin': 18, 'achteen': 18, 'achtrien': 18, 'ahctt': 18,
    // negentien
    'negentien': 19, 'negentienn': 19,
    // twintig
    'twintig': 20, 'twintg': 20
  };

  function woordOfGetal(w) {
    if (!w) return null;
    return isNaN(w) ? woordNaarGetal[w.toLowerCase()] ?? null : parseInt(w);
  }
  function adjustTime(h) {
    if (h != null && h < 8) return h + 12;
    return h;
  }
  let startH = null, startM = null;
  const tijdRegexes = [
    // 5 over half 9 (+ typo's)
    { re: /(\w+)\s*(over|oevr|oveer|oevr|ovre|oevre|ober|ove|iver|obver)\s*half\s*(\w+)/gi, calc: (m, o, h) => [adjustTime(woordOfGetal(h) - 1), 30 + woordOfGetal(m)] },
    // 5 voor half 9 (+ typo's)
    { re: /(\w+)\s*(voor|vor|foor|vooor|vooe|voer|voof|voot|vopr|v0or|vorr|vdor)\s*half\s*(\w+)/gi, calc: (m, v, h) => [adjustTime(woordOfGetal(h) - 1), 30 - woordOfGetal(m)] },
    // kwart over 9 (+ typo's)
    { re: /kwart\s*(over|oevr|oveer|oevr|ovre|oevre|ober|ove|iver|obver)\s*(\w+)/gi, calc: (o, h) => [adjustTime(woordOfGetal(h)), 15] },
    // kwart voor 9 (+ typo's)
    { re: /kwart\s*(voor|vor|foor|vooor|vooe|voer|voof|voot|vopr|v0or|vorr|vdor)\s*(\w+)/gi, calc: (v, h) => [adjustTime(woordOfGetal(h) - 1), 45] },
    // half 9
    { re: /half (\w+)/gi, calc: h => [adjustTime(woordOfGetal(h) - 1), 30] },
    // 5 over 9 (+ typo's)
    { re: /(\d{1,2})\s*(over|oevr|oveer|oevr|ovre|oevre|ober|ove|iver|obver)\s*(\d{1,2})/gi, calc: (m, o, h) => [adjustTime(parseInt(h)), parseInt(m)] },
    // vijf over acht (woordgetallen + typo's)
    { re: /(\w+)\s*(over|oevr|oveer|oevr|ovre|oevre|ober|ove|iver|obver)\s*(\w+)/gi, calc: (m, o, h) => {
      const min = woordOfGetal(m);
      const uur = woordOfGetal(h);
      if (min == null || uur == null) return [null, null];
      return [adjustTime(uur), min];
    } },
    // 10 voor 8 (+ typo's)
    { re: /(\d{1,2})\s*(voor|vor|foor|vooor|vooe|voer|voof|voot|vopr|v0or|vorr|vdor)\s*(\d{1,2})/gi, calc: (m, v, h) => [adjustTime(parseInt(h) - 1), 60 - parseInt(m)] },
    // acht voor twaalf (woordgetallen + typo's)
    { re: /(\w+)\s*(voor|vor|foor|vooor|vooe|voer|voof|voot|vopr|v0or|vorr|vdor)\s*(\w+)/gi, calc: (m, v, h) => {
      const min = woordOfGetal(m);
      const uur = woordOfGetal(h);
      if (min == null || uur == null) return [null, null];
      return [adjustTime(uur - 1), 60 - min];
    } },
    // kwart over 7 (cijfer)
    { re: /kwart over (\d{1,2})/gi, calc: h => [adjustTime(parseInt(h)), 15] },
    // kwart voor 6 (cijfer)
    { re: /kwart voor (\d{1,2})/gi, calc: h => [adjustTime(parseInt(h) - 1), 45] },
    // half 8 (cijfer)
    { re: /half (\d{1,2})/gi, calc: h => [adjustTime(parseInt(h) - 1), 30] },
    // 09:15
    { re: /(\d{1,2}):(\d{2})/gi, calc: (h, m) => [parseInt(h), parseInt(m)] },
    // 9 uur, 9u
    { re: /(\d{1,2})\s*(uur|u)/gi, calc: h => [adjustTime(parseInt(h)), 0] },
    // negen uur
    { re: /(\w+)\s*(uur|u)/gi, calc: h => [adjustTime(woordOfGetal(h)), 0] }
  ];
  for (let tijdRe of tijdRegexes) {
    let match;
    while ((match = tijdRe.re.exec(origineleTekst)) !== null) {
      let res;
      try {
        res = tijdRe.calc(...match.slice(1));
      } catch {
        res = null;
      }
      if (res && res[0] != null && res[1] != null) {
        startH = res[0];
        startM = res[1];
        break;
      }
    }
    if (startH !== null) break;
  }
  // Weekcontext: als geen datum gevonden, maar weeknr en dag, bereken datum
  if (!datum && weeknr && gevondenDag) {
    // Bepaal eerste dag van het jaar
    const year = new Date().getFullYear();
    const simple = new Date(year, 0, 1 + (weeknr - 1) * 7);
    const dagVanSimple = simple.getDay();
    const doelDag = dagen[gevondenDag];
    // Corrigeer naar juiste dag in de week
    let diff = doelDag - dagVanSimple;
    if (diff < 0) diff += 7;
    simple.setDate(simple.getDate() + diff);
    datum = simple;
  }
  const titel = opschonenTitel(text);
  // Tijd uit 'tijd:' label, als geen andere tijd gevonden
  let tijdResultaat = startH !== null && startM !== null
    ? `${startH.toString().padStart(2, "0")}:${startM.toString().padStart(2, "0")}`
    : tijdLabel;
  return {
    titel: titel,
    datum: datum,
    tijd: tijdResultaat
  };
}

// Nieuwe functie: detecteert meerdere afspraken op aparte regels of met punten of dagwissel na komma
function parseMeerdereAfsprakenInRegel(tekst) {
  tekst = typoCorrectieOverVoorKwartHalf(tekst);
  tekst = corrigeerDagTypo(tekst);
  tekst = maandTypoCorrectie(tekst);
  // Split op regels, punten of op ', ' gevolgd door dagnaam OF dagnaam-typo
  const dagNamen = ["zondag","maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag"];
  const dagTypos = [
    "zonddag","zondagg","zondahg","zonndag","zodnag","zondgg","zonndagg","zonddagg","zondg",
    "mandag","manndag","maandaag","maadng","maanadg","maadng","mandaag","maanadg","manndag","maadnag","maadnng","maadnaag","maadan","manndaag","maanndag","manadg","manadng","maanadg","mannddg","mandaag",
    "dinsdaag","dinsdg","dinsdahg","dinsdagg","dinstag","dinsdsg","dinsddag","dinsdah","dinstag","dinsdg","dinsag","dinsdagh","dinsdagg","dinsdg","dinsadg","dinsdagh","dinsdgg",
    "woensdaag","woensdg","woensdahg","woensddag","wonsdag","woensadg","woensdga","woensdg","woendag","woensdag","woensdgg","woendsag","woenstag","woensdg","woensdg","woensddag","woensdahg",
    "donerdag","donderdga","donderdahg","donderdgg","donderdah","donderdahg","donerdgg","donedrag","donderdgg","donderdgh","dondardag","donerdag","donderdgg","donderdahg","donderdgg","donerdg","donderdgg","donderdahg",
    "vriijdag","vriidag","vrijdagg","vrijdagh","vrijdag","vriidag","vrijdagh","vrijdagg","vrijdajg","vrijdag","vrijdaj","vrijdag","vrjidag","vrijdagh","vrijdajg","vrjidag","vrijdja","vrijdajg","vrijdagh",
    "zaterdahg","zaterdg","zaterddag","zaaterdag","zatterdag","zateradg","zaterdagg","zaterdga","zaterdgg","zatedrag","zateerdag","zaterdga","zaterdgg","zaterdagh","zateerdag","zaterdga","zaterdag","zaterdgg","zateradg"
  ];
  const dagRegex = [...dagNamen, ...dagTypos].join("|");
  // Split op: enter, punt, of komma+spatie gevolgd door dagnaam of typo
  const blokken = tekst.split(new RegExp(`[\r\n\.]+|, (?=${dagRegex})`, 'i')).map(r => r.trim()).filter(r => r.length > 0);

  // Zoek weeknummer context
  let weekMatch = tekst.match(/week\s*(\d{1,2})/i);
  let weeknr = weekMatch ? parseInt(weekMatch[1]) : null;
  let weekContext = weeknr ? weeknr : null;

  // Bepaal hoofd-titel uit eerste blok vóór dagnaam
  let hoofdTitel = null;
  let eersteBlok = blokken.find(r => new RegExp(`\\b(${dagRegex})\\b`, 'i').test(r));
  if (eersteBlok) {
    let dagMatch = eersteBlok.match(new RegExp(`^(.*?)\\b(${dagRegex})\\b`, 'i'));
    if (dagMatch && dagMatch[1].trim().length > 0) {
      hoofdTitel = opschonenTitel(dagMatch[1].trim());
    }
  }

  let afspraken = [];
  let laatsteDag = null;
  for (let blok of blokken) {
    // Vind de eerste dagnaam in het blok
    let dagMatch = blok.match(new RegExp(`\\b(${dagRegex})\\b`, 'i'));
    if (dagMatch) {
      laatsteDag = dagMatch[1].toLowerCase();
    }
    let dagNaam = laatsteDag;
    // Titel vóór de dagnaam (eventueel)
    let titleBeforeDay = dagMatch ? blok.substring(0, dagMatch.index).trim() : "";
    let baseTitle = titleBeforeDay ? opschonenTitel(titleBeforeDay) : hoofdTitel || "";
    // Tekst ná de dagnaam
    let naDag = dagMatch ? blok.substring(dagMatch.index + dagNaam.length).trim() : blok;
    // Herken "tijd: XX:XX" en "datum: X maand tijd: XX:XX"
    const tijdRegex = /(\d{1,2}[:.]\d{2})/g;
    let tijdLabelRegex = /tijd[:\s]*([0-9]{1,2}[:.][0-9]{2})/gi;
    let tijdLabelMatches = [];
    let match;
    while ((match = tijdLabelRegex.exec(naDag)) !== null) {
      tijdLabelMatches.push(match[1].replace('.', ':'));
    }
    let parts = naDag.split(tijdRegex).filter(Boolean);
    if (tijdLabelMatches.length > 0) {
      parts = tijdLabelMatches;
    }
    for (let i = 0; i < parts.length; i++) {
      let s = parts[i].trim();
      if (/^\d{1,2}[:.]\d{2}$/.test(s) || /^\d{1,2}[:.]\d{2}$/.test(parts[i])) {
        // Tijd normaliseren
        let tijd = s.replace(".", ":");
        // Extra titel (als volgt na de tijd en geen nieuwe tijd)
        let extraTitel = "";
        if (i + 1 < parts.length && !/^\d{1,2}[:.]\d{2}$/.test(parts[i + 1])) {
          extraTitel = opschonenTitel(parts[i + 1].trim());
          // Filter: geen komma, niet leeg, geen dagnaam of typo
          const dagNamenEnTypos = [
            "zondag","zonddag","zondagg","zondahg","zonndag","zodnag","zondgg","zonndagg","zonddagg","zondg",
            "maandag","mandag","manndag","maandaag","maadng","maanadg","maadng","mandaag","maanadg","manndag","maadnag","maadnng","maadnaag","maadan","manndaag","maanndag","manadg","manadng","maanadg","mannddg","mandaag",
            "dinsdag","dinsdaag","dinsdg","dinsdahg","dinsdagg","dinstag","dinsdsg","dinsddag","dinsdah","dinstag","dinsdg","dinsag","dinsdagh","dinsdagg","dinsdg","dinsadg","dinsdagh","dinsdgg",
            "woensdag","woensdaag","woensdg","woensdahg","woensddag","wonsdag","woensadg","woensdga","woensdg","woendag","woensdag","woensdgg","woendsag","woenstag","woensdg","woensdg","woensddag","woensdahg",
            "donderdag","donerdag","donderdga","donderdahg","donderdgg","donderdah","donderdahg","donerdgg","donedrag","donderdgg","donderdgh","dondardag","donerdag","donderdgg","donderdahg","donderdgg","donerdg","donderdgg","donderdahg",
            "vrijdag","vriijdag","vriidag","vrijdagg","vrijdagh","vrijdag","vriidag","vrijdagh","vrijdagg","vrijdajg","vrijdag","vrijdaj","vrijdag","vrjidag","vrijdagh","vrijdajg","vrjidag","vrijdja","vrijdajg","vrijdagh",
            "zaterdag","zaterdahg","zaterdg","zaterddag","zaaterdag","zatterdag","zateradg","zaterdagg","zaterdga","zaterdgg","zatedrag","zateerdag","zaterdga","zaterdgg","zaterdagh","zateerdag","zaterdga","zaterdag","zaterdgg","zateradg"
          ];
          if (
            !extraTitel ||
            extraTitel === "," ||
            dagNamenEnTypos.includes(extraTitel.toLowerCase())
          ) {
            extraTitel = "";
          }
        }
        // Combineer titels
        let afspraakTitel = baseTitle;
        if (extraTitel && extraTitel !== "Onbekende afspraak") {
          afspraakTitel = afspraakTitel
            ? afspraakTitel + " – " + extraTitel
            : extraTitel;
        }
        // Voeg 'Examen' alleen toe als extraTitel exact 'Examen' is, niet aan alle afspraken in het blok
        if (
          extraTitel &&
          extraTitel.toLowerCase() === "examen" &&
          !/examen/i.test(afspraakTitel)
        ) {
          afspraakTitel += afspraakTitel ? " – Examen" : "Examen";
        }
        // Fallback: als titel leeg of dagnaam/Onbekende afspraak, gebruik hoofdTitel
        if (!afspraakTitel || afspraakTitel.toLowerCase() === dagNaam || afspraakTitel === "Onbekende afspraak") {
          afspraakTitel = hoofdTitel || "Onbekende afspraak";
        }
        // Parsestring voor datum/tijd
        let parseString = dagNaam + " " + tijd;
        if (extraTitel && !baseTitle) {
          parseString += " " + extraTitel;
        }
        // Geef weekContext door
        let event = parseTextToEvent(parseString, weekContext);
        // Override titel als deze samengesteld is
        event.titel = afspraakTitel ? afspraakTitel : event.titel;
        afspraken.push({
          titel: event.titel,
          datum: event.datum,
          tijd: event.tijd
        });
      }
    }
  }
  return afspraken;
}

// Titelopschoner: haalt tijden, datums, 'datum', 'tijd' en andere bekende labels uit tekst
function titelopschoner(tekst) {
  let t = tekst.toLowerCase();
  // Verwijder tijdstippen (zoals 12:00, 9.30, 18u)
  t = t.replace(/\b\d{1,2}[:.]\d{2}(?:\su)?\b/g, "");
  // Verwijder datums (zoals 21-7-2025, 5/8/2025, 5 juli, 5 augustus)
  t = t.replace(/\b\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\b/g, "");
  t = t.replace(/\b\d{1,2}\s+(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\b/g, "");
  // Verwijder de woorden 'datum', 'tijd' en dagen van de week (met ALLE typo's en dubbele punt)
  t = t.replace(/\b(datum|tijd|zondag|zonddag|zondagg|zondahg|zonndag|zodnag|zondgg|zonndagg|zonddagg|zondg|maandag|mandag|manndag|maandaag|maadng|maanadg|maadng|mandaag|maanadg|manndag|maadnag|maadnng|maadnaag|maadan|manndaag|maanndag|manadg|manadng|maanadg|mannddg|mandaag|dinsdag|dinsdaag|dinsdg|dinsdahg|dinsdagg|dinstag|dinsdsg|dinsddag|dinsdah|dinstag|dinsdg|dinsag|dinsdagh|dinsdagg|dinsdg|dinsadg|dinsdagh|dinsdgg|woensdag|woensdaag|woensdg|woensdahg|woensddag|wonsdag|woensadg|woensdga|woensdg|woendag|woensdag|woensdgg|woendsag|woenstag|woensdg|woensdg|woensddag|woensdahg|donderdag|donerdag|donderdga|donderdahg|donderdgg|donderdah|donderdahg|donerdgg|donedrag|donderdgg|donderdgh|dondardag|donerdag|donderdgg|donderdahg|donderdgg|donerdg|donderdgg|donderdahg|vrijdag|vriijdag|vriidag|vrijdagg|vrijdagh|vrijdag|vriidag|vrijdagh|vrijdagg|vrijdajg|vrijdag|vrijdaj|vrijdag|vrjidag|vrijdagh|vrijdajg|vrjidag|vrijdja|vrijdajg|vrijdagh|zaterdag|zaterdahg|zaterdg|zaterddag|zaaterdag|zatterdag|zateradg|zaterdagg|zaterdga|zaterdgg|zatedrag|zateerdag|zaterdga|zaterdgg|zaterdagh|zateerdag|zaterdga|zaterdag|zaterdgg|zateradg)\b:?/g, "");
  // Verwijder overige labels
  t = t.replace(/\b(uur|om|op|tot|van|en|week)\b/g, "");
  // Verwijder losse cijfers
  t = t.replace(/\b\d+\b/g, "");
  // Verwijder Nederlandse cijferwoorden (en typo's)
  t = t.replace(/\b(een|en|eehn|ean|eemm|eej|eenn|eeen|eenm|e3n|enn|eeb|twee|twe|twei|twwe|twie|tww|tw3e|twre|twew|tweeë|tweee|drie|driee|driei|driey|drieh|dree|driej|drrie|drieee|drieé|d4ie|drje|drieu|vier|vieer|viir|vvier|fiir|vuer|vire|viehr|vi3r|viee|vie4|virr|vuer|vijf|vijv|viv|viev|vijg|vujf|vyjf|vjif|v9jf|vjhf|vijjf|vijff|vjvf|zes|zss|zess|zesz|zs|zees|zws|zesx|zesz|zesr|zrs|2es|zeven|zven|zevenn|zevven|zeen|zevn|z3ven|zewen|zeve|zeevn|zeveh|xeven|acht|ahct|accht|aacht|achtg|achtt|achy|axht|aght|acgt|achtz|negen|negenn|neegn|neven|neggn|neegn|negee|nehem|neegem|negeb|negem|tien|tienn|tienm|tein|tiien|tieen|tjien|tlen|tjeen|tioen|tine|tian|elf|elff|elv|elg|elfj|eelf|elrf|elgf|elkf|e,f|elfe|elk|twaalf|twalf|twaalv|twwaalf|twalef|twwalf|tuaalf|twaaaf|twalfh|twallf|twazlf|twaalg|dertien|dertin|deritien|dertieen|dertine|d3rtien|dertjen|dertioen|drrtien|dertinm|dertlen|veertien|veertin|veerien|veerteen|veertjan|veertlen|veetien|veertine|veertiem|ve3rtien|veertinm|vijftien|vijftin|vijftjen|vijvteen|vijvtiem|vyjftien|vijgtien|vjjftien|vujftien|vijftlen|vijrteen|zestien|zesstien|zestjan|zestin|zesyien|zestiem|zestjeen|zesrien|zestieen|zeszien|zeventien|zewentien|zeventin|zevenntien|z3ventien|zeeventien|zevenrien|zeventjeen|sevntien|zevenien|achttien|achtien|ahtttien|achtteen|achttjan|achtjeen|achttin|achteen|achtrien|ahctt)\b/gi, "");
  // Verwijder dubbele spaties en trim
  t = t.replace(/\s+/g, " ").trim();
  // Eerste letter hoofdletter, rest klein
  if (t.length > 0) {
    t = t.charAt(0).toUpperCase() + t.slice(1);
  } else {
    t = "Onbekende afspraak";
  }
  return t;
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