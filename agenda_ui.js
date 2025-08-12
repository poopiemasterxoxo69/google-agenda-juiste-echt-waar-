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

  // Expand/collapse task cards on small screens to reveal full title
  let expandListenerBound = false;
  function bindGlobalCollapseListener(){
    if (expandListenerBound) return; expandListenerBound = true;
    document.addEventListener('mousedown', (e)=>{
      document.querySelectorAll('.taak[data-expanded="true"]').forEach(el=>{
        if (!el.contains(e.target)) collapseTask(el);
      });
    });
    document.addEventListener('touchstart', (e)=>{
      document.querySelectorAll('.taak[data-expanded="true"]').forEach(el=>{
        if (!el.contains(e.target)) collapseTask(el);
      });
    }, {passive:true});
  }
  function expandTask(el){
    if (el.dataset.expanded === 'true') return;
    el.dataset.expanded = 'true';
    // store original styles
    el.dataset.origHeight = el.style.height || '';
    el.dataset.origZ = el.style.zIndex || '';
    el.style.height = 'auto';
    el.style.maxHeight = 'none';
    el.style.whiteSpace = 'normal';
    el.style.textOverflow = 'clip';
    el.style.overflow = 'auto';
    el.style.display = 'block';
    el.style.zIndex = '99';
    el.style.boxShadow = '0 8px 24px #0006, inset 0 1px 0 rgba(255,255,255,0.25)';
  }
  function collapseTask(el){
    if (el.dataset.expanded !== 'true') return;
    el.dataset.expanded = 'false';
    el.style.height = el.dataset.origHeight || '';
    el.style.maxHeight = '';
    el.style.whiteSpace = '';
    el.style.textOverflow = '';
    el.style.overflow = 'hidden';
    el.style.display = '-webkit-box';
    el.style.zIndex = el.dataset.origZ || '';
    el.style.boxShadow = '0 4px 16px #0004, inset 0 1px 0 rgba(255,255,255,0.25)';
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
  function isMobile() { return window.matchMedia && window.matchMedia('(max-width: 480px)').matches; }

  function vulAfsprakenInGrid(agenda, monday, allDayBar, options={}) {
    if (!window.accessToken) return;
    const mobile = !!options.mobile;
    const visibleDays = mobile ? 1 : 7;
    const dayStartIndex = mobile ? (typeof options.dayIndex === 'number' ? options.dayIndex : ((new Date().getDay()+6)%7)) : 0;
    // Consistente schaal: pixels per minuut op basis van rijhoogte (rowPx)
    const rowPxOpt = typeof options.rowPx === 'number' ? options.rowPx : (mobile ? 72 : 80);
    const ppm = rowPxOpt / 60; // pixels per minuut
    // Clear vorige rendering zonder grid te slopen
    try {
      agenda.querySelectorAll('.day-layer').forEach(n=>n.remove());
      allDayBar.querySelectorAll('.allday-chip').forEach(n=>n.remove());
    } catch(e) { /* ignore */ }
    const colorMap = { '1': '#a4bdfc', '2': '#7ae7bf', '3': '#dbadff', '4': '#ff887c', '5': '#fbd75b', '6': '#ffb878', '7': '#46d6db', '8': '#e1e1e1', '9': '#5484ed', '10': '#51b749', '11': '#dc2127' };
    const start = new Date(monday);
    const eind = new Date(monday); eind.setDate(start.getDate()+6); eind.setHours(23,59,59,999);
    gapi.client.calendar.events.list({ calendarId: 'primary', timeMin: start.toISOString(), timeMax: eind.toISOString(), showDeleted: false, singleEvents: true, orderBy: 'startTime' }).then(function(response) {
      const events = response.result.items; if (!events || events.length === 0) return;
      // Hele dag (span over meerdere dagen)
      events.filter(e=>e.start.date && !e.start.dateTime).forEach(event => {
        const startDate = new Date(event.start.date);
        const endDate = new Date(event.end.date || event.start.date); // end.date is exclusief
        // Span berekenen binnen de weergegeven week
        const weekStart = new Date(monday);
        const weekEnd = new Date(monday); weekEnd.setDate(weekStart.getDate()+6);
        const spanStart = new Date(Math.max(weekStart, startDate));
        const spanEndExclusive = new Date(Math.min(weekEnd.getTime()+24*3600*1000, endDate));
        let startIndex = (spanStart.getDay()+6)%7;
        let endIndexExclusive = (new Date(spanEndExclusive.getTime()-1).getDay()+6)%7 + 1; // inclusief index
        // Clamp voor mobiele enkel-dag weergave
        if (mobile) {
          startIndex = Math.max(startIndex, dayStartIndex);
          endIndexExclusive = Math.min(endIndexExclusive, dayStartIndex+1);
        }
        const chip = document.createElement('div'); chip.className = 'allday-chip'; chip.textContent = event.summary || '(geen titel)';
        const kleur = event.colorId&&colorMap[event.colorId]?colorMap[event.colorId]:'#4285f4';
        const colStart = mobile ? 2 : (startIndex+2);
        const colEnd = mobile ? 3 : (endIndexExclusive+2);
        chip.style.cssText = `grid-column:${colStart} / ${colEnd};align-self:center;justify-self:stretch;margin:4px;min-height:32px;padding:8px 12px;background:${kleur};color:#fff;font-size:15px;border-radius:16px;box-shadow:0 2px 10px #0004;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
        // On small screens, allow multi-line titles for all-day chips
        if (options.smallScreen) {
          chip.style.whiteSpace = 'normal';
          chip.style.textOverflow = 'clip';
          chip.style.lineHeight = '1.2';
          chip.style.minHeight = '36px';
          chip.style.fontSize = '14px';
        }
        chip.onclick = e => showEventTooltip(event, e.target);
        allDayBar.appendChild(chip);
      });
      // Maak per-dag overlay-lagen (spannen alle 24 uur) en plaats één doorlopend blok per event-segment (alleen splitsen op daggrens)
      function getDayLayer(dagIndex) {
        const colIndex = mobile ? 2 : (2 + dagIndex); // grid kolommen: 1 = tijd, dagen starten op 2
        let layer = agenda.querySelector(`.day-layer[data-dag='${dagIndex}']`);
        if (layer) return layer;
        layer = document.createElement('div');
        layer.className = 'day-layer';
        layer.dataset.dag = String(dagIndex);
        // z-index laag houden zodat gridlijnen zichtbaar blijven; events zelf krijgen hogere z-index
        layer.style.cssText = `grid-column:${colIndex} / ${colIndex+1};grid-row:1 / ${24+1};position:relative;z-index:1;pointer-events:none;`;
        agenda.appendChild(layer);
        // Voeg zichtbare gridlijnen toe binnen de day-layer, zodat de 24-uurs grid altijd zichtbaar blijft
        if (!layer.querySelector('.grid-lines')) {
          const lines = document.createElement('div');
          lines.className = 'grid-lines';
          lines.style.cssText = 'position:absolute;left:6px;right:6px;top:0;bottom:0;pointer-events:none;z-index:4;';
          for (let uur=0; uur<24; uur++) {
            const y = uur * rowPxOpt;
            const hour = document.createElement('div');
            hour.style.cssText = `position:absolute;left:0;right:0;top:${y}px;height:1px;background:rgba(255,255,255,0.12);`;
            lines.appendChild(hour);
            // half uur
            const half = document.createElement('div');
            half.style.cssText = `position:absolute;left:0;right:0;top:${y + (rowPxOpt/2)}px;height:1px;background:rgba(255,255,255,0.10);`;
            lines.appendChild(half);
          }
          // verticale dag-randlijnen
          const vLeft = document.createElement('div');
          vLeft.style.cssText = 'position:absolute;top:0;bottom:0;left:0;width:1px;background:rgba(255,255,255,0.10);';
          lines.appendChild(vLeft);
          const vRight = document.createElement('div');
          vRight.style.cssText = 'position:absolute;top:0;bottom:0;right:0;width:1px;background:rgba(255,255,255,0.10);';
          lines.appendChild(vRight);
          layer.appendChild(lines);
        }
        return layer;
      }

      // Verzamel segments per dag (splits uitsluitend op daggrens)
      const daySegments = {};
      events.filter(e=>e.start.dateTime && e.end.dateTime).forEach(event => {
        let s = new Date(event.start.dateTime);
        let e = new Date(event.end.dateTime);
        // Normalize ms
        s = new Date(s.getFullYear(), s.getMonth(), s.getDate(), s.getHours(), s.getMinutes(), 0, 0);
        e = new Date(e.getFullYear(), e.getMonth(), e.getDate(), e.getHours(), e.getMinutes(), 0, 0);
        let iter = new Date(s);
        while (iter < e) {
          const dagIndex = (iter.getDay()+6)%7;
          if (!mobile || (dagIndex >= dayStartIndex && dagIndex < dayStartIndex+visibleDays)) {
            const dayStart = new Date(iter); dayStart.setHours(0,0,0,0);
            const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate()+1);
            const segStart = new Date(Math.max(iter, dayStart));
            const segEnd = new Date(Math.min(e, dayEnd));
            const startMin = Math.max(0, Math.min(1440, Math.round((segStart - dayStart)/60000)));
            const endMin = Math.max(0, Math.min(1440, Math.round((segEnd - dayStart)/60000)));
            if (endMin > startMin) {
              const key = String(dagIndex);
              if (!daySegments[key]) daySegments[key] = [];
              daySegments[key].push({ event, startMin, endMin });
            }
          }
          // Volgende dag
          const nextDay = new Date(iter); nextDay.setHours(24,0,0,0);
          iter = nextDay;
        }
      });

      // Overlap-inrichting per dag: kolommen toewijzen per cluster en renderen in de day-layer
      const gutterPx = 6; // match halve-uur lijn insets voor strakke uitlijning
      Object.keys(daySegments).forEach(key => {
        const dagIndex = Number(key);
        const segs = daySegments[key].sort((a,b)=> a.startMin - b.startMin || a.endMin - b.endMin);
        // Clusters bepalen en kolommen toewijzen
        let clusterId = 0;
        let active = [];
        segs.forEach(seg => {
          // Cleanup actieve die niet meer overlappen
          active = active.filter(a => a.endMin > seg.startMin);
          // Kolom kiezen
          const usedCols = new Set(active.map(a=>a.col));
          let col = 0; while (usedCols.has(col)) col++;
          seg.col = col;
          // Cluster logic: als active leeg -> nieuwe cluster
          if (active.length === 0) clusterId++;
          seg.cluster = clusterId;
          active.push(seg);
        });
        // Bepaal clusterSize
        const clusterSize = {};
        segs.forEach(seg => { clusterSize[seg.cluster] = Math.max(clusterSize[seg.cluster]||0, seg.col+1); });
        // Render
        const layer = getDayLayer(dagIndex);
        segs.forEach(seg => {
          const taak = document.createElement('div');
          taak.className = 'taak';
          taak.textContent = seg.event.summary || '(geen titel)';
          const cols = clusterSize[seg.cluster] || 1;
          const widthPct = 100/cols;
          taak.style.position = 'absolute';
          taak.style.left = `calc(${widthPct*seg.col}% + ${gutterPx}px)`;
          taak.style.width = `calc(${widthPct}% - ${gutterPx*2}px)`;
          taak.style.top = (seg.startMin * ppm) + 'px';
          taak.style.height = ((seg.endMin - seg.startMin) * ppm) + 'px';
          let kleur = '#4285f4'; if (seg.event.colorId && colorMap[seg.event.colorId]) kleur = colorMap[seg.event.colorId];
          taak.style.background = kleur;
          taak.style.border = 'none';
          taak.style.color = '#ffffff';
          taak.style.borderRadius = '8px';
          taak.style.padding = '6px 8px';
          const base = mobile ? 14 : 13; const fs = Math.max(10, Math.min(base, base * (((seg.endMin - seg.startMin) * ppm)/ (rowPxOpt*0.8))));
          taak.style.fontSize = fs + 'px';
          taak.style.fontWeight = '500';
          taak.style.zIndex = 3; // boven grid en layer
          taak.style.boxSizing = 'border-box';
          taak.style.whiteSpace = 'normal';
          taak.style.wordBreak = 'break-word';
          taak.style.overflowWrap = 'anywhere';
          taak.style.overflow = 'hidden';
          taak.style.textOverflow = 'clip';
          taak.style.cursor = 'pointer';
          taak.style.lineHeight = '1.2';
          taak.style.pointerEvents = 'auto'; // layer heeft pointer-events:none
          // Interactie
          taak.title = seg.event.summary || '(geen titel)';
          if (options.smallScreen) {
            bindGlobalCollapseListener();
            taak.addEventListener('click', (e)=>{ e.stopPropagation(); if (taak.dataset.expanded === 'true') collapseTask(taak); else expandTask(taak); });
          } else {
            taak.onclick = e => showEventTooltip(seg.event, e.target);
          }
          layer.appendChild(taak);
        });
      });
    });
  }

  function buildAgendaGrid() {
    const container = document.getElementById('weekAgendaContainer'); if (!container) return;
    // Fixed grid behavior: by default, do NOT rebuild grid if it already exists
    const lock = (typeof window.lockAgendaGrid === 'boolean') ? window.lockAgendaGrid : true;
    const now = new Date();
    const monday = new Date(now);
    const currentDay = monday.getDay();
    const diffToMonday = (currentDay === 0 ? -6 : 1) - currentDay;
    const offset = (typeof window.weekOffset === 'number') ? window.weekOffset : 0;
    // Prefer a full week view on small screens too unless explicitly disabled
    const isSmallScreen = isMobile();
    const preferWeekOnMobile = (typeof window.preferWeekOnMobile === 'boolean') ? window.preferWeekOnMobile : true;
    const mobile = isSmallScreen && !preferWeekOnMobile;
    const dayIndexFromState = typeof window.dayIndexOffset === 'number' ? window.dayIndexOffset : ((new Date().getDay()+6)%7);
    monday.setDate(now.getDate() + diffToMonday + (offset*7));
    monday.setHours(0,0,0,0);
    // If grid already exists (e.g., after login), only refill events to avoid layout changes
    const existingAgenda = container.querySelector('.agenda');
    const existingAllDayBar = container.querySelector('.allday-bar');
    if (existingAgenda && existingAllDayBar && lock) {
      const rowPx = mobile ? 96 : 88;
      vulAfsprakenInGrid(existingAgenda, monday, existingAllDayBar, { mobile, dayIndex: dayIndexFromState, smallScreen: isSmallScreen, rowPx });
      return;
    }
    // Fresh build
    container.innerHTML = '';
    const weekNum = getWeekNumber(monday);
    const header = document.createElement('div'); header.className = 'agenda-header';
    header.style.cssText = 'height:48px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 12px;background:linear-gradient(145deg, #0d1f2d 0%, #162c40 20%, #1e3a56 45%, #285673 75%, #2e6a85 100%);color:#cdefff;font-size:1.05em;font-weight:700;touch-action:none;-webkit-user-select:none;user-select:none;border-radius:20px 20px 0 0;box-shadow:0 8px 32px 0 rgba(80,180,240,0.16);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1.5px solid rgba(255,255,255,0.12)';
    const left = document.createElement('div');
    const prevBtn = document.createElement('button'); prevBtn.textContent = '◀'; prevBtn.style.cssText = 'min-width:38px;height:32px;border-radius:8px;margin-right:6px;';
    const todayBtn = document.createElement('button'); todayBtn.textContent = mobile ? 'Vandaag' : 'Vandaag'; todayBtn.style.cssText = 'height:32px;border-radius:8px;margin-right:6px;';
    const nextBtn = document.createElement('button'); nextBtn.textContent = '▶'; nextBtn.style.cssText = 'min-width:38px;height:32px;border-radius:8px;';
    left.appendChild(prevBtn); left.appendChild(todayBtn); left.appendChild(nextBtn);
    const mid = document.createElement('div');
    let label = '';
    if (offset === 0) label = ' (deze week)'; else if (offset === -1) label = ' (vorige week)'; else if (offset === 1) label = ' (volgende week)'; else if (offset < 0) label = ` (${Math.abs(offset)} weken terug)`; else label = ` (${offset} weken vooruit)`;
    if (mobile) {
      const visibleDate = new Date(monday); visibleDate.setDate(monday.getDate()+dayIndexFromState);
      mid.textContent = `${visibleDate.toLocaleDateString('nl-NL', { weekday:'long', day:'2-digit', month:'long' })}`;
    } else {
      mid.textContent = `Week ${weekNum}${label}`;
    }
    mid.style.fontWeight = '700';
    const klok = document.createElement('span'); klok.id = 'weekagenda-klok'; klok.style.fontWeight = 'normal';
    header.appendChild(left); header.appendChild(mid); header.appendChild(klok); container.appendChild(header);
    function stepDay(delta){
      let idx = (typeof window.dayIndexOffset==='number'?window.dayIndexOffset:dayIndexFromState) + delta;
      let wk = (typeof window.weekOffset==='number'?window.weekOffset:0);
      while (idx < 0) { idx += 7; wk -= 1; }
      while (idx > 6) { idx -= 7; wk += 1; }
      window.dayIndexOffset = idx; window.weekOffset = wk; buildAgendaGrid();
    }
    prevBtn.onclick = ()=>{ if (mobile) stepDay(-1); else { window.weekOffset = (typeof window.weekOffset==='number'?window.weekOffset:0) - 1; buildAgendaGrid(); } };
    nextBtn.onclick = ()=>{ if (mobile) stepDay(1); else { window.weekOffset = (typeof window.weekOffset==='number'?window.weekOffset:0) + 1; buildAgendaGrid(); } };
    todayBtn.onclick = ()=>{ window.weekOffset = 0; window.dayIndexOffset = (new Date().getDay()+6)%7; buildAgendaGrid(); };
    updateRealtimeClock();
    const datumBar = document.createElement('div'); datumBar.className = 'datum-bar';
    datumBar.style.cssText = `display:grid;grid-template-columns:60px repeat(${mobile?1:7},1fr);height:${mobile? '44px':'42px'};background:rgba(30,50,80,0.55);color:#cdefff;font-size:${mobile?'1.05em':'1em'};align-items:center;border-bottom:1.5px solid rgba(255,255,255,0.10);position:sticky;top:48px;z-index:10;touch-action:none;-webkit-user-select:none;user-select:none;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);`;
    datumBar.appendChild(document.createElement('div'));
    const dagen = ['Ma','Di','Wo','Do','Vr','Za','Zo'];
    const visibleDays = mobile ? 1 : 7;
    const startIndex = mobile ? dayIndexFromState : 0;
    for (let i=0; i<visibleDays; ++i) {
      const dag = new Date(monday); dag.setDate(monday.getDate() + startIndex + i);
      const d = document.createElement('div'); d.style.cssText = 'text-align:center;position:relative;';
      const isVandaag = isSameDay(dag, new Date());
      d.innerHTML = `<div style="display:inline-block;padding:${mobile?'6px 10px':'6px 12px'};border-radius:20px;${isVandaag ? 'background:#4285f4;color:#fff;' : ''}">${dagen[(startIndex+i)%7]} ${dag.getDate()}</div>`;
      if (isVandaag) d.classList.add('vandaag'); datumBar.appendChild(d);
    }
    container.appendChild(datumBar);
    const allDayBar = document.createElement('div'); allDayBar.className = 'allday-bar';
    allDayBar.style.cssText = `display:grid;grid-template-columns:60px repeat(${mobile?1:7},1fr);height:${mobile?'44px':'36px'};align-items:center;background:rgba(30,50,80,0.42);border-bottom:1.5px solid rgba(255,255,255,0.08);overflow-x:auto;white-space:nowrap;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);`;
    allDayBar.appendChild(document.createElement('div'));
    for (let i=0; i<(mobile?1:7); ++i) { const d = document.createElement('div'); d.className = 'allday-cel'; d.style.cssText = `position:relative;height:${mobile?'44px':'36px'};`; allDayBar.appendChild(d); }
    container.appendChild(allDayBar);
    const agenda = document.createElement('div'); agenda.className = 'agenda';
    const rowPx = mobile ? 96 : 88; // per uur - grotere blokken voor meer tekst
    agenda.style.cssText = `display:grid;grid-template-columns:60px repeat(${mobile?1:7},1fr);grid-template-rows:repeat(24,${rowPx}px);height:calc(100vh - ${mobile? '150px':'144px'});overflow-y:auto;background:linear-gradient(145deg, #0d1f2d 0%, #162c40 20%, #1e3a56 45%, #285673 75%, #2e6a85 100%);position:relative;-webkit-user-select:none;user-select:none;scroll-behavior:smooth;border-radius:0 0 22px 22px;box-shadow:0 8px 32px 0 rgba(80,180,240,0.13);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);`;
    agenda.tabIndex = 0;
    // Bereken zichtbare datums voor kolommen
    const dayDates = [];
    { const startIndex = mobile ? dayIndexFromState : 0; const count = mobile ? 1 : 7; for (let i=0;i<count;i++){ const d=new Date(monday); d.setDate(monday.getDate()+startIndex+i); dayDates.push(d);} }
    for (let uur=0; uur<24; ++uur) {
      for (let dag=0; dag<(mobile?2:8); ++dag) {
        const cel = document.createElement('div');
        if (dag===0) {
          cel.textContent = (uur<10?'0':'')+uur+':00';
          cel.style.cssText = `color:#b7dfff;font-size:${mobile?'0.95em':'1em'};display:flex;align-items:center;justify-content:center;border-right:1px solid rgba(255,255,255,0.08);background:rgba(30,50,80,0.22);touch-action:none;-webkit-user-select:none;user-select:none;`;
        } else {
          const idx = mobile ? 0 : (dag-1);
          const isTodayCol = dayDates[idx] && isSameDay(dayDates[idx], new Date());
          cel.style.cssText = `border-right:1px solid rgba(255,255,255,0.07);border-bottom:1px solid rgba(255,255,255,0.10);position:relative;background:${isTodayCol ? 'rgba(66,133,244,0.10)' : 'rgba(30,50,80,0.13)'};transition:background 0.2s;`;
          cel.className = 'agenda-cel'; cel.dataset.dag = idx; cel.dataset.uur = uur;
          // Half-uur scheidslijn
          const half = document.createElement('div');
          half.style.cssText = `position:absolute;left:6px;right:6px;top:${rowPx/2}px;height:1px;background:rgba(255,255,255,0.12);`;
          cel.appendChild(half);
        }
        agenda.appendChild(cel);
      }
    }
    container.appendChild(agenda);
    // mark initialized to allow refills later without rebuild
    window.agendaGridInitialized = true;

    // Scroll naar huidige tijd (indien deze week)
    if (!mobile && offset === 0) {
      const nu = new Date();
      const rowPx = mobile ? 96 : 88; // zelfde als gebruikt in grid-template-rows
      const ppmDesk = rowPx / 60; // pixels per minuut
      const top = (nu.getHours()*60 + nu.getMinutes()) * ppmDesk;
      agenda.scrollTop = Math.max(0, top - 120);
      // Tijd-indicator lijn in huidige uurcel
      const dagIndex = (nu.getDay()+6)%7;
      const uur = nu.getHours();
      const cel = agenda.querySelector(`.agenda-cel[data-dag='${dagIndex}'][data-uur='${uur}']`);
      if (cel) {
        const line = document.createElement('div');
        line.className = 'now-line';
        line.style.cssText = 'position:absolute;left:0;right:0;height:2px;background:#ea4335;box-shadow:0 0 0 1px #ea4335;z-index:3;';
        line.style.top = (nu.getMinutes() * ppmDesk) + 'px';
        cel.appendChild(line);
      }
    }
    if (mobile) {
      const nu = new Date();
      const visibleDate = new Date(monday); visibleDate.setDate(monday.getDate()+dayIndexFromState);
      if (isSameDay(nu, visibleDate)) {
        const top = (nu.getHours()*rowPx + nu.getMinutes() * (rowPx/60));
        agenda.scrollTop = Math.max(0, top - 140);
        const uur = nu.getHours();
        const cel = agenda.querySelector(`.agenda-cel[data-dag='0'][data-uur='${uur}']`);
        if (cel) {
          const line = document.createElement('div');
          line.className = 'now-line';
          line.style.cssText = 'position:absolute;left:0;right:0;height:2px;background:#ea4335;box-shadow:0 0 0 1px #ea4335;z-index:3;';
          line.style.top = (nu.getMinutes() * (rowPx/60)) + 'px';
          cel.appendChild(line);
        }
      }
    }
    let touchStartX = null;
    agenda.addEventListener('touchstart', e => { if (e.touches.length===1) touchStartX = e.touches[0].clientX; });
    agenda.addEventListener('touchend', e => {
      if (touchStartX!==null && e.changedTouches.length===1) {
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx)>40) {
          agenda.style.transition = 'background 0.2s'; agenda.style.background = '#222'; setTimeout(()=>{agenda.style.background='#181818';}, 220);
          if (mobile) {
            // Dagstap
            const dir = dx < 0 ? 1 : -1;
            let idx = (typeof window.dayIndexOffset==='number'?window.dayIndexOffset:dayIndexFromState) + dir;
            let wk = (typeof window.weekOffset==='number'?window.weekOffset:0);
            while (idx < 0) { idx += 7; wk -= 1; }
            while (idx > 6) { idx -= 7; wk += 1; }
            window.dayIndexOffset = idx; window.weekOffset = wk;
            buildAgendaGrid();
          } else {
            window.weekOffset = (typeof window.weekOffset==='number'?window.weekOffset:0) + (dx<0 ? 1 : -1);
            buildAgendaGrid();
          }
        }
        touchStartX = null;
      }
    });
    vulAfsprakenInGrid(agenda, monday, allDayBar, { mobile, dayIndex: dayIndexFromState, smallScreen: isSmallScreen, rowPx });
  }

  ns.vulAfsprakenInGrid = vulAfsprakenInGrid; window.vulAfsprakenInGrid = vulAfsprakenInGrid;
  ns.buildAgendaGrid = buildAgendaGrid; window.buildAgendaGrid = buildAgendaGrid;
  // Expose navigation helpers
  ns.nextWeek = function(){ window.weekOffset = (typeof window.weekOffset==='number'?window.weekOffset:0) + 1; buildAgendaGrid(); };
  ns.prevWeek = function(){ window.weekOffset = (typeof window.weekOffset==='number'?window.weekOffset:0) - 1; buildAgendaGrid(); };
  ns.thisWeek = function(){ window.weekOffset = 0; buildAgendaGrid(); };
  // Initialize once helper to guarantee a fixed grid
  ns.initAgendaGridOnce = function(){
    const container = document.getElementById('weekAgendaContainer'); if (!container) return;
    const agenda = container.querySelector('.agenda'); const allDayBar = container.querySelector('.allday-bar');
    if (agenda && allDayBar) { ns.refillAgenda(); return; }
    // Allow single build, then lock grid
    window.lockAgendaGrid = true;
    buildAgendaGrid();
  };
  // Refill helper: vul alleen afspraken in op bestaande grid (gebruik in login-callback)
  ns.refillAgenda = function(){
    const container = document.getElementById('weekAgendaContainer'); if (!container) return;
    const agenda = container.querySelector('.agenda'); const allDayBar = container.querySelector('.allday-bar');
    if (!agenda || !allDayBar) { buildAgendaGrid(); return; }
    const now = new Date();
    const monday = new Date(now);
    const currentDay = monday.getDay();
    const diffToMonday = (currentDay === 0 ? -6 : 1) - currentDay;
    const offset = (typeof window.weekOffset === 'number') ? window.weekOffset : 0;
    monday.setDate(now.getDate() + diffToMonday + (offset*7));
    monday.setHours(0,0,0,0);
    const isSmallScreen = isMobile();
    const preferWeekOnMobile = (typeof window.preferWeekOnMobile === 'boolean') ? window.preferWeekOnMobile : true;
    const mobile = isSmallScreen && !preferWeekOnMobile;
    const dayIndexFromState = typeof window.dayIndexOffset === 'number' ? window.dayIndexOffset : ((new Date().getDay()+6)%7);
    const rowPx = mobile ? 96 : 88;
    vulAfsprakenInGrid(agenda, monday, allDayBar, { mobile, dayIndex: dayIndexFromState, smallScreen: isSmallScreen, rowPx });
  };
})();
