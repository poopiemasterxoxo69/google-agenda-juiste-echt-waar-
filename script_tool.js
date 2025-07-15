function todayWithoutTime() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

function vervangWoordenDoorCijfers(tekst) {
    const woordenNaarGetallen = {
        een: "1", twee: "2", drie: "3", vier: "4", vijf: "5", zes: "6", zeven: "7", acht: "8", negen: "9", tien: "10",
        elf: "11", twaalf: "12", dertien: "13", veertien: "14", vijftien: "15", zestien: "16",
        zeventien: "17", achttien: "18", negentien: "19", twintig: "20"
    };

    for (const [woord, cijfer] of Object.entries(woordenNaarGetallen)) {
        const re = new RegExp(`\\b${woord}\\b`, "gi");
        tekst = tekst.replace(re, cijfer);
    }
    return tekst;
}

function opschonenTitel(tekst) {
    // Voeg spaties toe tussen getal en woorden als 'voor', 'over', 'half'
    let t = tekst.toLowerCase().replace(/(\d)(voor|over|half)/gi, '$1 $2');

    const woordenWeg = [
        "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag",
        "januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus",
        "september", "oktober", "november", "december",
        "kwart", "over", "voor", "half", "uur", "u", "om", "tijd", "datum", "minuut", "minuten",
        "vijf", "tien", "vijftien", "twintig", "dertig", "veertig", "vijftig", "zes", "zeven",
        "acht", "negen", "elf", "twaalf", "dertien", "veertien", "vijftien", "zestien", "zeventien",
        "achttien", "negentien", "twintig", "een", "twee", "drie", "vier", "zes", "zeven", "acht", "negen",
        "voorhalf", "overhalf", "voor half", "over half",
        "’s ochtends", "’s middags", "’s avonds", "s ochtends", "s middags", "s avonds"
    ];

    // Verwijder losse getallen
    t = t.replace(/\b\d+\b/g, "");

    // Verwijder alle woorden uit de lijst
    for (let woord of woordenWeg) {
        const escaped = woord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp("\\b" + escaped + "\\b", "gi");
        t = t.replace(re, "");
    }

    // Extra schoonmaak: leestekens en dubbele spaties
    t = t.replace(/[:\-,]/g, " ");
    t = t.replace(/\s+/g, " ").trim();

    if (t.length > 0) {
        t = t.charAt(0).toUpperCase() + t.slice(1);
    } else {
        t = "Onbekende afspraak";
    }

    return t;
}


function parseTextToEvent(text) {
    let origineleTekst = text.toLowerCase();
    origineleTekst = vervangWoordenDoorCijfers(origineleTekst);

    let datum = null;

    const dagen = {
        zondag: 0, maandag: 1, dinsdag: 2, woensdag: 3, donderdag: 4,
        vrijdag: 5, zaterdag: 6
    };
    const vandaag = new Date();
    for (let dagNaam in dagen) {
        if (origineleTekst.includes(dagNaam)) {
            const vandaagDag = vandaag.getDay();
            const doelDag = dagen[dagNaam];
            let verschil = doelDag - vandaagDag;
            if (verschil <= 0) verschil += 7;
            datum = new Date(todayWithoutTime());
            datum.setDate(datum.getDate() + verschil);
            break;
        }
    }

    const datumRegex = /(?:datum[:\s]*)?(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?|(\d{1,2})\s+(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)(?:\s+(\d{4}))?/i;
    const dateMatch = datumRegex.exec(origineleTekst);
    if (dateMatch) {
        if (dateMatch[1] && dateMatch[2]) {
            const day = parseInt(dateMatch[1]);
            const month = parseInt(dateMatch[2]) - 1;
            const year = dateMatch[3] ? parseInt(dateMatch[3]) : new Date().getFullYear();
            datum = new Date(year, month, day);
        } else if (dateMatch[4] && dateMatch[5]) {
            const months = {
                januari: 0, februari: 1, maart: 2, april: 3, mei: 4, juni: 5,
                juli: 6, augustus: 7, september: 8, oktober: 9, november: 10, december: 11
            };
            const day = parseInt(dateMatch[4]);
            const month = months[dateMatch[5].toLowerCase()];
            const year = dateMatch[6] ? parseInt(dateMatch[6]) : new Date().getFullYear();
            datum = new Date(year, month, day);
        }
    }

    let startH = null, startM = null;

    // Hier gaan we ook een helper variabele onthouden: of het een “half y” tijd is en y < 8
    let isHalfMiddag = false;
    let halfY = null;  // het y-uur na half

    const tijdRegexes = [
        {
            // Match: 10 over half 3 / 10overhalf3 / 10 over half3 (met of zonder spatie)
            re: /(\d{1,2})\s*over\s*half\s*(\d{1,2})/gi,
            calc: (m, h) => {
                halfY = h;
                // uur = h - 1, minuten = 30 + m
                return [h - 1, 30 + parseInt(m)];
            }
        },
        {
            // Match: 5voor half 4 / 5 voor half 4
            re: /(\d{1,2})\s*voor\s*half\s*(\d{1,2})/gi,
            calc: (m, h) => {
                halfY = h;
                // uur = h - 1, minuten = 30 - m
                return [h - 1, 30 - parseInt(m)];
            }
        },
        { re: /kwart over (\d{1,2})/gi, calc: h => [h, 15] },
        { re: /kwart voor (\d{1,2})/gi, calc: h => [h - 1, 45] },
        { re: /half (\d{1,2})/gi, calc: h => [h - 1, 30] },
        { re: /(\d{1,2}):(\d{2})/gi, calc: (h, m) => [parseInt(h), parseInt(m)] },
        { re: /(\d{1,2})\s*(uur|u)/gi, calc: h => [parseInt(h), 0] }
    ];

    for (let tr of tijdRegexes) {
        let match;
        while ((match = tr.re.exec(origineleTekst)) !== null) {
            let result;
            if (tr.calc.length === 1) {
                result = tr.calc(parseInt(match[1]));
            } else if (tr.calc.length === 2) {
                result = tr.calc(parseInt(match[1]), parseInt(match[2]));
            }
            if (result) {
                startH = result[0];
                startM = result[1];

                // Check of we een "half y" tijd hebben met y < 8 om middag toe te passen
                if (halfY !== null && halfY < 8 && (tr.re.source.includes("half"))) {
                    isHalfMiddag = true;
                }

                break;
            }
        }
        if (startH !== null) break;
    }

    // Pas middag toe indien nodig
    if (isHalfMiddag) {
        if (startH < 12) {
            startH += 12;
        }
    }

    if (!datum) datum = todayWithoutTime();

    return {
        titel: opschonenTitel(origineleTekst),
        datum,
        tijd: (startH !== null) ? `${startH.toString().padStart(2, "0")}:${startM.toString().padStart(2, "0")}` : null
    };
}

function parseEnToon() {
    const inputText = document.getElementById("inputText").value.trim();
    const kleur = document.getElementById("kleur").value;
    const duur = parseInt(document.getElementById("duur").value);
    const heleDag = document.getElementById("heleDag").checked;
    const output = document.getElementById("output");

    output.textContent = "";

    if (!inputText) {
        output.textContent = "Voer eerst tekst in.";
        return;
    }

    const event = parseTextToEvent(inputText);

    let tijdStr = event.tijd;
    if (heleDag || !tijdStr) {
        tijdStr = "Hele dag";
    }

    const datum = event.datum;
    const datumStr = `${datum.getDate().toString().padStart(2, "0")}-${(datum.getMonth() + 1).toString().padStart(2, "0")}-${datum.getFullYear()}`;

    output.textContent = `Titel: ${event.titel}\nDatum: ${datumStr}\nTijd: ${tijdStr}\nDuur: ${duur} minuten\nKleur: ${kleur === "random" ? "Willekeurig" : kleur}`;
}
