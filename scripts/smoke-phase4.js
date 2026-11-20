// Rauchtest Phase 4: Trader-Profil, Mindset morgens/abends, Tagestyp, PnL ausblenden
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'); const OUT = process.argv[2] || '/tmp';
(async () => {
  const b = await chromium.launch(); const errs = [];
  async function page(opts, hash) {
    const c = await b.newContext(opts); const p = await c.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    await p.route('http://rs.test/**', (r) => { const u = new URL(r.request().url()); const f = u.pathname === '/' ? 'index.html' : u.pathname.slice(1); const fp = path.join(ROOT, f);
      if (!fs.existsSync(fp)) return r.fulfill({ status: 404, body: '' }); let body = fs.readFileSync(fp, 'utf8');
      if (f === 'index.html') body = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>' + body + '</body></html>';
      r.fulfill({ contentType: f.endsWith('.json') ? 'application/json' : f.endsWith('.js') ? 'text/javascript' : 'text/html', body }); });
    await p.goto('http://rs.test/#' + hash); await p.waitForTimeout(700); return p; }
  const p = await page({ viewport: { width: 1300, height: 950 } }, 'markt');
  console.log('Mindset morgens:', (await p.textContent('.mind.top')).replace(/\s+/g, ' ').slice(0, 110));
  console.log('Bibel-Link:', await p.getAttribute('.mind.top .bref', 'href'));
  // Profil-Test durchklicken: Verlust-Tilt und Overconfidence hoch, Rest mittel
  await p.evaluate(() => (location.hash = 'profil')); await p.waitForTimeout(200);
  await p.click('[data-act=pt-start]'); await p.waitForTimeout(150);
  await p.click('[data-act=pt-next]'); await p.waitForTimeout(100); console.log('Unvollständig blockiert:', (await p.textContent('.ci-card .small.muted')).trim());
  const high = new Set([1, 2, 3, 5, 10, 11, 12, 13, 14, 23, 24, 25, 26]); const lowRev = new Set([4, 27]);
  for (let page = 0; page < 9; page++) {
    const ns = await p.$$eval('.pt-item [data-v="1"]', (els) => els.map((e) => +e.dataset.n));
    for (const n of ns) await p.click(`[data-act=pt-ans][data-n="${n}"][data-v="${high.has(n) ? 5 : lowRev.has(n) ? 1 : 3}"]`);
    if (page === 0) await p.screenshot({ path: OUT + '/p4-test.png' });
    await p.click('[data-act=pt-next]'); await p.waitForTimeout(80);
  }
  await p.click('[data-act=pt-trig][data-k="nach 1 Verlust"]'); await p.waitForTimeout(60); await p.click('[data-act=pt-trig-s][data-k="nach 1 Verlust"][data-v="3"]');
  await p.click('[data-act=pt-trig][data-k="Geldsorgen"]'); await p.waitForTimeout(60);
  await p.click('[data-act=pt-next]'); await p.waitForTimeout(100);
  await p.fill('#tm_self_sentence', 'Ich muss heute nichts zurückholen. Plattform zu.'); await p.fill('#tm_early', 'Enge in der Brust, schneller klicken.');
  await p.click('[data-act=pt-next]'); await p.waitForTimeout(300);
  const prof = await p.evaluate(() => PROFILE());
  console.log('Scores:', JSON.stringify(prof.scores), '| Top 3:', prof.top_risks.join(', '), '| Trigger:', JSON.stringify(prof.triggers));
  await p.screenshot({ path: OUT + '/p4-profil.png', fullPage: true });
  await p.click('[data-act=toggle-hidepnl]'); await p.waitForTimeout(150); console.log('PnL-Ausblenden gespeichert:', await p.evaluate(() => PR().hide_pnl_in_session));
  // Abend: Gewinntag mit Overconfidence ROT -> markierter Text; Verlusttag mit Verlust-Tilt ROT -> Satz an mich selbst
  await p.evaluate(async () => { const D = TODAY(); await put('trades', { date: D, time: '15:40', pnl: 300, followed_plan: true, emotion_before: { emotion: 'ruhig', intensity: 3 } }); UI.jDate = D; location.hash = 'journal'; });
  await p.waitForTimeout(250); await p.fill('#j_review', 'Sauber nach Plan.'); await p.click('#jForm button[type=submit]'); await p.waitForTimeout(400);
  const ev = await p.evaluate(() => S.mindset_log.find((l) => l.slot === 'EVENING'));
  console.log('Abend-Log:', ev.day_type, ev.message_id, '| Tagestyp im trading_days:', await p.evaluate(() => S.trading_days.find((d) => d.id === TODAY()).day_type));
  await p.screenshot({ path: OUT + '/p4-abend.png', fullPage: true });
  await p.evaluate(async () => { const t = S.trades[0]; await put('trades', { ...t, pnl: -200 }); }); await p.waitForTimeout(100);
  await p.fill('#j_review', 'Kontrolliert gestoppt.'); await p.click('#jForm button[type=submit]'); await p.waitForTimeout(400);
  console.log('Verlusttag:', await p.evaluate(() => S.mindset_log.find((l) => l.slot === 'EVENING').day_type), '| Satz sichtbar:', await p.isVisible('.mind.dark'));
  // Check-in speichert PRE-Log
  await p.evaluate(async () => { await storePre(TODAY()); }); console.log('PRE gespeichert:', await p.evaluate(() => S.mindset_log.some((l) => l.slot === 'PRE')));
  const m = await page({ ...devices['iPhone 13'] }, 'profil'); await m.screenshot({ path: OUT + '/p4-phone.png' });
  console.log('Handy-Breite:', await m.evaluate(() => document.documentElement.scrollWidth));
  console.log('JS-Fehler:', errs.length ? errs : 'keine'); await b.close();
})();
