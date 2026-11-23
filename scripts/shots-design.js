// Design-Screenshots aller Hauptseiten (Desktop + iPhone)
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'); const OUT = process.argv[2] || '/tmp';
(async () => {
  const b = await chromium.launch(); const errs = [];
  async function page(opts) { const c = await b.newContext(opts); const p = await c.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    await p.route('http://rs.test/**', (r) => { const u = new URL(r.request().url()); const f = u.pathname === '/' ? 'index.html' : u.pathname.slice(1); const fp = path.join(ROOT, f);
      if (!fs.existsSync(fp)) return r.fulfill({ status: 404, body: '' }); let body = fs.readFileSync(fp, 'utf8');
      if (f === 'index.html') body = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + body + '</body></html>';
      r.fulfill({ contentType: f.endsWith('.json') ? 'application/json' : f.endsWith('.js') ? 'text/javascript' : 'text/html', body }); });
    await p.goto('http://rs.test/'); await p.waitForTimeout(600);
    await p.evaluate(async () => { await demoLoad(); const a = S.accounts.find((x) => x.demo); await put('accounts', { ...a, rule_id: 'ftmo-futures-pro-50k', stage: 'EVAL' });
      await put('checkins', { id: TODAY(), score: 76, level: 'green', intention: 'Geduldig auf mein A-Setup warten.' }); await put('day_status', { id: TODAY(), briefing_read: true });
      await put('weekly_reviews', { id: RS.addDaysStr(RS.weekStart(TODAY()), -7), fokus: 'Nach dem ersten Verlust 15 Minuten Pause' }); render(); });
    await p.waitForTimeout(2200); return p; }
  const p = await page({ viewport: { width: 1440, height: 1000 } });
  for (const v of ['heute', 'risiko', 'prop', 'dashboard', 'simulator']) { await p.evaluate((v) => { location.hash = v; }, v); await p.waitForTimeout(250); await p.screenshot({ path: `${OUT}/d-${v}.png`, fullPage: v === 'heute' }); }
  const m = await page({ ...devices['iPhone 13'] }); await m.screenshot({ path: OUT + '/d-phone.png', fullPage: true });
  console.log('Handy-Breite:', await m.evaluate(() => document.documentElement.scrollWidth), '| JS-Fehler:', errs.length ? errs : 'keine'); await b.close();
})();
