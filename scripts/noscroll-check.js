// Prüft je Seite und Tab, ob der Inhalt ohne Scrollen auf den Bildschirm passt (Desktop)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'); const OUT = process.argv[2] || '';
const W = +(process.env.W || 1440), H = +(process.env.H || 900);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const c = await b.newContext({ viewport: { width: W, height: H } }); const p = await c.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  await p.route('http://rs.test/**', (r) => { const u = new URL(r.request().url()); const f = u.pathname === '/' ? 'index.html' : u.pathname.slice(1); const fp = path.join(ROOT, f);
    if (!fs.existsSync(fp)) return r.fulfill({ status: 404, body: '' }); let body = fs.readFileSync(fp, 'utf8');
    if (f === 'index.html') body = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + body + '</body></html>';
    r.fulfill({ contentType: f.endsWith('.json') ? 'application/json' : f.endsWith('.js') ? 'text/javascript' : 'text/html', body }); });
  await p.goto('http://rs.test/'); await p.waitForTimeout(600);
  const B = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/briefing-example.json'), 'utf8'));
  await p.evaluate(async (B) => { await put('briefings', { ...B, id: TODAY() });
    const C = PSYC(); const a = {}; C.dimensions.forEach((d) => d.items.forEach((it) => { a[it.n] = 4; })); const r = RS.scoreProfile(a, C);
    await put('psych_profile', { created_at: new Date().toISOString(), created_date: TODAY(), answers: a, scores: r.scores, levels: r.levels, top_risks: RS.topRisks(r.scores, r.levels, 3), triggers: { 'Verlust': 3, 'FOMO': 2 }, tilt_map: { first_sign: 'Ich klicke schneller', self_sentence: 'Der Tag gehört nicht dem Markt.' } });
  }, B);
  await p.evaluate(async () => { await demoLoad(); const a = S.accounts.find((x) => x.demo); await put('accounts', { ...a, rule_id: 'ftmo-futures-pro-50k', stage: 'EVAL' });
    await put('checkins', { id: TODAY(), score: 76, level: 'green', intention: 'Geduldig auf mein A-Setup warten.' }); await put('day_status', { id: TODAY(), briefing_read: true }); render(); });
  await p.waitForTimeout(2000);
  const views = await p.evaluate(() => VIEWS.map((v) => v[0]));
  let bad = 0;
  for (const v of views) {
    await p.evaluate((v) => { location.hash = v; }, v); await p.waitForTimeout(250);
    if (v === 'simulator') { await p.evaluate(() => { UI.sim = simDefaults(); UI.sim.runs = 500; simRun(); }); await p.waitForTimeout(300); }
    const tabs = await p.evaluate(() => [...document.querySelectorAll('.ptabs button')].map((x) => x.dataset.v));
    const nested = await p.evaluate(() => [...document.querySelectorAll('#main .tabpane')].filter((x) => x.parentElement.closest('.tabpane')).map((x) => x.dataset.tab));
    if (nested.length) { bad++; console.log('VERSCHACHTELT', v, nested.join(',')); }
    for (const t of tabs.length ? tabs : [null]) {
      if (t) await p.evaluate((t) => setSubTab(t), t);
      await p.waitForTimeout(80);
      const r = await p.evaluate(() => { const m = document.getElementById('main'); return { over: m.scrollHeight - m.clientHeight, page: document.documentElement.scrollHeight - innerHeight }; });
      const ok = r.over <= 2; if (!ok) bad++;
      console.log((ok ? 'ok  ' : 'SCROLL'), v + (t ? ' / ' + t : ''), r.over > 2 ? '+' + r.over + 'px' : '');
      if (OUT) await p.screenshot({ path: `${OUT}/ns-${v}${t ? '-' + t : ''}.png` });
    }
  }
  console.log('Seiten mit Scroll:', bad, '| JS-Fehler:', errs.length ? errs : 'keine'); await b.close();
})();
