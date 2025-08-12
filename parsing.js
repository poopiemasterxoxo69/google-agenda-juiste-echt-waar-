// parsing.js (full implementations)
(function(){
  console.log('[BOOT] parsing.js loaded');
  const ns = window.Parsing = window.Parsing || {};

  // todayWithoutTime: Date zonder tijd
  function todayWithoutTime() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // opschonenTitel: basis titelopschoner voor parse fallback/hoofdtitel
  function opschonenTitel(tekst) {
    let t = (tekst || '').toLowerCase();
    const woordenWeg = [
      'januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december',
      'kwart','over','voor','half','uur','u','om','tijd','datum',
      '’s ochtends','’s middags','’s avonds','s ochtends','s middags','s avonds'
    ];
    for (let woord of woordenWeg) {
      const re = new RegExp('\\b' + woord + '\\b', 'gi');
      t = t.replace(re, '');
    }
    t = t.replace(/\b\d+\b/g, '');
    t = t.replace(/\d{1,2}[:.]\d{2}/g, '');
    t = t.replace(/[:\-]/g, '');
    t = t.replace(/\s+/g, ' ').trim();
    if (t.length > 0) {
      t = t.charAt(0).toUpperCase() + t.slice(1);
    } else {
      t = 'Onbekende afspraak';
    }
    return t;
  }

  // Typo-correctie voor tijd/dag woorden
  function typoCorrectieOverVoorKwartHalf(tekst) {
    // Voeg spaties toe wanneer getal en tijdwoord aan elkaar zitten
    tekst = tekst.replace(/(\d+)\s*([a-z]{2,8})\s*(\d+)/gi, (match, p1, p2, p3) => {
      const tijdwoorden = [
        'over','ovr','oveer','oevr','ovre','oevre','ober','ove','ive','obver','iver',
        'voor','vor','foor','vooor','vooe','voer','voof','voot','vopr','v0or','vorr','vdor',
        'kwart','kwrat','kwarrt','kwartt','kwartd','quwart','kwwart','kwat','kqart','kwarrd','kwakt','kwaet',
        'half','hlf','hafl','hallf','hslf','halb','halv','hqlf','halff','hslv','halc','halg'
      ];
      if (tijdwoorden.includes(p2.toLowerCase())) return `${p1} ${p2} ${p3}`;
      return match;
    });
    const typoMap = {
      over: ['over','ovr','oveer','oevr','ovre','oevre','ober','ove','iver','obver','iver'],
      voor: ['voor','vor','foor','vooor','vooe','voer','voof','voot','vopr','v0or','vorr','vdor'],
      kwart: ['kwart','kwrat','kwarrt','kwartt','kwartd','quwart','kwwart','kwat','kqart','kwarrd','kwakt','kwaet'],
      half: ['half','hlf','hafl','hallf','hslf','halb','halv','hqlf','halff','hslv','halc','halg'],
      maandag: ['maandag','mandag','manndag','maandaag','maadng','maanadg','maadng','mandaag','maanadg','manndag','maadnag','maadnng','maadnaag','maadan','manndaag','maanndag','manadg','manadng','maanadg','mannddg','mandaag'],
      dinsdag: ['dinsdag','dinsdaag','dinsdg','dinsdahg','dinsdagg','dinsdsg','dinsddag','dinsdah','dinstag','dinsdg','dinsag','dinsdagh','dinsdagg','dinsdg','dinsadg','dinsdagh','dinsdgg'],
      woensdag: ['woensdag','woensdaag','woensdg','woensdahg','woensdag','woensddag','wonsdag','woensadg','woensdga','woensdg','woendag','woensdag','woensdgg','woendsag','woenstag','woensdg','woensdg','woensddag','woensdahg'],
      donderdag: ['donderdag','donerdag','donderdga','donderdahg','donderdgg','donderdah','donderdahg','donerdgg','donedrag','donderdgg','donderdgh','dondardag','donerdag','donderdgg','donderdahg','donderdgg','donerdg','donderdgg','donderdahg'],
      vrijdag: ['vrijdag','vriijdag','vriidag','vrijdagg','vrijdagh','vriidag','vrijdagh','vrijdagg','vrijdajg','vrijdaj','vrjidag','vrijdagh','vrijdajg','vrjidag','vrijdja','vrijdajg','vrijdagh'],
      zaterdag: ['zaterdag','zaterdahg','zaterdg','zaterddag','zaaterdag','zatterdag','zateradg','zaterdagg','zaterdga','zaterdgg','zatedrag','zateerdag','zaterdga','zaterdgg','zaterdagh','zateerdag','zaterdga','zaterdag','zaterdgg','zateradg'],
      zondag: ['zondag','zonddag','zondagg','zondahg','zonndag','zodnag','zondgg','zonndagg','zonddagg','zondg']
    };
    let t = tekst;
    for (const [correct, typos] of Object.entries(typoMap)) {
      for (const typo of typos) {
        t = t.replace(new RegExp('\\b' + typo + '\\b', 'gi'), correct);
      }
    }
    return t;
  }

  function maandTypoCorrectie(tekst) {
    const maandTypoMap = {
      januari: ['januri','januai','janurai','jnauari','januarie','janari','janueri','januair','janurari'],
      februari: ['feburari','februai','febrauri','febuary','februrai','februarie','ferbruari','febraui','febuari','febrari'],
      maart: ['mart','maert','maartt','marrrt','maat','maaat','maar','maars','maatr','mraat'],
      april: ['aprl','appril','arpil','apirl','aprill','aprli','aprril','aprel','aprik'],
      mei: ['mi','meei','meii','mey','meie','mii','meiee','mee'],
      juni: ['jni','juuni','junni','jnui','juniie','juno','jui','junu','jnni'],
      juli: ['julli','juuli','jly','jli','julliie','juliie','julie','julii','juil'],
      augustus: ['augstus','augusts','agustus','augustsu','agusts','augutus','augusuts','augst','agustuss','auggustus'],
      september: ['septmber','septemer','septermber','septembr','septmbr','setember','septembrer','septembe','septber','seotember'],
      oktober: ['oktber','ocotber','okotber','oktobr','oktoer','okober','octber','oktobber','oktobeer','otkober'],
      november: ['novmber','novembr','novemer','novmebr','noveber','novembe','novembrer','nvoember','novebmer','novemebr'],
      december: ['decmber','descember','decembre','desembre','deecember','deceber','desmber','decemebr','decembber','decembee']
    };
    let t = tekst;
    for (const [maand, typos] of Object.entries(maandTypoMap)) {
      for (const typo of typos) {
        t = t.replace(new RegExp('\\b' + typo + '\\b', 'gi'), maand);
      }
    }
    return t;
  }

  function corrigeerDagTypo(tekst) {
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
    const dagen = { zondag:0, maandag:1, dinsdag:2, woensdag:3, donderdag:4, vrijdag:5, zaterdag:6 };
    const vandaag = new Date();
    // Weeknummer
    const weekMatch = text.match(/week\s*(\d{1,2})/i);
    if (weekMatch) weeknr = parseInt(weekMatch[1]);
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
    // Datum parsing
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
        const maanden = { januari:0,februari:1,maart:2,april:3,mei:4,juni:5,juli:6,augustus:7,september:8,oktober:9,november:10,december:11 };
        const day = parseInt(dateMatch[4]);
        const month = maanden[dateMatch[5].toLowerCase()];
        const year = dateMatch[6] ? parseInt(dateMatch[6]) : new Date().getFullYear();
        datum = new Date(year, month, day);
      }
    }
    const woordNaarGetal = {
      een:1,en:1,eehn:1,ean:1,eemm:1,eej:1,eenn:1,eeen:1,eenm:1,e3n:1,enn:1,eeb:1,
      twee:2,twe:2,twei:2,twwe:2,twie:2,tww:2,tw3e:2,twre:2,twew:2,'tweeë':2,tweee:2,
      drie:3,driee:3,driei:3,driey:3,drieh:3,dree:3,driej:3,drrie:3,drieee:3,'drieé':3,'d4ie':3,drje:3,drieu:3,
      vier:4,vieer:4,viir:4,vvier:4,fiir:4,vuer:4,vire:4,viehr:4,'vi3r':4,viee:4,'vie4':4,virr:4,vuer:4,
      vijf:5,vijv:5,viv:5,viev:5,vijg:5,vujf:5,vyjf:5,vjif:5,'v9jf':5,vjhf:5,vijjf:5,vijff:5,vjvf:5,
      zes:6,zss:6,zess:6,zesz:6,zs:6,zees:6,zws:6,zesx:6,zesr:6,zrs:6,'2es':6,
      zeven:7,zven:7,zevenn:7,zevven:7,zeen:7,zevn:7,'z3ven':7,zewen:7,zeve:7,zeevn:7,zeveh:7,xeven:7,
      acht:8,ahct:8,accht:8,aacht:8,achtg:8,achtt:8,achy:8,axht:8,aght:8,acgt:8,achtz:8,
      negen:9,negenn:9,neegn:9,neven:9,neggn:9,negee:9,nehem:9,neegem:9,negeb:9,negem:9,
      tien:10,tienn:10,tienm:10,tein:10,tiien:10,tieen:10,tjien:10,tlen:10,tjeen:10,tioen:10,tine:10,tian:10,
      elf:11,elff:11,elv:11,elg:11,elfj:11,eelf:11,elrf:11,elgf:11,elkf:11,'e,f':11,elfe:11,elk:11,
      twaalf:12,twalf:12,twaalv:12,twwaalf:12,twalef:12,twwalf:12,tuaalf:12,twaaaf:12,twalfh:12,twallf:12,twazlf:12,twaalg:12,
      dertien:13,dertin:13,deritien:13,dertieen:13,dertine:13,'d3rtien':13,dertjen:13,dertioen:13,drrtien:13,dertinm:13,dertlen:13,
      veertien:14,veertin:14,veerien:14,veerteen:14,veertjan:14,veertlen:14,veetien:14,veertine:14,veertiem:14,'ve3rtien':14,veertinm:14,
      vijftien:15,vijftin:15,vijftjen:15,vijvteen:15,vijvtiem:15,vyjftien:15,vijgtien:15,vjjftien:15,vujftien:15,vijftlen:15,vijrteen:15,
      zestien:16,zesstien:16,zestjan:16,zestin:16,zesyien:16,zestiem:16,zestjeen:16,zesrien:16,zestieen:16,zeszien:16,
      zeventien:17,zewentien:17,zeventin:17,zevenntien:17,'z3ventien':17,zeeventien:17,zevenrien:17,zeventjeen:17,sevntien:17,zevenien:17,
      achttien:18,achtien:18,ahtttien:18,achtteen:18,achttjan:18,achtjeen:18,achttin:18,achteen:18,achtrien:18,ahctt:18,
      negentien:19,negentienn:19,
      twintig:20,twintg:20
    };
    function woordOfGetal(w) { if (!w) return null; return isNaN(w) ? (woordNaarGetal[w.toLowerCase()] ?? null) : parseInt(w); }
    function adjustTime(h) { if (h != null && h < 8) return h + 12; return h; }
    let startH = null, startM = null;
    const tijdRegexes = [
      { re: /(\w+)\s*(over|oevr|oveer|oevr|ovre|oevre|ober|ove|iver|obver)\s*half\s*(\w+)/gi, calc: (m, o, h) => [adjustTime(woordOfGetal(h) - 1), 30 + woordOfGetal(m)] },
      { re: /(\w+)\s*(voor|vor|foor|vooor|vooe|voer|voof|voot|vopr|v0or|vorr|vdor)\s*half\s*(\w+)/gi, calc: (m, v, h) => [adjustTime(woordOfGetal(h) - 1), 30 - woordOfGetal(m)] },
      { re: /kwart\s*(over|oevr|oveer|oevr|ovre|oevre|ober|ove|iver|obver)\s*(\w+)/gi, calc: (o, h) => [adjustTime(woordOfGetal(h)), 15] },
      { re: /kwart\s*(voor|vor|foor|vooor|vooe|voer|voof|voot|vopr|v0or|vorr|vdor)\s*(\w+)/gi, calc: (v, h) => [adjustTime(woordOfGetal(h) - 1), 45] },
      { re: /half (\w+)/gi, calc: h => [adjustTime(woordOfGetal(h) - 1), 30] },
      { re: /(\d{1,2})\s*(over|oevr|oveer|oevr|ovre|oevre|ober|ove|iver|obver)\s*(\d{1,2})/gi, calc: (m, o, h) => [adjustTime(parseInt(h)), parseInt(m)] },
      { re: /(\w+)\s*(over|oevr|oveer|oevr|ovre|oevre|ober|ove|iver|obver)\s*(\w+)/gi, calc: (m, o, h) => { const min = woordOfGetal(m); const uur = woordOfGetal(h); if (min == null || uur == null) return [null, null]; return [adjustTime(uur), min]; } },
      { re: /(\d{1,2})\s*(voor|vor|foor|vooor|vooe|voer|voof|voot|vopr|v0or|vorr|vdor)\s*(\d{1,2})/gi, calc: (m, v, h) => [adjustTime(parseInt(h) - 1), 60 - parseInt(m)] },
      { re: /(\w+)\s*(voor|vor|foor|vooor|vooe|voer|voof|voot|vopr|v0or|vorr|vdor)\s*(\w+)/gi, calc: (m, v, h) => { const min = woordOfGetal(m); const uur = woordOfGetal(h); if (min == null || uur == null) return [null, null]; return [adjustTime(uur - 1), 60 - min]; } },
      { re: /kwart over (\d{1,2})/gi, calc: h => [adjustTime(parseInt(h)), 15] },
      { re: /kwart voor (\d{1,2})/gi, calc: h => [adjustTime(parseInt(h) - 1), 45] },
      { re: /half (\d{1,2})/gi, calc: h => [adjustTime(parseInt(h) - 1), 30] },
      { re: /(\d{1,2}):(\d{2})/gi, calc: (h, m) => [parseInt(h), parseInt(m)] },
      { re: /(\d{1,2})\s*(uur|u)/gi, calc: h => [adjustTime(parseInt(h)), 0] },
      { re: /(\w+)\s*(uur|u)/gi, calc: h => [adjustTime(woordOfGetal(h)), 0] }
    ];
    for (let tijdRe of tijdRegexes) {
      let match;
      while ((match = tijdRe.re.exec(origineleTekst)) !== null) {
        let res;
        try { res = tijdRe.calc(...match.slice(1)); } catch { res = null; }
        if (res && res[0] != null && res[1] != null) { startH = res[0]; startM = res[1]; break; }
      }
      if (startH !== null) break;
    }
    // Weekcontext
    if (!datum && weeknr && gevondenDag) {
      const year = new Date().getFullYear();
      const simple = new Date(year, 0, 1 + (weeknr - 1) * 7);
      const dagVanSimple = simple.getDay();
      const doelDag = dagen[gevondenDag];
      let diff = doelDag - dagVanSimple;
      if (diff < 0) diff += 7;
      simple.setDate(simple.getDate() + diff);
      datum = simple;
    }
    const titel = opschonenTitel(text);
    let tijdResultaat = startH !== null && startM !== null ? `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}` : tijdLabel;
    return { titel, datum, tijd: tijdResultaat };
  }

  function parseMeerdereAfsprakenInRegel(tekst) {
    tekst = typoCorrectieOverVoorKwartHalf(tekst);
    tekst = corrigeerDagTypo(tekst);
    tekst = maandTypoCorrectie(tekst);
    const dagNamen = ['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag'];
    const dagTypos = [
      'zonddag','zondagg','zondahg','zonndag','zodnag','zondgg','zonndagg','zonddagg','zondg',
      'mandag','manndag','maandaag','maadng','maanadg','maadng','mandaag','maanadg','manndag','maadnag','maadnng','maadnaag','maadan','manndaag','maanndag','manadg','manadng','maanadg','mannddg','mandaag',
      'dinsdaag','dinsdg','dinsdahg','dinsdagg','dinstag','dinsdsg','dinsddag','dinsdah','dinstag','dinsdg','dinsag','dinsdagh','dinsdagg','dinsdg','dinsadg','dinsdagh','dinsdgg',
      'woensdaag','woensdg','woensdahg','woensddag','wonsdag','woensadg','woensdga','woensdg','woendag','woensdag','woensdgg','woendsag','woenstag','woensdg','woensdg','woensddag','woensdahg',
      'donerdag','donderdga','donderdahg','donderdgg','donderdah','donderdahg','donerdgg','donedrag','donderdgg','donderdgh','dondardag','donerdag','donderdgg','donderdahg','donderdgg','donerdg','donderdgg','donderdahg',
      'vriijdag','vriidag','vrijdagg','vrijdagh','vrijdag','vriidag','vrijdagh','vrijdagg','vrijdajg','vrijdag','vrijdaj','vrijdag','vrjidag','vrijdagh','vrijdajg','vrjidag','vrijdja','vrijdajg','vrijdagh',
      'zaterdahg','zaterdg','zaterddag','zaaterdag','zatterdag','zateradg','zaterdagg','zaterdga','zaterdgg','zatedrag','zateerdag','zaterdga','zaterdgg','zaterdagh','zateerdag','zaterdga','zaterdag','zaterdgg','zateradg'
    ];
    const dagRegex = [...dagNamen, ...dagTypos].join('|');
    const blokken = tekst.split(new RegExp(`[\r\n\.]+|, (?=${dagRegex})`, 'i')).map(r => r.trim()).filter(r => r.length > 0);
    let weekMatch = tekst.match(/week\s*(\d{1,2})/i);
    let weeknr = weekMatch ? parseInt(weekMatch[1]) : null;
    let weekContext = weeknr ? weeknr : null;
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
      let dagMatch = blok.match(new RegExp(`\\b(${dagRegex})\\b`, 'i'));
      if (dagMatch) {
        laatsteDag = dagMatch[1].toLowerCase();
      }
      let dagNaam = laatsteDag;
      let titleBeforeDay = dagMatch ? blok.substring(0, dagMatch.index).trim() : '';
      let baseTitle = titleBeforeDay ? opschonenTitel(titleBeforeDay) : hoofdTitel || '';
      let naDag = dagMatch ? blok.substring(dagMatch.index + dagNaam.length).trim() : blok;
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
          let tijd = s.replace('.', ':');
          let extraTitel = '';
          if (i + 1 < parts.length && !/^\d{1,2}[:.]\d{2}$/.test(parts[i + 1])) {
            extraTitel = opschonenTitel(parts[i + 1].trim());
            const dagNamenEnTypos = [
              'zondag','zonddag','zondagg','zondahg','zonndag','zodnag','zondgg','zonndagg','zonddagg','zondg',
              'maandag','mandag','manndag','maandaag','maadng','maanadg','maadng','mandaag','maanadg','manndag','maadnag','maadnng','maadnaag','maadan','manndaag','maanndag','manadg','manadng','maanadg','mannddg','mandaag',
              'dinsdag','dinsdaag','dinsdg','dinsdahg','dinsdagg','dinstag','dinsdsg','dinsddag','dinsdah','dinstag','dinsdg','dinsag','dinsdagh','dinsdagg','dinsdg','dinsadg','dinsdagh','dinsdgg',
              'woensdag','woensdaag','woensdg','woensdahg','woensddag','wonsdag','woensadg','woensdga','woensdg','woendag','woensdag','woensdgg','woendsag','woenstag','woensdg','woensdg','woensddag','woensdahg',
              'donderdag','donerdag','donderdga','donderdahg','donderdgg','donderdah','donderdahg','donerdgg','donedrag','donderdgg','donderdgh','dondardag','donerdag','donderdgg','donderdahg','donderdgg','donerdg','donderdgg','donderdahg',
              'vrijdag','vriijdag','vriidag','vrijdagg','vrijdagh','vrijdag','vriidag','vrijdagh','vrijdagg','vrijdajg','vrijdag','vrijdaj','vrijdag','vrjidag','vrijdagh','vrijdajg','vrjidag','vrijdja','vrijdajg','vrijdagh',
              'zaterdag','zaterdahg','zaterdg','zaterddag','zaaterdag','zatterdag','zateradg','zaterdagg','zaterdga','zaterdgg','zatedrag','zateerdag','zaterdga','zaterdgg','zaterdagh','zateerdag','zaterdga','zaterdag','zaterdgg','zateradg'
            ];
            if (!extraTitel || extraTitel === ',' || dagNamenEnTypos.includes(extraTitel.toLowerCase())) {
              extraTitel = '';
            }
          }
          let afspraakTitel = baseTitle;
          if (extraTitel && extraTitel !== 'Onbekende afspraak') {
            afspraakTitel = afspraakTitel ? afspraakTitel + ' – ' + extraTitel : extraTitel;
          }
          if (extraTitel && extraTitel.toLowerCase() === 'examen' && !/examen/i.test(afspraakTitel)) {
            afspraakTitel += afspraakTitel ? ' – Examen' : 'Examen';
          }
          if (!afspraakTitel || afspraakTitel.toLowerCase() === dagNaam || afspraakTitel === 'Onbekende afspraak') {
            afspraakTitel = hoofdTitel || 'Onbekende afspraak';
          }
          let parseString = dagNaam + ' ' + tijd;
          if (extraTitel && !baseTitle) parseString += ' ' + extraTitel;
          let event = parseTextToEvent(parseString, weekContext);
          event.titel = afspraakTitel ? afspraakTitel : event.titel;
          afspraken.push({ titel: event.titel, datum: event.datum, tijd: event.tijd });
        }
      }
    }
    return afspraken;
  }

  // Bind to namespace and mirror to window for backward compatibility
  ns.todayWithoutTime = todayWithoutTime;
  ns.opschonenTitel = opschonenTitel;
  ns.typoCorrectieOverVoorKwartHalf = typoCorrectieOverVoorKwartHalf;
  ns.maandTypoCorrectie = maandTypoCorrectie;
  ns.corrigeerDagTypo = corrigeerDagTypo;
  ns.parseTextToEvent = parseTextToEvent;
  ns.parseMeerdereAfsprakenInRegel = parseMeerdereAfsprakenInRegel;

  window.todayWithoutTime = window.todayWithoutTime || todayWithoutTime;
  window.opschonenTitel = window.opschonenTitel || opschonenTitel;
  window.typoCorrectieOverVoorKwartHalf = window.typoCorrectieOverVoorKwartHalf || typoCorrectieOverVoorKwartHalf;
  window.maandTypoCorrectie = window.maandTypoCorrectie || maandTypoCorrectie;
  window.corrigeerDagTypo = window.corrigeerDagTypo || corrigeerDagTypo;
  window.parseTextToEvent = window.parseTextToEvent || parseTextToEvent;
  window.parseMeerdereAfsprakenInRegel = window.parseMeerdereAfsprakenInRegel || parseMeerdereAfsprakenInRegel;

  console.log('[OK] Parsing ready');
})();
