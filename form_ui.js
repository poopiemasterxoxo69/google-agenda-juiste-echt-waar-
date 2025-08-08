// form_ui.js (wrapper phase)
(function(){
  console.log('[BOOT] form_ui.js loaded');
  const ns = window.FormUI = window.FormUI || {};
  function missing(name){ return function(){ console.error(`[FormUI] Missing implementation for ${name}.`); }; }
  ns.parseEnToon = window.parseEnToon || missing('parseEnToon');
  ns.updateAfsprakenBufferNaEdit = window.updateAfsprakenBufferNaEdit || missing('updateAfsprakenBufferNaEdit');
  ns.kleurLabelToe = window.kleurLabelToe || missing('kleurLabelToe');
  ns.genereerKleurOpties = window.genereerKleurOpties || missing('genereerKleurOpties');
  ns.genereerTijdOpties = window.genereerTijdOpties || missing('genereerTijdOpties');
  ns.deleteAllAfspraken = window.deleteAllAfspraken || missing('deleteAllAfspraken');
  ns.titelopschoner = window.titelopschoner || missing('titelopschoner');
  ns.formatDatumNederlands = window.formatDatumNederlands || missing('formatDatumNederlands');
  console.log('[OK] FormUI namespace bound');
})();
