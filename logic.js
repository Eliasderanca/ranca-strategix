/* Ranca Strategix – reine Logik (ohne DOM, ohne Datenbank).
 * Läuft im Browser (window.RS) und in Node (require('./logic.js')) für die Unit-Tests.
 * Regeln und Zahlen kommen immer als Parameter herein (Konfiguration), nie als Konstanten.
 */
(function (root, factory) {
  const RS = factory();
  if (typeof module === 'object' && module.exports) module.exports = RS;
  else root.RS = RS;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const RS = {};
  const TZ = 'Europe/Berlin';

  /* ---------- Zeit: immer Europe/Berlin ---------- */
  const dateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  const timeFmt = new Intl.DateTimeFormat('de-DE', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  /** Kalenderdatum in Berlin als YYYY-MM-DD */
  RS.berlinDate = (d = new Date()) => dateFmt.format(d);
  /** Uhrzeit in Berlin als HH:MM */
  RS.berlinTime = (d = new Date()) => timeFmt.format(d);
  /** Millisekunden bis zur nächsten Mitternacht in Berlin (für Sperren „bis 00:00 Uhr“) */
  RS.msUntilBerlinMidnight = (d = new Date()) => {
    const today = RS.berlinDate(d);
    // in 15-Minuten-Schritten vorwärts, bis das Berliner Datum wechselt; dann minutengenau zurück
    let t = d.getTime();
    while (RS.berlinDate(new Date(t)) === today) t += 15 * 60000;
    while (RS.berlinDate(new Date(t - 60000)) !== today) t -= 60000;
    const midnight = t - (new Date(t).getSeconds() * 1000 + new Date(t).getMilliseconds());
    return Math.max(0, midnight - d.getTime());
  };

  /* ---------- Konten, Phasen, Regelsätze ---------- */
  RS.STAGES = ['EVAL', 'FUNDED', 'BREACHED', 'PAYOUT'];
  RS.STAGE_LABEL = { EVAL: 'Eval', FUNDED: 'Funded', BREACHED: 'Verloren', PAYOUT: 'Ausgezahlt' };
  RS.ACTIVE_STAGES = ['EVAL', 'FUNDED'];

  /** Alte Felder (phase/status), damit bestehende Ansichten weiter funktionieren */
  RS.stageToLegacy = (stage) => ({
    phase: stage === 'EVAL' ? 'challenge' : 'funded',
    status: stage === 'BREACHED' ? 'verloren' : stage === 'PAYOUT' ? 'ausbezahlt' : 'aktiv',
  });

  /** Ist ein Konto aktiv (zählt zum Limit gleichzeitiger Konten)? */
  RS.isActive = (acc) => {
    if (!acc) return false;
    if (acc.stage) return RS.ACTIVE_STAGES.includes(acc.stage);
    return !['verloren', 'beendet', 'ausbezahlt'].includes(acc.status || 'aktiv');
  };

  /** Liste "0:2, 1000:3, 2000:5" -> [{min_profit:0,minis:2},...] (sortiert) */
  RS.parseScaling = (text) => {
    if (Array.isArray(text)) return text.slice().sort((a, b) => a.min_profit - b.min_profit);
    const out = String(text || '')
      .split(/[,;\n]+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const m = p.match(/^(-?\d+(?:[.,]\d+)?)\s*[:=]\s*(\d+)$/);
        if (!m) throw new Error(`Ungültige Scaling-Stufe „${p}“. Format: Gewinn:Minis, z. B. 1000:3`);
        return { min_profit: Number(m[1].replace(',', '.')), minis: Number(m[2]) };
      });
    return out.sort((a, b) => a.min_profit - b.min_profit);
  };
  RS.formatScaling = (arr) => (arr || []).map((s) => `${s.min_profit}:${s.minis}`).join(', ');

  /** Erlaubte Minis laut Scaling-Tabelle bei aktuellem Kontogewinn (unter der ersten Stufe gilt die erste Stufe) */
  RS.scalingFor = (rule, profit) => {
    const steps = RS.parseScaling((rule && rule.funded_contract_scaling) || []);
    if (!steps.length) return null;
    let cur = steps[0];
    for (const s of steps) if (profit >= s.min_profit) cur = s;
    const perMini = (rule && rule.micros_per_mini) || 10;
    return { minis: cur.minis, micros: cur.minis * perMini, from: cur.min_profit };
  };

  /**
   * Führt Regelsatz und Konto zusammen. Ergebnis hat die Felder, die die App schon kennt
   * (profitTarget, maxDrawdown, ...), sodass bestehende Berechnungen unverändert bleiben.
   * Ohne Regelsatz kommt das Konto unverändert zurück.
   */
  RS.effectiveAccount = (acc, rule) => {
    if (!acc || !rule) return acc;
    const stage = acc.stage || 'EVAL';
    const evalStage = stage === 'EVAL';
    const fundedStage = stage === 'FUNDED' || stage === 'PAYOUT';
    return {
      ...acc,
      ...RS.stageToLegacy(stage),
      stage,
      ruleName: rule.name,
      firm: rule.firm || acc.firm,
      size: rule.start_balance,
      profitTarget: evalStage ? rule.profit_target_eval : null,
      maxDrawdown: rule.max_drawdown,
      ddType: rule.drawdown_type === 'STATIC' ? 'static' : rule.drawdown_type === 'INTRADAY_TRAILING' ? 'trailing-intraday' : 'trailing-eod',
      ddLock: rule.drawdown_lock === 'start_balance',
      maxDailyLoss: rule.daily_loss_limit,
      dllSoft: rule.daily_loss_type !== 'HARD',
      consistencyPct: evalStage ? rule.eval_consistency_max_pct : null,
      payoutMinDays: fundedStage ? rule.payout_qualifying_days_required : null,
      minDayProfit: fundedStage ? rule.payout_qualifying_day_min : null,
      maxPayout: fundedStage ? rule.payout_cap : null,
      profitSplit: rule.profit_split != null ? rule.profit_split * 100 : acc.profitSplit,
      payoutShare: 100,
      monthlyFee: evalStage ? rule.monthly_fee : 0,
    };
  };

  /** Prüft ein Konto vor dem Speichern. Gibt eine deutsche Fehlermeldung oder null zurück. */
  RS.validateAccount = (acc, allAccounts, maxActive) => {
    if (!acc || !String(acc.name || '').trim()) return 'Bitte einen Kontonamen eingeben.';
    if (acc.stage && !RS.STAGES.includes(acc.stage)) return 'Unbekannte Phase.';
    if (maxActive && RS.isActive(acc)) {
      const others = (allAccounts || []).filter((a) => a.id !== acc.id && RS.isActive(a)).length;
      if (others + 1 > maxActive) return `Es sind schon ${others} Konten aktiv. Erlaubt sind höchstens ${maxActive} gleichzeitig.`;
    }
    return null;
  };

  /** Teilt Konten in Copy-Gruppen und Einzelkonten (Reihenfolge bleibt erhalten) */
  RS.groupAccounts = (accounts) => {
    const groups = new Map();
    const singles = [];
    for (const a of accounts || []) {
      const g = String(a.copy_group || '').trim();
      if (!g) { singles.push(a); continue; }
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(a);
    }
    // Eine „Gruppe“ mit nur einem Konto wird als Einzelkonto gezeigt
    const out = [];
    for (const [name, members] of groups) {
      if (members.length > 1) out.push({ name, members });
      else singles.push(members[0]);
    }
    return { groups: out, singles };
  };

  /** Neue personal_rules auf die alten Einstellungsnamen abbilden, die bestehende Features lesen */
  RS.legacySettings = (pr) => {
    if (!pr) return {};
    const out = {};
    for (const k of ['revengeMin', 'cooldownMin', 'monthGoal', 'goalMonth', 'maxRedDays', 'sessionStart', 'sessionEnd', 'rules']) {
      if (pr[k] != null && pr[k] !== '') out[k] = pr[k];
    }
    if (pr.daily_stop_phase1 != null) out.maxDailyLoss = Math.abs(Number(pr.daily_stop_phase1));
    if (pr.max_trades_per_day != null) out.maxTrades = Number(pr.max_trades_per_day);
    if (pr.max_consecutive_losses != null) out.maxConsec = Number(pr.max_consecutive_losses);
    return out;
  };

  /* ---------- Phase 2: Risk-Engine ---------- */
  const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
  const byTime = (a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''));

  /** Gehört ein Trade zu einem Konto? (alt: accountId, neu: account_ids als Liste) */
  RS.tradeHasAccount = (t, id) => t.accountId === id || (Array.isArray(t.account_ids) && t.account_ids.includes(id));

  /**
   * Trades einer Handelseinheit (Einzelkonto oder Copy-Gruppe).
   * Eine Copy-Gruppe wird identisch gehandelt; gezählt wird über das erste Konto der Gruppe,
   * damit ein Trade nicht doppelt zählt.
   */
  RS.unitTrades = (trades, unitIds) => {
    const lead = unitIds[0];
    return (trades || []).filter((t) => RS.tradeHasAccount(t, lead));
  };

  /** Tages-P&L je Datum, sortiert */
  RS.dailyPnl = (trades) => {
    const m = {};
    for (const t of trades || []) m[t.date] = (m[t.date] || 0) + num(t.pnl);
    return Object.keys(m).sort().map((d) => ({ date: d, pnl: m[d] }));
  };

  /** Die letzten n Handelstage vor einem Datum waren alle rot? */
  RS.redStreakBefore = (trades, date, n = 2) => {
    const days = RS.dailyPnl(trades).filter((d) => d.date < date);
    if (days.length < n) return false;
    return days.slice(-n).every((d) => d.pnl < 0);
  };

  /**
   * Zentrale Risk-Engine für einen Tag und eine Handelseinheit.
   * @param {object} o
   *   date: 'YYYY-MM-DD' (Berlin), trades: alle Trades der Einheit,
   *   pr: personal_rules, account: wirksames Konto (effectiveAccount) oder null,
   *   tilt: {level:'RED'|'YELLOW', reason} aus Phase 3 oder null, now: Date (für die Sperrzeit)
   */
  RS.riskEngine = (o) => {
    const pr = o.pr || {};
    const date = o.date;
    const all = (o.trades || []).slice().sort(byTime);
    const today = all.filter((t) => t.date === date);
    const before = all.filter((t) => t.date < date);
    const dayPnl = today.reduce((s, t) => s + num(t.pnl), 0);
    const wins = today.filter((t) => num(t.pnl) > 0).length;
    const losses = today.filter((t) => num(t.pnl) < 0).length;
    const taken = today.length;
    const profitAtOpen = before.reduce((s, t) => s + num(t.pnl), 0);

    // Risiko-Phase: Phase 2 ab Kontogewinn X (Stand Tagesbeginn, damit sie sich nicht mitten im Tag ändert)
    const phase2 = pr.phase2_from_profit != null && profitAtOpen >= num(pr.phase2_from_profit);
    const redDays = RS.redStreakBefore(all, date, 2);
    let baseRisk = phase2 ? num(pr.risk_per_trade_phase2) : num(pr.risk_per_trade_phase1);
    let riskPhase = phase2 ? 'P2' : 'P1';
    if (redDays && pr.after_two_red_days_risk != null) { baseRisk = num(pr.after_two_red_days_risk); riskPhase = 'RED_DAYS'; }
    const dailyStop = Math.abs(num(phase2 ? pr.daily_stop_phase2 : pr.daily_stop_phase1));

    const remainingToStop = Math.max(0, dailyStop + dayPnl);
    const firmLimit = o.account && o.account.maxDailyLoss ? num(o.account.maxDailyLoss) : null;
    const firmRemaining = firmLimit != null ? Math.max(0, firmLimit + dayPnl) : null;

    // Trades
    const maxTrades = num(pr.max_trades_per_day) || Infinity;
    let tradesLeft = Math.max(0, maxTrades - taken);
    const lastNeedsGreen = !!pr.fourth_trade_requires_green && Number.isFinite(maxTrades) && taken === maxTrades - 1 && dayPnl <= 0;
    if (lastNeedsGreen) tradesLeft = 0;
    const maxLosers = num(pr.max_losing_trades_per_day) || Infinity;

    // Ampel
    const reasons = [];
    const notices = [];
    let status = 'GREEN';
    const red = (r) => { status = 'RED'; reasons.push(r); };
    if (dailyStop && dayPnl <= -dailyStop) red(`Tages-Stop von −${dailyStop} $ erreicht (${dayPnl.toFixed(0)} $).`);
    if (firmLimit != null && dayPnl <= -firmLimit) red(`FTMO-Tageslimit von −${firmLimit} $ erreicht. Konto prüfen.`);
    if (losses >= maxLosers) red(`${losses} Verlusttrades heute. Maximum ist ${maxLosers}.`);
    if (pr.stop_after_two_winners && wins >= 2) red('2 Gewinner heute. Deine Regel: dann ist Schluss.');
    if (Number.isFinite(maxTrades) && taken >= maxTrades) red(`${taken} von ${maxTrades} Trades genutzt.`);
    else if (lastNeedsGreen) red(`Trade ${maxTrades} ist nur erlaubt, wenn der Tag im Plus ist (${dayPnl.toFixed(0)} $).`);
    if (o.tilt && o.tilt.level === 'RED') red(o.tilt.reason || 'Tilt-Sperre nach Verlusttrade.');
    if (status !== 'RED') {
      if (losses >= 1) { status = 'YELLOW'; reasons.push(`${losses} Verlusttrade heute. Ruhig bleiben, nur A-Setups.`); }
      if (dailyStop && -dayPnl >= dailyStop * 0.5) { status = 'YELLOW'; reasons.push(`Schon ${Math.round(-dayPnl / dailyStop * 100)} % deines Tages-Stops verbraucht.`); }
      if (o.tilt && o.tilt.level === 'YELLOW') { status = 'YELLOW'; reasons.push(o.tilt.reason || 'Nur noch halbe Größe.'); }
    }
    if (status === 'RED') tradesLeft = 0;

    // Erlaubtes Risiko: Basis, halbiert bei Tilt-Gelb, nie mehr als bis zum Tages-Stop übrig ist
    const halfSize = !!(o.tilt && o.tilt.level === 'YELLOW');
    let riskPerTrade = halfSize ? baseRisk / 2 : baseRisk;
    if (dailyStop) riskPerTrade = Math.min(riskPerTrade, remainingToStop);
    if (firmRemaining != null) riskPerTrade = Math.min(riskPerTrade, firmRemaining);
    if (status === 'RED') riskPerTrade = 0;
    riskPerTrade = Math.floor(riskPerTrade);

    // Eval-Hinweise wegen Konsistenzregel
    if (o.account && o.account.stage === 'EVAL') {
      if (pr.eval_daily_profit_hard_warning != null && dayPnl >= num(pr.eval_daily_profit_hard_warning)) notices.push({ level: 'warn', text: `Tagesgewinn ${dayPnl.toFixed(0)} $: Die Konsistenzregel wird gefährlich. Jetzt aufhören.` });
      else if (pr.eval_daily_profit_soft_cap != null && dayPnl >= num(pr.eval_daily_profit_soft_cap)) notices.push({ level: 'info', text: `Tagesgewinn ${dayPnl.toFixed(0)} $: Feierabend. Ein zu großer Tag schadet der Konsistenzregel.` });
    }
    if (riskPhase === 'RED_DAYS') notices.push({ level: 'info', text: `Nach 2 roten Tagen gilt heute ${baseRisk} $ Risiko pro Trade.` });

    return {
      date, status, reasons, notices,
      riskPerTrade, baseRisk, riskPhase, halfSize,
      dailyStop, dayPnl, remainingToStop, firmLimit, firmRemaining,
      tradesTaken: taken, tradesLeft, maxTrades: Number.isFinite(maxTrades) ? maxTrades : null,
      wins, losses, profitAtOpen,
      lockedUntilMs: status === 'RED' && o.now ? o.now.getTime() + RS.msUntilBerlinMidnight(o.now) : null,
    };
  };

  const ORDER = { GREEN: 0, YELLOW: 1, RED: 2 };
  /** Gesamtstatus über mehrere Einheiten: der schlechteste zählt (Sperre gilt für die ganze Session) */
  RS.worstStatus = (results) => (results || []).reduce((w, r) => (ORDER[r.status] > ORDER[w] ? r.status : w), 'GREEN');

  /* ---------- Phase 2: Positionsgröße ---------- */
  /**
   * @param {object} o risk ($), stopPoints, usdPerPoint, limit (max. Kontrakte dieses Instruments oder null)
   */
  RS.positionSize = (o) => {
    const risk = num(o.risk), stop = num(o.stopPoints), ppp = num(o.usdPerPoint);
    if (!(stop > 0) || !(ppp > 0)) return { contracts: 0, actualRisk: 0, perContract: 0, targets: [], error: 'Bitte Stopweite in Punkten eingeben.' };
    const perContract = stop * ppp;
    const contracts = Math.max(0, Math.floor((risk + 1e-9) / perContract));
    const actualRisk = contracts * perContract;
    const targets = [2, 3, 4].map((rr) => ({ rr, points: stop * rr, usd: actualRisk * rr }));
    const out = { contracts, actualRisk, perContract, targets, warning: null, error: null };
    if (contracts === 0) out.error = risk > 0 ? `Stop zu weit: 1 Kontrakt riskiert schon ${perContract} $, erlaubt sind ${risk} $.` : 'Heute ist kein Risiko mehr erlaubt.';
    if (o.limit != null && contracts > o.limit) out.warning = `${contracts} Kontrakte liegen über deinem Scaling-Limit von ${o.limit}. Maximal ${o.limit} handeln.`;
    return out;
  };

  /** Scaling-Limit für ein Instrument: Micro-Kontrakte über micros, Mini-Kontrakte über minis */
  RS.contractLimit = (rule, stage, profit, instrument) => {
    if (!rule || !instrument) return null;
    let minis = null;
    if (stage === 'FUNDED') { const s = RS.scalingFor(rule, profit); minis = s ? s.minis : null; }
    else if (stage === 'EVAL' && rule.eval_max_minis) minis = num(rule.eval_max_minis);
    if (minis == null) return null;
    return instrument.type === 'micro' ? minis * (rule.micros_per_mini || 10) : minis;
  };

  return RS;
});
