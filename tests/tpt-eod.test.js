// TakeProfitTrader 25K EOD: Regelsatz, Soft/Hard-Tageslimit, Ziel-Erhöhung, Puffer-Payout, Drawdown-Rest
const test = require('node:test');
const assert = require('node:assert/strict');
const RS = require('../logic.js');
const seed = require('../config/seed.json');
const TPT = seed.account_rules.find((r) => r.id === 'tpt-eod-25k');
const PR = { ...seed.personal_rules, ...TPT.personal_overrides };
const always = (r) => () => r;

test('Regelsatz TPT 25K EOD ist vollständig und offiziell belegt', () => {
  assert.equal(TPT.start_balance, 25000); assert.equal(TPT.profit_target_eval, 1500);
  assert.equal(TPT.max_drawdown, 1000); assert.equal(TPT.drawdown_type, 'EOD_TRAILING'); assert.equal(TPT.drawdown_lock, 'start_balance');
  assert.equal(TPT.daily_loss_limit, 500); assert.equal(TPT.daily_loss_type, 'SOFT_ABOVE_START');
  assert.equal(TPT.eval_min_days, 3); assert.equal(TPT.payout_buffer, 1000); assert.equal(TPT.profit_split, 0.8);
  assert.ok(TPT.source.startsWith('https://')); assert.ok(TPT.personal_overrides.daily_stop_phase1 > -TPT.daily_loss_limit);
});

test('effectiveTarget: 50 %-Regel hebt das Ziel auf den doppelten besten Tag', () => {
  assert.equal(RS.effectiveTarget(1500, 600, 50, 'RAISE_TARGET'), 1500);
  assert.equal(RS.effectiveTarget(1500, 900, 50, 'RAISE_TARGET'), 1800);
  assert.equal(RS.effectiveTarget(3000, 2000, 50, null), 3000); // FTMO: Ziel bleibt
});

test('dllIsHard: weich über dem Start, hart darunter', () => {
  assert.equal(RS.dllIsHard('SOFT_ABOVE_START', 100), false);
  assert.equal(RS.dllIsHard('SOFT_ABOVE_START', -300), true);
  assert.equal(RS.dllIsHard('HARD', 5000), true);
  assert.equal(RS.dllIsHard('SOFT', -900), false);
});

test('withdrawable und etToBerlin', () => {
  assert.equal(RS.withdrawable(1500, 0, 1000), 500);
  assert.equal(RS.withdrawable(1500, 400, 1000), 100);
  assert.equal(RS.withdrawable(800, 0, 1000), 0);
  assert.equal(RS.etToBerlin('2026-12-10', '16:55'), '22:55');
  assert.equal(RS.etToBerlin('2026-03-10', '16:55'), '21:55'); // USA schon Sommerzeit, Europa noch nicht
});

test('riskEngine: TPT-Konto, Drawdown-Rest und Tageslimit', () => {
  const acc = RS.effectiveAccount({ id: 'a', name: 'TPT #1', stage: 'EVAL' }, TPT);
  assert.equal(acc.minDays, 3); assert.equal(acc.dllMode, 'SOFT_ABOVE_START');
  const D = '2026-12-02';
  let r = RS.riskEngine({ date: D, trades: [], pr: PR, account: acc });
  assert.equal(r.ddRemaining, 1000); assert.equal(r.riskPerTrade, 100); assert.equal(r.firmName, 'TakeProfitTrader');
  // Gestern +700 geschlossen: Floor 24.700, heute -200 -> Stand 25.500, 800 Rest
  r = RS.riskEngine({ date: D, trades: [{ date: '2026-12-01', time: '15:40', pnl: 700 }, { date: D, time: '15:40', pnl: -200 }], pr: PR, account: acc });
  assert.equal(r.ddRemaining, 800);
  // -500 am ersten Tag: hartes Limit (unter Startkapital)
  r = RS.riskEngine({ date: D, trades: [{ date: D, time: '15:40', pnl: -500 }], pr: { ...PR, daily_stop_phase1: -9999 }, account: acc });
  assert.equal(r.status, 'RED'); assert.ok(r.reasons.some((x) => x.includes('verloren')));
  // Mit +1.000 Polster: weiche Pause
  r = RS.riskEngine({ date: D, trades: [{ date: '2026-12-01', time: '15:40', pnl: 1000 }, { date: D, time: '15:40', pnl: -500 }], pr: { ...PR, daily_stop_phase1: -9999, daily_stop_phase2: -9999 }, account: acc });
  assert.ok(r.reasons.some((x) => x.includes('pausiert')));
  assert.ok(r.notices.some((x) => x.text.includes('22:55')));
});

test('simulateFunded im Puffer-Modell: Auszahlung nur über 1.000 $ Gewinn, 80 %', () => {
  const r = RS.simulateFunded({ pr: PR, rule: TPT, sample: always(2), days: 5, runs: 10 });
  // 2R × 100 $ = 200, zwei Gewinner pro Tag -> 400 $/Tag (Phase 2 ab 500: 125 $ Risiko -> 500 $/Tag)
  assert.equal(r.pPayout, 1);
  assert.ok(r.avgPayoutNet > 0 && r.avgPayoutNet < 2000);
  const short = RS.simulateFunded({ pr: PR, rule: TPT, sample: always(2), days: 2, runs: 5 });
  assert.equal(short.pPayout, 0); // nach 2 Tagen noch unter dem Puffer
});

test('simDay: Tageslimit über dem Start ist kein Kontoverlust', () => {
  const soft = RS.simDay({ profit: 2000, redDays: 0 }, { ...PR, daily_stop_phase1: -9999, daily_stop_phase2: -9999, max_losing_trades_per_day: 9 }, TPT, 'FUNDED', always(-1), Math.random, { riskOverride: 250 });
  assert.equal(soft.breach, null);
  const hard = RS.simDay({ profit: 0, redDays: 0 }, { ...PR, daily_stop_phase1: -9999, max_losing_trades_per_day: 9 }, TPT, 'EVAL', always(-1), Math.random, { riskOverride: 250 });
  assert.equal(hard.breach, 'DAILY');
});
