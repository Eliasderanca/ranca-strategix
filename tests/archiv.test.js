// Archiv: Journal-Export einlesen, Konten/Copy-Gruppen bilden, Kennzahlen
const test = require('node:test');
const assert = require('node:assert/strict');
const RS = require('../logic.js');
const H = '"tradeId","broker","tradeAccount","symbol","position","entryDate","exitDate","maxQuantity","pnlDollars","commission"\n';
const L = (acc, sym, pos, entry, q, pnl, fee = 1) => `"1","tradovate","${acc}","${sym}","${pos}","${entry}","${entry.replace(/:00\.000Z$/, ':30.000Z')}","${q}","${pnl}","${fee}"\n`;

test('parseJournalExport: Berliner Zeit, Richtung, netto P&L, Haltedauer', () => {
  const t = RS.parseJournalExport(H + L('TAKEPROFIT1', 'MNQ', 'S', '2026-12-01T14:35:00.000Z', 5, '-98.00', '7.5'));
  assert.equal(t.length, 1);
  assert.deepEqual([t[0].date, t[0].time, t[0].side, t[0].q, t[0].pnl, t[0].fee, t[0].dur], ['2026-12-01', '15:35:00', 'Short', 5, -98, 7.5, 30]);
});

test('buildArchive: Phase aus Kontoname, Copy-Gruppe über gleiche Einstiege, bestanden ab Ziel', () => {
  let csv = H;
  for (const a of ['TAKEPROFIT11', 'TAKEPROFIT12', 'TAKEPROFIT13']) {
    csv += L(a, 'MNQ', 'L', '2026-02-02T14:31:00.000Z', 20, '800');
    csv += L(a, 'MNQ', 'L', '2026-02-03T14:40:00.000Z', 20, '750');
  }
  csv += L('TAKEPROFIT99', 'MNQ', 'L', '2026-02-02T08:00:00.000Z', 3, '-1600');
  csv += L('TAKEPROFITPRO777', 'NQ', 'S', '2026-02-10T08:05:00.000Z', 3, '-900');
  const A = RS.buildArchive(RS.parseJournalExport(csv), { target: 1500 });
  const by = Object.fromEntries(A.map((a) => [a.account, a]));
  assert.equal(by.TAKEPROFIT11.group, 'Test-Gruppe 02.02'); assert.equal(by.TAKEPROFIT13.group, 'Test-Gruppe 02.02');
  assert.equal(by.TAKEPROFIT99.group, undefined);
  assert.equal(by.TAKEPROFIT11.outcome, 'bestanden'); assert.equal(by.TAKEPROFIT99.outcome, 'verloren');
  assert.equal(by.TAKEPROFITPRO777.phase, 'PRO'); assert.equal(by.TAKEPROFIT11.days, 2);
  const S = RS.archiveStats(A);
  assert.equal(S.test.accounts, 4); assert.equal(S.test.passed, 3); assert.equal(S.pro.accounts, 1);
  assert.equal(S.test.decisions, 3); // Copy-Trades zählen als eine Entscheidung
  assert.equal(S.test.byWindow['US-Open (15:30–17)'].pnl, 1550);
  assert.equal(S.test.byWindow['Asien (vor 08:00)'].n, 0);
  assert.equal(S.test.byWindow['Europa (08–12)'].pnl, -1600);
  assert.equal(S.groups[0].accounts, 3);
});

test('tradeWindow: Grenzen', () => {
  assert.equal(RS.tradeWindow('15:29:59'), 'Vor US-Open (12–15:30)');
  assert.equal(RS.tradeWindow('15:30'), 'US-Open (15:30–17)');
  assert.equal(RS.tradeWindow('17:00'), 'Abend (ab 17)');
  assert.equal(RS.tradeWindow('07:59'), 'Asien (vor 08:00)');
});
