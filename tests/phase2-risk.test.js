// Phase 2: Risk-Engine, Positionsgröße, Scaling-Limit
const test = require('node:test');
const assert = require('node:assert/strict');
const RS = require('../logic.js');
const seed = require('../config/seed.json');

const PR = seed.personal_rules;
const RULE = seed.account_rules[0];
const EVAL = RS.effectiveAccount({ id: 'a', name: 'A', rule_id: RULE.id, stage: 'EVAL' }, RULE);
const FUNDED = RS.effectiveAccount({ id: 'b', name: 'B', rule_id: RULE.id, stage: 'FUNDED' }, RULE);
const D = '2026-12-03';
let n = 0;
const T = (date, pnl, time) => ({ id: 't' + n++, date, time: time || `15:${String(30 + (n % 29)).padStart(2, '0')}`, pnl, accountId: 'a' });
const run = (trades, extra = {}) => RS.riskEngine({ date: D, trades, pr: PR, account: EVAL, now: new Date('2026-12-03T15:00:00Z'), ...extra });

test('Frischer Tag: GRÜN, 150 $ Risiko, 450 $ bis Stop, 1.000 $ bis FTMO-Limit, 4 Trades', () => {
  const r = run([]);
  assert.equal(r.status, 'GREEN');
  assert.equal(r.riskPerTrade, 150);
  assert.equal(r.riskPhase, 'P1');
  assert.equal(r.remainingToStop, 450);
  assert.equal(r.firmRemaining, 1000);
  assert.equal(r.tradesLeft, 4);
  assert.equal(r.lockedUntilMs, null);
});

test('Phase 2 ab +600 $ Kontogewinn zu Tagesbeginn: 200 $ Risiko, Stop −600 $', () => {
  const r = run([T('2026-12-01', 350), T('2026-12-02', 250)]);
  assert.equal(r.riskPhase, 'P2');
  assert.equal(r.riskPerTrade, 200);
  assert.equal(r.dailyStop, 600);
  assert.equal(run([T('2026-12-01', 599.99)]).riskPhase, 'P1');
  // Gewinn von heute hebt die Phase nicht mitten am Tag an
  assert.equal(run([T('2026-12-01', 500), T(D, 300)]).riskPhase, 'P1');
});

test('Nach 2 roten Tagen: 100 $ für den nächsten Tag, danach zurück', () => {
  const r = run([T('2026-12-01', -200), T('2026-12-02', -100)]);
  assert.equal(r.riskPhase, 'RED_DAYS');
  assert.equal(r.riskPerTrade, 100);
  assert.ok(r.notices.some((x) => /2 roten Tagen/.test(x.text)));
  // ein grüner Tag dazwischen: zurück zur normalen Phase
  assert.equal(run([T('2026-11-30', -200), T('2026-12-01', -100), T('2026-12-02', 50)]).riskPhase, 'P1');
});

test('GELB nach 1 Verlust', () => {
  const r = run([T(D, -100, '15:35')]);
  assert.equal(r.status, 'YELLOW');
  assert.equal(r.remainingToStop, 350);
  assert.equal(r.tradesLeft, 3);
});

test('GELB bei 50 % des Tages-Stops, genau an der Grenze', () => {
  assert.equal(run([T(D, 300, '15:31'), T(D, -525, '15:40')]).status, 'YELLOW'); // −225 = 50 %
  assert.equal(run([T(D, 300, '15:31'), T(D, -524, '15:40')]).dayPnl, -224);
});

test('ROT bei genau −450 $, Sperre bis Mitternacht Berlin', () => {
  const r = run([T(D, -450, '15:40')]);
  assert.equal(r.status, 'RED');
  assert.equal(r.riskPerTrade, 0);
  assert.equal(r.tradesLeft, 0);
  assert.equal(new Date(r.lockedUntilMs).toISOString(), '2026-12-03T23:00:00.000Z'); // 00:00 Berlin im Winter
  assert.equal(run([T(D, -449, '15:40')]).status, 'YELLOW');
});

test('ROT bei 3 Verlusttrades, auch wenn der Stop nicht erreicht ist', () => {
  const r = run([T(D, -50, '15:31'), T(D, 300, '15:35'), T(D, -50, '15:40'), T(D, -50, '15:45')]);
  assert.equal(r.status, 'RED');
  assert.ok(r.reasons.some((x) => /3 Verlusttrades/.test(x)));
});

test('ROT nach 2 Gewinnern (stop_after_two_winners)', () => {
  const r = run([T(D, 200, '15:31'), T(D, 150, '15:50')]);
  assert.equal(r.status, 'RED');
  assert.ok(r.reasons.some((x) => /2 Gewinner/.test(x)));
  assert.equal(RS.riskEngine({ date: D, trades: [T(D, 200), T(D, 150)], pr: { ...PR, stop_after_two_winners: false }, account: EVAL }).status, 'GREEN');
});

test('Trade 4 nur bei Tages-PnL > 0', () => {
  const minus = run([T(D, 100, '15:31'), T(D, -150, '15:40'), T(D, 0, '15:50')]); // 3 Trades, −50
  assert.equal(minus.status, 'RED');
  assert.equal(minus.tradesLeft, 0);
  const plus = RS.riskEngine({ date: D, trades: [T(D, -100, '15:31'), T(D, 300, '15:40'), T(D, 0, '15:50')], pr: { ...PR, stop_after_two_winners: false }, account: EVAL });
  assert.equal(plus.tradesLeft, 1); // 3 Trades, +200
  assert.notEqual(plus.status, 'RED');
});

test('ROT bei 4 Trades', () => {
  const r = RS.riskEngine({ date: D, trades: [T(D, 100), T(D, -50), T(D, 100), T(D, -20)], pr: { ...PR, stop_after_two_winners: false, max_losing_trades_per_day: 9 }, account: EVAL });
  assert.equal(r.status, 'RED');
});

test('ROT bei Tilt-Sperre, GELB mit halber Größe bei Tilt-Gelb', () => {
  assert.equal(run([], { tilt: { level: 'RED', reason: 'Drang 8/10' } }).status, 'RED');
  const y = run([], { tilt: { level: 'YELLOW', reason: 'Nur noch halbe Größe' } });
  assert.equal(y.status, 'YELLOW');
  assert.equal(y.riskPerTrade, 75);
  assert.equal(y.halfSize, true);
});

test('Erlaubtes Risiko nie größer als der Rest bis zum Tages-Stop', () => {
  const r = run([T(D, -350, '15:40')]); // 100 $ bis −450
  assert.equal(r.riskPerTrade, 100);
});

test('Eval-Hinweise ab 1.200 $ und 1.500 $ Tagesgewinn, nicht im Funded-Konto', () => {
  const pr = { ...PR, stop_after_two_winners: false };
  assert.equal(RS.riskEngine({ date: D, trades: [T(D, 1200)], pr, account: EVAL }).notices[0].level, 'info');
  assert.equal(RS.riskEngine({ date: D, trades: [T(D, 1500)], pr, account: EVAL }).notices[0].level, 'warn');
  assert.equal(RS.riskEngine({ date: D, trades: [T(D, 1500)], pr, account: FUNDED }).notices.length, 0);
});

test('FTMO-Tageslimit −1.000 $ führt zu ROT, ohne Konto kein Firmenlimit', () => {
  const pr = { ...PR, daily_stop_phase1: -5000 };
  assert.equal(RS.riskEngine({ date: D, trades: [T(D, -1000)], pr, account: EVAL }).status, 'RED');
  assert.equal(RS.riskEngine({ date: D, trades: [], pr, account: null }).firmRemaining, null);
});

test('Copy-Gruppe zählt Trades nur einmal (über das erste Konto)', () => {
  const tr = [{ date: D, pnl: -100, account_ids: ['a', 'b'] }, { date: D, pnl: -100, accountId: 'b' }];
  assert.equal(RS.unitTrades(tr, ['a', 'b']).length, 1);
});

test('worstStatus: der schlechteste Status gilt', () => {
  assert.equal(RS.worstStatus([{ status: 'GREEN' }, { status: 'YELLOW' }]), 'YELLOW');
  assert.equal(RS.worstStatus([{ status: 'YELLOW' }, { status: 'RED' }, { status: 'GREEN' }]), 'RED');
  assert.equal(RS.worstStatus([]), 'GREEN');
});

test('positionSize: MNQ, 150 $ Risiko, 15 Punkte Stop → 5 Kontrakte, 150 $ Risiko', () => {
  const r = RS.positionSize({ risk: 150, stopPoints: 15, usdPerPoint: 2 });
  assert.equal(r.contracts, 5);
  assert.equal(r.actualRisk, 150);
  assert.deepEqual(r.targets.map((t) => t.usd), [300, 450, 600]);
  assert.deepEqual(r.targets.map((t) => t.points), [30, 45, 60]);
});

test('positionSize: abrunden, Stop zu weit, keine Stopweite', () => {
  assert.equal(RS.positionSize({ risk: 150, stopPoints: 16, usdPerPoint: 2 }).contracts, 4);
  assert.equal(RS.positionSize({ risk: 150, stopPoints: 16, usdPerPoint: 2 }).actualRisk, 128);
  assert.match(RS.positionSize({ risk: 150, stopPoints: 10, usdPerPoint: 20 }).error, /Stop zu weit/);
  assert.match(RS.positionSize({ risk: 150, stopPoints: 0, usdPerPoint: 2 }).error, /Stopweite/);
  assert.match(RS.positionSize({ risk: 0, stopPoints: 10, usdPerPoint: 2 }).error, /kein Risiko/);
});

test('positionSize + contractLimit: Warnung über dem Funded-Scaling', () => {
  const MNQ = seed.instruments.find((i) => i.id === 'MNQ');
  const NQ = seed.instruments.find((i) => i.id === 'NQ');
  assert.equal(RS.contractLimit(RULE, 'FUNDED', 0, MNQ), 20);
  assert.equal(RS.contractLimit(RULE, 'FUNDED', 1500, NQ), 3);
  assert.equal(RS.contractLimit(RULE, 'EVAL', 0, MNQ), null); // kein Eval-Limit konfiguriert
  const r = RS.positionSize({ risk: 200, stopPoints: 4, usdPerPoint: 2, limit: 20 }); // 25 Micros
  assert.equal(r.contracts, 25);
  assert.match(r.warning, /über deinem Scaling-Limit von 20/);
});
