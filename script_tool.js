(function ensureGapiLoadedAndCallGapiLoaded() {
  // Controleer of gapi al beschikbaar is
  if (window.gapi) {
    // gapi is al geladen, roep direct gapiLoaded aan
    if (typeof window.gapiLoaded === 'function') {
      window.gapiLoaded();
    }
    return;
  }

  // Controleer of het script al bestaat
  var existingScript = document.querySelector('script[src="https://apis.google.com/js/api.js"]');
  if (existingScript) {
    // Voeg een onload toe als het script nog niet geladen is
    if (!existingScript.hasAttribute('data-gapi-onload')) {
      existingScript.setAttribute('data-gapi-onload', '1');
      existingScript.addEventListener('load', function() {
        if (typeof window.gapiLoaded === 'function') {
          window.gapiLoaded();
        }
      });
    }
    return;
  }

  // Script nog niet aanwezig: injecteer het en stel onload in
  var script = document.createElement('script');
  script.src = 'https://apis.google.com/js/api.js';
  script.async = true;
  script.defer = true;
  script.onload = function() {
    if (typeof window.gapiLoaded === 'function') {
      window.gapiLoaded();
    }
  };
  document.head.appendChild(script);
})();

// --- Google profile/foto patching ---
function showProfileInfo(token) {
  console.log('[DEBUG] showProfileInfo aangeroepen met token', token);
  fetch('https://people.googleapis.com/v1/people/me?personFields=photos,names,emailAddresses', {
    headers: { Authorization: 'Bearer ' + token }
  })
    .then(res => res.json())
    .then(data => {
      const profileBox = document.getElementById('profileBox');
      if (!profileBox) {
        console.warn('[DEBUG] Geen profileBox gevonden in DOM!');
        return;
      }
      let imgUrl = '';
      let name = '';
      if (data.photos && data.photos[0] && data.photos[0].url) {
        imgUrl = data.photos[0].url;
      }
      if (data.names && data.names[0] && data.names[0].displayName) {
        name = data.names[0].displayName;
      }
      console.log('[DEBUG] Profiel data', {imgUrl, name, data});
      profileBox.innerHTML = imgUrl ? `<img src="${imgUrl}" alt="profiel" style="width:48px;height:48px;border-radius:50%;box-shadow:0 2px 8px #0003;vertical-align:middle;"> <span style='font-size:16px;font-weight:bold;vertical-align:middle;'>${name}</span>` : '';
      // Login-knop verbergen
      const loginBtn = document.getElementById('loginButton');
      if (loginBtn) loginBtn.style.display = 'none';
    })
    .catch((e) => {
      console.error('[DEBUG] Fout bij ophalen profielinfo', e);
    });
}

function patchTokenClientCallback() {
  console.log('[DEBUG] patchTokenClientCallback aangeroepen');
  if (!window.tokenClient) return;
  if (window.tokenClient._profilePatched) return;
  const origCallback = window.tokenClient.callback;
  window.tokenClient.callback = function(response) {
    if (response && response.access_token) {
      console.log('[DEBUG] patchTokenClientCallback: access_token ontvangen', response.access_token);
      showProfileInfo(response.access_token);
    }
    if (typeof origCallback === 'function') origCallback(response);
  };
  window.tokenClient._profilePatched = true;
}

// Variabele om zichtbaarheid login-knop te beheren
window.loginButtonVisible = true;

function updateLoginButtonVisibility() {
  var loginBtn = document.getElementById('loginButton');
  if (loginBtn) loginBtn.style.display = window.loginButtonVisible ? '' : 'none';
}

function initGoogleLogin() {
  window.tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: '424624995566-0aprf3c3739snsn0q752kj4slifditj3.apps.googleusercontent.com',
    scope: 'https://www.googleapis.com/auth/calendar.events.readonly https://www.googleapis.com/auth/calendar.events',
    callback: (tokenResponse) => {
      window.accessToken = tokenResponse.access_token;
      document.getElementById("status").innerText = "Ingelogd ✔";
      window.loginButtonVisible = false;
      updateLoginButtonVisibility();
    }
  });
  patchTokenClientCallback();
}

// Start login/init als DOM klaar is en Google geladen is

document.addEventListener('DOMContentLoaded', function() {
  // Wacht tot google.accounts geladen is
  function wachtOpGoogle(cb, tries = 0) {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      cb();
    } else if (tries < 30) {
      setTimeout(() => wachtOpGoogle(cb, tries + 1), 100);
    } else {
      console.error('[DEBUG] Google accounts niet gevonden');
    }
  }
  wachtOpGoogle(initGoogleLogin);

  // Login-knop tonen/verbergen bij paginalaad
  updateLoginButtonVisibility();

  // Voeg listeners toe voor knoppen
  const herkenBtn = document.getElementById("herkenButton");
  if (herkenBtn) herkenBtn.addEventListener("click", parseEnToon);
  const voegToeBtn = document.getElementById("voegToeButton");
  if (voegToeBtn) voegToeBtn.addEventListener("click", addEvent);
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
  window._bewerkteAfspraken = afspraken.map(a => ({...a}));
}

function kleurLabelToe(kleur) {
  const kleuren = {
    'random': '🎲 Willekeurig',
    '11': '❤️ Rood (Tomaat)',
    '6': '🟧 Oranje (Mandarijn)',
    '5': '💛 Geel (Zonnebloem)',
    '10': '💚 Donkergroen (Basilicum)',
    '2': '💚 Lichtgroen (Salie)',
    '9': '💙 Blauw (Pauw)',
    '7': '🫐 Bosbes',
    '3': '💜 Lavendel',
    '4': '🍇 Paars (Druif)',
    '1': '💗 Roze (Flamingo)',
    '8': '⚫ Grijs (Grafiet)'
  };
  return kleuren[kleur] || kleur;
}

function genereerKleurOpties(geselecteerd) {
  const kleuren = [
    { value: 'random', label: '🎲 Willekeurig' },
    { value: '11', label: '❤️ Rood (Tomaat)' },
    { value: '6', label: '🟧 Oranje (Mandarijn)' },
    { value: '5', label: '💛 Geel (Zonnebloem)' },
    { value: '10', label: '💚 Donkergroen (Basilicum)' },
    { value: '2', label: '💚 Lichtgroen (Salie)' },
    { value: '9', label: '💙 Blauw (Pauw)' },
    { value: '7', label: '🫐 Bosbes' },
    { value: '3', label: '💜 Lavendel' },
    { value: '4', label: '🍇 Paars (Druif)' },
    { value: '1', label: '💗 Roze (Flamingo)' },
    { value: '8', label: '⚫ Grijs (Grafiet)' }
  ];
  return kleuren.map(k => `<option value="${k.value}"${geselecteerd == k.value ? ' selected' : ''}>${k.label}</option>`).join('');
}

function genereerTijdOpties(geselecteerd) {
  let opties = '';
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 5) {
      let hh = h.toString().padStart(2, '0');
      let mm = m.toString().padStart(2, '0');
      let tijd = `${hh}:${mm}`;
      let selected = geselecteerd === tijd ? ' selected' : '';
      opties += `<option value="${tijd}"${selected}>${tijd}</option>`;
    }
  }
  return opties;
}

function deleteAllAfspraken() {
  window._bewerkteAfspraken = null;
  if (window.afsprakenBuffer) window.afsprakenBuffer = null;
  // Eventueel andere globale buffers hier wissen
}

function formatDatumNederlands(datum) {
  if (!(datum instanceof Date) || isNaN(datum.getTime())) return '';
  const dagen = ['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag'];
  const maanden = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
  const dag = datum.getDate();
  const maand = datum.getMonth() + 1;
  const jaar = datum.getFullYear();
  const dagNaam = dagen[datum.getDay()];
  const maandNaam = maanden[datum.getMonth()];
  return `${dag}-${maand}-${jaar} (${dagNaam} ${dag} ${maandNaam} ${jaar})`;
}

function parseEnToon(bewerkte=false) {
  if (!bewerkte) {
    window._bewerkteAfspraken = null;
    // Eventueel andere globale buffers wissen:
    if (window.afsprakenBuffer) window.afsprakenBuffer = null;
  }
  let afspraken;
  const kleur = document.getElementById("kleur").value;
  const duur = document.getElementById("duur").value;
  const heleDag = document.getElementById("heleDag").checked;

    if (bewerkte && window._bewerkteAfspraken) {
      afspraken = window._bewerkteAfspraken;
    } else {
      const tekst = document.getElementById("inputText").value;
      const tijdMatches = tekst.match(/(\d{1,2}[:.]\d{2})/g);
      if (tijdMatches && tijdMatches.length > 1) {
        afspraken = parseMeerdereAfsprakenInRegel(tekst);
      } else {
        afspraken = [parseTextToEvent(tekst)];
      }
      // Propagate kleur to all afspraken if not set, maar laat 'random' gewoon als 'random' staan
      afspraken = afspraken.map(a => ({ ...a, kleur: a.kleur || kleur }));
      window._bewerkteAfspraken = null;
    }

  if (afspraken.length > 0) {
    let html = "";
    afspraken.forEach((afspraak, index) => {
      const datumStr = afspraak.datum && afspraak.datum.toLocaleDateString
        ? afspraak.datum.toLocaleDateString("nl-NL")
        : "Onbekend";
      html += `
        <div class="veld" style="position:relative;padding-bottom:18px;" data-index="${index}">
          <button class="aanpas-btn" title="Aanpassen">✏️</button>
          <div class="afspraak-view">
            <div><strong>📌 Titel:</strong> ${titelopschoner(afspraak.titel)}</div>
            <div><strong>📅 Datum:</strong> ${afspraak.datum ? formatDatumNederlands(afspraak.datum) : 'Onbekend'}</div>
            <div><strong>⏰ Starttijd:</strong> ${heleDag ? "hele dag" : (afspraak.tijd || "Onbekend")}</div>
            <div><strong>🕒 Duur:</strong> ${heleDag ? "n.v.t." : `${duur} minuten`}</div>
            <div><strong>🎨 Kleur:</strong> ${kleurLabelToe(afspraak.kleur)}</div>
          </div>
          <form class="afspraak-edit" style="display:none;margin-top:6px;">
            <label>Titel: <input type="text" name="titel" value="${titelopschoner(afspraak.titel)}"></label><br>
            <label>Datum: <input type="date" name="datum" value="${afspraak.datum ? afspraak.datum.toISOString().split('T')[0] : ''}"></label><br>
            <label>Tijd: <select name="tijd">${genereerTijdOpties(afspraak.tijd)}</select></label><br>
            <label>Duur (min): <input type="number" name="duur" value="${duur}" min="1"></label><br>
            <label>Kleur: <select name="kleur">${genereerKleurOpties(afspraak.kleur)}</select></label><br>
            <button type="submit" style="background:#27ae60;color:#fff;border:none;padding:6px 16px;border-radius:4px;font-weight:bold;cursor:pointer;margin-top:6px;">Opslaan</button>
            <button type="button" class="annuleer-btn" style="margin-left:8px;">Annuleer</button>
          </form>
        </div>
      `;
      if (index < afspraken.length - 1) html += "<hr>";
    });
    document.getElementById("output").innerHTML = html;
    if (document.getElementById("meerdereOutput")) {
      document.getElementById("meerdereOutput").innerHTML = "";
    }

    // Event listeners voor aanpas, opslaan en annuleer
    document.querySelectorAll('.aanpas-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const veld = btn.closest('.veld');
        veld.querySelector('.afspraak-view').style.display = 'none';
        veld.querySelector('.afspraak-edit').style.display = 'block';
      });
    });
    document.querySelectorAll('.afspraak-edit').forEach(form => {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        const veld = form.closest('.veld');
        const index = parseInt(veld.getAttribute('data-index'));
        // Haal waarden op
        afspraken[index].titel = form.titel.value;
        afspraken[index].datum = form.datum.value ? new Date(form.datum.value) : afspraken[index].datum;
        afspraken[index].tijd = form.tijd.value;
        afspraken[index].duur = form.duur.value;
        afspraken[index].kleur = form.kleur.value;
        updateAfsprakenBufferNaEdit(afspraken);
        parseEnToon(true);
      });
      form.querySelector('.annuleer-btn').addEventListener('click', function() {
        form.style.display = 'none';
        form.closest('.veld').querySelector('.afspraak-view').style.display = 'block';
      });
    });
  } else {
    document.getElementById("output").innerText = "Geen afspraken gevonden.";
    if (document.getElementById("meerdereOutput")) {
      document.getElementById("meerdereOutput").innerText = "";
    }
  }
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

// Voeg afspraken toe aan Google Agenda
function getActueleAfspraken() {
  if (window._bewerkteAfspraken && Array.isArray(window._bewerkteAfspraken)) {
    return window._bewerkteAfspraken;
  }
  // Indien geen edits: parse opnieuw uit inputText
  const tekst = document.getElementById("inputText").value;
  const tijdMatches = tekst.match(/(\d{1,2}[:.]\d{2})/g);
  if (tijdMatches && tijdMatches.length > 1) {
    return parseMeerdereAfsprakenInRegel(tekst);
  }
  return [parseTextToEvent(tekst)];
}

async function addEvent() {
  if (!accessToken) {
    alert("Log eerst in met Google.");
    return;
  }
  let afspraken = getActueleAfspraken();
  const kleur = document.getElementById("kleur").value;
  const duur = parseInt(document.getElementById("duur").value);
  const heleDag = document.getElementById("heleDag").checked;
  // Hoofd-titel bepalen voor fallback
  let dagNamen = ["zondag","maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag"];
  let dagRegex2 = dagNamen.join("|");
  const tekst = document.getElementById("inputText").value;
  let eersteBlok = tekst.split(new RegExp(`[\r\n\.]+|, (?=${dagRegex2})`, 'i')).find(r => new RegExp(`\b(${dagRegex2})\b`, 'i').test(r));
  let hoofdTitel = null;
  if (eersteBlok) {
    let dagMatch = eersteBlok.match(new RegExp(`^(.*?)\b(${dagRegex2})\b`, 'i'));
    if (dagMatch && dagMatch[1].trim().length > 0) {
      hoofdTitel = titelopschoner(dagMatch[1].trim());
    }
  }
  // Fallback hoofd-titel toepassen
  afspraken = afspraken.map(afspraak => {
    let schoneTitel = titelopschoner(afspraak.titel);
    if (!schoneTitel || schoneTitel === "Onbekende afspraak") {
      schoneTitel = hoofdTitel ? hoofdTitel : "Onbekende afspraak";
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

// Inline handmatige afspraak toevoegen via + knop

document.addEventListener('DOMContentLoaded', function() {
  const plusBtn = document.getElementById('manual-plus-btn');
  plusBtn && plusBtn.addEventListener('click', function() {
    // Check of er al een lege edit-form is, zo ja: focus
    if (document.querySelector('.manual-edit-form')) {
      document.querySelector('.manual-edit-form input[name="titel"]').focus();
      return;
    }
    // Maak lege afspraak (zelfde structuur als bestaande edit-form)
    const afspraken = (window._bewerkteAfspraken && Array.isArray(window._bewerkteAfspraken)) ? window._bewerkteAfspraken.slice() : [];
    // Render een lege edit-form bovenaan de afsprakenlijst
    const outputDiv = document.getElementById('output');
    if (!outputDiv) return;
    const formDiv = document.createElement('div');
    formDiv.className = 'veld';
    formDiv.innerHTML = `
      <form class="afspraak-edit manual-edit-form" style="margin-bottom:16px;">
        <label>Titel: <input type="text" name="titel" value="" required></label><br>
        <label>Datum: <input type="date" name="datum" required></label><br>
        <label>Tijd: <select name="tijd">${genereerTijdOpties()}</select></label><br>
        <label>Duur (min): <input type="number" name="duur" value="60" min="1" required></label><br>
        <label>Kleur: <select name="kleur">${genereerKleurOpties('random')}</select></label><br>
        <label><input type="checkbox" name="heleDag"> Hele dag</label><br>
        <button type="submit" style="background:#27ae60;color:#fff;border:none;padding:6px 16px;border-radius:4px;font-weight:bold;cursor:pointer;margin-top:6px;">Toevoegen</button>
        <button type="button" class="annuleer-btn" style="margin-left:8px;">Annuleer</button>
      </form>
    `;
    outputDiv.prepend(formDiv);
    formDiv.querySelector('input[name="titel"]').focus();
    // Annuleer knop
    formDiv.querySelector('.annuleer-btn').addEventListener('click', function() {
      formDiv.remove();
    });
    // Submit logica
    formDiv.querySelector('form').addEventListener('submit', function(e) {
      e.preventDefault();
      const form = e.target;
      // Validatie: datum verplicht
      if (!form.datum.value) {
        alert('Vul een datum in!');
        form.datum.focus();
        return;
      }
      // Validatie: tijd óf hele dag verplicht
      if (!form.tijd.value && !form.heleDag.checked) {
        alert('Vul een tijd in of vink "Hele dag" aan!');
        form.tijd.focus();
        return;
      }
      const afspraak = {
        titel: form.titel.value,
        datum: form.datum.value ? new Date(form.datum.value) : undefined,
        tijd: form.tijd.value || undefined,
        duur: form.duur.value || 60,
        kleur: form.kleur.value || 'random',
        heleDag: form.heleDag.checked
      };
      if (!window._bewerkteAfspraken || !Array.isArray(window._bewerkteAfspraken)) {
        window._bewerkteAfspraken = [];
      }
      window._bewerkteAfspraken.unshift(afspraak);
      parseEnToon(true);
    });
  });
});


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

