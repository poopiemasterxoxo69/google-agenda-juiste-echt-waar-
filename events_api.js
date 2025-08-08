// events_api.js (wrapper phase)
(function(){
  console.log('[BOOT] events_api.js loaded');
  const ns = window.EventsAPI = window.EventsAPI || {};
  function missing(name){ return function(){ console.error(`[EventsAPI] Missing implementation for ${name}.`); }; }
  ns.checkConflictingEvents = window.checkConflictingEvents || missing('checkConflictingEvents');
  ns.combineDateTime = window.combineDateTime || missing('combineDateTime');
  ns.berekenEindtijd = window.berekenEindtijd || missing('berekenEindtijd');
  ns.getActueleAfspraken = window.getActueleAfspraken || missing('getActueleAfspraken');
  ns.addEvent = window.addEvent || missing('addEvent');
  console.log('[OK] EventsAPI namespace bound');
})();
