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

  return RS;
});
