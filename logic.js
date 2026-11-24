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
      consistencyMode: rule.consistency_mode || null,
      minDays: evalStage && rule.eval_min_days != null ? rule.eval_min_days : acc.minDays,
      dllMode: rule.daily_loss_type || null,
      startBalance: rule.start_balance,
      payoutBufferUsd: fundedStage && !acc.plus && rule.payout_buffer != null ? num(rule.payout_buffer) : null,
      fundedDailyProfitCap: fundedStage ? rule.funded_daily_profit_cap || null : null,
      flatByEt: rule.flat_by_et || null,
      ddAfterPayout: rule.drawdown_after_payout || null,
      payoutMinDays: fundedStage ? rule.payout_qualifying_days_required : null,
      minDayProfit: fundedStage ? rule.payout_qualifying_day_min : null,
      maxPayout: fundedStage ? rule.payout_cap : null,
      profitSplit: acc.plus && rule.profit_split_plus != null ? rule.profit_split_plus * 100 : rule.profit_split != null ? rule.profit_split * 100 : acc.profitSplit,
      payoutShare: 100,
      monthlyFee: evalStage ? rule.monthly_fee : 0,
    };
  };

  /**
   * Profitziel unter Konsistenzregel. Modus RAISE_TARGET (z. B. TakeProfitTrader): Ist der beste Tag zu groß,
   * steigt das Ziel auf bestDay ÷ pct (bei 50 %: doppelter bester Tag). Sonst bleibt das Ziel.
   */
  RS.effectiveTarget = (target, bestDay, pct, mode) => {
    target = num(target); if (!pct || mode !== 'RAISE_TARGET' || !(bestDay > 0)) return target;
    return Math.max(target, Math.ceil(bestDay / (num(pct) / 100)));
  };

  /** Bricht ein Tagesverlust-Limit das Konto? HARD: immer. SOFT: nie. SOFT_ABOVE_START: nur, wenn der Kontostand unter dem Start liegt. */
  RS.dllIsHard = (mode, profitAfter) => mode === 'HARD' || (mode === 'SOFT_ABOVE_START' && num(profitAfter) < 0);

  /** Auszahlbarer Betrag mit Puffer (TakeProfitTrader): Gewinn minus bisherige Auszahlungen minus Puffer, nie negativ. */
  RS.withdrawable = (profit, paidOut, buffer) => Math.max(0, Math.round((num(profit) - num(paidOut) - num(buffer)) * 100) / 100);

  /** Uhrzeit in New York (HH:MM) für ein Datum in Berliner Zeit umrechnen, z. B. 16:55 ET -> 22:55 */
  RS.etToBerlin = (date, hhmm) => {
    const [y, mo, d] = String(date).split('-').map(Number), [h, mi] = String(hhmm).split(':').map(Number);
    const ms = RS.zonedToMs(y, mo, d, h, mi, 0, 'America/New_York');
    return new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ms));
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
    const firmName = (o.account && o.account.firm) || 'Firma';
    // Drawdown-Rest: EOD-Trailing über die Tagesschlüsse vor heute, mit Lock beim Start
    let ddRemaining = null;
    if (o.account && o.account.maxDrawdown) {
      const dd = num(o.account.maxDrawdown);
      const paid = (o.account.payouts || []).filter((p) => p.date <= date).reduce((x, p) => x + num(p.amount), 0);
      let floor = -dd;
      if (paid > 0 && o.account.ddAfterPayout === 'start_balance') floor = paid; // Grenze fest beim Startkapital; Gewinn-Konto zählt ohne Auszahlungen
      else if (o.account.ddType !== 'static') {
        const closes = {}; let bal = 0; before.forEach((t) => { bal += num(t.pnl); closes[t.date] = bal; });
        const peak = Math.max(0, ...Object.values(closes));
        floor = peak - dd; if (o.account.ddLock) floor = Math.min(floor, 0);
      }
      ddRemaining = Math.max(0, Math.round(profitAtOpen + dayPnl - floor));
    }
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
    if (firmLimit != null && dayPnl <= -firmLimit) {
      const mode = o.account.dllMode || (o.account.dllSoft ? 'SOFT' : 'HARD');
      red(RS.dllIsHard(mode, profitAtOpen + dayPnl) ? `${firmName}-Tageslimit von −${firmLimit} $ erreicht. Das Konto ist nach den Firmenregeln verloren. Konto prüfen.` : `${firmName}-Tageslimit von −${firmLimit} $ erreicht. Handel pausiert bis zur nächsten Session.`);
    }
    if (ddRemaining != null && ddRemaining <= 0) red(`Drawdown-Grenze von ${firmName} erreicht. Konto prüfen.`);
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
    if (ddRemaining != null) riskPerTrade = Math.min(riskPerTrade, ddRemaining);
    if (status === 'RED') riskPerTrade = 0;
    riskPerTrade = Math.floor(riskPerTrade);

    // Eval-Hinweise wegen Konsistenzregel
    if (o.account && o.account.stage === 'EVAL') {
      if (pr.eval_daily_profit_hard_warning != null && dayPnl >= num(pr.eval_daily_profit_hard_warning)) notices.push({ level: 'warn', text: `Tagesgewinn ${dayPnl.toFixed(0)} $: Die Konsistenzregel wird gefährlich. Jetzt aufhören.` });
      else if (pr.eval_daily_profit_soft_cap != null && dayPnl >= num(pr.eval_daily_profit_soft_cap)) notices.push({ level: 'info', text: `Tagesgewinn ${dayPnl.toFixed(0)} $: Feierabend. Ein zu großer Tag schadet der Konsistenzregel.` });
    }
    if (o.account && o.account.fundedDailyProfitCap && dayPnl >= num(o.account.fundedDailyProfitCap) * 0.8) notices.push({ level: 'warn', text: `Tagesgewinn ${dayPnl.toFixed(0)} $: Bei ${o.account.fundedDailyProfitCap} $ schließt ${firmName} alle Positionen und pausiert den Tag.` });
    if (o.account && o.account.flatByEt) notices.push({ level: 'info', text: `${firmName} stellt um ${RS.etToBerlin(date, o.account.flatByEt)} Uhr (Berlin) automatisch glatt.` });
    if (riskPhase === 'RED_DAYS') notices.push({ level: 'info', text: `Nach 2 roten Tagen gilt heute ${baseRisk} $ Risiko pro Trade.` });

    return {
      date, status, reasons, notices,
      riskPerTrade, baseRisk, riskPhase, halfSize,
      dailyStop, dayPnl, remainingToStop, firmLimit, firmRemaining, ddRemaining, firmName,
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

  /* ---------- Phase 3: Journal, Trading-Tage, Tilt, Statistik ---------- */

  /** R eines Trades: eingetragenes result_r, sonst altes Feld r, sonst aus P&L / (Stop × $/Punkt × Kontrakte) */
  RS.tradeR = (t, usdPerPoint) => {
    if (t.result_r != null && t.result_r !== '') return num(t.result_r);
    if (t.r != null && t.r !== '') return num(t.r);
    const risk = num(t.stop_points) * num(usdPerPoint) * num(t.contracts);
    return risk > 0 ? Math.round((num(t.pnl) / risk) * 100) / 100 : null;
  };

  /** Anzahl Regelbrüche eines Trades: „Plan nicht befolgt“ zählt mindestens 1, dazu markierte Regelbrüche */
  RS.ruleBreakCount = (t) => Math.max((t.ruleBreaks || []).length, t.followed_plan === false ? 1 : 0);

  /** Emotion vor dem Trade (neu: {emotion,intensity}; alt: Text in t.emotion) */
  RS.emotionBefore = (t) => (t.emotion_before && t.emotion_before.emotion) || (t.emotion ? String(t.emotion).toLowerCase() : null);

  /**
   * Tagesdatensatz für `trading_days`. Copy-Gruppen-Trades zählen einmal.
   * extra: { readiness_score, mood_evening, reflection_text, day_type }
   */
  RS.buildTradingDay = (date, trades, extra = {}) => {
    const t = (trades || []).filter((x) => x.date === date);
    return {
      date,
      pnl_total: Math.round(t.reduce((s, x) => s + num(x.pnl), 0) * 100) / 100,
      trades_count: t.length,
      wins: t.filter((x) => num(x.pnl) > 0).length,
      losses: t.filter((x) => num(x.pnl) < 0).length,
      rule_breaks: t.reduce((s, x) => s + RS.ruleBreakCount(x), 0),
      day_type: extra.day_type != null ? extra.day_type : null,
      readiness_score: extra.readiness_score != null ? extra.readiness_score : null,
      mood_evening: extra.mood_evening != null ? extra.mood_evening : null,
      reflection_text: extra.reflection_text || '',
    };
  };

  /** Tilt-Frühwarnung: Antworten -> Ampel. cfg: {red_urge:7, yellow_urge:5} */
  RS.tiltResult = (ans, cfg = {}) => {
    const redAt = cfg.red_urge != null ? cfg.red_urge : 7;
    const yellowAt = cfg.yellow_urge != null ? cfg.yellow_urge : 5;
    const urge = num(ans.urge);
    if (ans.a_setup === false) return { level: 'RED', reason: 'Der nächste Trade wäre kein A-Setup. Tilt-Sperre.' };
    if (urge >= redAt) return { level: 'RED', reason: `Drang zum Zurückholen ${urge}/10. Tilt-Sperre.` };
    if (urge >= yellowAt) return { level: 'YELLOW', reason: `Drang zum Zurückholen ${urge}/10: nur noch halbe Größe.` };
    return { level: 'GREEN', reason: '' };
  };

  /** Wirksamer Tilt-Status einer Einheit an einem Tag: ein ROT bleibt, sonst zählt der letzte Check */
  RS.tiltFor = (checks, date, unitIds) => {
    const mine = (checks || []).filter((c) => c.date === date && (!unitIds || !unitIds.length || !(c.account_ids || []).length || (c.account_ids || []).some((id) => unitIds.includes(id))))
      .sort((a, b) => num(a.created_ms) - num(b.created_ms));
    const red = mine.find((c) => c.level === 'RED');
    if (red) return { level: 'RED', reason: red.reason };
    const last = mine[mine.length - 1];
    return last && last.level === 'YELLOW' ? { level: 'YELLOW', reason: last.reason } : null;
  };

  /** Läuft gerade eine Pflicht-Pause? Gibt den Check zurück oder null */
  RS.tiltPending = (checks, nowMs) => (checks || []).find((c) => num(c.pause_until_ms) > nowMs) || null;

  /** Overconfidence-Hinweis bei euphorisch/gierig ab Intensität 7 */
  RS.overconfidence = (eb, cfg = {}) => {
    if (!eb || !eb.emotion) return false;
    const list = cfg.emotions || ['euphorisch', 'gierig'];
    return list.includes(eb.emotion) && num(eb.intensity) >= (cfg.min_intensity != null ? cfg.min_intensity : 7);
  };

  /** Kalenderwoche nach ISO 8601 als 'YYYY-Www' */
  RS.isoWeek = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    const day = dt.getUTCDay() || 7;
    dt.setUTCDate(dt.getUTCDate() + 4 - day);
    const yStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
    const wk = Math.ceil(((dt - yStart) / 86400000 + 1) / 7);
    return `${dt.getUTCFullYear()}-W${String(wk).padStart(2, '0')}`;
  };

  /** Kennzahlen einer Trade-Gruppe: Anzahl, Winrate, Ø R (nur Trades mit R), Ø $ */
  RS.groupStats = (trades, rOf) => {
    const n = trades.length;
    const wins = trades.filter((t) => num(t.pnl) > 0).length;
    const rs = trades.map(rOf).filter((r) => r != null);
    return {
      n,
      winrate: n ? wins / n : null,
      avgR: rs.length ? Math.round((rs.reduce((s, r) => s + r, 0) / rs.length) * 100) / 100 : null,
      avgPnl: n ? Math.round((trades.reduce((s, t) => s + num(t.pnl), 0) / n) * 100) / 100 : null,
      nR: rs.length,
    };
  };
  const groupBy = (arr, keyFn) => { const m = new Map(); for (const x of arr) { const k = keyFn(x); if (k == null) continue; if (!m.has(k)) m.set(k, []); m.get(k).push(x); } return m; };
  const sortedTrades = (trades) => (trades || []).slice().sort(byTime);

  /** Winrate und Ø R nach Emotion vor dem Trade */
  RS.statsByEmotion = (trades, rOf) => [...groupBy(trades || [], RS.emotionBefore)].map(([k, v]) => ({ key: k, ...RS.groupStats(v, rOf) })).sort((a, b) => b.n - a.n);

  /** Trade direkt nach einem Verlust (am selben Tag) gegenüber allen anderen */
  RS.afterLossStats = (trades, rOf) => {
    const after = [], other = [];
    for (const [, day] of groupBy(sortedTrades(trades), (t) => t.date)) {
      day.forEach((t, i) => ((i > 0 && num(day[i - 1].pnl) < 0) ? after : other).push(t));
    }
    return { afterLoss: RS.groupStats(after, rOf), others: RS.groupStats(other, rOf) };
  };

  /** Ergebnis von Trade 1, 2, 3, 4 (und mehr) des Tages */
  RS.statsByTradeIndex = (trades, rOf, max = 4) => {
    const buckets = Array.from({ length: max }, () => []);
    for (const [, day] of groupBy(sortedTrades(trades), (t) => t.date)) day.forEach((t, i) => buckets[Math.min(i, max - 1)].push(t));
    return buckets.map((b, i) => ({ index: i + 1, label: i === max - 1 ? `${max}+` : String(i + 1), ...RS.groupStats(b, rOf) }));
  };

  /** Regelbrüche pro Kalenderwoche (lückenlos, die letzten `weeks` Wochen bis `untilDate`) */
  RS.ruleBreaksByWeek = (trades, untilDate, weeks = 8) => {
    const counts = {};
    for (const t of trades || []) { const w = RS.isoWeek(t.date); counts[w] = (counts[w] || 0) + RS.ruleBreakCount(t); }
    const out = [];
    const [y, m, d] = untilDate.split('-').map(Number);
    for (let i = weeks - 1; i >= 0; i--) {
      const dt = new Date(Date.UTC(y, m - 1, d - i * 7));
      const ds = dt.toISOString().slice(0, 10);
      const w = RS.isoWeek(ds);
      out.push({ week: w, breaks: counts[w] || 0 });
    }
    return out;
  };

  /** Ø R je Setup (neues Feld setup, sonst Name aus dem Playbook über setupName) */
  RS.statsBySetup = (trades, rOf, setupName) => [...groupBy(trades || [], (t) => t.setup || (setupName && setupName(t)) || 'Ohne Setup')]
    .map(([k, v]) => ({ key: k, ...RS.groupStats(v, rOf) })).sort((a, b) => (b.avgR ?? -99) - (a.avgR ?? -99));

  /* ---------- Phase 4: Trader-Profil ---------- */

  /** Datum ± Tage (YYYY-MM-DD, kalendarisch, ohne Zeitzonen-Effekte) */
  RS.addDaysStr = (dateStr, n) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
  };

  /** Ampel eines Dimensions-Scores (0–100): bis green_max GRÜN, bis yellow_max GELB, sonst ROT */
  RS.profileLevel = (score, th = {}) => {
    const g = th.green_max != null ? th.green_max : 39, y = th.yellow_max != null ? th.yellow_max : 64;
    return score <= g ? 'GREEN' : score <= y ? 'YELLOW' : 'RED';
  };

  /**
   * Teil A auswerten. answers: {1:1..5, ..., 40:1..5}. Umgekehrte Items: 6 − Antwort.
   * Score = (Mittelwert − 1) / 4 × 100, auf ganze Zahlen gerundet.
   */
  RS.scoreProfile = (answers, cfg) => {
    const scores = {}, levels = {}, missing = [];
    for (const dim of cfg.dimensions) {
      const vals = [];
      for (const it of dim.items) {
        const a = Number(answers && answers[it.n]);
        if (!(a >= 1 && a <= 5)) { missing.push(it.n); continue; }
        vals.push(it.reverse ? 6 - a : a);
      }
      if (!vals.length) continue;
      const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
      scores[dim.key] = Math.round(((mean - 1) / 4) * 100);
      levels[dim.key] = RS.profileLevel(scores[dim.key], cfg.thresholds);
    }
    return { scores, levels, complete: missing.length === 0, missing };
  };

  /** Die n größten Risiken (nur GELB/ROT), höchster Score zuerst */
  RS.topRisks = (scores, levels, n = 3) => Object.keys(scores)
    .filter((k) => levels[k] !== 'GREEN')
    .sort((a, b) => scores[b] - scores[a])
    .slice(0, n);

  /**
   * Teil D: Selbsteinschätzung gegen echte Daten (ab minTrades Trades).
   * Liefert je geprüfter Dimension: Datenbefund und ob die Einschätzung zu gut („overrated“) oder zu streng („underrated“) ist.
   * o: { scores, levels, trades, rOf, dayTargets: {date: $}, winnersStop: true/false, minTrades }
   */
  RS.realityCheck = (o) => {
    const trades = sortedTrades(o.trades);
    if (trades.length < (o.minTrades || 20)) return { ready: false, need: (o.minTrades || 20) - trades.length, items: [] };
    const items = [];
    const verdict = (lvl, bad) => (bad && lvl !== 'RED' ? 'overrated' : !bad && lvl === 'RED' ? 'underrated' : null);
    // Verlust-Tilt: R nach Verlust und Größenänderung nach Verlust
    if (o.scores.loss_tilt != null) {
      const al = RS.afterLossStats(trades, o.rOf);
      const after = [], other = [];
      for (const [, day] of groupBy(trades, (t) => t.date)) day.forEach((t, i) => ((i > 0 && num(day[i - 1].pnl) < 0) ? after : other).push(t));
      const avgC = (a) => { const c = a.map((t) => num(t.contracts)).filter((x) => x > 0); return c.length ? c.reduce((s, x) => s + x, 0) / c.length : null; };
      const ca = avgC(after), co = avgC(other);
      const sizeUp = ca != null && co != null && co > 0 ? ca / co : null;
      const rDiff = al.afterLoss.avgR != null && al.others.avgR != null ? al.afterLoss.avgR - al.others.avgR : null;
      const bad = (rDiff != null && rDiff <= -0.3) || (sizeUp != null && sizeUp >= 1.2);
      items.push({ key: 'loss_tilt', score: o.scores.loss_tilt, level: o.levels.loss_tilt, bad, verdict: verdict(o.levels.loss_tilt, bad),
        facts: { afterLossR: al.afterLoss.avgR, othersR: al.others.avgR, afterLossN: al.afterLoss.n, sizeRatio: sizeUp != null ? Math.round(sizeUp * 100) / 100 : null } });
    }
    // Overconfidence: Trades nach Erreichen des Tagesziels (oder nach 2 Gewinnern)
    if (o.scores.overconfidence != null) {
      let afterTarget = 0, daysReached = 0;
      for (const [date, day] of groupBy(trades, (t) => t.date)) {
        const target = o.dayTargets && o.dayTargets[date];
        let pnl = 0, wins = 0, reachedAt = -1;
        day.forEach((t, i) => { pnl += num(t.pnl); if (num(t.pnl) > 0) wins++; if (reachedAt < 0 && ((target && pnl >= target) || (o.winnersStop && wins >= 2))) reachedAt = i; });
        if (reachedAt >= 0) { daysReached++; afterTarget += day.length - 1 - reachedAt; }
      }
      const bad = afterTarget >= 2;
      items.push({ key: 'overconfidence', score: o.scores.overconfidence, level: o.levels.overconfidence, bad, verdict: verdict(o.levels.overconfidence, bad), facts: { tradesAfterTarget: afterTarget, daysReached } });
    }
    // Disziplin: Regelbrüche pro Woche
    if (o.scores.discipline != null) {
      const weeks = groupBy(trades, (t) => RS.isoWeek(t.date));
      const total = trades.reduce((s, t) => s + RS.ruleBreakCount(t), 0);
      const perWeek = weeks.size ? Math.round((total / weeks.size) * 10) / 10 : 0;
      const bad = perWeek >= 1;
      items.push({ key: 'discipline', score: o.scores.discipline, level: o.levels.discipline, bad, verdict: verdict(o.levels.discipline, bad), facts: { breaksPerWeek: perWeek, weeks: weeks.size } });
    }
    return { ready: true, need: 0, items };
  };

  /* ---------- Phase 4: Mindset ---------- */

  /**
   * Tagestyp. day: {trades_count, pnl_total, rule_breaks}; dailyStop: positiver Betrag (z. B. 450).
   * Ein Tag mit Trades und genau 0 $ zählt wie ein Verlusttag (kontrolliert oder mit Regelbruch).
   */
  RS.dayType = (day, dailyStop) => {
    if (!day || !num(day.trades_count)) return 'NO_TRADE';
    const pnl = num(day.pnl_total), breaks = num(day.rule_breaks);
    if (pnl > 0) return breaks > 0 ? 'WIN_RULEBREAK' : 'WIN_PLAN';
    const overStop = dailyStop ? -pnl > Math.abs(dailyStop) : false;
    return breaks > 0 || overStop ? 'LOSS_RULEBREAK' : 'LOSS_CONTROLLED';
  };

  /** Serien-Flags bis einschließlich `date`: STREAK_WIN (3+ grüne Handelstage in Folge), STREAK_LOSS (2+ rote) */
  RS.dayFlags = (days, date) => {
    const list = (days || []).filter((d) => d.date <= date && num(d.trades_count) > 0).sort((a, b) => a.date.localeCompare(b.date));
    if (!list.length || list[list.length - 1].date !== date) return [];
    let g = 0, r = 0;
    for (let i = list.length - 1; i >= 0 && num(list[i].pnl_total) > 0; i--) g++;
    for (let i = list.length - 1; i >= 0 && num(list[i].pnl_total) < 0; i--) r++;
    const out = [];
    if (g >= 3) out.push('STREAK_WIN');
    if (r >= 2) out.push('STREAK_LOSS');
    return out;
  };

  /** Deterministischer Zufall aus einem Text (gleiches Datum = gleiche Auswahl) */
  RS.seededRandom = (seed) => {
    let h = 2166136261;
    for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };

  /**
   * Mindset-Text wählen: zufällig aus der Kategorie, kein Text, der in den letzten `days` Tagen gezeigt wurde.
   * Sind alle gesperrt, nimmt sie den am längsten nicht gezeigten. forceTag: nur Texte mit diesem Tag
   * (falls die Kategorie keinen hat: aus allen Kategorien).
   * history: [{date, message_id}]
   */
  RS.pickMessage = (messages, category, history, date, opts = {}) => {
    const days = opts.days != null ? opts.days : 10;
    let pool = (messages || []).filter((m) => m.category === category);
    if (opts.forceTag) {
      const tagged = pool.filter((m) => (m.tags || []).includes(opts.forceTag));
      pool = tagged.length ? tagged : (messages || []).filter((m) => (m.tags || []).includes(opts.forceTag));
    }
    if (!pool.length) return null;
    const from = RS.addDaysStr(date, -days);
    const lastShown = {};
    for (const h of history || []) if (h.date < date) lastShown[h.message_id] = lastShown[h.message_id] > h.date ? lastShown[h.message_id] : h.date;
    const free = pool.filter((m) => !(lastShown[m.id] && lastShown[m.id] >= from));
    const rnd = RS.seededRandom(`${date}|${category}|${opts.slot || ''}`);
    if (free.length) return free[Math.floor(rnd() * free.length)];
    return pool.slice().sort((a, b) => (lastShown[a.id] || '').localeCompare(lastShown[b.id] || ''))[0];
  };

  /** Link zur Bibelstelle bei bibleserver.com (Lutherbibel 2017) */
  RS.bibleUrl = (ref) => {
    const clean = String(ref || '').replace(/\s+/g, '').replace(/[–—]/g, '-');
    return `https://www.bibleserver.com/LUT/${encodeURIComponent(clean)}`;
  };

  /* ---------- Phase 5: Coach-Kontext ---------- */

  /**
   * Kontext, der vor jeder Coach-Antwort mitgeschickt wird.
   * o: { profile, psychCfg, pr, engine: [{name, r}], tradingDays, trades, accounts: [{name, stage, ddLeft, qualDays, qualNeeded, profit, profitTarget, payoutDate}], today }
   */
  RS.buildCoachContext = (o) => {
    const p = o.profile, cfg = o.psychCfg || { dimensions: [], tilt_map: [] };
    const dimName = (k) => (cfg.dimensions.find((d) => d.key === k) || {}).name || k;
    const days = (o.tradingDays || []).filter((d) => d.date <= o.today).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
    const emoOf = (date) => (o.trades || []).filter((t) => t.date === date).map((t) => { const e = RS.emotionBefore(t); return e ? (t.emotion_before && t.emotion_before.intensity ? `${e} ${t.emotion_before.intensity}` : e) : null; }).filter(Boolean);
    return {
      heute: o.today,
      traderProfil: p ? {
        testVom: p.created_date || String(p.created_at || '').slice(0, 10),
        scores: Object.fromEntries(Object.entries(p.scores || {}).map(([k, v]) => [dimName(k), { score: v, ampel: (p.levels || {})[k] }])),
        top3Risiken: (p.top_risks || []).map(dimName),
        trigger: p.triggers || {},
        tiltMap: Object.fromEntries((cfg.tilt_map || []).filter((q) => p.tilt_map && p.tilt_map[q.key]).map((q) => [q.label, p.tilt_map[q.key]])),
      } : 'noch kein Profil-Test gemacht',
      persoenlicheRegeln: o.pr || {},
      riskEngineHeute: (o.engine || []).map((u) => ({
        einheit: u.name, status: u.r.status, gruende: u.r.reasons, hinweise: (u.r.notices || []).map((n) => n.text),
        erlaubtesRisikoProTrade: u.r.riskPerTrade, risikoPhase: u.r.riskPhase, pnlHeute: u.r.dayPnl,
        bisTagesStop: u.r.remainingToStop, bisFtmoTageslimit: u.r.firmRemaining, tradesUebrig: u.r.tradesLeft,
      })),
      gesamtStatusHeute: RS.worstStatus((o.engine || []).map((u) => u.r)),
      letzte10Handelstage: days.map((d) => ({ datum: d.date, pnl: d.pnl_total, tagestyp: d.day_type, trades: d.trades_count, regelbrueche: d.rule_breaks, readiness: d.readiness_score, stimmungAbend: d.mood_evening, gefuehle: emoOf(d.date) })),
      konten: (o.accounts || []).map((a) => ({ name: a.name, phase: a.stage || a.phase, abstandDrawdown: a.ddLeft, gewinn: a.profit, profitZiel: a.profitTarget || null, payoutTage: a.qualNeeded ? `${a.qualDays}/${a.qualNeeded}` : null, naechsterPayout: a.payoutDate || null })),
    };
  };

  /* ---------- Phase 5: Dezember-Cockpit ---------- */

  /** Deutsche Zahl „1.234,56 €“ / „-50“ / „“ -> Zahl oder null */
  RS.parseDeNumber = (s) => {
    if (s == null) return null;
    let x = String(s).replace(/[€$\s ]/g, '');
    if (!x) return null;
    const neg = /^\(.*\)$/.test(x) || /^-/.test(x);
    x = x.replace(/[()\-+]/g, '');
    if (!x) return null; // „-   €“ = leer
    if (x.includes(',')) x = x.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(x)) x = x.replace(/\./g, '');
    const n = Number(x);
    return Number.isFinite(n) ? (neg ? -n : n) : null;
  };

  /** Datum „24.11.2026“, „24.11.26“ oder „2026-11-24“ -> 'YYYY-MM-DD' oder null */
  RS.parseDeDate = (s) => {
    const t = String(s || '').trim();
    let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
    if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return null;
  };

  /**
   * CSV der Kosten-Historie (Trennzeichen „;“). Spalten: Account, Firm, Date, Eval Fee, Reset, Eval Status,
   * Activation Fee, Total Spend, Payout, Net, Status, Notes. Fehlt Total Spend, wird es aus den Gebühren summiert;
   * fehlt Net, ist es Payout − Total Spend. Rückgabe: { rows, errors }
   */
  RS.parseCostCsv = (text) => {
    let lines = String(text || '').replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.replace(/[;\s]/g, ''));
    // Übersichtszeilen oberhalb der Tabelle (z. B. „Total Spend; 4.347,91 €“) überspringen: Kopfzeile suchen
    const hi = lines.findIndex((l) => /(^|;)\s*account[^;]*;\s*firm\s*;\s*date\s*;/i.test(l));
    if (hi > 0) lines = lines.slice(hi);
    if (lines.length < 2) return { rows: [], errors: ['Keine Datenzeilen gefunden.'] };
    const split = (l) => { const out = []; let cur = '', q = false; for (const ch of l) { if (ch === '"') { q = !q; continue; } if (ch === ';' && !q) { out.push(cur.trim()); cur = ''; continue; } cur += ch; } out.push(cur.trim()); return out; };
    const norm = (h) => h.toLowerCase().replace(/[^a-z]/g, '');
    const head = split(lines[0]).map(norm);
    const col = { account: 'account', firm: 'firm', date: 'date', eval_fee: 'evalfee', reset: 'reset', eval_status: 'evalstatus', activation_fee: 'activationfee', total_spend: 'totalspend', payout: 'payout', net: 'net', status: 'status', notes: 'notes' };
    const idx = Object.fromEntries(Object.entries(col).map(([k, h]) => [k, head.indexOf(h)]));
    const errors = [];
    if (idx.account < 0 || idx.date < 0) return { rows: [], errors: ['Kopfzeile nicht erkannt. Erwartet u. a. „Account;Firm;Date;…“ mit Semikolon.'] };
    const rows = [];
    lines.slice(1).forEach((l, i) => {
      const c = split(l); const get = (k) => (idx[k] >= 0 ? c[idx[k]] : '');
      const date = RS.parseDeDate(get('date'));
      if (!date) { errors.push(`Zeile ${i + 2}: Datum „${get('date')}“ nicht erkannt.`); return; }
      const fee = RS.parseDeNumber(get('eval_fee')) || 0, reset = RS.parseDeNumber(get('reset')) || 0, act = RS.parseDeNumber(get('activation_fee')) || 0;
      const total = RS.parseDeNumber(get('total_spend')); const payout = RS.parseDeNumber(get('payout')) || 0;
      const totalSpend = total != null ? total : Math.round((fee + reset + act) * 100) / 100;
      const net = RS.parseDeNumber(get('net'));
      const FIRMS = { tpt: 'TPT', apex: 'Apex', ftmo: 'FTMO' };
      let firm = get('firm'); if (!firm && /ftmo/i.test(get('account'))) firm = 'FTMO'; firm = FIRMS[firm.toLowerCase()] || firm;
      const es = get('eval_status').replace(/\s+/g, ' ').trim(), esN = /dd ?hit/i.test(es) ? 'DD Hit' : /pass/i.test(es) ? 'Passed' : es;
      rows.push({ account: get('account'), firm, date, eval_fee: fee, reset, eval_status: esN, activation_fee: act,
        total_spend: totalSpend, payout, net: net != null ? net : Math.round((payout - totalSpend) * 100) / 100, status: get('status'), notes: get('notes') });
    });
    return { rows, errors };
  };

  /**
   * Jahres-KPIs aus der Kosten-Historie (Prop-Firm-Ausgaben vs. Payouts, Beträge in €).
   * Eval = Zeile mit Eval-Gebühr oder mit Credits bezahlt. Bestanden = Eval mit Status „Passed“. Funded-Konten = bestandene Evals.
   */
  RS.costKpis = (rows) => {
    const r2 = (x) => Math.round(x * 100) / 100;
    const all = rows || [];
    const isEval = (x) => num(x.eval_fee) > 0 || !!x.credits; // auch kostenlose Evals (z. B. Reset mit TPT-Credits)
    const passed = (x) => isEval(x) && /pass/i.test(x.eval_status || '');
    const ddHit = (x) => isEval(x) && /dd ?hit/i.test(x.eval_status || '');
    const spend = all.reduce((s, x) => s + num(x.total_spend), 0), payouts = all.reduce((s, x) => s + num(x.payout), 0);
    const evals = all.filter(isEval).length, pass = all.filter(passed).length, payoutCount = all.filter((x) => num(x.payout) > 0).length;
    const group = (keyFn) => {
      const o = {};
      all.forEach((x) => { const k = keyFn(x); const g = o[k] || (o[k] = { evals: 0, passed: 0, ddHits: 0, spend: 0, payouts: 0, payoutCount: 0 });
        g.evals += isEval(x) ? 1 : 0; g.passed += passed(x) ? 1 : 0; g.ddHits += ddHit(x) ? 1 : 0; g.spend += num(x.total_spend); g.payouts += num(x.payout); g.payoutCount += num(x.payout) > 0 ? 1 : 0; });
      Object.values(o).forEach((g) => { g.spend = r2(g.spend); g.payouts = r2(g.payouts); g.net = r2(g.payouts - g.spend); g.passRate = g.evals ? g.passed / g.evals : null; });
      return o;
    };
    return {
      rows: all.length, spend: r2(spend), payouts: r2(payouts), net: r2(payouts - spend), roiPct: spend ? Math.round(((payouts - spend) / spend) * 1000) / 10 : null,
      evals, passed: pass, ddHits: all.filter(ddHit).length, passRate: evals ? pass / evals : null,
      payoutCount, payoutRateEval: evals ? payoutCount / evals : null, payoutRateFunded: pass ? payoutCount / pass : null,
      avgEvalCost: evals ? r2(all.filter(isEval).reduce((s, x) => s + num(x.eval_fee), 0) / evals) : null,
      costPerPass: pass ? r2(spend / pass) : null, costPerPayout: payoutCount ? r2(spend / payoutCount) : null,
      activationSpend: r2(all.reduce((s, x) => s + num(x.activation_fee), 0)), resetSpend: r2(all.reduce((s, x) => s + num(x.reset), 0)),
      byFirm: group((x) => x.firm || '–'), byMonth: group((x) => String(x.date).slice(0, 7)),
    };
  };

  /**
   * Budget-Übersicht. Kosten in €, Payouts der Konten in $ (brutto, vor Split).
   * o: { costs: [{date,total_spend}], payoutsUsd: [{date,amount}], budgetEur, fxUsdPerEur, split, from, to }
   */
  RS.cockpitSummary = (o) => {
    const inP = (d) => (!o.from || d >= o.from) && (!o.to || d <= o.to);
    const fx = num(o.fxUsdPerEur) || 1, split = o.split != null ? num(o.split) : 0.9;
    const feesEur = Math.round((o.costs || []).filter((c) => inP(c.date)).reduce((s, c) => s + num(c.total_spend), 0) * 100) / 100;
    const grossUsd = Math.round((o.payoutsUsd || []).filter((p) => inP(p.date)).reduce((s, p) => s + num(p.amount), 0) * 100) / 100;
    const netUsd = Math.round(grossUsd * split * 100) / 100;
    const netEur = Math.round((netUsd / fx) * 100) / 100;
    const breakEvenEur = split ? Math.round((feesEur / split) * 100) / 100 : null;
    return {
      budgetEur: num(o.budgetEur), feesEur, reserveEur: Math.round((num(o.budgetEur) - feesEur) * 100) / 100,
      payoutGrossUsd: grossUsd, payoutNetUsd: netUsd, payoutNetEur: netEur,
      roiPct: feesEur > 0 ? Math.round(((netEur - feesEur) / feesEur) * 1000) / 10 : null,
      breakEvenEur, breakEvenUsd: breakEvenEur != null ? Math.round(breakEvenEur * fx * 100) / 100 : null,
      breakEvenLeftEur: breakEvenEur != null ? Math.max(0, Math.round((breakEvenEur - grossUsd / fx) * 100) / 100) : null,
    };
  };

  /** Kündigungs-Erinnerung: Eval-Konten mit Verlängerungsdatum, `daysBefore` Tage vorher bis zum Tag selbst */
  RS.renewalReminders = (accounts, today, daysBefore = 3) => (accounts || [])
    .filter((a) => a.renewal_date && (a.stage || 'EVAL') === 'EVAL' && RS.isActive(a))
    .filter((a) => today >= RS.addDaysStr(a.renewal_date, -daysBefore) && today <= a.renewal_date)
    .map((a) => ({ id: a.id, name: a.name, renewal_date: a.renewal_date, daysLeft: Math.round((Date.parse(a.renewal_date) - Date.parse(today)) / 86400000) }));

  /** Meilenstein-Status relativ zu heute: 'done' | 'now' | 'next' */
  RS.milestoneState = (m, today) => {
    const from = m.from || m.date || null, to = m.to || m.date;
    if (to < today) return 'done';
    if ((!from || from <= today) && today <= to) return 'now'; // reine Frist („bis …“) läuft bis zum Stichtag
    return 'next';
  };

  /* ---------- Import: Tradovate-Performance-Export ---------- */

  /** Zeitzonen-Versatz in Minuten für einen Zeitpunkt (z. B. Europe/Berlin im Winter: +60) */
  const tzOffsetMin = (ms, tz) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(new Date(ms)).filter((x) => x.type !== 'literal').map((x) => [x.type, Number(x.value)]));
    return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - ms) / 60000;
  };
  /** Wanduhrzeit in Zeitzone tz -> Zeitpunkt (ms). Funktioniert auch an Tagen der Zeitumstellung. */
  RS.zonedToMs = (y, mo, d, h, mi, s, tz) => {
    const guess = Date.UTC(y, mo - 1, d, h, mi, s || 0);
    let ms = guess - tzOffsetMin(guess, tz) * 60000;
    ms = guess - tzOffsetMin(ms, tz) * 60000;
    return ms;
  };

  /** Zeitstempel aus dem Export („11/14/2026 15:31:05“, „2026-11-14 15:31:05“, „14.11.2026 15:31“) -> {date, time, ms} in Berlin */
  RS.importTimestamp = (ts, tz = 'Europe/Berlin') => {
    const t = String(ts || '').trim();
    let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
    let y, mo, d, h, mi, s;
    if (m) { [, mo, d, y, h, mi, s] = m.map((x, i) => (i && i < 7 ? Number(x) : x)); if (y < 100) y += 2000; if (m[7]) { if (/pm/i.test(m[7]) && h < 12) h += 12; if (/am/i.test(m[7]) && h === 12) h = 0; } }
    else if ((m = t.match(/^(\d{4})-(\d{2})-(\d{2})[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?/))) { [, y, mo, d, h, mi, s] = m.map(Number); }
    else if ((m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?/))) { [, d, mo, y, h, mi, s] = m.map(Number); }
    else return null;
    const ms = RS.zonedToMs(y, mo, d, h, mi, s || 0, tz);
    return { ms, date: RS.berlinDate(new Date(ms)), time: RS.berlinTime(new Date(ms)) };
  };

  /** US-Geldbetrag aus Tradovate: „$1,234.50“, „$(25.00)“, „-25.00“ */
  RS.parseUsd = (s) => {
    if (s == null) return null;
    let x = String(s).trim();
    if (!x) return null;
    const neg = /^\(.*\)$/.test(x.replace(/\$/g, '')) || /^-/.test(x) || /^\$-/.test(x) || /\(\s*[\d.,]+\s*\)/.test(x);
    x = x.replace(/[$()\s,+-]/g, '');
    const n = Number(x);
    return Number.isFinite(n) ? (neg ? -n : n) : null;
  };

  /** Basis-Instrument aus Kontraktsymbol: MNQZ6 / MNQZ26 / MNQ 12-26 -> MNQ */
  RS.instrumentRoot = (sym) => {
    const s = String(sym || '').trim().toUpperCase().split(/\s+/)[0];
    const m = s.match(/^([A-Z0-9]+?)[FGHJKMNQUVXZ]\d{1,2}$/);
    return m ? m[1] : s;
  };

  /**
   * Tradovate „Performance“-CSV (Account Reports → Performance → Export).
   * Jede Zeile ist ein geschlossenes Kauf/Verkauf-Paar. Teil-Ausstiege derselben Einstiegs-Order
   * werden zu einem Trade zusammengefasst. P&L ist brutto (ohne Gebühren).
   * Rückgabe: { trades, errors, format }
   */
  RS.parseTradovatePerformance = (text, tz = 'Europe/Berlin') => {
    const lines = String(text || '').replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return { trades: [], errors: ['Die Datei enthält keine Trades.'], format: null };
    const split = (l) => { const out = []; let cur = '', q = false; for (const ch of l) { if (ch === '"') { q = !q; continue; } if (ch === ',' && !q) { out.push(cur.trim()); cur = ''; continue; } cur += ch; } out.push(cur.trim()); return out; };
    const head = split(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z]/g, ''));
    const ix = (n) => head.indexOf(n);
    const need = ['symbol', 'qty', 'buyprice', 'sellprice', 'pnl', 'boughttimestamp', 'soldtimestamp'];
    const miss = need.filter((n) => ix(n) < 0);
    if (miss.length) return { trades: [], errors: [`Das ist kein Tradovate-Performance-Export (es fehlen: ${miss.join(', ')}).`], format: null };
    const errors = [], groups = new Map();
    lines.slice(1).forEach((l, i) => {
      const c = split(l), g = (n) => c[ix(n)];
      const bought = RS.importTimestamp(g('boughttimestamp'), tz), sold = RS.importTimestamp(g('soldtimestamp'), tz);
      const qty = Number(g('qty')), pnl = RS.parseUsd(g('pnl')), bp = Number(String(g('buyprice')).replace(/,/g, '')), sp = Number(String(g('sellprice')).replace(/,/g, ''));
      if (!bought || !sold || !(qty > 0) || pnl == null) { errors.push(`Zeile ${i + 2} übersprungen: unvollständige Angaben.`); return; }
      const long = bought.ms <= sold.ms;
      const entryFill = ix('buyfillid') >= 0 ? (long ? g('buyfillid') : g('sellfillid')) : null;
      const exitFill = ix('buyfillid') >= 0 ? (long ? g('sellfillid') : g('buyfillid')) : null;
      const entry = long ? bought : sold, exit = long ? sold : bought;
      const key = entryFill ? `${g('symbol')}|${entryFill}` : `${g('symbol')}|${entry.ms}|${long ? 'L' : 'S'}|${long ? bp : sp}`;
      if (!groups.has(key)) groups.set(key, { symbol: g('symbol'), long, entry, exitMs: exit.ms, exitTime: exit.time, qty: 0, pnl: 0, entryPrice: long ? bp : sp, exitNotional: 0, fills: [] });
      const t = groups.get(key);
      t.qty += qty; t.pnl += pnl; t.exitNotional += (long ? sp : bp) * qty; t.fills.push(exitFill || String(exit.ms));
      if (exit.ms > t.exitMs) { t.exitMs = exit.ms; t.exitTime = exit.time; }
    });
    const trades = [...groups.entries()].map(([key, t]) => ({
      date: t.entry.date, time: t.entry.time, exit_time: t.exitTime, entry_ms: t.entry.ms,
      symbol: t.symbol, instrument: RS.instrumentRoot(t.symbol), direction: t.long ? 'Long' : 'Short', contracts: t.qty,
      entry_price: t.entryPrice, exit_price: Math.round((t.exitNotional / t.qty) * 10000) / 10000,
      pnl_gross: Math.round(t.pnl * 100) / 100, import_key: 'tv:' + key + '|' + t.fills.sort().join('+'),
    })).sort((a, b) => a.entry_ms - b.entry_ms);
    return { trades, errors, format: 'tradovate-performance' };
  };

  /** Netto-P&L: brutto minus Gebühr je Kontrakt (Round Turn) aus der Instrument-Konfiguration */
  RS.applyCommission = (t, instruments) => {
    const ins = (instruments || []).find((i) => i.id === t.instrument);
    const fee = Math.round(num(ins && ins.commission_rt) * num(t.contracts) * 100) / 100;
    return { ...t, fees: fee, pnl: Math.round((num(t.pnl_gross) - fee) * 100) / 100 };
  };

  /**
   * Import mit vorhandenen Trades abgleichen.
   * - schon importiert (gleicher import_key) -> 'skip'
   * - manuell erfasster Trade gleiches Datum, gleiches Konto, gleiche Richtung, Einstieg ±toleranceMin -> 'merge'
   *   (Zahlen aus dem Export, Setup/Gefühle/Notizen bleiben)
   * - sonst -> 'new'
   */
  RS.planImport = (imported, existing, accountIds, toleranceMin = 5) => {
    const ids = accountIds || [];
    const sameAcc = (t) => (!ids.length ? !t.accountId && !(t.account_ids || []).length : ids.some((id) => RS.tradeHasAccount(t, id)));
    const keys = new Set((existing || []).map((t) => t.import_key).filter(Boolean));
    const used = new Set();
    const toMin = (hhmm) => { const [h, m] = String(hhmm || '').split(':').map(Number); return Number.isFinite(h) ? h * 60 + (m || 0) : null; };
    return (imported || []).map((t) => {
      if (keys.has(t.import_key)) return { trade: t, action: 'skip' };
      let best = null, bestD = Infinity;
      for (const e of existing || []) {
        if (used.has(e.id) || e.import_key || e.date !== t.date || !sameAcc(e)) continue;
        const dir = e.direction || e.side;
        if (dir && dir !== t.direction) continue;
        const a = toMin(e.time), b = toMin(t.time);
        if (a == null || b == null) continue;
        const dd = Math.abs(a - b);
        if (dd <= toleranceMin && dd < bestD) { best = e; bestD = dd; }
      }
      if (best) { used.add(best.id); return { trade: t, action: 'merge', targetId: best.id }; }
      return { trade: t, action: 'new' };
    });
  };

  /* ---------- Simulator: Eval und Payout (Monte Carlo) ---------- */

  /**
   * R-Ziehung. source: {list:[R,...]} (Bootstrap aus echten Trades) oder {winrate:0..1, avgWin:R, avgLoss:R (negativ)}
   */
  RS.rSampler = (source) => {
    if (source && Array.isArray(source.list) && source.list.length) { const l = source.list; return (rnd) => l[Math.floor(rnd() * l.length)]; }
    const wr = num(source && source.winrate), w = num(source && source.avgWin) || 1, ls = -Math.abs(num(source && source.avgLoss) || 1);
    return (rnd) => (rnd() < wr ? w : ls);
  };

  /**
   * Ein simulierter Handelstag nach deinen persönlichen Regeln.
   * state: {profit (Kontogewinn zu Tagesbeginn), redDays (rote Tage in Folge)}; rule: Regelsatz; pr: personal_rules
   * Rückgabe: {pnl, trades, wins, losses, breach, minProfit (tiefster Kontostand im Tag, relativ)}
   */
  RS.simDay = (state, pr, rule, stage, sample, rnd, opt = {}) => {
    const phase2 = pr.phase2_from_profit != null && state.profit >= num(pr.phase2_from_profit);
    let base = phase2 ? num(pr.risk_per_trade_phase2) : num(pr.risk_per_trade_phase1);
    if (state.redDays >= 2 && pr.after_two_red_days_risk != null) base = num(pr.after_two_red_days_risk);
    if (opt.riskOverride) base = opt.riskOverride;
    const stop = Math.abs(num(phase2 ? pr.daily_stop_phase2 : pr.daily_stop_phase1)) || Infinity;
    const maxT = num(opt.maxTrades || pr.max_trades_per_day) || 4, maxL = num(pr.max_losing_trades_per_day) || Infinity;
    const firm = rule && rule.daily_loss_limit ? num(rule.daily_loss_limit) : Infinity;
    const soft = stage === 'EVAL' && pr.eval_daily_profit_soft_cap != null ? num(pr.eval_daily_profit_soft_cap) : Infinity;
    let pnl = 0, n = 0, w = 0, l = 0, minP = state.profit, breach = null;
    while (n < maxT) {
      if (l >= maxL || (pr.stop_after_two_winners && w >= 2) || pnl <= -stop || pnl >= soft) break;
      if (pr.fourth_trade_requires_green && n === maxT - 1 && pnl <= 0) break;
      const risk = Math.min(base, stop - -pnl, firm + pnl);
      if (!(risk > 0)) break;
      const res = sample(rnd) * risk;
      pnl += res; n++; if (res > 0) w++; else if (res < 0) l++;
      minP = Math.min(minP, state.profit + pnl);
      if (pnl <= -firm) { if (RS.dllIsHard(rule.daily_loss_type || 'HARD', state.profit + pnl)) breach = 'DAILY'; break; }
      if (state.ddLevel != null && state.profit + pnl <= state.ddLevel) { breach = 'DRAWDOWN'; break; }
    }
    return { pnl: Math.round(pnl * 100) / 100, trades: n, wins: w, losses: l, breach, minProfit: minP };
  };

  /** Drawdown-Grenze relativ zum Startkapital: EOD-Trailing mit Lock beim Start */
  RS.ddLevel = (rule, peakEod) => {
    if (!rule || !rule.max_drawdown) return null;
    const lvl = num(peakEod) - num(rule.max_drawdown);
    if (rule.drawdown_type === 'STATIC') return -num(rule.max_drawdown);
    return rule.drawdown_lock === 'start_balance' ? Math.min(lvl, 0) : lvl;
  };

  /**
   * Eval simulieren. o: {pr, rule, sample, days (Handelstage), runs, seed, riskOverride, minDays}
   * Bestanden: Gewinn ≥ Ziel, bester Tag ≤ Konsistenz-%, mindestens minDays Handelstage.
   */
  RS.simulateEval = (o) => {
    const runs = o.runs || 5000, rnd = RS.seededRandom(o.seed || 'eval'), target = num(o.rule.profit_target_eval), cons = num(o.rule.eval_consistency_max_pct) || 100;
    let pass = 0, breach = 0, open = 0, consBlocked = 0; const passDays = [], finals = [], paths = [];
    for (let r = 0; r < runs; r++) {
      const st = { profit: 0, redDays: 0, peak: 0 }; let best = 0, res = 'OPEN', d = 0, traded = 0, hitTargetEarly = false; const path = [0];
      for (d = 1; d <= o.days; d++) {
        st.ddLevel = RS.ddLevel(o.rule, st.peak);
        const day = RS.simDay(st, o.pr, o.rule, 'EVAL', o.sample, rnd, o);
        st.profit += day.pnl; if (day.trades) traded++; path.push(Math.round(st.profit));
        if (day.breach) { res = 'BREACH'; break; }
        best = Math.max(best, day.pnl); st.peak = Math.max(st.peak, st.profit);
        st.redDays = day.pnl < 0 ? st.redDays + 1 : day.pnl > 0 ? 0 : st.redDays;
        if (st.profit >= target) {
          if (best / st.profit * 100 <= cons && traded >= (o.minDays || 1)) { res = 'PASS'; break; }
          hitTargetEarly = true;
        }
      }
      if (res === 'PASS') { pass++; passDays.push(d); } else if (res === 'BREACH') breach++; else { open++; if (hitTargetEarly) consBlocked++; }
      finals.push(st.profit); if (paths.length < 8) paths.push({ res, path });
    }
    passDays.sort((a, b) => a - b);
    const hist = Array.from({ length: o.days }, (_, i) => passDays.filter((x) => x === i + 1).length);
    return { runs, pPass: pass / runs, pBreach: breach / runs, pOpen: open / runs, pConsistencyBlocked: consBlocked / runs,
      medianDays: passDays.length ? passDays[Math.floor(passDays.length / 2)] : null, passHist: hist,
      avgFinal: Math.round(finals.reduce((s, x) => s + x, 0) / runs), paths };
  };

  /**
   * Funded-Phase bis zum ersten Payout simulieren. o: {pr, rule, sample, days, runs, seed, riskOverride}
   * Payout-fähig: payout_qualifying_days_required Tage mit ≥ payout_qualifying_day_min. Auszahlung: min(Gewinn, Cap) × Split.
   */
  RS.simulateFunded = (o) => {
    const runs = o.runs || 5000, rnd = RS.seededRandom(o.seed || 'funded');
    const need = num(o.rule.payout_qualifying_days_required) || 0, qmin = num(o.rule.payout_qualifying_day_min) || 0;
    const cap = num(o.rule.payout_cap) || Infinity, split = o.rule.profit_split != null ? num(o.rule.profit_split) : 0.9;
    const buffer = o.rule.payout_buffer != null ? num(o.rule.payout_buffer) : null;
    let ok = 0, breach = 0; const payouts = [], daysTo = [];
    for (let r = 0; r < runs; r++) {
      const st = { profit: 0, redDays: 0, peak: 0 }; let q = 0, res = 'OPEN', d, firstOk = null;
      for (d = 1; d <= o.days; d++) {
        st.ddLevel = RS.ddLevel(o.rule, st.peak);
        const day = RS.simDay(st, o.pr, o.rule, 'FUNDED', o.sample, rnd, o);
        st.profit += day.pnl;
        if (day.breach) { res = 'BREACH'; break; }
        st.peak = Math.max(st.peak, st.profit); st.redDays = day.pnl < 0 ? st.redDays + 1 : day.pnl > 0 ? 0 : st.redDays;
        if (day.pnl >= qmin && day.trades) q++;
        if (buffer != null) { if (firstOk == null && st.profit > buffer) firstOk = d; continue; }
        if (q >= need && st.profit > 0) { res = 'OK'; break; }
      }
      // Puffer-Modell (TakeProfitTrader): täglich auszahlbar, was über dem Puffer liegt. Gewertet am Ende des Zeitraums.
      if (buffer != null && res !== 'BREACH' && st.profit > buffer) { res = 'OK'; d = firstOk; }
      if (res === 'OK') { ok++; daysTo.push(d); payouts.push((Math.min(st.profit, cap) - (buffer || 0)) * split); } else if (res === 'BREACH') breach++;
    }
    payouts.sort((a, b) => a - b); daysTo.sort((a, b) => a - b);
    const avg = payouts.length ? payouts.reduce((s, x) => s + x, 0) / payouts.length : 0;
    return { runs, pPayout: ok / runs, pBreach: breach / runs, pOpen: (runs - ok - breach) / runs,
      avgPayoutNet: Math.round(avg), medianPayoutNet: payouts.length ? Math.round(payouts[Math.floor(payouts.length / 2)]) : 0,
      expectedNet: Math.round(avg * (ok / runs)), medianDays: daysTo.length ? daysTo[Math.floor(daysTo.length / 2)] : null };
  };

  /* ---------- Archiv: Trade-Historie aus einem Journal-Export (z. B. TPT 2026) ---------- */

  /** Komma-CSV mit Anführungszeichen -> Zeilen als Objekte (Spaltennamen aus Kopfzeile) */
  const csvObjects = (text) => {
    const rows = []; let row = [], cur = '', q = false; const t = String(text || '').replace(/^﻿/, '');
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (q) { if (ch === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; continue; }
      if (ch === '"') q = true; else if (ch === ',') { row.push(cur); cur = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some((x) => x !== '')) rows.push(row); row = []; } else cur += ch;
    }
    row.push(cur); if (row.some((x) => x !== '')) rows.push(row);
    const head = rows.shift() || [];
    return rows.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), r[i]])));
  };

  /**
   * Journal-Export (Spalten tradeAccount, symbol, position, entryDate, exitDate, maxQuantity, pnlDollars, commission).
   * pnlDollars ist netto nach Kommission. Zeiten werden nach Berlin umgerechnet.
   * Rückgabe: [{ account, sym, side:'Long'|'Short', q, pnl, fee, date, time, dur }]
   */
  RS.parseJournalExport = (text) => csvObjects(text).filter((r) => r.tradeAccount && r.entryDate).map((r) => {
    const e = new Date(r.entryDate), x = new Date(r.exitDate || r.entryDate);
    return { account: r.tradeAccount, sym: r.symbol, side: /^s/i.test(r.position) ? 'Short' : 'Long', q: num(r.maxQuantity), pnl: num(r.pnlDollars), fee: num(r.commission),
      date: RS.berlinDate(e), time: new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(e), dur: Math.max(0, Math.round((x - e) / 1000)) };
  });

  /** Zeitfenster (Berlin) für die Auswertung nach Uhrzeit */
  RS.tradeWindow = (time) => {
    const [h, m] = String(time).split(':').map(Number), mins = h * 60 + m;
    return mins < 480 ? 'Asien (vor 08:00)' : mins < 720 ? 'Europa (08–12)' : mins < 930 ? 'Vor US-Open (12–15:30)' : mins < 1020 ? 'US-Open (15:30–17)' : 'Abend (ab 17)';
  };
  RS.WINDOWS = ['Asien (vor 08:00)', 'Europa (08–12)', 'Vor US-Open (12–15:30)', 'US-Open (15:30–17)', 'Abend (ab 17)'];

  /**
   * Konten aus Archiv-Trades bilden. Phase aus dem Kontonamen (PRO im Namen = funded), Copy-Gruppen über gleiche
   * Einstiege (Minute, Symbol, Richtung), bestanden = Test mit Gewinn ≥ target. o: { target, proPattern }
   */
  RS.buildArchive = (trades, o = {}) => {
    const target = num(o.target) || 1500, proRe = o.proPattern || /PRO\d/i;
    const by = {}; (trades || []).forEach((t) => (by[t.account] || (by[t.account] = [])).push(t));
    const sig = (t) => `${t.date} ${t.time.slice(0, 5)}|${t.sym}|${t.side}`;
    const accs = Object.entries(by).map(([account, ts]) => {
      ts.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
      const days = {}; ts.forEach((t) => { days[t.date] = Math.round(((days[t.date] || 0) + t.pnl) * 100) / 100; });
      const pnl = Math.round(ts.reduce((s, t) => s + t.pnl, 0) * 100) / 100, phase = proRe.test(account) ? 'PRO' : 'TEST';
      return { id: account, account, phase, first: ts[0].date, last: ts[ts.length - 1].date, days: Object.keys(days).length, dayPnl: days, n: ts.length, pnl,
        fees: Math.round(ts.reduce((s, t) => s + t.fee, 0) * 100) / 100, maxQ: Math.max(...ts.map((t) => t.q)),
        outcome: phase === 'TEST' && pnl >= target ? 'bestanden' : 'verloren', trades: ts.map((t) => [t.date, t.time, t.sym, t.side, t.q, t.pnl, t.fee, t.dur]), _sig: new Set(ts.map(sig)) };
    }).sort((a, b) => a.first.localeCompare(b.first) || a.account.localeCompare(b.account));
    let g = 0; const done = new Set();
    accs.forEach((a) => {
      if (done.has(a.id)) return;
      // Copy-Gruppe: an den gemeinsamen Handelstagen stimmt mindestens die Hälfte der Einstiege überein
      const same = (b) => { const dA = new Set([...a._sig].map((x) => x.slice(0, 10))), common = [...b._sig].filter((x) => dA.has(x.slice(0, 10))), dB = new Set(common.map((x) => x.slice(0, 10)));
        const sa = [...a._sig].filter((x) => dB.has(x.slice(0, 10))); if (!sa.length) return false;
        return sa.filter((x) => b._sig.has(x)).length >= 0.5 * Math.max(sa.length, common.length); };
      const mates = accs.filter((b) => b !== a && !done.has(b.id) && b.phase === a.phase && same(b));
      done.add(a.id);
      if (mates.length) { const base = `${a.phase === 'PRO' ? 'PRO' : 'Test'}-Gruppe ${a.first.slice(5).split('-').reverse().join('.')}`; const n = accs.filter((x) => x.group && x.group.startsWith(base)).length ? ' B' : '';
        g++; [a, ...mates].forEach((x) => { x.group = base + n; done.add(x.id); }); }
    });
    accs.forEach((a) => { delete a._sig; });
    return accs;
  };

  /** Kennzahlen aus Archiv-Konten für Coach, Agenten und Ansicht */
  RS.archiveStats = (accs) => {
    const list = accs || [];
    const part = (phase) => {
      const A = list.filter((a) => a.phase === phase), T = A.flatMap((a) => a.trades.map((t) => ({ acc: a.id, date: t[0], time: t[1], sym: t[2], side: t[3], q: t[4], pnl: t[5], fee: t[6], dur: t[7] })));
      // Entscheidungen: Copy-Trades derselben Minute nur einmal (erstes Konto) zählen
      const seen = new Map(); T.forEach((t) => { const k = `${t.date} ${t.time.slice(0, 5)}|${t.sym}|${t.side}`; const cur = seen.get(k); if (!cur) seen.set(k, { ...t, accs: new Set([t.acc]) }); else if (cur.acc === t.acc) cur.pnl += t.pnl; else cur.accs.add(t.acc); });
      const D = [...seen.values()];
      const win = (arr) => { const w = arr.filter((t) => t.pnl > 0), l = arr.filter((t) => t.pnl <= 0), gw = w.reduce((s, t) => s + t.pnl, 0), gl = -l.reduce((s, t) => s + t.pnl, 0);
        return { n: arr.length, pnl: Math.round(arr.reduce((s, t) => s + t.pnl, 0)), winrate: arr.length ? w.length / arr.length : null, avgWin: w.length ? Math.round(gw / w.length) : null, avgLoss: l.length ? -Math.round(gl / l.length) : null, pf: gl ? Math.round((gw / gl) * 100) / 100 : null }; };
      const byWindow = Object.fromEntries(RS.WINDOWS.map((w) => [w, win(D.filter((t) => RS.tradeWindow(t.time) === w))]));
      const durs = T.map((t) => t.dur).sort((a, b) => a - b);
      const days = A.flatMap((a) => Object.values(a.dayPnl));
      return { accounts: A.length, passed: A.filter((a) => a.outcome === 'bestanden').length, trades: T.length, decisions: D.length, all: win(T), decisionsStats: win(D), byWindow,
        avgQty: T.length ? Math.round((T.reduce((s, t) => s + t.q, 0) / T.length) * 10) / 10 : null, minisShare: T.length ? T.filter((t) => /^(NQ|ES|GC|YM|RTY|CL)$/.test(t.sym)).length / T.length : null,
        medianHoldSec: durs.length ? durs[Math.floor(durs.length / 2)] : null, tradesPerDay: days.length ? Math.round((T.length / days.length) * 10) / 10 : null,
        avgDay: days.length ? Math.round(days.reduce((s, x) => s + x, 0) / days.length) : null, worstDay: days.length ? Math.min(...days) : null, bestDay: days.length ? Math.max(...days) : null,
        daysToEnd: A.map((a) => a.days).sort((a, b) => a - b), pnl: Math.round(A.reduce((s, a) => s + a.pnl, 0)) };
    };
    // Tage, an denen mehrere Konten nacheinander verloren gingen (nicht als Copy-Gruppe)
    const lostByDay = {}; list.filter((a) => a.outcome === 'verloren').forEach((a) => { (lostByDay[a.last] || (lostByDay[a.last] = [])).push(a); });
    const hopping = Object.entries(lostByDay).filter(([, A]) => new Set(A.map((a) => a.group || a.id)).size >= 3).map(([date, A]) => ({ date, accounts: A.length, pnl: Math.round(A.reduce((s, a) => s + a.pnl, 0)) }));
    const groups = {}; list.filter((a) => a.group).forEach((a) => { const g = groups[a.group] || (groups[a.group] = { name: a.group, phase: a.phase, accounts: 0, passed: 0, pnl: 0, first: a.first, last: a.last }); g.accounts++; g.passed += a.outcome === 'bestanden' ? 1 : 0; g.pnl += a.pnl; if (a.last > g.last) g.last = a.last; });
    return { test: part('TEST'), pro: part('PRO'), hopping, groups: Object.values(groups).map((g) => ({ ...g, pnl: Math.round(g.pnl) })), from: list.length ? list.map((a) => a.first).sort()[0] : null, to: list.length ? list.map((a) => a.last).sort().pop() : null };
  };

  /* ---------- News-Sperre ---------- */

  /**
   * Sperrfenster aus Briefing-Terminen und eigenen Einträgen für ein Datum.
   * events: [{date?, time?, when?, title, importance}] (when z. B. „Mi 25.11. · 14:30 MEZ“), year für when ohne Jahr.
   */
  RS.newsBlocks = (events, date, minutes = 5, importances = ['hoch']) => {
    const out = [];
    for (const e of events || []) {
      let d = e.date, t = e.time;
      if ((!d || !t) && e.when) {
        const m = String(e.when).match(/(\d{1,2})\.(\d{1,2})\.(?:(\d{4}))?[^0-9]*?(\d{1,2}):(\d{2})/);
        if (m) { d = d || `${m[3] || date.slice(0, 4)}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; t = t || `${m[4].padStart(2, '0')}:${m[5]}`; }
      }
      if (d !== date || !/^\d{2}:\d{2}$/.test(t || '')) continue;
      if (e.importance && importances && importances.length && !importances.includes(e.importance) && !e.manual) continue;
      const [h, mi] = t.split(':').map(Number), at = h * 60 + mi;
      const f = (x) => `${String(Math.floor(((x % 1440) + 1440) % 1440 / 60)).padStart(2, '0')}:${String(((x % 60) + 60) % 60).padStart(2, '0')}`;
      out.push({ title: e.title || 'News', time: t, start: f(at - minutes), end: f(at + minutes) });
    }
    return out.sort((a, b) => a.start.localeCompare(b.start));
  };
  /** Aktives Sperrfenster zur Uhrzeit HH:MM oder null */
  RS.activeNewsBlock = (blocks, hhmm) => (blocks || []).find((b) => hhmm >= b.start && hhmm <= b.end) || null;

  /* ---------- Wochen-Review ---------- */

  /** Montag (YYYY-MM-DD) der ISO-Woche eines Datums */
  RS.weekStart = (dateStr) => { const [y, m, d] = dateStr.split('-').map(Number); const dt = new Date(Date.UTC(y, m - 1, d)); const wd = dt.getUTCDay() || 7; return RS.addDaysStr(dateStr, 1 - wd); };

  /**
   * Wochenbilanz. o: {weekStart, trades, checkins:[{id,score,level}], tiltChecks, dayTypes:{date:type}, rOf}
   */
  RS.weekSummary = (o) => {
    const from = o.weekStart, to = RS.addDaysStr(from, 6);
    const tr = (o.trades || []).filter((t) => t.date >= from && t.date <= to);
    const days = RS.dailyPnl(tr);
    const s = RS.groupStats(tr, o.rOf || (() => null));
    const ci = (o.checkins || []).filter((c) => c.id >= from && c.id <= to);
    const types = {}; for (const d of days) { const ty = (o.dayTypes || {})[d.date]; if (ty) types[ty] = (types[ty] || 0) + 1; }
    const bySetup = RS.statsBySetup(tr, o.rOf || (() => null));
    const emo = RS.statsByEmotion(tr, o.rOf || (() => null));
    return {
      week: RS.isoWeek(from), from, to,
      pnl: Math.round(tr.reduce((x, t) => x + num(t.pnl), 0) * 100) / 100, trades: tr.length, winrate: s.winrate, avgR: s.avgR,
      tradingDays: days.length, greenDays: days.filter((d) => d.pnl > 0).length, redDays: days.filter((d) => d.pnl < 0).length,
      bestDay: days.length ? Math.max(...days.map((d) => d.pnl)) : 0, worstDay: days.length ? Math.min(...days.map((d) => d.pnl)) : 0,
      ruleBreaks: tr.reduce((x, t) => x + RS.ruleBreakCount(t), 0), followedPct: tr.length ? tr.filter((t) => RS.ruleBreakCount(t) === 0).length / tr.length : null,
      dayTypes: types, tiltChecks: (o.tiltChecks || []).filter((c) => c.date >= from && c.date <= to).length,
      tiltRed: (o.tiltChecks || []).filter((c) => c.date >= from && c.date <= to && c.level === 'RED').length,
      checkinAvg: ci.length ? Math.round(ci.reduce((x, c) => x + num(c.score), 0) / ci.length) : null, checkins: ci.length,
      bestSetup: bySetup.find((x) => x.avgR != null) || null, worstEmotion: emo.filter((x) => x.avgR != null).sort((a, b) => a.avgR - b.avgR)[0] || null,
    };
  };

  return RS;
});
