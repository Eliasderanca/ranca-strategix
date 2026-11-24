// Phase 4: Trader-Profil (Testauswertung, Realitäts-Check) und Mindset (Tagestyp, Textauswahl)
const test = require('node:test');
const assert = require('node:assert/strict');
const RS = require('../logic.js');
const seed = require('../config/seed.json');
const PC = seed.psych_config;
const MSG = seed.mindset_messages;

const allAnswers = (v) => Object.fromEntries(Array.from({ length: 40 }, (_, i) => [i + 1, v]));

test('Seed: 40 Aussagen in 9 Dimensionen, umgekehrte Items laut Spezifikation', () => {
  const items = PC.dimensions.flatMap((d) => d.items);
  assert.equal(PC.dimensions.length, 9);
  assert.equal(items.length, 40);
  assert.deepEqual(items.map((i) => i.n), Array.from({ length: 40 }, (_, i) => i + 1));
  assert.deepEqual(items.filter((i) => i.reverse).map((i) => i.n), [4, 9, 18, 27, 28, 30, 36, 39, 40]);
  assert.equal(PC.triggers.length, 15);
  assert.equal(PC.tilt_map.length, 5);
});

test('Seed: 21 Mindset-Texte in 8 Kategorien mit Bibelstelle', () => {
  assert.equal(MSG.length, 21);
  const cats = [...new Set(MSG.map((m) => m.category))];
  assert.deepEqual(cats, ['PRE_SESSION', 'WIN_PLAN', 'WIN_RULEBREAK', 'LOSS_CONTROLLED', 'LOSS_RULEBREAK', 'NO_TRADE', 'STREAK_WIN', 'STREAK_LOSS']);
  assert.ok(MSG.every((m) => m.text && m.bible_ref && m.id));
  assert.equal(new Set(MSG.map((m) => m.id)).size, 21);
});

test('scoreProfile: alles 3 → 50 (GELB) in jeder Dimension, Umkehrung neutral bei 3', () => {
  const r = RS.scoreProfile(allAnswers(3), PC);
  assert.equal(r.complete, true);
  for (const k of Object.keys(r.scores)) { assert.equal(r.scores[k], 50); assert.equal(r.levels[k], 'YELLOW'); }
});

test('scoreProfile: Umkehrung 6 − Antwort, Score-Formel (Mittelwert − 1) / 4 × 100', () => {
  // Verlust-Tilt: Items 1,2,3,5 = 5, Item 4 (R) = 1 -> nach Umkehrung alles 5 -> 100
  const a = allAnswers(3); Object.assign(a, { 1: 5, 2: 5, 3: 5, 4: 1, 5: 5 });
  assert.equal(RS.scoreProfile(a, PC).scores.loss_tilt, 100);
  // Item 4 = 5 (kann gut abhaken) -> 1 nach Umkehrung: Mittel (5+5+5+1+5)/5 = 4.2 -> 80
  a[4] = 5; assert.equal(RS.scoreProfile(a, PC).scores.loss_tilt, 80);
  // Zustand/Umfeld: 37=1, 38=1, 39(R)=5, 40(R)=5 -> alles 1 -> 0
  Object.assign(a, { 37: 1, 38: 1, 39: 5, 40: 5 });
  assert.equal(RS.scoreProfile(a, PC).scores.state, 0);
  assert.equal(RS.scoreProfile(a, PC).levels.state, 'GREEN');
});

test('profileLevel: Grenzen 39/40 und 64/65', () => {
  const th = PC.thresholds;
  assert.equal(RS.profileLevel(0, th), 'GREEN');
  assert.equal(RS.profileLevel(39, th), 'GREEN');
  assert.equal(RS.profileLevel(40, th), 'YELLOW');
  assert.equal(RS.profileLevel(64, th), 'YELLOW');
  assert.equal(RS.profileLevel(65, th), 'RED');
  assert.equal(RS.profileLevel(100, th), 'RED');
});

test('scoreProfile: fehlende Antworten werden gemeldet', () => {
  const a = allAnswers(3); delete a[7]; delete a[40];
  const r = RS.scoreProfile(a, PC);
  assert.equal(r.complete, false);
  assert.deepEqual(r.missing, [7, 40]);
});

test('topRisks: höchste drei, grüne Dimensionen nie', () => {
  const scores = { loss_tilt: 80, fomo: 70, payout: 66, state: 50, fear: 10 };
  const levels = Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, RS.profileLevel(v, PC.thresholds)]));
  assert.deepEqual(RS.topRisks(scores, levels), ['loss_tilt', 'fomo', 'payout']);
  assert.deepEqual(RS.topRisks({ fear: 10, state: 20 }, { fear: 'GREEN', state: 'GREEN' }), []);
});

test('dayType: alle fünf Typen und die Stop-Grenze', () => {
  assert.equal(RS.dayType({ trades_count: 0 }, 450), 'NO_TRADE');
  assert.equal(RS.dayType({ trades_count: 2, pnl_total: 300, rule_breaks: 0 }, 450), 'WIN_PLAN');
  assert.equal(RS.dayType({ trades_count: 2, pnl_total: 300, rule_breaks: 1 }, 450), 'WIN_RULEBREAK');
  assert.equal(RS.dayType({ trades_count: 2, pnl_total: -450, rule_breaks: 0 }, 450), 'LOSS_CONTROLLED'); // genau am Stop
  assert.equal(RS.dayType({ trades_count: 2, pnl_total: -451, rule_breaks: 0 }, 450), 'LOSS_RULEBREAK'); // überschritten
  assert.equal(RS.dayType({ trades_count: 1, pnl_total: -50, rule_breaks: 1 }, 450), 'LOSS_RULEBREAK');
  assert.equal(RS.dayType({ trades_count: 1, pnl_total: 0, rule_breaks: 0 }, 450), 'LOSS_CONTROLLED');
});

test('dayFlags: 3 grüne in Folge, 2 rote in Folge, Tage ohne Trades zählen nicht', () => {
  const D = (date, pnl, n = 1) => ({ date, pnl_total: pnl, trades_count: n });
  const days = [D('2026-12-01', 100), D('2026-12-02', 50), D('2026-12-03', 0, 0), D('2026-12-04', 20)];
  assert.deepEqual(RS.dayFlags(days, '2026-12-04'), ['STREAK_WIN']);
  assert.deepEqual(RS.dayFlags(days, '2026-12-02'), []);
  const red = [D('2026-12-07', 100), D('2026-12-08', -50), D('2026-12-09', -20)];
  assert.deepEqual(RS.dayFlags(red, '2026-12-09'), ['STREAK_LOSS']);
  assert.deepEqual(RS.dayFlags(red, '2026-12-08'), []);
  assert.deepEqual(RS.dayFlags(red, '2026-12-10'), []); // an diesem Tag nicht gehandelt
});

test('pickMessage: gleiche Auswahl am gleichen Tag, keine Wiederholung innerhalb von 10 Tagen', () => {
  const a = RS.pickMessage(MSG, 'PRE_SESSION', [], '2026-12-03');
  assert.equal(RS.pickMessage(MSG, 'PRE_SESSION', [], '2026-12-03').id, a.id);
  // 4 Tage hintereinander: 4 verschiedene Texte
  const hist = []; const seen = new Set();
  for (const d of ['2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04']) { const m = RS.pickMessage(MSG, 'PRE_SESSION', hist, d); seen.add(m.id); hist.push({ date: d, message_id: m.id }); }
  assert.equal(seen.size, 4);
  // Tag 5: alle 4 gesperrt -> der am längsten nicht gezeigte (vom 01.12.)
  assert.equal(RS.pickMessage(MSG, 'PRE_SESSION', hist, '2026-12-05').id, hist[0].message_id);
  // nach mehr als 10 Tagen wieder frei
  const old = [{ date: '2026-11-20', message_id: 'no-trade-1' }];
  const ok = new Set(); for (let i = 0; i < 30; i++) ok.add(RS.pickMessage(MSG, 'NO_TRADE', old, RS.addDaysStr('2026-12-01', i)).id);
  assert.ok(ok.has('no-trade-1'));
  // genau 10 Tage vorher gezeigt: noch gesperrt
  assert.equal(RS.pickMessage(MSG, 'NO_TRADE', [{ date: '2026-11-21', message_id: 'no-trade-1' }], '2026-12-01').id, 'no-trade-2');
});

test('pickMessage: Overconfidence-Pflicht an Gewinntagen nimmt nur markierte Texte', () => {
  for (let i = 0; i < 20; i++) {
    const d = RS.addDaysStr('2026-12-01', i);
    assert.ok(['win-plan-1', 'win-plan-2'].includes(RS.pickMessage(MSG, 'WIN_PLAN', [], d, { forceTag: 'overconfidence' }).id));
    assert.equal(RS.pickMessage(MSG, 'WIN_RULEBREAK', [], d, { forceTag: 'overconfidence' }).id, 'win-rulebreak-2');
  }
});

test('bibleUrl: Leerzeichen raus, Gedankenstrich zu Bindestrich, Link zu bibleserver.com', () => {
  assert.equal(RS.bibleUrl('2. Timotheus 1,7'), 'https://www.bibleserver.com/LUT/2.Timotheus1%2C7');
  assert.equal(RS.bibleUrl('Jakobus 4,13–15'), 'https://www.bibleserver.com/LUT/Jakobus4%2C13-15');
  assert.equal(RS.bibleUrl('Psalm 37,7'), 'https://www.bibleserver.com/LUT/Psalm37%2C7');
});

test('realityCheck: erst ab 20 Trades, dann Abweichungen erkennen', () => {
  // Disziplin wird nur geprüft, wenn Trades Regel-Angaben (followed_plan / ruleBreaks) haben
  const rOf = (t) => t.result_r;
  const scores = { loss_tilt: 20, overconfidence: 30, discipline: 80 };
  const levels = { loss_tilt: 'GREEN', overconfidence: 'GREEN', discipline: 'RED' };
  const few = Array.from({ length: 19 }, (_, i) => ({ date: '2026-12-01', time: `15:${10 + i}`, pnl: 10, result_r: 0.1 }));
  assert.equal(RS.realityCheck({ scores, levels, trades: few, rOf }).ready, false);
  assert.equal(RS.realityCheck({ scores, levels, trades: few, rOf }).need, 1);
  // 10 Tage: Verlust (1 Kontrakt), dann Trade mit 2 Kontrakten und −1R, dann Gewinn, Gewinn, weiterer Trade nach 2 Gewinnern
  const tr = [];
  for (let d = 1; d <= 10; d++) {
    const date = `2026-12-${String(d).padStart(2, '0')}`;
    tr.push({ date, time: '15:30', pnl: -100, result_r: -1, contracts: 1 });
    tr.push({ date, time: '15:40', pnl: -100, result_r: -1, contracts: 2 });
    tr.push({ date, time: '15:50', pnl: 200, result_r: 2, contracts: 1 });
    tr.push({ date, time: '16:00', pnl: 200, result_r: 2, contracts: 1 });
    tr.push({ date, time: '16:10', pnl: 50, result_r: 0.5, contracts: 1, followed_plan: true });
  }
  const r = RS.realityCheck({ scores, levels, trades: tr, rOf, winnersStop: true });
  assert.equal(r.ready, true);
  const lt = r.items.find((x) => x.key === 'loss_tilt');
  assert.equal(lt.bad, true);
  assert.equal(lt.verdict, 'overrated'); // grün eingeschätzt, Daten schlecht
  const oc = r.items.find((x) => x.key === 'overconfidence');
  assert.equal(oc.facts.tradesAfterTarget, 10);
  assert.equal(oc.verdict, 'overrated');
  const di = r.items.find((x) => x.key === 'discipline');
  assert.equal(di.facts.breaksPerWeek, 0);
  assert.equal(di.verdict, 'underrated'); // rot eingeschätzt, Daten gut
});
