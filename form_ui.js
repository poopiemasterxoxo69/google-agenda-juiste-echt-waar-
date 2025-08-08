// form_ui.js (implementation phase)
(function(){
  console.log('[BOOT] form_ui.js loaded');
  const ns = window.FormUI = window.FormUI || {};

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

  function parseEnToon(bewerkte=false) {
    if (!bewerkte) {
      window._bewerkteAfspraken = null;
      // Eventueel andere globale buffers wissen:
      if (window.afsprakenBuffer) window.afsprakenBuffer = null;
    }
    let afspraken;
    const kleur = document.getElementById('kleur').value;
    const duur = document.getElementById('duur').value;
    const heleDag = document.getElementById('heleDag').checked;

    if (bewerkte && window._bewerkteAfspraken) {
      afspraken = window._bewerkteAfspraken;
    } else {
      const tekst = document.getElementById('inputText').value;
      const tijdMatches = tekst.match(/(\d{1,2}[:.]\d{2})/g);
      if (tijdMatches && tijdMatches.length > 1) {
        afspraken = window.parseMeerdereAfsprakenInRegel ? window.parseMeerdereAfsprakenInRegel(tekst) : [];
      } else {
        afspraken = [window.parseTextToEvent ? window.parseTextToEvent(tekst) : { titel: '', datum: null, tijd: null }];
      }
      // Propagate kleur to all afspraken if not set, maar laat 'random' gewoon als 'random' staan
      afspraken = afspraken.map(a => ({ ...a, kleur: a.kleur || kleur }));
      window._bewerkteAfspraken = null;
    }

    if (afspraken.length > 0) {
      let html = '';
      afspraken.forEach((afspraak, index) => {
        const datumStr = afspraak.datum && afspraak.datum.toLocaleDateString
          ? afspraak.datum.toLocaleDateString('nl-NL')
          : 'Onbekend';
        html += `
        <div class="veld agenda-card-glass" data-index="${index}">
          <button class="aanpas-btn" title="Aanpassen">✏️</button>
          <div class="afspraak-view">
            <div class="afspraak-titel"><strong>📌 Titel:</strong> ${titelopschoner(afspraak.titel)}</div>
            <div><strong>📅 Datum:</strong> ${afspraak.datum ? formatDatumNederlands(afspraak.datum) : 'Onbekend'}</div>
            <div><strong>⏰ Starttijd:</strong> ${heleDag ? 'hele dag' : (afspraak.tijd || 'Onbekend')}</div>
            <div><strong>🕒 Duur:</strong> ${heleDag ? 'n.v.t.' : `${duur} minuten`}</div>
            <div><strong>🎨 Kleur:</strong> ${kleurLabelToe(afspraak.kleur)}</div>
          </div>
          <form class="afspraak-edit" style="display:none;margin-top:6px;">
            <label>Titel: <input type="text" name="titel" value="${titelopschoner(afspraak.titel)}"></label><br>
            <label>Datum: <input type="date" name="datum" value="${afspraak.datum ? afspraak.datum.toISOString().split('T')[0] : ''}"></label><br>
            <label>Tijd: <select name="tijd">${genereerTijdOpties(afspraak.tijd)}</select></label><br>
            <label>Duur (min): <input type="number" name="duur" value="${duur}" min="1"></label><br>
            <label>Kleur: <select name="kleur">${genereerKleurOpties(afspraak.kleur)}</select></label><br>
            <button type="submit" class="save-edit">Opslaan</button>
            <button type="button" class="annuleer-btn" style="font-size:0.94em;padding:2px 9px;background:#f5f5f5;color:#888;border:1px solid #eee;border-radius:5px;margin-top:4px;">Annuleer</button>
          </form>
        </div>
      `;
        if (index < afspraken.length - 1) html += '<hr>';
      });
      document.getElementById('output').innerHTML = html;
      if (document.getElementById('meerdereOutput')) {
        document.getElementById('meerdereOutput').innerHTML = '';
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
      document.getElementById('output').innerText = 'Geen afspraken gevonden.';
      if (document.getElementById('meerdereOutput')) {
        document.getElementById('meerdereOutput').innerText = '';
      }
    }
  }

  // Bind to namespace
  ns.updateAfsprakenBufferNaEdit = updateAfsprakenBufferNaEdit;
  ns.kleurLabelToe = kleurLabelToe;
  ns.genereerKleurOpties = genereerKleurOpties;
  ns.genereerTijdOpties = genereerTijdOpties;
  ns.deleteAllAfspraken = deleteAllAfspraken;
  ns.titelopschoner = titelopschoner;
  ns.formatDatumNederlands = formatDatumNederlands;
  ns.parseEnToon = parseEnToon;

  // Backward compatibility on window
  window.updateAfsprakenBufferNaEdit = window.updateAfsprakenBufferNaEdit || updateAfsprakenBufferNaEdit;
  window.kleurLabelToe = window.kleurLabelToe || kleurLabelToe;
  window.genereerKleurOpties = window.genereerKleurOpties || genereerKleurOpties;
  window.genereerTijdOpties = window.genereerTijdOpties || genereerTijdOpties;
  window.deleteAllAfspraken = window.deleteAllAfspraken || deleteAllAfspraken;
  window.titelopschoner = window.titelopschoner || titelopschoner;
  window.formatDatumNederlands = window.formatDatumNederlands || formatDatumNederlands;
  window.parseEnToon = window.parseEnToon || parseEnToon;

  console.log('[OK] FormUI ready');
})();
