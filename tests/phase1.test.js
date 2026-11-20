// Phase 1: Zeitzone, Regelsätze, Scaling, Kontolimit, Copy-Gruppen
const test = require('node:test');
const assert = require('node:assert/strict');
const RS = require('../logic.js');
const seed = require('../config/seed.json');

const FTMO = seed.account_rules.find((r) => r.id === 'ftmo-futures-pro-50k');

test('berlinDate: Abend in UTC ist in Berlin schon der nächste Tag', () => {
  assert.equal(RS.berlinDate(new Date('2026-11-20T23:30:00Z')), '2026-11-21'); // Winterzeit UTC+1
  assert.equal(RS.berlinDate(new Date('2026-11-20T22:59:00Z')), '2026-11-20');
  assert.equal(RS.berlinDate(new Date('2026-07-01T22:30:00Z')), '2026-07-02'); // Sommerzeit UTC+2
  assert.equal(RS.berlinDate(new Date('2026-07-01T21:59:00Z')), '2026-07-01');
});

test('berlinTime: 24-Stunden-Format in Berlin', () => {
  assert.equal(RS.berlinTime(new Date('2026-11-20T14:30:00Z')), '15:30');
  assert.equal(RS.berlinTime(new Date('2026-07-01T14:30:00Z')), '16:30');
});

test('msUntilBerlinMidnight: auch an Tagen der Zeitumstellung korrekt', () => {
  assert.equal(RS.msUntilBerlinMidnight(new Date('2026-11-20T22:00:00Z')), 60 * 60000); // 23:00 Berlin
  assert.equal(RS.msUntilBerlinMidnight(new Date('2026-03-28T22:30:00Z')), 30 * 60000); // vor Sommerzeit-Nacht
  assert.equal(RS.msUntilBerlinMidnight(new Date('2026-10-24T21:45:00Z')), 15 * 60000); // vor Winterzeit-Nacht
});

test('Seed: FTMO Futures Pro 50K mit allen Werten aus der Spezifikation', () => {
  assert.ok(FTMO, 'Regelsatz fehlt in config/seed.json');
  assert.equal(FTMO.start_balance, 50000);
  assert.equal(FTMO.profit_target_eval, 3000);
  assert.equal(FTMO.max_drawdown, 3000);
  assert.equal(FTMO.drawdown_type, 'EOD_TRAILING');
  assert.equal(FTMO.drawdown_lock, 'start_balance');
  assert.equal(FTMO.daily_loss_limit, 1000);
  assert.equal(FTMO.daily_loss_type, 'HARD');
  assert.equal(FTMO.eval_consistency_max_pct, 50);
  assert.equal(FTMO.payout_qualifying_day_min, 200);
  assert.equal(FTMO.payout_qualifying_days_required, 5);
  assert.equal(FTMO.payout_cap, 5000);
  assert.equal(FTMO.profit_split, 0.9);
  assert.equal(FTMO.monthly_fee, 139);
});

test('Seed: personal_rules mit allen Werten aus der Spezifikation', () => {
  const p = seed.personal_rules;
  assert.equal(p.risk_per_trade_phase1, 150);
  assert.equal(p.risk_per_trade_phase2, 200);
  assert.equal(p.phase2_from_profit, 600);
  assert.equal(p.daily_stop_phase1, -450);
  assert.equal(p.daily_stop_phase2, -600);
  assert.equal(p.max_losing_trades_per_day, 3);
  assert.equal(p.max_trades_per_day, 4);
  assert.equal(p.fourth_trade_requires_green, true);
  assert.equal(p.after_two_red_days_risk, 100);
  assert.equal(p.stop_after_two_winners, true);
  assert.equal(p.eval_daily_profit_soft_cap, 1200);
  assert.equal(p.eval_daily_profit_hard_warning, 1500);
  assert.equal(p.max_active_accounts, 4);
});

test('scalingFor: 2 / 3 / 5 Minis an den Stufengrenzen', () => {
  assert.deepEqual(RS.scalingFor(FTMO, -800), { minis: 2, micros: 20, from: 0 });
  assert.equal(RS.scalingFor(FTMO, 0).minis, 2);
  assert.equal(RS.scalingFor(FTMO, 999).minis, 2);
  assert.equal(RS.scalingFor(FTMO, 1000).minis, 3);
  assert.equal(RS.scalingFor(FTMO, 1999.99).minis, 3);
  assert.equal(RS.scalingFor(FTMO, 2000).minis, 5);
  assert.equal(RS.scalingFor(FTMO, 2000).micros, 50);
  assert.equal(RS.scalingFor({}, 500), null);
});

test('parseScaling / formatScaling: Text hin und zurück, Fehler bei Unsinn', () => {
  const s = RS.parseScaling('2000:5, 0:2,1000:3');
  assert.deepEqual(s, [{ min_profit: 0, minis: 2 }, { min_profit: 1000, minis: 3 }, { min_profit: 2000, minis: 5 }]);
  assert.equal(RS.formatScaling(s), '0:2, 1000:3, 2000:5');
  assert.throws(() => RS.parseScaling('1000-3'), /Ungültige Scaling-Stufe/);
});

test('effectiveAccount: EVAL nutzt Profitziel und Konsistenz, keine Payout-Felder', () => {
  const a = RS.effectiveAccount({ id: 'a1', name: 'Pro #1', rule_id: FTMO.id, stage: 'EVAL', profitTarget: 9999 }, FTMO);
  assert.equal(a.profitTarget, 3000); // Regelsatz gewinnt gegen alte Kontofelder
  assert.equal(a.consistencyPct, 50);
  assert.equal(a.maxDrawdown, 3000);
  assert.equal(a.ddType, 'trailing-eod');
  assert.equal(a.ddLock, true);
  assert.equal(a.maxDailyLoss, 1000);
  assert.equal(a.dllSoft, false);
  assert.equal(a.payoutMinDays, null);
  assert.equal(a.phase, 'challenge');
  assert.equal(a.status, 'aktiv');
  assert.equal(a.monthlyFee, 139);
  assert.equal(a.size, 50000);
});

test('effectiveAccount: FUNDED nutzt Payout-Regeln, kein Profitziel, keine Abo-Gebühr', () => {
  const a = RS.effectiveAccount({ id: 'a2', name: 'Pro #2', rule_id: FTMO.id, stage: 'FUNDED' }, FTMO);
  assert.equal(a.profitTarget, null);
  assert.equal(a.consistencyPct, null);
  assert.equal(a.payoutMinDays, 5);
  assert.equal(a.minDayProfit, 200);
  assert.equal(a.maxPayout, 5000);
  assert.equal(a.profitSplit, 90);
  assert.equal(a.phase, 'funded');
  assert.equal(a.monthlyFee, 0);
});

test('effectiveAccount: BREACHED ist verloren, ohne Regelsatz bleibt das Konto unverändert', () => {
  assert.equal(RS.effectiveAccount({ id: 'a3', stage: 'BREACHED' }, FTMO).status, 'verloren');
  const legacy = { id: 'x', name: 'Alt', maxDrawdown: 2000 };
  assert.equal(RS.effectiveAccount(legacy, null), legacy);
});

test('validateAccount: höchstens 4 aktive Konten, inaktive zählen nicht', () => {
  const act = (id) => ({ id, name: id, stage: 'EVAL' });
  const four = [act('a'), act('b'), act('c'), act('d')];
  assert.match(RS.validateAccount(act('e'), four, 4), /höchstens 4/);
  assert.equal(RS.validateAccount({ ...four[0] }, four, 4), null); // Bearbeiten eines vorhandenen Kontos
  assert.equal(RS.validateAccount({ id: 'e', name: 'e', stage: 'BREACHED' }, four, 4), null);
  const withLost = [...four.slice(0, 3), { id: 'z', name: 'z', stage: 'BREACHED' }];
  assert.equal(RS.validateAccount(act('e'), withLost, 4), null);
  assert.match(RS.validateAccount({ id: 'n', name: '  ' }, [], 4), /Kontonamen/);
  assert.equal(RS.isActive({ status: 'verloren' }), false); // alte Konten ohne stage
  assert.equal(RS.isActive({ status: 'aktiv' }), true);
});

test('groupAccounts: Copy-Gruppen ab 2 Konten, sonst Einzelkonto', () => {
  const r = RS.groupAccounts([
    { id: '1', copy_group: 'A' }, { id: '2' }, { id: '3', copy_group: 'A' }, { id: '4', copy_group: 'B' },
  ]);
  assert.equal(r.groups.length, 1);
  assert.equal(r.groups[0].name, 'A');
  assert.deepEqual(r.groups[0].members.map((a) => a.id), ['1', '3']);
  assert.deepEqual(r.singles.map((a) => a.id), ['2', '4']);
});

test('legacySettings: neue Regeln speisen die bestehenden Features', () => {
  const s = RS.legacySettings({ ...seed.personal_rules, monthGoal: 3000 });
  assert.equal(s.maxDailyLoss, 450);
  assert.equal(s.maxTrades, 4);
  assert.equal(s.monthGoal, 3000);
});
