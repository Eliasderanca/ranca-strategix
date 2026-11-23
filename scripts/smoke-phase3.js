// Rauchtest Phase 3: Schnelleingabe, Tilt-Frühwarnung, Trading-Tage, Statistik
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'); const OUT = process.argv[2] || '/tmp';
(async () => {
  const b = await chromium.launch(); const errs = [];
  async function page(opts, hash = 'trades') {
    const c = await b.newContext(opts); const p = require('./tabs-helper.js')(await c.newPage()); p.on('pageerror', (e) => errs.push(e.message));
    await p.route('http://rs.test/**', (r) => { const u = new URL(r.request().url()); const f = u.pathname === '/' ? 'index.html' : u.pathname.slice(1); const fp = path.join(ROOT, f);
      if (!fs.existsSync(fp)) return r.fulfill({ status: 404, body: '' }); let body = fs.readFileSync(fp, 'utf8');
      if (f === 'index.html') body = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>' + body + '</body></html>';
      r.fulfill({ contentType: f.endsWith('.json') ? 'application/json' : f.endsWith('.js') ? 'text/javascript' : 'text/html', body }); });
    await p.goto('http://rs.test/#' + hash); await p.waitForTimeout(600); return p; }
  const p = await page({ viewport: { width: 1300, height: 950 } });
  await p.evaluate(async () => { for (const n of ['#1', '#2']) await put('accounts', { name: 'FTMO Pro 50K ' + n, rule_id: 'ftmo-futures-pro-50k', stage: 'EVAL', phase: 'challenge', status: 'aktiv', copy_group: 'A', plan: {}, payouts: [] });
    await put('checkins', { id: TODAY(), score: 78, level: 'green' }); });
  await p.waitForTimeout(200);
  // Schnelleingabe: Gewinn-Trade, Zeit messen in Klicks
  const t0 = Date.now();
  await p.evaluate(() => document.querySelector('[data-act=add-trade]').click()); await p.waitForTimeout(150);
  await p.screenshot({ path: OUT + '/p3-quick.png' });
  await p.click('[data-act=qt][data-k=setup][data-v=VAL-Long]');
  await p.fill('#qt_contracts', '5'); await p.fill('#qt_stop', '15'); await p.fill('#qt_pnl', '300');
  console.log('R-Anzeige:', await p.textContent('#qt_r'));
  await p.click('[data-act=qt][data-k=eb][data-v=gierig]'); await p.fill('#qt_eb_int', '8'); await p.dispatchEvent('#qt_eb_int', 'input');
  console.log('Overconfidence-Warnung sichtbar:', await p.isVisible('#qt_oc .alert'));
  await p.click('[data-act=qt][data-k=ea][data-v=ruhig]');
  await p.press('#qt_pnl', 'Enter'); await p.waitForTimeout(250);
  console.log('Eingabe in', Date.now() - t0, 'ms (Automat) | Trades:', await p.evaluate(() => S.trades.length));
  const tr = await p.evaluate(() => S.trades[0]);
  console.log('Gespeichert:', JSON.stringify({ ids: tr.account_ids.length, setup: tr.setup, r: tr.result_r, eb: tr.emotion_before, plan: tr.followed_plan }));
  console.log('Trading-Tag:', JSON.stringify(await p.evaluate(() => S.trading_days.find((d) => d.id === TODAY()))));
  // Verlust-Trade -> Pflicht-Popup
  await p.evaluate(() => document.querySelector('[data-act=add-trade]').click()); await p.waitForTimeout(150);
  await p.fill('#qt_pnl', '-150'); await p.click('[data-act=qt][data-k=eb][data-v=frustriert]'); await p.click('[data-act=qt][data-k=followed_plan][data-v=false]');
  await p.press('#qt_pnl', 'Enter'); await p.waitForTimeout(300);
  console.log('Tilt-Popup sichtbar:', await p.isVisible('#tilt'), '| Weiter gesperrt ohne Antwort:', await p.isDisabled('[data-act=tilt-submit]'));
  await p.keyboard.press('Escape'); console.log('Escape schließt nicht:', await p.isVisible('#tilt'));
  await p.reload(); await p.waitForTimeout(600); console.log('Nach Neuladen wieder da:', await p.isVisible('#tilt'));
  await p.click('[data-act=tilt-urge][data-v="6"]'); await p.click('[data-act=tilt-a][data-v="1"]'); await p.screenshot({ path: OUT + '/p3-tilt-q.png' });
  await p.click('[data-act=tilt-submit]'); await p.waitForTimeout(300);
  console.log('Pause läuft, Knopf versteckt:', await p.isHidden('#tiltDone'), '| Restzeit:', await p.textContent('#tiltLeft'));
  await p.screenshot({ path: OUT + '/p3-tilt-pause.png' });
  const eng = await p.evaluate(() => { const u = ENGINE().units[0]; return u.r.status + ' ' + u.r.riskPerTrade + ' ' + u.r.reasons.join(' | '); });
  console.log('Engine nach Drang 6:', eng);
  // Trade erfassen während Pause -> Popup statt Formular
  await p.evaluate(() => { const t = document.getElementById('tilt'); t.remove(); document.querySelector('[data-act=add-trade]').click(); });
  await p.waitForTimeout(150); console.log('Neuer Trade während Pause -> Popup:', await p.isVisible('#tilt'), '| Formular:', await p.evaluate(() => !!document.getElementById('ov')));
  // Pause künstlich beenden, Drang 8 -> ROT
  await p.evaluate(async () => { for (const c of S.tilt_checks) await put('tilt_checks', { ...c, pause_until_ms: 1 }); render(); });
  await p.evaluate(async () => { const t = S.trades.find((x) => x.pnl < 0); await put('trades', { ...t, id: undefined, time: '16:40', tilt_required: true }); render(); }); await p.waitForTimeout(200);
  await p.click('[data-act=tilt-urge][data-v="8"]'); await p.click('[data-act=tilt-a][data-v="1"]'); await p.click('[data-act=tilt-submit]'); await p.waitForTimeout(200);
  console.log('Engine nach Drang 8:', await p.evaluate(() => ENGINE().status));
  await p.evaluate(async () => { for (const c of S.tilt_checks) await put('tilt_checks', { ...c, pause_until_ms: 1 }); document.getElementById('tilt')?.remove(); render(); }); await p.waitForTimeout(200);
  console.log('Sperrbildschirm wegen Tilt:', await p.isVisible('#lock'));
  // Statistik mit Demo-Daten
  await p.evaluate(async () => { S.tilt_checks = []; S.trades = []; saveLocal(); await demoLoad(); location.hash = 'statistik'; }); await p.waitForTimeout(1800);
  await p.screenshot({ path: OUT + '/p3-stats.png', fullPage: true });
  const m = await page({ ...devices['iPhone 13'] }, 'markt');
  await m.evaluate(() => document.querySelector('.plus').click()); await m.waitForTimeout(200); await m.screenshot({ path: OUT + '/p3-quick-phone.png', fullPage: true });
  console.log('Handy-Breite:', await m.evaluate(() => document.documentElement.scrollWidth));
  console.log('JS-Fehler:', errs.length ? errs : 'keine'); await b.close();
})();
