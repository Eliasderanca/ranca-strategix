// Rauchtest Phase 2: Ampel, Sperrbildschirm, Positionsrechner, Konto-Kennzahlen
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
    await p.goto('http://rs.test/#risiko'); await p.waitForTimeout(600); return p; }
  const p = await page({ viewport: { width: 1300, height: 950 } });
  await p.evaluate(async () => { await put('accounts', { name: 'FTMO Pro 50K #1', rule_id: 'ftmo-futures-pro-50k', stage: 'EVAL', phase: 'challenge', status: 'aktiv', plan: {}, payouts: [] });
    await put('accounts', { name: 'FTMO Pro 50K #2', rule_id: 'ftmo-futures-pro-50k', stage: 'FUNDED', phase: 'funded', status: 'aktiv', plan: {}, payouts: [] }); });
  await p.waitForTimeout(200);
  const st = () => p.evaluate(() => ({ s: ENGINE().status, u: ENGINE().units.map((u) => u.name + ':' + u.r.status + ':' + u.r.riskPerTrade + ':' + u.r.remainingToStop) }));
  console.log('Start:', JSON.stringify(await st()));
  await p.click('[data-act=calc-instr][data-id=MNQ]'); await p.fill('#calcStop', '15'); await p.waitForTimeout(100);
  console.log('Rechner MNQ 15 Pkt:', (await p.textContent('#calcOut')).replace(/\s+/g, ' ').slice(0, 90));
  await p.screenshot({ path: OUT + '/p2-risk-green.png', fullPage: true });
  const a1 = await p.evaluate(() => S.accounts.find((a) => a.stage === 'EVAL').id);
  await p.evaluate(async (id) => { await put('trades', { date: TODAY(), time: '15:35', pnl: -150, accountId: id, ruleBreaks: [] }); }, a1); await p.evaluate(() => { document.activeElement.blur(); location.hash = 'markt'; }); await p.waitForTimeout(200);
  console.log('Nach 1 Verlust:', JSON.stringify(await st()), '| Leiste:', (await p.textContent('.riskbar')).replace(/\s+/g, ' ').trim());
  await p.evaluate(() => (location.hash = 'risiko')); await p.waitForTimeout(150); await p.screenshot({ path: OUT + '/p2-risk-yellow.png', fullPage: true });
  await p.evaluate(async (id) => { await put('trades', { date: TODAY(), time: '15:50', pnl: -300, accountId: id, ruleBreaks: [] }); }, a1); await p.waitForTimeout(250);
  console.log('Nach −450 $:', JSON.stringify(await st()), '| Sperre sichtbar:', await p.isVisible('#lock'));
  await p.screenshot({ path: OUT + '/p2-lock.png' });
  await p.evaluate(() => (location.hash = 'markt')); await p.waitForTimeout(150); console.log('Sperre auf Markt-Lage:', await p.isVisible('#lock'));
  await p.click('#lock a[href="#journal"]'); await p.waitForTimeout(200); console.log('Abend-Log erreichbar (keine Sperre):', !(await p.isVisible('#lock')));
  await p.evaluate(() => document.querySelector('[data-act=add-trade]').click()); await p.waitForTimeout(150); console.log('Trade erfassen blockiert -> Sperre:', await p.isVisible('#lock'), '| Formular offen:', await p.evaluate(() => !!document.getElementById('ov')));
  await p.evaluate(() => (location.hash = 'markt')); await p.reload(); await p.waitForTimeout(600); console.log('Nach Neuladen (Markt-Lage) weiter gesperrt:', await p.isVisible('#lock'));
  await p.evaluate(() => { S.trades = []; saveLocal(); location.hash = 'dashboard'; render(); }); await p.waitForTimeout(200);
  await p.screenshot({ path: OUT + '/p2-dash.png' });
  const m = await page({ ...devices['iPhone 13'] }); await m.screenshot({ path: OUT + '/p2-phone.png', fullPage: true }); console.log('Handy-Breite:', await m.evaluate(() => document.documentElement.scrollWidth));
  console.log('JS-Fehler:', errs.length ? errs : 'keine'); await b.close();
})();
