// Rauchtest Phase 5: Coach-Kontext und Schnellfragen, Dezember-Cockpit, CSV-Import, Abo-Erinnerung
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'); const OUT = process.argv[2] || '/tmp';
(async () => {
  const b = await chromium.launch(); const errs = [];
  async function page(opts, hash) {
    const c = await b.newContext(opts); const p = require('./tabs-helper.js')(await c.newPage()); p.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack||'').split('\n').slice(1,3).join(' | ')));
    await p.route('http://rs.test/**', (r) => { const u = new URL(r.request().url()); const f = u.pathname === '/' ? 'index.html' : u.pathname.slice(1); const fp = path.join(ROOT, f);
      if (!fs.existsSync(fp)) return r.fulfill({ status: 404, body: '' }); let body = fs.readFileSync(fp, 'utf8');
      if (f === 'index.html') body = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>' + body + '</body></html>';
      r.fulfill({ contentType: f.endsWith('.json') ? 'application/json' : f.endsWith('.js') ? 'text/javascript' : 'text/html', body }); });
    await p.goto('http://rs.test/#' + hash); await p.waitForTimeout(700); return p; }
  const p = await page({ viewport: { width: 1300, height: 950 } }, 'coach');
  await p.evaluate(async () => { const r = RS.addDaysStr(TODAY(), 2);
    await put('accounts', { name: 'FTMO Pro 50K #1', rule_id: 'ftmo-futures-pro-50k', stage: 'EVAL', phase: 'challenge', status: 'aktiv', renewal_date: r, plan: {}, payouts: [] });
    await put('accounts', { name: 'FTMO Pro 50K #2', rule_id: 'ftmo-futures-pro-50k', stage: 'FUNDED', phase: 'funded', status: 'aktiv', plan: {}, payouts: [{ date: TODAY(), amount: 1000 }] });
    await put('trades', { date: TODAY(), time: '15:40', pnl: 200, emotion_before: { emotion: 'ruhig', intensity: 3 }, followed_plan: true, account_ids: [S.accounts[0].id], accountId: S.accounts[0].id }); });
  await p.waitForTimeout(200);
  console.log('Schnellfragen:', await p.$$eval('[data-act=ask]', (e) => e.map((x) => x.textContent)));
  const ctx = await p.evaluate(() => JSON.parse(coachContext()));
  console.log('Kontext-Schlüssel:', Object.keys(ctx).join(', '));
  console.log('Prompt beginnt mit:', (await p.evaluate(() => coachPrompt())).slice(0, 70));
  await p.evaluate(() => (location.hash = 'cockpit')); await p.waitForTimeout(200);
  console.log('Abo-Erinnerung sichtbar:', await p.isVisible('.alert.stop'));
  await p.click('[data-act=cp-add]'); await p.fill('#f_account', 'FTMO Pro 50K #1'); await p.fill('#f_eval_fee', '129'); await p.click('#mForm button[type=submit]'); await p.waitForTimeout(500);
  await p.click('[data-act=cp-import]'); await p.waitForTimeout(100);
  await p.fill('#cpCsv', 'Account;Firm;Date;Eval Fee;Reset;Eval Status;Activation Fee;Total Spend;Payout;Net;Status;Notes\nApex 50K #1;Apex;03.07.2026;35,00 €;;Bestanden;85,00 €;120,00 €;1.250,00 €;1.130,00 €;Ausgezahlt;Juli\nTPT 50K;TPT;15.08.2026;150,00 €;99,00 €;Nicht bestanden;;;;;Verloren;\nKaputt;X;irgendwann;1;;;;;;;;');
  await p.waitForTimeout(100); console.log('Import-Vorschau:', (await p.textContent('#cpPrev')).replace(/\s+/g, ' ').trim());
  await p.click('#mForm button[type=submit]'); await p.waitForTimeout(300);
  await p.click('[data-act=cp-import]'); await p.fill('#cpCsv', 'Account;Firm;Date;Eval Fee;Reset;Eval Status;Activation Fee;Total Spend;Payout;Net;Status;Notes\nApex 50K #1;Apex;03.07.2026;35,00 €;;Bestanden;85,00 €;120,00 €;1.250,00 €;1.130,00 €;Ausgezahlt;Juli'); await p.click('#mForm button[type=submit]'); await p.waitForTimeout(300);
  console.log('Einträge nach doppeltem Import:', await p.evaluate(() => S.cost_history.length));
  console.log('Cockpit:', JSON.stringify(await p.evaluate(() => cockpitData().sum)));
  await p.screenshot({ path: OUT + '/p5-cockpit.png', fullPage: true });
  await p.evaluate(() => (location.hash = 'markt')); await p.waitForTimeout(200); console.log('Erinnerung auf Markt-Lage:', await p.isVisible('.alert.stop'));
  const m = await page({ ...devices['iPhone 13'] }, 'cockpit'); await m.screenshot({ path: OUT + '/p5-phone.png', fullPage: true });
  console.log('Handy-Breite:', await m.evaluate(() => document.documentElement.scrollWidth));
  console.log('JS-Fehler:', errs.length ? errs : 'keine'); await b.close();
})();
