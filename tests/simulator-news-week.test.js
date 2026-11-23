// Challenge-/Payout-Simulator, News-Sperre, Wochen-Review
const test = require('node:test');
const assert = require('node:assert/strict');
const RS = require('../logic.js');
const seed = require('../config/seed.json');
const PR = seed.personal_rules, RULE = seed.account_rules[0];
const always = (r) => () => r;

test('simDay: Regeln greifen (2 Gewinner, Tages-Stop, 3 Verlierer, Risiko-Phase, Soft-Cap)', () => {
  const win = RS.simDay({ profit: 0, redDays: 0 }, PR, RULE, 'EVAL', always(2), Math.random);
  assert.deepEqual([win.pnl, win.trades, win.wins], [600, 2, 2]); // 2 × 2R × 150 $, dann Schluss
  const p2 = RS.simDay({ profit: 600, redDays: 0 }, PR, RULE, 'EVAL', always(2), Math.random);
  assert.equal(p2.pnl, 800); // Phase 2: 200 $ Risiko
  const loss = RS.simDay({ profit: 0, redDays: 0 }, PR, RULE, 'EVAL', always(-1), Math.random);
  assert.deepEqual([loss.pnl, loss.trades], [-450, 3]);
  const red = RS.simDay({ profit: -900, redDays: 2 }, PR, RULE, 'EVAL', always(-1), Math.random);
  assert.equal(red.pnl, -300); // nach 2 roten Tagen 100 $
  const big = RS.simDay({ profit: 0, redDays: 0 }, PR, RULE, 'EVAL', always(10), Math.random);
  assert.deepEqual([big.pnl, big.trades], [1500, 1]); // Soft-Cap 1.200 $ beendet den Tag
  const fundedBig = RS.simDay({ profit: 0, redDays: 0 }, PR, RULE, 'FUNDED', always(10), Math.random);
  assert.equal(fundedBig.trades, 2); // im Funded kein Eval-Soft-Cap
});

test('ddLevel: Trailing am Tageshoch, Lock beim Start', () => {
  assert.equal(RS.ddLevel(RULE, 0), -3000);
  assert.equal(RS.ddLevel(RULE, 1200), -1800);
  assert.equal(RS.ddLevel(RULE, 5000), 0);
});

test('simulateEval: immer 2R gewinnen -> bestanden an Tag 4', () => {
  const r = RS.simulateEval({ pr: PR, rule: RULE, sample: always(2), days: 9, runs: 50, minDays: 2 });
  assert.equal(r.pPass, 1);
  assert.equal(r.medianDays, 4);
  assert.equal(r.passHist[3], 50);
});

test('simulateEval: immer verlieren -> Drawdown an Tag 9, mit 8 Tagen noch offen', () => {
  assert.equal(RS.simulateEval({ pr: PR, rule: RULE, sample: always(-1), days: 10, runs: 20 }).pBreach, 1);
  const eight = RS.simulateEval({ pr: PR, rule: RULE, sample: always(-1), days: 8, runs: 20 });
  assert.equal(eight.pOpen, 1);
  assert.equal(eight.avgFinal, -2700);
});

test('simulateEval: Konsistenzregel verzögert das Bestehen', () => {
  const r = RS.simulateEval({ pr: PR, rule: RULE, sample: always(10), days: 9, runs: 10, minDays: 2 });
  assert.equal(r.medianDays, 3); // Tag 2: 3.500 $, aber bester Tag 57 % -> erst Tag 3
  const short = RS.simulateEval({ pr: PR, rule: RULE, sample: always(10), days: 2, runs: 10, minDays: 2 });
  assert.equal(short.pConsistencyBlocked, 1);
});

test('simulateEval: realistische Verteilung liefert Wahrscheinlichkeiten zwischen 0 und 1, reproduzierbar', () => {
  const o = { pr: PR, rule: RULE, sample: RS.rSampler({ winrate: 0.5, avgWin: 2, avgLoss: -1 }), days: 9, runs: 2000, seed: 'x' };
  const a = RS.simulateEval(o), b = RS.simulateEval(o);
  assert.deepEqual(a.pPass, b.pPass);
  assert.ok(a.pPass > 0 && a.pPass < 1);
  assert.ok(Math.abs(a.pPass + a.pBreach + a.pOpen - 1) < 1e-9);
});

test('simulateFunded: 5 Tage ≥ 200 $ -> Payout, Cap und Split', () => {
  const r = RS.simulateFunded({ pr: PR, rule: RULE, sample: always(2), days: 5, runs: 20 });
  assert.equal(r.pPayout, 1);
  assert.equal(r.medianDays, 5);
  assert.equal(r.avgPayoutNet, 3420); // (600 + 4 × 800) × 0,9
  const capped = RS.simulateFunded({ pr: PR, rule: { ...RULE, payout_cap: 1000 }, sample: always(2), days: 5, runs: 5 });
  assert.equal(capped.avgPayoutNet, 900);
  assert.equal(RS.simulateFunded({ pr: PR, rule: RULE, sample: always(2), days: 4, runs: 5 }).pPayout, 0);
});

test('rSampler: Bootstrap aus Liste und Winrate-Modell', () => {
  const s = RS.rSampler({ list: [3] });
  assert.equal(s(Math.random), 3);
  const m = RS.rSampler({ winrate: 1, avgWin: 2.5, avgLoss: 1 });
  assert.equal(m(Math.random), 2.5);
  assert.equal(RS.rSampler({ winrate: 0, avgWin: 2, avgLoss: 1 })(Math.random), -1);
});

test('newsBlocks: Termine aus dem Briefing, nur wichtige, ±5 Minuten, eigene Einträge immer', () => {
  const ev = [
    { title: 'US-PCE', when: 'Mi 25.11. · 14:30 MEZ', importance: 'hoch' },
    { title: 'Dell', when: 'Di 24.11. · nach US-Schluss', importance: 'hoch' },
    { title: 'Einkaufsmanager', when: 'Mi 25.11. · 09:30 MEZ', importance: 'mittel' },
    { title: 'FOMC', date: '2026-11-25', time: '20:00', importance: 'hoch' },
    { title: 'Eigene Notiz', date: '2026-11-25', time: '16:00', manual: true },
  ];
  const b = RS.newsBlocks(ev, '2026-11-25', 5);
  assert.deepEqual(b.map((x) => [x.title, x.start, x.end]), [['US-PCE', '14:25', '14:35'], ['Eigene Notiz', '15:55', '16:05'], ['FOMC', '19:55', '20:05']]);
  assert.equal(RS.activeNewsBlock(b, '14:31').title, 'US-PCE');
  assert.equal(RS.activeNewsBlock(b, '14:35').title, 'US-PCE');
  assert.equal(RS.activeNewsBlock(b, '14:36'), null);
  assert.equal(RS.newsBlocks(ev, '2026-11-24').length, 0); // „nach US-Schluss“ ohne Uhrzeit
});

test('weekStart und weekSummary: Bilanz einer Woche', () => {
  assert.equal(RS.weekStart('2026-12-03'), '2026-11-30');
  assert.equal(RS.weekStart('2026-12-06'), '2026-11-30'); // Sonntag gehört zur Woche davor
  assert.equal(RS.weekStart('2026-11-30'), '2026-11-30');
  const T = (date, pnl, extra = {}) => ({ date, time: '15:30', pnl, ...extra });
  const s = RS.weekSummary({
    weekStart: '2026-11-30',
    trades: [T('2026-11-30', 300, { result_r: 2, setup: 'VAL-Long', emotion_before: { emotion: 'ruhig', intensity: 3 } }), T('2026-12-01', -150, { result_r: -1, followed_plan: false, setup: 'Sonstiges', emotion_before: { emotion: 'gierig', intensity: 8 } }), T('2026-12-07', 999)],
    checkins: [{ id: '2026-11-30', score: 80 }, { id: '2026-12-01', score: 50 }],
    tiltChecks: [{ date: '2026-12-01', level: 'RED' }], dayTypes: { '2026-11-30': 'WIN_PLAN', '2026-12-01': 'LOSS_RULEBREAK' }, rOf: (t) => t.result_r,
  });
  assert.equal(s.week, '2026-W49');
  assert.deepEqual([s.pnl, s.trades, s.tradingDays, s.greenDays, s.redDays, s.ruleBreaks], [150, 2, 2, 1, 1, 1]);
  assert.equal(s.followedPct, 0.5);
  assert.deepEqual(s.dayTypes, { WIN_PLAN: 1, LOSS_RULEBREAK: 1 });
  assert.deepEqual([s.tiltChecks, s.tiltRed, s.checkinAvg], [1, 1, 65]);
  assert.equal(s.bestSetup.key, 'VAL-Long');
  assert.equal(s.worstEmotion.key, 'gierig');
});
