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
})();
