// Phase 3: R-Berechnung, Trading-Tage, Tilt-Frühwarnung, Statistik
const test = require('node:test');
const assert = require('node:assert/strict');
const RS = require('../logic.js');
const seed = require('../config/seed.json');
const JC = seed.journal_config;

const rOf = (t) => RS.tradeR(t, 2); // MNQ
let n = 0;
const T = (date, time, pnl, extra = {}) => ({ id: 't' + n++, date, time, pnl, ...extra });

test('Seed: Setups, Emotionen und Tilt-Regeln aus der Spezifikation', () => {
  assert.deepEqual(JC.setups, ['VAL-Long', 'VAH-Short', 'POC-Reversion', 'VWAP-Reclaim', 'VWAP-Rejection', 'Sonstiges']);
  assert.deepEqual(JC.emotions, ['ruhig', 'fokussiert', 'ungeduldig', 'gierig', 'ängstlich', 'frustriert', 'wütend', 'euphorisch', 'gelangweilt', 'unter Druck']);
  assert.equal(JC.tilt.red_urge, 7);
  assert.equal(JC.tilt.yellow_urge, 5);
  assert.equal(JC.tilt.pause_minutes, 5);
});

test('tradeR: eingetragenes R, altes Feld, sonst berechnet', () => {
  assert.equal(RS.tradeR({ result_r: 2.5, pnl: 1 }, 2), 2.5);
  assert.equal(RS.tradeR({ r: -1, pnl: 1 }, 2), -1);
  assert.equal(RS.tradeR({ pnl: 300, stop_points: 15, contracts: 5 }, 2), 2); // 300 / 150
  assert.equal(RS.tradeR({ pnl: -75, stop_points: 15, contracts: 5 }, 2), -0.5);
  assert.equal(RS.tradeR({ pnl: 100 }, 2), null);
});

test('ruleBreakCount: Plan nicht befolgt zählt, markierte Brüche zählen einzeln', () => {
  assert.equal(RS.ruleBreakCount({ followed_plan: true }), 0);
  assert.equal(RS.ruleBreakCount({ followed_plan: false }), 1);
  assert.equal(RS.ruleBreakCount({ followed_plan: false, ruleBreaks: ['Kein Stop', 'Revenge'] }), 2);
  assert.equal(RS.ruleBreakCount({ ruleBreaks: ['Revenge'] }), 1);
});

test('buildTradingDay: Summen, Gewinner, Verlierer, Regelbrüche, Readiness', () => {
  const tr = [T('2026-12-02', '15:31', 300), T('2026-12-02', '15:50', -150, { followed_plan: false }), T('2026-12-02', '16:10', 0), T('2026-12-03', '15:31', 999)];
  const d = RS.buildTradingDay('2026-12-02', tr, { readiness_score: 72, mood_evening: 4, reflection_text: 'ok' });
  assert.deepEqual(d, { date: '2026-12-02', pnl_total: 150, trades_count: 3, wins: 1, losses: 1, rule_breaks: 1, day_type: null, readiness_score: 72, mood_evening: 4, reflection_text: 'ok' });
  assert.equal(RS.buildTradingDay('2026-12-09', tr).trades_count, 0);
});

test('tiltResult: Drang ≥ 7 oder kein A-Setup = ROT, 5–6 = GELB, darunter frei', () => {
  const c = JC.tilt;
  assert.equal(RS.tiltResult({ urge: 7, a_setup: true }, c).level, 'RED');
  assert.equal(RS.tiltResult({ urge: 10, a_setup: true }, c).level, 'RED');
  assert.equal(RS.tiltResult({ urge: 2, a_setup: false }, c).level, 'RED');
  assert.equal(RS.tiltResult({ urge: 6, a_setup: true }, c).level, 'YELLOW');
  assert.equal(RS.tiltResult({ urge: 5, a_setup: true }, c).level, 'YELLOW');
  assert.match(RS.tiltResult({ urge: 5, a_setup: true }, c).reason, /halbe Größe/);
  assert.equal(RS.tiltResult({ urge: 4, a_setup: true }, c).level, 'GREEN');
});

test('tiltFor: ROT bleibt den ganzen Tag, sonst zählt der letzte Check, nur passende Konten', () => {
  const D = '2026-12-03';
  const checks = [
    { date: D, created_ms: 1, level: 'YELLOW', reason: 'y', account_ids: ['a'] },
    { date: D, created_ms: 2, level: 'GREEN', reason: '', account_ids: ['a'] },
  ];
  assert.equal(RS.tiltFor(checks, D, ['a']), null); // letzter Check grün
  assert.equal(RS.tiltFor(checks.slice(0, 1), D, ['a']).level, 'YELLOW');
  assert.equal(RS.tiltFor(checks.slice(0, 1), D, ['b']), null); // anderes Konto
  const withRed = [{ date: D, created_ms: 0, level: 'RED', reason: 'r', account_ids: ['a'] }, ...checks];
  assert.equal(RS.tiltFor(withRed, D, ['a']).level, 'RED');
  assert.equal(RS.tiltFor(withRed, '2026-12-04', ['a']), null); // neuer Tag
});

test('Tilt-ROT sperrt die Session über die Risk-Engine', () => {
  const r = RS.riskEngine({ date: '2026-12-03', trades: [], pr: seed.personal_rules, account: null, tilt: RS.tiltResult({ urge: 8, a_setup: true }, JC.tilt) });
  assert.equal(r.status, 'RED');
});

test('tiltPending: Pflicht-Pause läuft bis pause_until_ms', () => {
  const c = [{ id: 'x', pause_until_ms: 1000 }];
  assert.equal(RS.tiltPending(c, 999).id, 'x');
  assert.equal(RS.tiltPending(c, 1000), null);
});

test('overconfidence: euphorisch/gierig ab Intensität 7', () => {
  const c = JC.overconfidence;
  assert.equal(RS.overconfidence({ emotion: 'euphorisch', intensity: 7 }, c), true);
  assert.equal(RS.overconfidence({ emotion: 'gierig', intensity: 9 }, c), true);
  assert.equal(RS.overconfidence({ emotion: 'gierig', intensity: 6 }, c), false);
  assert.equal(RS.overconfidence({ emotion: 'ruhig', intensity: 10 }, c), false);
  assert.equal(RS.overconfidence(null, c), false);
});

test('isoWeek: Jahreswechsel und Montag als Wochenstart', () => {
  assert.equal(RS.isoWeek('2026-12-03'), '2026-W49');
  assert.equal(RS.isoWeek('2026-11-30'), '2026-W49'); // Montag
  assert.equal(RS.isoWeek('2026-11-29'), '2026-W48'); // Sonntag
  assert.equal(RS.isoWeek('2026-12-31'), '2026-W53');
  assert.equal(RS.isoWeek('2027-01-04'), '2027-W01');
});

const DATA = [
  // Tag 1: Verlust, dann Gewinn, dann Gewinn
  T('2026-12-01', '15:31', -150, { emotion_before: { emotion: 'ruhig', intensity: 3 }, result_r: -1, setup: 'VAL-Long' }),
  T('2026-12-01', '15:50', 300, { emotion_before: { emotion: 'gierig', intensity: 8 }, result_r: 2, setup: 'VWAP-Reclaim', followed_plan: false }),
  T('2026-12-01', '16:20', 150, { emotion_before: { emotion: 'ruhig', intensity: 4 }, result_r: 1, setup: 'VAL-Long' }),
  // Tag 2: Verlust, Verlust, Gewinn, Gewinn
  T('2026-12-02', '15:35', -150, { emotion_before: { emotion: 'ungeduldig', intensity: 6 }, result_r: -1, setup: 'POC-Reversion' }),
  T('2026-12-02', '15:45', -150, { emotion_before: { emotion: 'gierig', intensity: 7 }, result_r: -1, setup: 'Sonstiges', ruleBreaks: ['Revenge'] }),
  T('2026-12-02', '16:00', 300, { emotion_before: { emotion: 'ruhig', intensity: 2 }, result_r: 2, setup: 'VAL-Long' }),
  T('2026-12-02', '16:30', 100, { emotion: 'Fokussiert', r: 0.5 }), // altes Format
];

test('statsByEmotion: Winrate und Ø R je Emotion vor dem Trade (altes Format wird gelesen)', () => {
  const s = RS.statsByEmotion(DATA, rOf);
  const ruhig = s.find((x) => x.key === 'ruhig');
  assert.equal(ruhig.n, 3);
  assert.equal(ruhig.winrate, 2 / 3);
  assert.equal(ruhig.avgR, 0.67);
  const gierig = s.find((x) => x.key === 'gierig');
  assert.equal(gierig.n, 2);
  assert.equal(gierig.winrate, 0.5);
  assert.equal(gierig.avgR, 0.5);
  assert.equal(s.find((x) => x.key === 'fokussiert').n, 1);
});

test('afterLossStats: Trade direkt nach Verlust gegen alle anderen (nur am selben Tag)', () => {
  const s = RS.afterLossStats(DATA, rOf);
  // nach Verlust: 12-01 15:50 (+2R), 12-02 15:45 (−1R), 12-02 16:00 (+2R)
  assert.equal(s.afterLoss.n, 3);
  assert.equal(s.afterLoss.winrate, 2 / 3);
  assert.equal(s.afterLoss.avgR, 1);
  assert.equal(s.others.n, 4);
  // Trade 1 eines Tages zählt nie als „nach Verlust“, auch wenn der Vortag rot endete
  assert.equal(RS.afterLossStats([T('2026-12-01', '16:00', -100), T('2026-12-02', '15:30', 100)], rOf).afterLoss.n, 0);
});

test('statsByTradeIndex: Trade 1, 2, 3, 4+ des Tages', () => {
  const s = RS.statsByTradeIndex(DATA, rOf);
  assert.deepEqual(s.map((x) => x.n), [2, 2, 2, 1]);
  assert.equal(s[0].winrate, 0); // beide ersten Trades verloren
  assert.equal(s[0].avgR, -1);
  assert.equal(s[3].label, '4+');
});

test('ruleBreaksByWeek: lückenlose Wochen, Brüche korrekt zugeordnet', () => {
  const s = RS.ruleBreaksByWeek(DATA, '2026-12-02', 3);
  assert.deepEqual(s, [{ week: '2026-W47', breaks: 0 }, { week: '2026-W48', breaks: 0 }, { week: '2026-W49', breaks: 2 }]);
});

test('statsBySetup: Ø R je Setup, bestes zuerst, Altdaten über Playbook-Name', () => {
  const s = RS.statsBySetup(DATA, rOf, (t) => (t.setupId === 'pb1' ? 'Opening Range' : null));
  assert.equal(s[0].key, 'VWAP-Reclaim');
  assert.equal(s[0].avgR, 2);
  const val = s.find((x) => x.key === 'VAL-Long');
  assert.equal(val.n, 3);
  assert.equal(val.avgR, 0.67);
  assert.ok(s.some((x) => x.key === 'Ohne Setup'));
});
