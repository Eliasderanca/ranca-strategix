// Für Smoke-Tests: Bevor ein Element angeklickt oder ausgefüllt wird, den Seiten-Tab öffnen, in dem es liegt.
module.exports = function revealTabs(p) {
  for (const m of ['click', 'fill', 'check', 'uncheck', 'selectOption', 'type', 'press', 'dispatchEvent', 'setInputFiles']) {
    const orig = p[m].bind(p);
    p[m] = async (sel, ...a) => {
      await p.evaluate((s) => { let el = null; try { el = document.querySelector(s); } catch (e) { return; }
        const pane = el && el.closest('.tabpane'); if (pane && !pane.classList.contains('on') && window.setSubTab) window.setSubTab(pane.dataset.tab); }, sel).catch(() => {});
      return orig(sel, ...a);
    };
  }
  return p;
};
