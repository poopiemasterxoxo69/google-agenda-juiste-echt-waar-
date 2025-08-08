// manual_plus.js
(function(){
  console.log('[BOOT] manual_plus.js loaded');
  const ns = window.ManualPlus = window.ManualPlus || {};

  function bindFab() {
    const plusBtn = document.getElementById('agenda-plus-btn');
    if (!plusBtn) return;
    // Prevent duplicate listeners
    if (plusBtn._manualPlusBound) return;
    plusBtn._manualPlusBound = true;
    plusBtn.addEventListener('click', function() {
      // If an edit form exists, focus title
      const existing = document.querySelector('.manual-edit-form');
      if (existing) {
        const t = existing.querySelector('input[name="titel"]');
        if (t) t.focus();
        return;
      }
      const outputDiv = document.getElementById('output');
      if (!outputDiv) return;
      const formDiv = document.createElement('div');
      formDiv.className = 'veld';
      formDiv.innerHTML = `
        <form class="afspraak-edit manual-edit-form" style="margin-bottom:16px;">
          <label>Titel: <input type="text" name="titel" value="" required></label><br>
          <label>Datum: <input type="date" name="datum" required></label><br>
          <label>Tijd: <select name="tijd">${window.genereerTijdOpties ? window.genereerTijdOpties() : ''}</select></label><br>
          <label>Duur (min): <input type="number" name="duur" value="60" min="1" required></label><br>
          <label>Kleur: <select name="kleur">${window.genereerKleurOpties ? window.genereerKleurOpties('random') : ''}</select></label><br>
          <label><input type="checkbox" name="heleDag"> Hele dag</label><br>
          <button type="submit" style="background:#27ae60;color:#fff;border:none;padding:6px 16px;border-radius:4px;font-weight:bold;cursor:pointer;margin-top:6px;">Toevoegen</button>
          <button type="button" class="annuleer-btn" style="margin-left:8px;">Annuleer</button>
        </form>
      `;
      outputDiv.prepend(formDiv);
      const tf = formDiv.querySelector('input[name="titel"]');
      if (tf) tf.focus();
      formDiv.querySelector('.annuleer-btn').addEventListener('click', function() { formDiv.remove(); });
      formDiv.querySelector('form').addEventListener('submit', function(e) {
        e.preventDefault();
        const form = e.target;
        if (!form.datum.value) { alert('Vul een datum in!'); form.datum.focus(); return; }
        if (!form.tijd.value && !form.heleDag.checked) { alert('Vul een tijd in of vink "Hele dag" aan!'); form.tijd.focus(); return; }
        const afspraak = {
          titel: form.titel.value,
          datum: form.datum.value ? new Date(form.datum.value) : undefined,
          tijd: form.tijd.value || undefined,
          duur: form.duur.value || 60,
          kleur: form.kleur.value || 'random',
          heleDag: form.heleDag.checked
        };
        if (!window._bewerkteAfspraken || !Array.isArray(window._bewerkteAfspraken)) window._bewerkteAfspraken = [];
        window._bewerkteAfspraken.unshift(afspraak);
        if (typeof window.parseEnToon === 'function') window.parseEnToon(true);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindFab);
  } else {
    bindFab();
  }

  console.log('[OK] ManualPlus namespace bound');
})();
