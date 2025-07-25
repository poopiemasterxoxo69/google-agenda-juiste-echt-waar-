// Alle agenda viewer functies en variabelen worden hier verzameld.

// Variabelen die door meerdere functies gebruikt worden
let weekOffset = 0;

function showAgenda() {
  console.log('showAgenda aangeroepen');
  const agendaView = document.getElementById('agendaView');
  console.log('agendaView:', agendaView, 'display:', agendaView ? agendaView.style.display : undefined);
  const navAfspraak = document.getElementById('nav-afspraak');
  const navAgenda = document.getElementById('nav-agenda');
  if (agendaView) agendaView.style.display = '';
  document.querySelectorAll('body > *:not(#agendaView):not(nav):not(#bottom-nav)').forEach(el => {
    if (el.id !== 'bottom-nav') el.style.display = 'none';
  });
  if (navAfspraak) navAfspraak.style.color = '#888';
  if (navAgenda) navAgenda.style.color = '#27ae60';
  buildAgendaGrid();
}

function buildAgendaGrid() {
  const agendaView = document.getElementById('agendaView');
  const navAfspraak = document.getElementById('nav-afspraak');
  const navAgenda = document.getElementById('nav-agenda');
  const container = document.getElementById('weekAgendaContainer');
  if (!container) return;
  container.innerHTML = '';
  // Bereken week-begin (maandag)
  const now = new Date();
  const monday = new Date(now);
  const currentDay = monday.getDay();
  const diffToMonday = (currentDay === 0 ? -6 : 1) - currentDay;
  monday.setDate(now.getDate() + diffToMonday + (weekOffset*7));
  monday.setHours(0,0,0,0);
  // Header
  const weekNum = getWeekNumber(monday);
  const header = document.createElement('div');
  header.className = 'agenda-header';
  header.innerHTML = `<span>Week ${weekNum}</span>`;
  container.appendChild(header);
  // ... rest van buildAgendaGrid code ...
  // Vul afspraken in grid
  const allDayBar = document.createElement('div');
  allDayBar.className = 'all-day-bar';
  container.appendChild(allDayBar);
  vulAfsprakenInGrid([], monday, allDayBar); // agenda array wordt elders gevuld
}

function vulAfsprakenInGrid(agenda, monday, allDayBar) {
  if (!window.accessToken) return;
  // Mapping van Google colorId naar hex
  const colorMap = {
    '1': '#a4bdfc', '2': '#7ae7bf', '3': '#dbadff', '4': '#ff887c', '5': '#fbd75b', '6': '#ffb878', '7': '#46d6db', '8': '#e1e1e1', '9': '#5484ed', '10': '#51b749', '11': '#dc2127'
  };
  // ... rest van vulAfsprakenInGrid code ...
}

function showEventTooltip(event, target) {
  // Verwijder bestaande tooltips
  document.querySelectorAll('.event-tooltip').forEach(tip=>tip.remove());
  const tip = document.createElement('div');
  tip.className = 'event-tooltip';
  tip.innerText = event.summary;
  document.body.appendChild(tip);
  // ... rest van showEventTooltip code ...
}

function updateRealtimeClock() {
  const klok = document.getElementById('weekagenda-klok');
  if (!klok) return;
  function update() {
    const nu = new Date();
    klok.innerText = nu.toLocaleTimeString();
  }
  update();
  setInterval(update, 1000);
}

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return weekNo;
}

function isSameDay(a,b) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

// Exporteer agenda viewer functies als globale functies
window.showAgenda = showAgenda;
window.buildAgendaGrid = buildAgendaGrid;
window.vulAfsprakenInGrid = vulAfsprakenInGrid;
window.showEventTooltip = showEventTooltip;
window.updateRealtimeClock = updateRealtimeClock;
window.getWeekNumber = getWeekNumber;
window.isSameDay = isSameDay;
window.todayWithoutTime = todayWithoutTime;

function todayWithoutTime() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

