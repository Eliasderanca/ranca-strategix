// Rauchtest „Betriebssystem“: Heute, News-Sperre, Simulator, Wochen-Review, Screenshots, Backup
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'); const OUT = process.argv[2] || '/tmp';
(async () => {
  const b = await chromium.launch(); const errs = [];
  async function page(opts, hash) {
    const c = await b.newContext(opts); const p = await c.newPage(); p.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
    await p.route('http://rs.test/**', (r) => { const u = new URL(r.request().url()); const f = u.pathname === '/' ? 'index.html' : u.pathname.slice(1); const fp = path.join(ROOT, f);
      if (!fs.existsSync(fp)) return r.fulfill({ status: 404, body: '' }); let body = fs.readFileSync(fp, 'utf8');
      if (f === 'index.html') body = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>' + body + '</body></html>';
      r.fulfill({ contentType: f.endsWith('.json') ? 'application/json' : f.endsWith('.js') ? 'text/javascript' : 'text/html', body }); });
    await p.goto('http://rs.test/' + (hash ? '#' + hash : '')); await p.waitForTimeout(700); return p; }
  const p = await page({ viewport: { width: 1300, height: 950 } });
  console.log('Startseite:', await p.evaluate(() => UI.view), '| Schritte:', await p.$$eval('.step', (s) => s.length));
  await p.evaluate(async () => { await put('accounts', { name: 'FTMO Pro 50K #1', rule_id: 'ftmo-futures-pro-50k', stage: 'EVAL', phase: 'challenge', status: 'aktiv', plan: {}, payouts: [] }); await put('checkins', { id: TODAY(), score: 76, level: 'green' }); });
  await p.click('[data-act=day-mark][data-k=briefing_read]'); await p.waitForTimeout(150);
  console.log('Erledigt-Zähler:', (await p.textContent('.card .small.muted')).trim());
  // News-Termin jetzt -> Sperre
  const now = await p.evaluate(() => RS.berlinTime());
  await p.click('[data-act=news-add]'); await p.fill('#f_time', now); await p.fill('#f_title', 'Test-News'); await p.click('#mForm button[type=submit]'); await p.waitForTimeout(250);
  console.log('News aktiv:', JSON.stringify(await p.evaluate(() => NEWS().active)), '| Leiste:', await p.isVisible('.riskbar .chip.loss'));
  await p.screenshot({ path: OUT + '/os-heute.png', fullPage: true });
  await p.evaluate(() => document.querySelector('[data-act=add-trade]').click()); await p.waitForTimeout(150);
  console.log('Screenshot-Bereich:', (await p.textContent('#qtShots')).replace(/\s+/g, ' ').trim());
  await p.fill('#qt_pnl', '100'); await p.click('[data-act=qt][data-k=eb][data-v=ruhig]'); await p.press('#qt_pnl', 'Enter'); await p.waitForTimeout(300);
  console.log('Auto-Regelbruch News:', JSON.stringify(await p.evaluate(() => S.trades[0].ruleBreaks)));
  // Tagesplan bleibt mit News erhalten
  await p.evaluate(() => openDayPlan(TODAY(), null)); await p.waitForTimeout(100); await p.locator('.dp-on').first().check(); await p.locator('.dp-risk').first().fill('150'); await p.click('[data-act=dp-save]'); await p.waitForTimeout(200);
  console.log('Tagesplan + News:', JSON.stringify(await p.evaluate(() => ({ items: Object.keys(DP(TODAY()).items).length, news: DP(TODAY()).news.length }))));
  // Simulator
  await p.evaluate(() => (location.hash = 'simulator')); await p.waitForTimeout(200);
  const t0 = Date.now(); await p.click('[data-act=sim-run]'); await p.waitForSelector('.sim-big', { timeout: 20000 });
  console.log('Simulation in', Date.now() - t0, 'ms:', JSON.stringify(await p.evaluate(() => ({ pass: UI.sim.res.ev.pPass, breach: UI.sim.res.ev.pBreach, payout: UI.sim.res.fu.pPayout, days: UI.sim.res.ev.medianDays, evalDays: UI.sim.evalDays, fundedDays: UI.sim.fundedDays }))));
  await p.screenshot({ path: OUT + '/os-sim.png', fullPage: true });
  // Wochen-Review
  await p.evaluate(() => (location.hash = 'woche')); await p.waitForTimeout(200);
  await p.fill('#wk_fokus', 'Nach dem ersten Verlust 15 Minuten Pause'); await p.click('#wkForm button[type=submit]'); await p.waitForTimeout(200);
  console.log('Review gespeichert:', await p.evaluate(() => S.weekly_reviews.length));
  await p.screenshot({ path: OUT + '/os-woche.png', fullPage: true });
  // Backup (lokal nicht verfügbar)
  await p.evaluate(() => (location.hash = 'regeln')); await p.waitForTimeout(150); await p.click('[data-act=backup]'); await p.waitForTimeout(150);
  console.log('Backup lokal:', await p.textContent('.toast'));
  const m = await page({ ...devices['iPhone 13'] }, 'heute'); await m.screenshot({ path: OUT + '/os-phone.png', fullPage: true });
  console.log('Handy-Breite:', await m.evaluate(() => document.documentElement.scrollWidth), '| Tabs:', await m.$$eval('.tabbar a span', (s) => s.map((x) => x.textContent).join(',')));
  console.log('JS-Fehler:', errs.length ? errs : 'keine'); await b.close();
})();
