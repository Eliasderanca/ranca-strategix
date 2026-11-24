// Rauchtest Archiv: CSV importieren, Coach-Tabs, Agenten-Hinweis, Coach-Kontext
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'); const OUT = process.argv[2] || '/tmp'; const FILE = process.argv[3] || path.join(ROOT, 'tests/fixtures/journal-export-beispiel.csv');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const c = await b.newContext({ viewport: { width: 1440, height: 860 } }); const p = require('./tabs-helper.js')(await c.newPage()); p.on('pageerror', (e) => errs.push(e.message));
  await p.route('http://rs.test/**', (r) => { const u = new URL(r.request().url()); const f = u.pathname === '/' ? 'index.html' : u.pathname.slice(1); const fp = path.join(ROOT, f);
    if (!fs.existsSync(fp)) return r.fulfill({ status: 404, body: '' }); let body = fs.readFileSync(fp, 'utf8');
    if (f === 'index.html') body = '<!doctype html><html><head><meta charset=utf8></head><body>' + body + '</body></html>';
    r.fulfill({ contentType: f.endsWith('.json') ? 'application/json' : f.endsWith('.js') ? 'text/javascript' : 'text/html', body }); });
  await p.goto('http://rs.test/'); await p.waitForTimeout(800);
  await p.evaluate(() => { location.hash = 'coach'; }); await p.waitForTimeout(300);
  await p.evaluate(() => setSubTab('archiv')); await p.setInputFiles('#archFile', FILE); await p.waitForTimeout(1500);
  console.log('Archiv-Konten:', await p.evaluate(() => S.archive_accounts.length), '| Gruppen:', await p.evaluate(() => JSON.stringify(ASTATS().groups.map((g) => g.name + ':' + g.accounts))));
  const over = async () => p.evaluate(() => { const m = document.getElementById('main'); return m.scrollHeight - m.clientHeight; });
  for (const t of ['archiv', 'interview', 'erkenntnisse']) { await p.evaluate((t) => setSubTab(t), t); await p.waitForTimeout(150); console.log('Tab', t, 'Überlauf', await over()); await p.screenshot({ path: `${OUT}/coach-${t}.png` }); }
  console.log('Coach-Kontext Archiv:', await p.evaluate(() => { const c = JSON.parse(coachContext()).archiv; return c ? `${c.konten.length} Konten, Test ${c.test.konten}, PRO ${c.pro.konten}` : 'fehlt'; }));
  console.log('Interview-Prompt Länge:', await p.evaluate(() => { UI.iv = { topic: 'pro', chat: [], busy: false }; return ivPrompt().length; }));
  await p.evaluate(async () => { await put('coach_sessions', { date: TODAY(), topic: 'PRO-Phase & Ungeduld', insights: ['Test-Erkenntnis'], rules: ['Erste 3 PRO-Tage halbe Größe'], open: [] }); setSubTab('erkenntnisse'); });
  await p.waitForTimeout(200); await p.click('[data-act=iv-rule]'); await p.waitForTimeout(200);
  console.log('Regel übernommen:', await p.evaluate(() => (PR().rules || '').includes('Erste 3 PRO-Tage halbe Größe')));
  await p.evaluate(async () => { await put('trades', { date: TODAY(), time: '09:10', pnl: -50, symbol: 'MNQ' }); });
  console.log('Agenten-Hinweis Uhrzeit:', await p.evaluate(() => alerts().some((a) => /außerhalb von 15:30/.test(a.tx))));
  console.log('JS-Fehler:', errs.length ? errs : 'keine'); await b.close();
})();
