// Rauchtest Prop-Konten: Übersicht, Detailansicht mit Szenario-Gitter, Regler, Auswahl, Ohne-Scrollen, Handy
// Aufruf: node scripts/smoke-szenarien.js [ausgabeordner]
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'); const OUT = process.argv[2] || '/tmp';
(async () => {
  const b = await chromium.launch(); const errs = [];
  async function page(opts) {
    const c = await b.newContext(opts); const p = await c.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    await p.route('http://rs.test/**', (r) => { const u = new URL(r.request().url()); const f = u.pathname === '/' ? 'index.html' : u.pathname.slice(1); const fp = path.join(ROOT, f);
      if (!fs.existsSync(fp)) return r.fulfill({ status: 404, body: '' }); let body = fs.readFileSync(fp, 'utf8');
      if (f === 'index.html') body = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>' + body + '</body></html>';
      r.fulfill({ contentType: f.endsWith('.json') ? 'application/json' : f.endsWith('.js') ? 'text/javascript' : 'text/html', body }); });
    await p.goto('http://rs.test/'); await p.waitForTimeout(700);
    await p.evaluate(async () => { const D = TODAY(), back = (n) => RS.addDaysStr(D, -n);
      await put('accounts', { id: 'tptE', name: 'TPT 25K EOD #1', rule_id: 'tpt-eod-25k', stage: 'EVAL', startDate: back(3), color: '#0e6b5c', plan: {}, payouts: [] });
      await put('trades', { date: back(2), time: '15:40', pnl: 600, accountId: 'tptE' });
      await put('trades', { date: back(1), time: '15:40', pnl: -300, accountId: 'tptE' });
      await put('accounts', { id: 'tptN', name: 'TPT 25K EOD #2', rule_id: 'tpt-eod-25k', stage: 'EVAL', startDate: D, color: '#2f6fa8', plan: {}, payouts: [] });
      await put('accounts', { id: 'tptF', name: 'TPT 25K PRO #1', rule_id: 'tpt-eod-25k', stage: 'FUNDED', startDate: back(6), color: '#8a5cc4', plan: {}, payouts: [] });
      await put('trades', { date: back(1), time: '15:50', pnl: 450, accountId: 'tptF' });
      await put('accounts', { id: 'old', name: 'TPT 25K alt', rule_id: 'tpt-eod-25k', stage: 'BREACHED', startDate: back(20), color: '#c23f38', plan: {}, payouts: [] });
      location.hash = 'prop'; });
    await p.waitForTimeout(400); return p;
  }
  const p = await page({ viewport: { width: 1440, height: 800 } });
  const over = () => p.evaluate(() => { const m = document.getElementById('main'); return m.scrollHeight - m.clientHeight; });
  console.log('Übersicht Zeilen:', await p.evaluate(() => document.querySelectorAll('.tabpane.on a.prow').length), '| Tabs:', await p.evaluate(() => [...document.querySelectorAll('.ptabs button')].map((x) => x.textContent).join(', ')), '| Scroll:', await over());
  console.log('Zeile #1:', await p.evaluate(() => document.querySelector('a.prow').innerText.replace(/\s+/g, ' ')));
  await p.screenshot({ path: OUT + '/sz-uebersicht.png' });
  await p.click('a.prow[href="#prop/tptE"]'); await p.waitForTimeout(400);
  const info = await p.evaluate(() => ({ hash: location.hash, nodes: document.querySelectorAll('#scenBox .sn').length, edges: document.querySelectorAll('#scenBox .se').length, kpi: [...document.querySelectorAll('.skpi')].map((k) => k.innerText.replace(/\s+/g, ' ')), notes: [...document.querySelectorAll('.scen-notes li')].map((x) => x.innerText) }));
  console.log('Detail:', info.hash, '| Felder', info.nodes, '| Linien', info.edges); console.log('KPIs:', info.kpi.join(' || ')); console.log('Hinweise:', info.notes.join(' || '));
  console.log('Odds:', await p.evaluate(() => document.querySelector('.odds')?.innerText.replace(/\s+/g, ' ')), '| Scroll:', await over());
  await p.screenshot({ path: OUT + '/sz-detail-eval.png' });
  // Hover und Auswahl
  const n = await p.$('#scenBox .sn[data-id^="3|"]'); const bb = await n.boundingBox(); await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.waitForTimeout(100);
  console.log('Tooltip:', await p.evaluate(() => document.getElementById('scenTip').innerText.replace(/\s+/g, ' ')));
  await n.click(); await p.waitForTimeout(100);
  console.log('Auswahl: hl-Felder', await p.evaluate(() => document.querySelectorAll('#scenBox .sn.hl').length), 'hl-Linien', await p.evaluate(() => document.querySelectorAll('#scenBox .se.hl').length), '| Info:', await p.evaluate(() => document.getElementById('scenInfo').innerText));
  await p.screenshot({ path: OUT + '/sz-detail-auswahl.png' });
  // Regler: Firmenregeln aus = Miro-Modell, Anzeige Wege
  await p.click('[data-act=sc-show][data-v=ways]'); await p.waitForTimeout(250);
  await p.evaluate(() => { const c = document.getElementById('sc_firm'); c.checked = false; c.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(300);
  console.log('Ohne Firmenregeln:', await p.evaluate(() => JSON.stringify({ cfg: AC('tptE').scenario, goal: SC.tree.total.goal.ways, breach: SC.tree.total.breach.ways, open: SC.tree.open.ways })));
  await p.screenshot({ path: OUT + '/sz-detail-wege.png' });
  await p.click('[data-act=sc-reset]'); await p.waitForTimeout(250);
  console.log('Zurückgesetzt:', await p.evaluate(() => AC('tptE').scenario === undefined && SC.cfg.firm === true));
  // frisches Konto = Miro-Startpunkt
  await p.evaluate(() => { location.hash = 'prop/tptN'; }); await p.waitForTimeout(300);
  console.log('Neues Konto:', await p.evaluate(() => JSON.stringify({ cols: SC.tree.cols.length, goal: +SC.tree.total.goal.prob.toFixed(3), breach: +SC.tree.total.breach.prob.toFixed(3), dll: SC.tree.total.breach.dll })), '| Scroll:', await over());
  await p.screenshot({ path: OUT + '/sz-detail-neu.png' });
  // Funded
  await p.evaluate(() => { location.hash = 'prop/tptF'; }); await p.waitForTimeout(300);
  console.log('Funded KPIs:', await p.evaluate(() => [...document.querySelectorAll('.skpi')].map((k) => k.innerText.replace(/\s+/g, ' ')).join(' || ')), '| Scroll:', await over());
  console.log('Funded Gitter oben:', await p.evaluate(() => [...document.querySelectorAll('#scenBox .ll')].slice(0, 3).map((x) => x.textContent).join(', ')));
  await p.screenshot({ path: OUT + '/sz-detail-funded.png' });
  await p.evaluate(() => setSubTab('konto')); await p.waitForTimeout(150);
  console.log('Tab Konto:', /Auszahlbar ab \$26\.000/.test(await p.evaluate(() => document.querySelector('#main').innerText)), '| Scroll:', await over());
  await p.evaluate(() => setSubTab('szen')); await p.waitForTimeout(150);
  console.log('Zurück im Szenario-Tab, Felder:', await p.evaluate(() => document.querySelectorAll('#scenBox .sn').length));
  // Ohne Scrollen auch bei 1280x720 und 1920x1080
  for (const [w, h] of [[1280, 720], [1920, 1080]]) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(300); console.log(`Scroll ${w}x${h}:`, await over(), '| Felder', await p.evaluate(() => document.querySelectorAll('#scenBox .sn').length)); await p.screenshot({ path: `${OUT}/sz-${w}.png` }); }
  // Handy
  const m = await page({ ...devices['iPhone 13'] });
  await m.screenshot({ path: OUT + '/sz-phone-liste.png', fullPage: true });
  await m.evaluate(() => { location.hash = 'prop/tptE'; }); await m.waitForTimeout(400);
  console.log('Handy: Seitenbreite', await m.evaluate(() => document.documentElement.scrollWidth), '| Felder', await m.evaluate(() => document.querySelectorAll('#scenBox .sn').length));
  await m.screenshot({ path: OUT + '/sz-phone-detail.png', fullPage: true });
  console.log('JS-Fehler:', errs.length ? errs : 'keine'); await b.close();
})();
