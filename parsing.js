// parsing.js (wrapper phase)
(function(){
  console.log('[BOOT] parsing.js loaded');
  const ns = window.Parsing = window.Parsing || {};
  function missing(name){
    return function(){ console.error(`[Parsing] Missing implementation for ${name}.`); };
  }
  ns.todayWithoutTime = window.todayWithoutTime || missing('todayWithoutTime');
  ns.opschonenTitel = window.opschonenTitel || missing('opschonenTitel');
  ns.typoCorrectieOverVoorKwartHalf = window.typoCorrectieOverVoorKwartHalf || missing('typoCorrectieOverVoorKwartHalf');
  ns.maandTypoCorrectie = window.maandTypoCorrectie || missing('maandTypoCorrectie');
  ns.corrigeerDagTypo = window.corrigeerDagTypo || missing('corrigeerDagTypo');
  ns.titelopschoner = window.titelopschoner || missing('titelopschoner');
  ns.parseTextToEvent = window.parseTextToEvent || missing('parseTextToEvent');
  ns.parseMeerdereAfsprakenInRegel = window.parseMeerdereAfsprakenInRegel || missing('parseMeerdereAfsprakenInRegel');
  ns.formatDatumNederlands = window.formatDatumNederlands || missing('formatDatumNederlands');
  console.log('[OK] Parsing namespace bound');
})();
