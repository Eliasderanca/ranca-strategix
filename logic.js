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

  return RS;
});
