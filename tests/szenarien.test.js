// Prop-Szenarien: Startzustand aus Trades und Szenario-Baum (Eval bis Ziel, Funded bis Payout über dem Puffer)
const test = require('node:test');
const assert = require('node:assert/strict');
const RS = require('../logic.js');
const seed = require('../config/seed.json');
const TPT = seed.account_rules.find((r) => r.id === 'tpt-eod-25k');

const thirds = RS.scenarioOutcomes(2 / 3, 0.5); // jeder Ausgang 1/3
const P = { risk: 300, perDay: 2, days: 5, outcomes: thirds };
const evalRules = (firm) => ({ mode: 'eval', firm, target: 1500, consPct: 50, consMode: 'RAISE_TARGET', minDays: 3, maxDD: 1000, ddType: 'trailing-eod', ddLock: true, dll: 500, dllMode: 'SOFT_ABOVE_START' });
const fresh = (extra = {}) => RS.scenarioStart({ trades: [], today: '2026-12-01', maxDD: 1000, ddType: 'trailing-eod', ddLock: true, dll: 500, dllMode: 'SOFT_ABOVE_START', ...extra });

test('Grundregeln (ohne Firmenregeln) ergeben genau das Miro-Diagramm', () => {
  const t = RS.scenarioTree(fresh(), evalRules(false), P);
  assert.equal(t.cols.length, 11);
  assert.deepEqual(t.cols.slice(1).map((c) => (c.goal ? c.goal.ways : 0)), [0, 0, 4, 10, 32, 76, 196, 482, 1164, 2858]);
  assert.deepEqual(t.cols.slice(1).map((c) => (c.breach ? c.breach.ways : 0)), [0, 0, 0, 1, 0, 4, 4, 14, 32, 66]);
  assert.equal(t.open.ways, 11650);
  assert.equal(t.total.goal.ways + t.total.breach.ways + t.open.ways, 16593);
  assert.ok(Math.abs(t.total.goal.prob - 0.7782) < 0.0005);
  // Spalte Tag 1 Trade 1: +600, +300, -300 mit je einem Weg
  assert.deepEqual(t.cols[1].nodes.map((n) => [n.pnl, n.ways]), [[600, 1], [300, 1], [-300, 1]]);
});

test('TPT-Regeln: zwei Verluste am ersten Tag lösen das Tageslimit aus, unter 25.000 $ ist das Konto weg', () => {
  const t = RS.scenarioTree(fresh(), evalRules(true), P);
  const c2 = t.cols[2];
  assert.equal(c2.breach.ways, 1); assert.equal(c2.breach.dll, 1); assert.equal(c2.breach.floor, 0);
  assert.ok(c2.edges.some((e) => e.from === -300 && e.to === 'B' && e.kind === 'dll'));
  assert.ok(!c2.nodes.some((n) => n.pnl === -600)); // ohne Firmenregeln läge hier ein Konto bei -600 $
});

test('Tageslimit über dem Start ist weich: Pause bis zum nächsten Tag, Verlust endet bei -500 $ Tag', () => {
  const s = RS.scenarioStart({ trades: [{ date: '2026-12-01', pnl: 600 }], today: '2026-12-02', maxDD: 1000, ddType: 'trailing-eod', ddLock: true, dll: 500, dllMode: 'SOFT_ABOVE_START' });
  assert.equal(s.pnl, 600); assert.equal(s.floor, -400); assert.equal(s.best, 600); assert.equal(s.daysDone, 1);
  const t = RS.scenarioTree(s, evalRules(true), { ...P, days: 2 });
  const n = t.cols[2].nodes.find((x) => x.pnl === 100); // 600 - 300 - (200 bis zum Limit)
  assert.ok(n && n.pausedWays === 1, 'Soft-Breach bei +100 $');
  assert.ok(t.cols[2].edges.some((e) => e.from === 300 && e.to === '100' && e.kind === 'dll'));
  // am nächsten Tag geht es von +100 $ normal weiter
  assert.ok(t.cols[3].nodes.some((x) => x.pnl === 700));
});

test('Konsistenz 50 %: Ziel erst, wenn der beste Tag unter der Hälfte des Gewinns liegt', () => {
  // Tag 1: +1200 (2x Win 1:2). Tag 2: Win 1:1 = +1500, bester Tag 80 % -> noch nicht bestanden
  const s = RS.scenarioStart({ trades: [{ date: '2026-12-01', pnl: 600 }, { date: '2026-12-01', pnl: 600 }], today: '2026-12-02', maxDD: 1000, ddType: 'trailing-eod', ddLock: true });
  assert.equal(s.floor, 0, 'Drawdown rastet beim Start ein (Tagesschluss +1200 $)');
  const t = RS.scenarioTree(s, evalRules(true), { ...P, days: 3 });
  assert.equal(t.cols[1].goal, null);
  assert.ok(t.cols[1].nodes.some((n) => n.pnl === 1500) && t.cols[1].nodes.some((n) => n.pnl === 1800));
  // genau 50 % (1200 von 2400) zählt als verfehlt, erst mehr als das Doppelte besteht
  const g = RS.scenarioTree({ ...s, pnl: 1800, dayPnl: 0 }, evalRules(true), { ...P, days: 1, outcomes: RS.scenarioOutcomes(1, 1) });
  assert.equal(g.cols[1].goal, null); // 2400: bester Tag 1200 = 50 %
  assert.equal(g.cols[2].goal.prob, 1); // 3000: 40 %
  // ohne Firmenregeln wäre +1500 sofort das Ziel
  const plain = RS.scenarioTree(s, evalRules(false), { ...P, days: 1 });
  assert.equal(plain.cols[1].goal.ways, 2);
});

test('Funded TPT 25K: Payout möglich erst über 26.000 $, Breach bei 24.000 $', () => {
  const r = { mode: 'funded', firm: true, maxDD: 1000, ddType: 'trailing-eod', ddLock: true, dll: 500, dllMode: 'SOFT_ABOVE_START', buffer: TPT.payout_buffer };
  const t = RS.scenarioTree(fresh(), r, P);
  assert.equal(t.cols[2].goal.ways, 1); // 2x Win 1:2 = +1200 > +1000
  assert.ok(t.cols[2].nodes.some((n) => n.pnl === 900)); // +900 ist noch kein Payout
  assert.ok(!t.cols[1].goal);
  // Exakt +1000 ($26.000) reicht nicht: auszahlbar ist erst, was darüber liegt
  const at = RS.scenarioTree({ ...fresh(), pnl: 700 }, r, { ...P, days: 1, outcomes: RS.scenarioOutcomes(1, 0) });
  assert.equal(at.cols[1].goal.prob, 0); // nur der (unwahrscheinliche) Win 1:2 käme darüber
  assert.equal(at.cols[1].nodes.find((n) => n.pnl === 1000).prob, 1);
});

test('scenarioStart: offener Tag, Payout und Breach', () => {
  const tr = [{ date: '2026-12-01', pnl: 300 }, { date: '2026-12-02', pnl: -300 }];
  const s = RS.scenarioStart({ trades: tr, today: '2026-12-02', todayOpen: true, maxDD: 1000, ddType: 'trailing-eod', ddLock: true, dll: 500, dllMode: 'SOFT_ABOVE_START' });
  assert.equal(s.open, true); assert.equal(s.todayTrades, 1); assert.equal(s.dayStart, 300); assert.equal(s.dayPnl, -300); assert.equal(s.pnl, 0);
  assert.equal(s.floor, -700); assert.equal(s.daysDone, 2);
  const t = RS.scenarioTree(s, evalRules(true), { ...P, days: 1 });
  assert.equal(t.slots[0].dayIdx, 0); assert.equal(t.slots[0].k, 2); // heute noch Trade 2
  // heute nach einem Verlust: zweiter Verlust -> Tageslimit bei -200 $, unter dem Start -> hart
  assert.equal(t.cols[1].breach.dll, 1);
  const paid = RS.scenarioStart({ trades: [{ date: '2026-12-01', pnl: 1600 }], today: '2026-12-03', paidOut: 400, maxDD: 1000, ddType: 'trailing-eod', ddLock: true, ddAfterPayout: 'start_balance' });
  assert.equal(paid.pnl, 1200); assert.equal(paid.floor, 0);
  const dead = RS.scenarioStart({ trades: [{ date: '2026-12-01', pnl: -1000 }], today: '2026-12-02', maxDD: 1000, ddType: 'trailing-eod', ddLock: true });
  assert.equal(dead.breached, true);
  assert.equal(RS.scenarioTree(dead, evalRules(true), P).startBreached, true);
});

test('scenarioOutcomes: Wahrscheinlichkeiten summieren sich zu 1', () => {
  const o = RS.scenarioOutcomes(0.5, 0.4);
  assert.ok(Math.abs(o.reduce((x, y) => x + y.p, 0) - 1) < 1e-12);
  assert.deepEqual(o.map((x) => x.k), ['w2', 'w1', 'l']);
  const t = RS.scenarioTree(fresh(), evalRules(true), { ...P, outcomes: o });
  const sum = t.total.goal.prob + t.total.breach.prob + t.open.prob;
  assert.ok(Math.abs(sum - 1) < 1e-9);
});
