// agenda_ui.js (wrapper phase)
(function(){
  console.log('[BOOT] agenda_ui.js loaded');
  const ns = window.AgendaUI = window.AgendaUI || {};
  function missing(name){ return function(){ console.error(`[AgendaUI] Missing implementation for ${name}.`); }; }
  ns.showAgenda = window.showAgenda || missing('showAgenda');
  ns.buildAgendaGrid = window.buildAgendaGrid || missing('buildAgendaGrid');
  ns.vulAfsprakenInGrid = window.vulAfsprakenInGrid || missing('vulAfsprakenInGrid');
  ns.showEventTooltip = window.showEventTooltip || missing('showEventTooltip');
  ns.updateRealtimeClock = window.updateRealtimeClock || missing('updateRealtimeClock');
  ns.getWeekNumber = window.getWeekNumber || missing('getWeekNumber');
  ns.isSameDay = window.isSameDay || missing('isSameDay');
  console.log('[OK] AgendaUI namespace bound');

  // --- Extracted implementations ---
  function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    return weekNo;
  }
  function isSameDay(a,b) {
    return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
  }
  function updateRealtimeClock() {
    const klok = document.getElementById('weekagenda-klok');
    if (!klok) return;
    function update() {
      const nu = new Date();
      klok.textContent = `🕒 ${nu.getHours().toString().padStart(2,'0')}:${nu.getMinutes().toString().padStart(2,'0')}`;
    }
    update();
    setInterval(update, 1000);
  }
  function showEventTooltip(event, target) {
    document.querySelectorAll('.event-tooltip').forEach(tip=>tip.remove());
    const tip = document.createElement('div');
    tip.className = 'event-tooltip';
    tip.style.cssText = 'position:fixed;left:50%;bottom:0;transform:translateX(-50%);z-index:9999;background:#28292b;color:#fff;padding:20px 16px 30px 16px;border-radius:18px 18px 0 0;box-shadow:0 -4px 24px #000a;font-size:18px;max-width:98vw;min-width:180px;width:96vw;pointer-events:auto;transition:bottom 0.25s;';
    let tijd = '';
    if (event.start.dateTime && event.end.dateTime) {
      const sd = new Date(event.start.dateTime);
      const ed = new Date(event.end.dateTime);
      tijd = `${sd.toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'})} - ${ed.toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'})}`;
    } else if (event.start.date) {
      tijd = 'Hele dag';
    }
    tip.innerHTML = `<div style='font-size:20px;font-weight:bold;margin-bottom:8px;'>${event.summary||'(geen titel)'}</div><div style='margin-bottom:6px;'>${tijd}</div>${event.location?'<div style="color:#aaf;margin-bottom:6px;">📍 '+event.location+'</div>':''}${event.description?'<div style=\"color:#bbb;white-space:pre-line;\">'+event.description+'</div>':''}<button style='position:absolute;right:18px;top:10px;background:none;border:none;color:#fff;font-size:28px;line-height:1;cursor:pointer;' onclick='this.parentNode.remove()'>&times;</button>`;
    function closeTip(e) { if (!tip.contains(e.target)) { tip.remove(); document.removeEventListener('mousedown', closeTip); } }
    document.addEventListener('mousedown', closeTip);
    document.body.appendChild(tip);
  }

  // expose
  ns.getWeekNumber = getWeekNumber; window.getWeekNumber = getWeekNumber; window.AgendaGetWeekNumber = getWeekNumber;
  ns.isSameDay = isSameDay; window.isSameDay = isSameDay;
  ns.updateRealtimeClock = updateRealtimeClock; window.updateRealtimeClock = updateRealtimeClock;
  ns.showEventTooltip = showEventTooltip; window.showEventTooltip = showEventTooltip;

  // -------- Agenda rendering --------
  function vulAfsprakenInGrid(agenda, monday, allDayBar, pixelsPerHour) {
    if (!window.accessToken) return;
    const colorMap = { '1': '#a4bdfc', '2': '#7ae7bf', '3': '#dbadff', '4': '#ff887c', '5': '#fbd75b', '6': '#ffb878', '7': '#46d6db', '8': '#e1e1e1', '9': '#5484ed', '10': '#51b749', '11': '#dc2127' };
    const start = new Date(monday);
    const eind = new Date(monday); eind.setDate(start.getDate()+6); eind.setHours(23,59,59,999);
    gapi.client.calendar.events.list({ calendarId: 'primary', timeMin: start.toISOString(), timeMax: eind.toISOString(), showDeleted: false, singleEvents: true, orderBy: 'startTime' }).then(function(response) {
      const events = response.result.items; if (!events || events.length === 0) return;
      // Hele dag
      events.filter(e=>e.start.date && !e.start.dateTime).forEach(event => {
        const startDate = new Date(event.start.date);
        const dagIndex = (startDate.getDay()+6)%7;
        const cel = allDayBar.querySelector(`.allday-cel:nth-child(${dagIndex+2})`);
        if (cel) {
          const chip = document.createElement('div'); chip.className = 'allday-chip'; chip.textContent = event.summary || '(geen titel)';
          const isMobile = window.matchMedia && window.matchMedia('(max-width: 480px)').matches;
          const chipFont = isMobile ? 16 : 15;
          const chipMinH = isMobile ? 48 : 42;
          chip.style.cssText = `display:inline-block;max-width:90%;padding:${isMobile? '10px 16px':'8px 14px'};margin:4px 4px 4px 0;background:${event.colorId&&colorMap[event.colorId]?colorMap[event.colorId]:'#4285f4'};color:#fff;font-size:${chipFont}px;border-radius:16px;box-shadow:0 2px 10px #0004;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-height:${chipMinH}px;`;
          chip.onclick = e => showEventTooltip(event, e.target);
          cel.appendChild(chip);
        }
      });
      // Grid events per uur
      const cellEvents = {};
      events.filter(e=>e.start.dateTime && e.end.dateTime).forEach(event => {
        const startDate = new Date(event.start.dateTime);
        const dagIndex = (startDate.getDay()+6)%7;
        const uur = startDate.getHours();
        const key = `${dagIndex}-${uur}`;
        if (!cellEvents[key]) cellEvents[key] = [];
        cellEvents[key].push(event);
      });
      for (const key in cellEvents) {
        const [dagIndex, uur] = key.split('-').map(Number);
        const eventsInCell = cellEvents[key];
        const n = eventsInCell.length;
        eventsInCell.forEach((event, i) => {
          const startDate = new Date(event.start.dateTime);
          const endDate = new Date(event.end.dateTime);
          const startMin = startDate.getMinutes();
          let duration = (endDate - startDate) / 60000; if (duration < 15) duration = 15;
          const cell = agenda.querySelector(`.agenda-cel[data-dag='${dagIndex}'][data-uur='${uur}']`);
          if (cell) {
            const taak = document.createElement('div'); taak.className = 'taak'; taak.textContent = event.summary || '(geen titel)';
            const isMobile = window.matchMedia && window.matchMedia('(max-width: 480px)').matches;
            const topPx = (startMin/60)*pixelsPerHour;
            const heightPx = (duration/60)*pixelsPerHour;
            taak.style.position = 'absolute';
            if (n === 1) {
              taak.style.left = '0';
              taak.style.width = '100%';
            } else {
              taak.style.left = `calc(${(100*i)/n}%)`;
              taak.style.width = `calc(${100/n}% - 2px)`; // kleine rand voor borders
            }
            taak.style.top = topPx + 'px';
            taak.style.height = heightPx + 'px';
            let kleur = '#4285f4'; if (event.colorId && colorMap[event.colorId]) kleur = colorMap[event.colorId];
            taak.style.background = kleur; taak.style.color = '#fff'; taak.style.borderRadius = '12px'; taak.style.padding = isMobile ? '10px 12px' : '8px 10px'; if (isMobile) taak.style.paddingLeft = '1px'; taak.style.fontSize = '13px'; taak.style.zIndex = 2; taak.style.boxShadow = '0 2px 10px #0005'; taak.style.whiteSpace = 'normal'; taak.style.overflow = 'hidden'; taak.style.wordBreak = 'normal'; taak.style.overflowWrap = 'break-word'; taak.style.textAlign = 'left'; taak.style.cursor = 'pointer'; taak.style.minHeight = isMobile ? '48px' : '42px'; taak.style.boxSizing = 'border-box';
            taak.onclick = e => showEventTooltip(event, e.target);
            cell.appendChild(taak);
          }
        });
      }
    });
  }

  function buildAgendaGrid() {
    const container = document.getElementById('weekAgendaContainer'); if (!container) return;
    container.innerHTML = '';
    const isMobile = window.matchMedia && window.matchMedia('(max-width: 480px)').matches;
    const pixelsPerHour = isMobile ? 84 : 60; // vergroot blokken op mobiel
    const now = new Date();
    const monday = new Date(now);
    const currentDay = monday.getDay();
    const diffToMonday = (currentDay === 0 ? -6 : 1) - currentDay;
    const offset = (typeof window.weekOffset === 'number') ? window.weekOffset : 0;
    monday.setDate(now.getDate() + diffToMonday + (offset*7));
    monday.setHours(0,0,0,0);
    const weekNum = getWeekNumber(monday);
    const header = document.createElement('div'); header.className = 'agenda-header';
    header.style.cssText = `height:${isMobile?56:48}px;display:flex;align-items:center;justify-content:space-between;padding:0 18px;background:linear-gradient(145deg, #0d1f2d 0%, #162c40 20%, #1e3a56 45%, #285673 75%, #2e6a85 100%);color:#cdefff;font-size:${isMobile? '1.22em':'1.17em'};font-weight:700;touch-action:none;-webkit-user-select:none;user-select:none;border-radius:20px 20px 0 0;box-shadow:0 8px 32px 0 rgba(80,180,240,0.16);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1.5px solid rgba(255,255,255,0.12);`;
    const weekText = document.createElement('span');
    let label = '';
    if (offset === 0) label = ' (deze week)'; else if (offset === -1) label = ' (vorige week)'; else if (offset === 1) label = ' (volgende week)'; else if (offset < 0) label = ` (${Math.abs(offset)} weken terug)`; else label = ` (${offset} weken vooruit)`;
    weekText.textContent = `Week ${weekNum}${label}`;
    const klok = document.createElement('span'); klok.id = 'weekagenda-klok'; klok.style.fontWeight = 'normal';
    header.appendChild(weekText); header.appendChild(klok); container.appendChild(header);
    updateRealtimeClock();
    const datumBar = document.createElement('div'); datumBar.className = 'datum-bar';
    datumBar.style.cssText = `display:grid;grid-template-columns:60px repeat(7,1fr);height:${isMobile?48:42}px;background:rgba(30,50,80,0.55);color:#cdefff;font-size:${isMobile?'1.05em':'1em'};align-items:center;border-bottom:1.5px solid rgba(255,255,255,0.10);position:sticky;top:${isMobile?56:48}px;z-index:10;touch-action:none;-webkit-user-select:none;user-select:none;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);`;
    datumBar.appendChild(document.createElement('div'));
    const dagen = ['Ma','Di','Wo','Do','Vr','Za','Zo'];
    for (let i=0; i<7; ++i) {
      const dag = new Date(monday); dag.setDate(monday.getDate()+i);
      const d = document.createElement('div'); d.style.cssText = 'text-align:center;position:relative;';
      const isVandaag = isSameDay(dag, new Date());
      d.innerHTML = `<div style="display:inline-block;padding:${isMobile?'8px 12px':'6px 12px'};border-radius:20px;${isVandaag ? 'background:#4285f4;color:#fff;' : ''}">${dagen[i]} ${dag.getDate()}</div>`;
      if (isVandaag) d.classList.add('vandaag'); datumBar.appendChild(d);
    }
    container.appendChild(datumBar);
    const allDayBar = document.createElement('div'); allDayBar.className = 'allday-bar';
    allDayBar.style.cssText = `display:grid;grid-template-columns:60px repeat(7,1fr);height:${isMobile?44:36}px;align-items:center;background:rgba(30,50,80,0.42);border-bottom:1.5px solid rgba(255,255,255,0.08);overflow-x:auto;white-space:nowrap;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);`;
    allDayBar.appendChild(document.createElement('div'));
    for (let i=0; i<7; ++i) { const d = document.createElement('div'); d.className = 'allday-cel'; d.style.cssText = `position:relative;height:${isMobile?44:36}px;`; allDayBar.appendChild(d); }
    container.appendChild(allDayBar);
    const agenda = document.createElement('div'); agenda.className = 'agenda';
    agenda.style.cssText = `display:grid;grid-template-columns:60px repeat(7,1fr);grid-template-rows:repeat(24,${pixelsPerHour}px);height:calc(100vh - ${isMobile? (56+48+44):144}px);overflow-y:auto;background:linear-gradient(145deg, #0d1f2d 0%, #162c40 20%, #1e3a56 45%, #285673 75%, #2e6a85 100%);position:relative;-webkit-user-select:none;user-select:none;scroll-behavior:smooth;border-radius:0 0 22px 22px;box-shadow:0 8px 32px 0 rgba(80,180,240,0.13);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);`;
    agenda.tabIndex = 0;
    for (let uur=0; uur<24; ++uur) {
      for (let dag=0; dag<8; ++dag) {
        const cel = document.createElement('div');
        if (dag===0) {
          cel.textContent = (uur<10?'0':'')+uur+':00';
          cel.style.cssText = `color:#b7dfff;font-size:${isMobile?'1.02em':'1em'};display:flex;align-items:center;justify-content:center;border-right:1px solid rgba(255,255,255,0.08);background:rgba(30,50,80,0.22);touch-action:none;-webkit-user-select:none;user-select:none;`;
        } else {
          cel.style.cssText = 'border-right:1px solid rgba(255,255,255,0.07);border-bottom:1px solid rgba(255,255,255,0.10);position:relative;background:rgba(30,50,80,0.13);transition:background 0.2s;';
          cel.className = 'agenda-cel'; cel.dataset.dag = dag-1; cel.dataset.uur = uur;
        }
        agenda.appendChild(cel);
      }
    }
    container.appendChild(agenda);
    let touchStartX = null;
    agenda.addEventListener('touchstart', e => { if (e.touches.length===1) touchStartX = e.touches[0].clientX; });
    agenda.addEventListener('touchend', e => {
      if (touchStartX!==null && e.changedTouches.length===1) {
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx)>40) {
          agenda.style.transition = 'background 0.2s'; agenda.style.background = '#222'; setTimeout(()=>{agenda.style.background='#181818';}, 220);
          window.weekOffset = (typeof window.weekOffset==='number'?window.weekOffset:0) + (dx<0 ? 1 : -1);
          buildAgendaGrid();
        }
        touchStartX = null;
      }
    });
    vulAfsprakenInGrid(agenda, monday, allDayBar, pixelsPerHour);
  }

  ns.vulAfsprakenInGrid = vulAfsprakenInGrid; window.vulAfsprakenInGrid = vulAfsprakenInGrid;
  ns.buildAgendaGrid = buildAgendaGrid; window.buildAgendaGrid = buildAgendaGrid;

  // -------- Preview helper --------
  ns.previewEventFromForm = function previewEventFromForm() {
    try {
      if (!window.EventsAPI || typeof window.EventsAPI.getActueleAfspraken !== 'function') {
        alert('Geen afspraakgegevens gevonden om te previewen.');
        return;
      }
      const afspraken = window.EventsAPI.getActueleAfspraken();
      if (!afspraken || afspraken.length === 0) {
        alert('Vul eerst een afspraak in om te previewen.');
        return;
      }
      const a = afspraken[0];
      const datum = a.datum instanceof Date ? new Date(a.datum) : new Date(a.datum);
      if (isNaN(datum)) { alert('Geen geldige datum gevonden.'); return; }

      // Bereken gewenste weekOffset zodat datum in de huidige grid valt
      const now = new Date();
      const cur = new Date(now); const curDay = cur.getDay(); const diffToMon = (curDay === 0 ? -6 : 1) - curDay; cur.setDate(now.getDate()+diffToMon); cur.setHours(0,0,0,0);
      const target = new Date(datum); const tDay = target.getDay(); const tDiff = (tDay === 0 ? -6 : 1) - tDay; target.setDate(datum.getDate()+tDiff); target.setHours(0,0,0,0);
      const weeks = Math.round((target - cur) / (7*24*3600*1000));
      window.weekOffset = weeks;
      // Rebuild en daarna highlight plaatsen
      buildAgendaGrid();
      requestAnimationFrame(()=>{
        const container = document.getElementById('weekAgendaContainer');
        const agenda = container && container.querySelector('.agenda');
        if (!agenda) return;
        const dagIndex = (new Date(a.datum).getDay()+6)%7;
        const uur = (a.tijd && /^\d{1,2}:\d{2}$/.test(a.tijd)) ? parseInt(a.tijd.split(':')[0]) : 9;
        const cell = agenda.querySelector(`.agenda-cel[data-dag='${dagIndex}'][data-uur='${uur}']`);
        if (!cell) return;
        const isMobile = window.matchMedia && window.matchMedia('(max-width: 480px)').matches;
        const pixelsPerHour = isMobile ? 84 : 60;
        const minutes = (a.tijd && /^\d{1,2}:\d{2}$/.test(a.tijd)) ? parseInt(a.tijd.split(':')[1]) : 0;
        const duur = a.duur ? parseInt(a.duur) : 60;
        const preview = document.createElement('div');
        preview.className = 'taak preview';
        preview.textContent = (a.titel || 'Voorbeeld');
        preview.style.cssText = `position:absolute;left:0;right:0;top:${(minutes/60)*pixelsPerHour}px;height:${(duur/60)*pixelsPerHour}px;background:transparent;border:2px dashed #8fd3fe;color:#cdefff;border-radius:12px;padding:${isMobile?'10px 12px':'8px 10px'};font-size:13px;z-index:3;pointer-events:none;box-sizing:border-box;white-space:normal;word-break:normal;overflow-wrap:break-word;overflow:hidden;text-align:left;`;
        if (isMobile) { preview.style.paddingLeft = '1px'; }
        // Auto-remove na paar seconden
        setTimeout(()=>{ preview.remove(); }, 4000);
        cell.appendChild(preview);
      });
    } catch(e) {
      console.error('Preview mislukt:', e);
    }
  };
})();