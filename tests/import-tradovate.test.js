// Import: Tradovate-Performance-Export (über TradingView ausgeführte Trades landen ebenfalls hier)
const test = require('node:test');
const assert = require('node:assert/strict');
const RS = require('../logic.js');

const HEAD = 'symbol,_priceFormat,_priceFormatType,_tickSize,buyFillId,sellFillId,qty,buyPrice,sellPrice,pnl,boughtTimestamp,soldTimestamp,duration';
const CSV = [
  HEAD,
  // Long 5 MNQ, Teil-Ausstieg 3 + 2 (gleiche Einstiegs-Fill-ID) -> ein Trade
  'MNQZ6,-2,0,0.25,1001,2001,3,21050.25,21065.25,$90.00,12/03/2026 15:31:05,12/03/2026 15:44:10,13min 5sec',
  'MNQZ6,-2,0,0.25,1001,2002,2,21050.25,21080.25,$120.00,12/03/2026 15:31:05,12/03/2026 15:58:40,27min 35sec',
  // Short 2 MNQ, Verlust (Verkauf zuerst)
  'MNQZ6,-2,0,0.25,1003,2003,2,21110.00,21095.00,$(60.00),12/03/2026 16:20:30,12/03/2026 16:12:02,8min 28sec',
  // kaputte Zeile
  'MNQZ6,-2,0,0.25,1004,2004,,,,,,,',
].join('\n');

test('importTimestamp: Formate und Umrechnung nach Berlin', () => {
  assert.deepEqual(RS.importTimestamp('12/03/2026 15:31:05', 'Europe/Berlin').time, '15:31');
  const et = RS.importTimestamp('12/03/2026 09:31:05', 'America/New_York'); // Winter: +6 h
  assert.equal(et.date, '2026-12-03'); assert.equal(et.time, '15:31');
  const utc = RS.importTimestamp('2026-12-03 23:30:00', 'UTC'); // nach Mitternacht in Berlin
  assert.equal(utc.date, '2026-12-04'); assert.equal(utc.time, '00:30');
  assert.equal(RS.importTimestamp('12/3/2026 3:31:05 PM', 'Europe/Berlin').time, '15:31');
  assert.equal(RS.importTimestamp('03.12.2026 15:31', 'Europe/Berlin').date, '2026-12-03');
  // US-Sommerzeit endet eine Woche später als die europäische: 27.10. ist der Abstand nur 5 h
  assert.equal(RS.importTimestamp('10/27/2026 09:30:00', 'America/New_York').time, '14:30');
  assert.equal(RS.importTimestamp('Mittwoch', 'UTC'), null);
});

test('parseUsd: Tradovate-Beträge', () => {
  assert.equal(RS.parseUsd('$90.00'), 90);
  assert.equal(RS.parseUsd('$(60.00)'), -60);
  assert.equal(RS.parseUsd('$1,234.50'), 1234.5);
  assert.equal(RS.parseUsd('-25.5'), -25.5);
  assert.equal(RS.parseUsd('$-12.00'), -12);
  assert.equal(RS.parseUsd(''), null);
});

test('instrumentRoot: Kontraktmonat wird entfernt', () => {
  assert.equal(RS.instrumentRoot('MNQZ6'), 'MNQ');
  assert.equal(RS.instrumentRoot('NQH27'), 'NQ');
  assert.equal(RS.instrumentRoot('MESZ6'), 'MES');
  assert.equal(RS.instrumentRoot('MNQ 12-26'), 'MNQ');
});

test('parseTradovatePerformance: Teil-Ausstiege zusammengefasst, Short erkannt, kaputte Zeile gemeldet', () => {
  const r = RS.parseTradovatePerformance(CSV, 'Europe/Berlin');
  assert.equal(r.format, 'tradovate-performance');
  assert.equal(r.trades.length, 2);
  const [a, b] = r.trades;
  assert.equal(a.direction, 'Long'); assert.equal(a.contracts, 5); assert.equal(a.pnl_gross, 210);
  assert.equal(a.time, '15:31'); assert.equal(a.exit_time, '15:58'); assert.equal(a.instrument, 'MNQ');
  assert.equal(a.entry_price, 21050.25); assert.equal(a.exit_price, 21071.25); // (3×21065.25 + 2×21080.25) / 5
  assert.equal(b.direction, 'Short'); assert.equal(b.contracts, 2); assert.equal(b.pnl_gross, -60);
  assert.equal(b.time, '16:12'); assert.equal(b.entry_price, 21095);
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /Zeile 5/);
  // gleicher Export zweimal -> gleiche Schlüssel
  assert.deepEqual(RS.parseTradovatePerformance(CSV).trades.map((t) => t.import_key), r.trades.map((t) => t.import_key));
});

test('parseTradovatePerformance: falsche Datei wird erkannt', () => {
  assert.match(RS.parseTradovatePerformance('date,time,pnl\n1,2,3').errors[0], /kein Tradovate-Performance-Export/);
  assert.match(RS.parseTradovatePerformance('').errors[0], /keine Trades/);
});

test('applyCommission: Netto = brutto − Gebühr je Kontrakt × Kontrakte', () => {
  const t = { instrument: 'MNQ', contracts: 5, pnl_gross: 210 };
  assert.deepEqual(RS.applyCommission(t, [{ id: 'MNQ', commission_rt: 0.74 }]), { ...t, fees: 3.7, pnl: 206.3 });
  assert.equal(RS.applyCommission(t, [{ id: 'MNQ' }]).pnl, 210); // keine Gebühr eingetragen
});

test('planImport: neu, mit manuellem Trade zusammenführen, schon vorhanden, falsches Konto', () => {
  const imp = RS.parseTradovatePerformance(CSV).trades;
  const existing = [
    { id: 'm1', date: '2026-12-03', time: '15:33', direction: 'Long', account_ids: ['a', 'b'], accountId: 'a', setup: 'VAL-Long', emotion_before: { emotion: 'ruhig', intensity: 3 } },
    { id: 'm2', date: '2026-12-03', time: '16:12', direction: 'Short', accountId: 'x' }, // anderes Konto
  ];
  const plan = RS.planImport(imp, existing, ['a', 'b']);
  assert.deepEqual(plan.map((p) => [p.action, p.targetId || null]), [['merge', 'm1'], ['new', null]]);
  // nach dem Import: erneuter Import überspringt alles
  const after = [{ ...existing[0], import_key: imp[0].import_key }, { id: 'n2', import_key: imp[1].import_key }];
  assert.deepEqual(RS.planImport(imp, after, ['a', 'b']).map((p) => p.action), ['skip', 'skip']);
  // außerhalb der Toleranz -> neu
  assert.equal(RS.planImport(imp, [{ ...existing[0], time: '15:40' }], ['a', 'b'])[0].action, 'new');
  // falsche Richtung -> neu
  assert.equal(RS.planImport(imp, [{ ...existing[0], direction: 'Short' }], ['a', 'b'])[0].action, 'new');
});
