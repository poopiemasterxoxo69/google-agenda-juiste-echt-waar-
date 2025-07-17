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

// **script_tool.js** (geüpdatet)

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
function parseTextToEvent(text, weekContext = null) {
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
    een: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7, acht: 8, negen: 9, tien: 10,
    elf: 11, twaalf: 12, dertien: 13, veertien: 14, vijftien: 15, zestien: 16,
    zeventien: 17, achttien: 18, negentien: 19, twintig: 20
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
    { re: /(\w+)\s*over\s*half\s*(\w+)/gi, calc: (m, h) => [adjustTime(woordOfGetal(h) - 1), 30 + woordOfGetal(m)] },
    { re: /(\w+)\s*voor\s*half\s*(\w+)/gi, calc: (m, h) => [adjustTime(woordOfGetal(h) - 1), 30 - woordOfGetal(m)] },
    { re: /kwart over (\w+)/gi, calc: h => [adjustTime(woordOfGetal(h)), 15] },
    { re: /kwart voor (\w+)/gi, calc: h => [adjustTime(woordOfGetal(h) - 1), 45] },
    { re: /half (\w+)/gi, calc: h => [adjustTime(woordOfGetal(h) - 1), 30] },
    { re: /(\d{1,2}):(\d{2})/gi, calc: (h, m) => [parseInt(h), parseInt(m)] },
    { re: /(\d{1,2})\s*(uur|u)/gi, calc: h => [adjustTime(parseInt(h)), 0] },
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

// Nieuwe functie: detecteert meerdere afspraken op aparte regels of met punten
function parseMeerdereAfsprakenInRegel(tekst) {
  // Zoek weeknummer context
  let weekMatch = tekst.match(/week\s*(\d{1,2})/i);
  let weeknr = weekMatch ? parseInt(weekMatch[1]) : null;
  let weekContext = weeknr ? weeknr : null;

  // Bepaal hoofd-titel uit eerste regel vóór dagnaam
  let hoofdTitel = null;
  let eersteRegel = tekst.split(/[\r\n\.]+/).find(r => /\b(zondag|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag)\b/i.test(r));
  if (eersteRegel) {
    let dagMatch = eersteRegel.match(/^(.*?)\b(zondag|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag)\b/i);
    if (dagMatch && dagMatch[1].trim().length > 0) {
      hoofdTitel = opschonenTitel(dagMatch[1].trim());
    }
  }

  // Split regels, maar behoud weekcontext
  const regels = tekst.split(/[\r\n\.]+/).map(r => r.trim()).filter(r => r.length > 0);
  let afspraken = [];
  let laatsteDag = null;
  for (let regel of regels) {
    // Vind de eerste dagnaam in de regel
    let dagMatch = regel.match(/\b(zondag|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag)\b/i);
    if (dagMatch) {
      laatsteDag = dagMatch[1].toLowerCase();
    }
    // Pak ook regels zonder dag als ze na een dagregel komen (voor blokken als "vrijdag 12:30 14:00 examen")
    let dagNaam = laatsteDag;
    // Titel vóór de dagnaam (eventueel)
    let titleBeforeDay = dagMatch ? regel.substring(0, dagMatch.index).trim() : "";
    let baseTitle = titleBeforeDay ? opschonenTitel(titleBeforeDay) : hoofdTitel || "";
    // Tekst ná de dagnaam
    let naDag = dagMatch ? regel.substring(dagMatch.index + dagNaam.length).trim() : regel;
    // Herken ook "tijd: XX:XX" en "datum: X maand tijd: XX:XX"
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
        }
        // Combineer titels
        let afspraakTitel = baseTitle;
        if (extraTitel && extraTitel !== "Onbekende afspraak") {
          afspraakTitel = afspraakTitel
            ? afspraakTitel + " – " + extraTitel
            : extraTitel;
        }
        // Voeg 'Examen' alleen toe als extraTitel exact 'Examen' is, niet aan alle afspraken in de regel
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

// Functie die wordt aangeroepen bij het klikken op "Herken gegevens"
function parseEnToon() {
  const tekst = document.getElementById("inputText").value;
  // Controleer of er meerdere tijden in de tekst staan
  const tijdMatches = tekst.match(/(\d{1,2}[:.]\d{2})/g);
  // Verzamel kleur, duur, heleDag altijd bovenaan
  const kleur = document.getElementById("kleur").value;
  const duur = document.getElementById("duur").value;
  const heleDag = document.getElementById("heleDag").checked;

  let afspraken = [];
  // Detecteer of er meerdere afspraken zijn
  if (tijdMatches && tijdMatches.length > 1) {
    afspraken = parseMeerdereAfsprakenInRegel(tekst);
  } else {
    afspraken = [parseTextToEvent(tekst)];
  }

  if (afspraken.length > 0) {
    let html = "";
    afspraken.forEach((afspraak, index) => {
      const datumStr = afspraak.datum && afspraak.datum.toLocaleDateString
        ? afspraak.datum.toLocaleDateString("nl-NL")
        : "Onbekend";
      html += `
        <div class="veld"><strong>📌 Titel:</strong> ${afspraak.titel}</div>
        <div class="veld"><strong>📅 Datum:</strong> ${datumStr}</div>
        <div class="veld"><strong>⏰ Starttijd:</strong> ${heleDag ? "hele dag" : (afspraak.tijd || "Onbekend")}</div>
        <div class="veld"><strong>🕒 Duur:</strong> ${heleDag ? "n.v.t." : `${duur} minuten`}</div>
        <div class="veld"><strong>🎨 Kleur:</strong> ${kleur === "random" ? "Willekeurig" : kleur}</div>
      `;
      if (index < afspraken.length - 1) html += "<hr>";
    });
    document.getElementById("output").innerHTML = html;
    if (document.getElementById("meerdereOutput")) {
      document.getElementById("meerdereOutput").innerHTML = "";
    }
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
  const addButton = document.getElementById("addEventButton");
  if (addButton) {
    addButton.addEventListener("click", addEvent);
  }
});


// Voeg afspraken toe aan Google Agenda
async function addEvent() {
  if (!accessToken) {
    alert("Log eerst in met Google.");
    return;
  }
  const tekst = document.getElementById("inputText").value;
  const kleur = document.getElementById("kleur").value;
  const duur = parseInt(document.getElementById("duur").value);
  const heleDag = document.getElementById("heleDag").checked;
  const tijdMatches = tekst.match(/(\d{1,2}[:.]\d{2})/g);

  let afspraken = [];
  if (tijdMatches && tijdMatches.length > 1) {
    afspraken = parseMeerdereAfsprakenInRegel(tekst);
  } else {
    afspraken = [parseTextToEvent(tekst)];
  }

  let toegevoegd = 0;
  for (const afspraak of afspraken) {
    let event = {};
    if (heleDag) {
      // Hele dag event
      const startDate = afspraak.datum ? afspraak.datum.toISOString().split("T")[0] : undefined;
      const endDate = afspraak.datum ? new Date(afspraak.datum.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0] : undefined;
      event = {
        summary: afspraak.titel,
        start: { date: startDate },
        end: { date: endDate },
        colorId: kleur === "random" ? undefined : kleur
      };
    } else {
      // Event met tijd
      let start = new Date(afspraak.datum);
      let [h, m] = (afspraak.tijd || "00:00").split(":").map(Number);
      start.setHours(h, m, 0, 0);
      let end = new Date(start.getTime() + duur * 60000);
      event = {
        summary: afspraak.titel,
        start: { dateTime: start.toISOString(), timeZone: 'Europe/Amsterdam' },
        end: { dateTime: end.toISOString(), timeZone: 'Europe/Amsterdam' },
        colorId: kleur === "random" ? undefined : kleur
      };
    }
    try {
      await gapi.client.calendar.events.insert({ calendarId: 'primary', resource: event });
      toegevoegd++;
    } catch (e) {
      console.error("Fout bij toevoegen event:", e);
    }
  }
  alert(`${toegevoegd} afspraak/afspraken toegevoegd aan je Google Agenda!`);
}
