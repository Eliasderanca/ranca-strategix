// Rauchtest im Browser (Playwright): lädt die App lokal, legt Konten an und prüft Kernabläufe.
// Aufruf: node scripts/smoke.js [ausgabeordner]
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const OUT = process.argv[2] || '/tmp';
(async () => {
  const b = await chromium.launch(); const errs = [];
  async function page(opts) {
    const c = await b.newContext(opts); const p = require('./tabs-helper.js')(await c.newPage());
    p.on('pageerror', (e) => errs.push(e.message));
    await p.route('http://rs.test/**', (r) => {
      const u = new URL(r.request().url()); let f = u.pathname === '/' ? 'index.html' : u.pathname.slice(1);
      const fp = path.join(ROOT, f); if (!fs.existsSync(fp)) return r.fulfill({ status: 404, body: '' });
      let body = fs.readFileSync(fp, 'utf8');
      if (f === 'index.html') body = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>' + body + '</body></html>';
      r.fulfill({ contentType: f.endsWith('.json') ? 'application/json' : f.endsWith('.js') ? 'text/javascript' : 'text/html', body });
    });
    await p.goto('http://rs.test/#prop'); await p.waitForTimeout(600); return p;
  }
  const p = await page({ viewport: { width: 1300, height: 950 } });
  const add = async (name, stage, group) => {
    await p.evaluate(() => editAcct(null)); await p.waitForTimeout(100);
    await p.fill('#f_name', name); await p.selectOption('#f_stage', stage); if (group) await p.fill('#f_copy_group', group);
    await p.click('#mForm button[type=submit]'); await p.waitForTimeout(150);
  };
  await p.evaluate(() => editAcct(null)); await p.waitForTimeout(150);
  await p.screenshot({ path: OUT + '/p1-form.png' });
  console.log('Felder bei Regelsatz versteckt:', await p.evaluate(() => document.getElementById('f_maxDrawdown').closest('.field').hidden));
  await p.click('[data-act=close]');
  await add('FTMO Pro 50K #1', 'EVAL', 'Gruppe A'); await add('FTMO Pro 50K #2', 'EVAL', 'Gruppe A');
  await add('FTMO Pro 50K #3', 'FUNDED'); await add('FTMO Pro 50K #4', 'EVAL');
  await add('FTMO Pro 50K #5', 'EVAL');
  console.log('Formular nach Ablehnung noch offen:', await p.evaluate(() => !!document.getElementById('ov'))); await p.click('[data-act=close]');
  console.log('Konten nach 5 Versuchen:', await p.evaluate(() => S.accounts.length));
  await p.evaluate(async () => { const a = S.accounts.find((x) => x.stage === 'FUNDED'); for (const [d, v] of [['2026-11-16', 600], ['2026-11-17', 550]]) await put('trades', { date: d, time: '15:40', pnl: v, accountId: a.id, ruleBreaks: [] }); });
  await p.waitForTimeout(300); await p.screenshot({ path: OUT + '/p1-prop.png', fullPage: true });
  await p.evaluate(() => (location.hash = 'regeln')); await p.waitForTimeout(300); await p.screenshot({ path: OUT + '/p1-regeln.png', fullPage: true });
  await p.fill('#f_max_trades_per_day', '3'); await p.click('.tabpane.on .set-form button[type=submit]'); await p.waitForTimeout(150);
  console.log('SET().maxTrades nach Speichern:', await p.evaluate(() => SET().maxTrades), '| Tages-Stop alt-Feld:', await p.evaluate(() => SET().maxDailyLoss));
  console.log('Berlin heute:', await p.evaluate(() => TODAY()));
  for (const v of ['markt', 'checkin', 'dashboard', 'kalender', 'trades', 'playbook', 'coach', 'agents', 'journal']) { await p.evaluate((v) => (location.hash = v), v); await p.waitForTimeout(120); }
  const m = await page({ ...devices['iPhone 13'] }); await m.screenshot({ path: OUT + '/p1-phone.png' });
  console.log('Seitenbreite Handy:', await m.evaluate(() => document.documentElement.scrollWidth));
  console.log('JS-Fehler:', errs.length ? errs : 'keine');
  await b.close();
})();
