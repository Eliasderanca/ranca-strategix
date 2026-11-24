// Phase 5: Coach-Kontext, Cockpit-Rechnung, CSV-Import, Abo-Erinnerung, Timeline
const test = require('node:test');
const assert = require('node:assert/strict');
const RS = require('../logic.js');
const seed = require('../config/seed.json');

test('Seed: Coach-Prompt und Schnellfragen aus der Spezifikation', () => {
  const c = seed.coach_config;
  assert.match(c.system_prompt, /kein Ja-Sager/);
  assert.match(c.system_prompt, /Bei Status ROT empfiehlst du niemals einen weiteren Trade/);
  assert.deepEqual(c.quick_questions, ['Ich will gerade revenge-traden', 'Bin ich heute bereit?', 'Analysiere meine Woche', 'Was ist gerade mein größtes Risiko?']);
});

test('buildCoachContext: Profil, Regeln, Engine, letzte 10 Handelstage mit Gefühlen, Konten', () => {
  const days = Array.from({ length: 14 }, (_, i) => ({ date: RS.addDaysStr('2026-12-01', i), pnl_total: i % 2 ? 100 : -50, day_type: i % 2 ? 'WIN_PLAN' : 'LOSS_CONTROLLED', trades_count: 1, rule_breaks: 0 }));
  const trades = [{ date: '2026-12-14', pnl: 100, emotion_before: { emotion: 'gierig', intensity: 8 } }, { date: '2026-12-14', pnl: -50, emotion: 'Frust' }];
  const ctx = RS.buildCoachContext({
    today: '2026-12-14',
    profile: { created_date: '2026-11-21', scores: { loss_tilt: 80, fomo: 30 }, levels: { loss_tilt: 'RED', fomo: 'GREEN' }, top_risks: ['loss_tilt'], triggers: { 'nach 1 Verlust': 3 }, tilt_map: { self_sentence: 'Plattform zu.' } },
    psychCfg: seed.psych_config, pr: seed.personal_rules,
    engine: [{ name: 'A', r: { status: 'RED', reasons: ['Tages-Stop'], notices: [], riskPerTrade: 0, riskPhase: 'P1', dayPnl: -450, remainingToStop: 0, firmRemaining: 550, tradesLeft: 0 } }],
    tradingDays: days, trades,
    accounts: [{ name: 'Pro #1', stage: 'FUNDED', ddLeft: 2500, profit: 800, qualDays: 3, qualNeeded: 5, payoutDate: '2026-12-18' }],
  });
  assert.equal(ctx.traderProfil.scores['Verlust-Tilt'].ampel, 'RED');
  assert.deepEqual(ctx.traderProfil.top3Risiken, ['Verlust-Tilt']);
  assert.equal(ctx.traderProfil.tiltMap['Mein Satz an mich selbst, wenn ich auf Stufe 5 bin:'], 'Plattform zu.');
  assert.equal(ctx.persoenlicheRegeln.risk_per_trade_phase1, 150);
  assert.equal(ctx.gesamtStatusHeute, 'RED');
  assert.equal(ctx.letzte10Handelstage.length, 10);
  assert.equal(ctx.letzte10Handelstage[0].datum, '2026-12-14');
  assert.deepEqual(ctx.letzte10Handelstage[0].gefuehle, ['gierig 8', 'frust']);
  assert.equal(ctx.konten[0].payoutTage, '3/5');
  assert.equal(RS.buildCoachContext({ today: '2026-12-01' }).traderProfil, 'noch kein Profil-Test gemacht');
});

test('parseDeNumber: deutsches Format mit Komma, Tausenderpunkt und €', () => {
  assert.equal(RS.parseDeNumber('1.234,56 €'), 1234.56);
  assert.equal(RS.parseDeNumber('139,00€'), 139);
  assert.equal(RS.parseDeNumber('-50,5 €'), -50.5);
  assert.equal(RS.parseDeNumber('1.500'), 1500);
  assert.equal(RS.parseDeNumber('85'), 85);
  assert.equal(RS.parseDeNumber(''), null);
  assert.equal(RS.parseDeNumber('abc'), null);
});

test('parseDeDate: 24.11.2026, 24.11.26 und ISO', () => {
  assert.equal(RS.parseDeDate('24.11.2026'), '2026-11-24');
  assert.equal(RS.parseDeDate('3.1.26'), '2026-01-03');
  assert.equal(RS.parseDeDate('2026-07-15'), '2026-07-15');
  assert.equal(RS.parseDeDate('Juli'), null);
});

test('parseCostCsv: Semikolon, deutsche Zahlen, fehlende Summen werden berechnet, Fehler je Zeile', () => {
  const csv = '﻿Account;Firm;Date;Eval Fee;Reset;Eval Status;Activation Fee;Total Spend;Payout;Net;Status;Notes\n'
    + 'Apex 50K #1;Apex;03.07.2026;35,00 €;;Bestanden;85,00 €;120,00 €;1.250,00 €;1.130,00 €;Ausgezahlt;"Juli, gut"\n'
    + 'TPT 50K;TPT;15.08.2026;150,00 €;99,00 €;Nicht bestanden;;;;;Verloren;\n'
    + 'Kaputt;X;irgendwann;1;;;;;;;;\n';
  const r = RS.parseCostCsv(csv);
  assert.equal(r.rows.length, 2);
  assert.deepEqual(r.rows[0], { account: 'Apex 50K #1', firm: 'Apex', date: '2026-07-03', eval_fee: 35, reset: 0, eval_status: 'Bestanden', activation_fee: 85, total_spend: 120, payout: 1250, net: 1130, status: 'Ausgezahlt', notes: 'Juli, gut' });
  assert.equal(r.rows[1].total_spend, 249);
  assert.equal(r.rows[1].net, -249);
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /Zeile 4/);
  assert.match(RS.parseCostCsv('a,b,c\n1,2,3').errors[0], /Kopfzeile/);
});

test('cockpitSummary: Fees, Reserve, Payouts brutto/netto, ROI, Break-even', () => {
  const s = RS.cockpitSummary({
    costs: [{ date: '2026-11-25', total_spend: 129 }, { date: '2026-12-05', total_spend: 129 }, { date: '2026-07-01', total_spend: 999 }],
    payoutsUsd: [{ date: '2026-12-19', amount: 1000 }], budgetEur: 400, fxUsdPerEur: 1.08, split: 0.9, from: '2026-11-20', to: '2026-12-31',
  });
  assert.equal(s.feesEur, 258);
  assert.equal(s.reserveEur, 142);
  assert.equal(s.payoutGrossUsd, 1000);
  assert.equal(s.payoutNetUsd, 900);
  assert.equal(s.payoutNetEur, 833.33);
  assert.equal(s.roiPct, 223);
  assert.equal(s.breakEvenEur, 286.67);
  assert.equal(s.breakEvenUsd, 309.6);
  assert.equal(s.breakEvenLeftEur, 0);
  const none = RS.cockpitSummary({ costs: [], payoutsUsd: [], budgetEur: 400, fxUsdPerEur: 1.08, split: 0.9 });
  assert.equal(none.roiPct, null);
  assert.equal(none.reserveEur, 400);
});

test('renewalReminders: 3 Tage vorher bis zum Tag, nur aktive Eval-Konten', () => {
  const acc = [
    { id: 'a', name: 'Eval', stage: 'EVAL', renewal_date: '2026-12-28' },
    { id: 'b', name: 'Funded', stage: 'FUNDED', renewal_date: '2026-12-28' },
    { id: 'c', name: 'Verloren', stage: 'BREACHED', renewal_date: '2026-12-28' },
    { id: 'd', name: 'Ohne Datum', stage: 'EVAL' },
  ];
  assert.deepEqual(RS.renewalReminders(acc, '2026-12-24', 3), []);
  assert.deepEqual(RS.renewalReminders(acc, '2026-12-25', 3).map((r) => [r.id, r.daysLeft]), [['a', 3]]);
  assert.deepEqual(RS.renewalReminders(acc, '2026-12-28', 3).map((r) => r.daysLeft), [0]);
  assert.deepEqual(RS.renewalReminders(acc, '2026-12-29', 3), []);
});

test('milestoneState: erledigt, läuft, kommt', () => {
  const m = { from: '2026-12-01', to: '2026-12-11' };
  assert.equal(RS.milestoneState(m, '2026-11-30'), 'next');
  assert.equal(RS.milestoneState(m, '2026-12-01'), 'now');
  assert.equal(RS.milestoneState(m, '2026-12-11'), 'now');
  assert.equal(RS.milestoneState(m, '2026-12-12'), 'done');
  assert.equal(RS.milestoneState({ to: '2026-11-30' }, '2026-11-30'), 'now');
});

test('parseCostCsv: Übersichtszeilen oben, „-   €“ und leere Zeilen; costKpis rechnet Pass- und Payout-Quote', () => {
  const csv = 'Prop Firm Spend vs Payout Tracker;;;;;;;;;;;\n;;;;;;;;;;;\nTotal Spend; 400,00 € ;;;;;;;;;;\n'
    + 'Account #;Firm;Date; Eval Fee ; Reset ; Eval Status ; Activation Fee ; Total Spend ; Payout $ ; Net ;Status;Notes\n'
    + 'TPT1 - 25K;TPT;2.1.2026; 76,52 € ; -   € ; DD Hit ; -   € ; 76,52 € ; -   € ;-76,52 € ;Breached;\n'
    + 'TPT2 - 25K;tpt;02.03.26; 80,00 € ;; Passed ;; 80,00 € ; 711,00 € ; 631,00 € ;Breached;Payout\n'
    + 'TPT2 FUNDED;TPT;29.10.2026; -   € ;; Passed ; 404,00 € ; 404,00 € ;;-404,00 € ;Breached;\n'
    + 'FTMO 150K;;29.10.2026; 242,00 € ;; DDHit ;; 242,00 € ;;-242,00 € ;Breached;\n;;;;;;;  ;;  ;;\n';
  const r = RS.parseCostCsv(csv);
  assert.deepEqual(r.errors, []);
  assert.equal(r.rows.length, 4);
  assert.equal(r.rows[0].reset, 0);
  assert.equal(r.rows[1].firm, 'TPT'); assert.equal(r.rows[3].firm, 'FTMO'); assert.equal(r.rows[3].eval_status, 'DD Hit');
  const k = RS.costKpis(r.rows);
  assert.deepEqual([k.evals, k.passed, k.ddHits, k.payoutCount], [3, 1, 2, 1]);
  assert.equal(k.spend, 802.52); assert.equal(k.payouts, 711); assert.equal(k.activationSpend, 404);
  assert.equal(k.payoutRateFunded, 1); assert.equal(k.byFirm.TPT.evals, 2); assert.equal(k.byMonth['2026-10'].spend, 646);
});
