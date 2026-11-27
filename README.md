# Ranca Strategix

Interne Trading-Software von Ranca: Markt-Lage, Daily Check-in, Journal, Dashboard, Kalender (P&L und Prop), Strategix Coach.

- **Live-App:** https://claude.ai/artifact/S7DArUyTrmaRwN8Urm3uwv (claude.ai-Artifact)
- **Spezifikation Dezember:** [docs/dezember-spec.md](docs/dezember-spec.md)
- **TakeProfitTrader 25K EOD (Dezember-Konto):** Regelsatz `tpt-eod-25k` in `config/seed.json`, Recherche in [reports/TakeProfitTrader 25K EOD Regeln.md](reports/TakeProfitTrader%2025K%20EOD%20Regeln.md). Neue Regelsätze aus `seed.json` erscheinen automatisch, auch wenn die Datenbank schon Regelsätze hat. Ein Regelsatz kann eigenes Risiko mitbringen (`personal_overrides`).

## Aufbau

| Pfad | Inhalt |
|---|---|
| `index.html` | Die komplette Oberfläche (Vanilla-JS, kein Build) |
| `logic.js` | Reine Rechenlogik (Regeln, Risiko, Zeitzone), im Browser als `window.RS`, in Node per `require` |
| `config/seed.json` | Startwerte für Regelsätze und persönliche Regeln (gilt nur, solange die Datenbank leer ist) |
| `tests/` | Unit-Tests für `logic.js` |
| `scripts/smoke.js` | Browser-Rauchtest mit Playwright |
| `scripts/smoke-szenarien.js` | Rauchtest Prop-Konten-Übersicht und Szenario-Ansicht |
| `scripts/noscroll-check.js` | Prüft je Seite und Tab, dass am Desktop nichts scrollt (`W=1440 H=800 node scripts/noscroll-check.js`) |
| `desktop/` | Mac-App (Electron-Fenster um die Live-App) |

**Archiv und Interview:** Unter Coach → Archiv lässt sich ein Journal-Export (CSV mit `tradeAccount`, `entryDate`, `pnlDollars` …) importieren. Er landet in `archive_accounts`, getrennt von den Live-Trades. Strategix erkennt Test- und PRO-Konten, Copy-Gruppen und Verlusttage und wertet nach Uhrzeit aus. Coach, Agenten und die Interview-Session (Coach → Interview) nutzen das Archiv. Erkenntnisse aus Sessions stehen in `coach_sessions`.

**Prop-Konten und Szenarien:** Prop-Konten zeigt alle Konten als Liste (P&L, Handelstage, Eval/Funded, Fortschritt, freier Drawdown, Chance für die nächsten Tage). Ein Klick öffnet `#prop/<id>`: Kennzahlen und ein Gitter aller Szenarien ab dem aktuellen Stand. Spalten sind die nächsten Trades, Zeilen die Kontostände; oben Ziel (Eval) bzw. Payout über dem Puffer (Funded, z. B. ab 26.000 $), unten Breach. Gleiche Zustände werden zusammengelegt (`RS.scenarioStart`, `RS.scenarioTree` in `logic.js`). Mit Firmenregeln rechnet es Tagesschluss-Trailing, Tageslimit soft/hart und die 50-%-Konsistenz mit, ohne sie wie das ursprüngliche Miro-Diagramm. Annahmen (Risiko, Trades/Tag, Tage, Trefferquote, Anteil 1:2) speichert jedes Konto in `accounts.scenario`; Startwerte in `config/seed.json` → `scenario_defaults`. Feld anklicken hebt alle Wege dorthin und von dort hervor.

**Ohne Scrollen:** Am Desktop hat jede Seite eine feste Bildschirmhöhe. Längere Seiten teilen sich in Tabs (`<div class="tabpane" data-tab="…" data-tl="…">`), die `applyTabs()` als Tab-Leiste in den Seitenkopf setzt. Der zuletzt gewählte Tab pro Seite bleibt gespeichert. Lange Listen (Trades, Journal) sind in Seiten aufgeteilt.

Daten liegen in der Datenbank des Artifacts. Außerhalb von claude.ai speichert die App in localStorage.

| Sammlung | Inhalt |
|---|---|
| `account_rules` | Firmen-Regelsätze (z. B. FTMO Futures Pro 50K) |
| `personal_rules` | Eigene Regeln (`main`) |
| `instruments` | $/Punkt und Typ je Instrument |
| `accounts` | Konten mit Regelsatz, Phase, Copy-Gruppe, Payouts |
| `trades` | Trades (neu mit `account_ids`, Setup, Gefühlen, R) |
| `trading_days` | Tagessummen mit Tagestyp, Readiness, Abendstimmung |
| `tilt_checks` | Tilt-Frühwarnung nach Verlusttrades |
| `psych_profile` | Trader-Profil-Tests |
| `mindset_messages`, `mindset_log` | Mindset-Texte und welche wann gezeigt wurden |
| `cost_history` | Ausgaben und Payouts (CSV-Import, Cockpit) |
| `app_config` | `journal`, `psych`, `coach`, `cockpit`: Listen, Grenzwerte, Coach-Prompt, Budget |
| `checkins`, `journal`, `dayplans`, `briefings`, `playbooks` | Check-in, Abend-Log, Tagespläne, Markt-Briefing, Playbook |

## Täglicher Ablauf

- **Heute** (Startseite): Check-in → Briefing → Tagesplan → News-Zeiten → Session → Tradovate-Import → Abend-Log (freitags Wochen-Review). Abgehakte Schritte stehen in `day_status`.
- **News-Sperre:** ±`news_block_minutes` (Standard 5) um Termine mit Wichtigkeit „hoch“ aus dem Morgen-Briefing und um eigene Termine im Tagesplan. Pre-Trade-Check gesperrt; Trades in diesem Fenster bekommen automatisch den Regelbruch „News ignoriert“.
- **Simulator:** Monte-Carlo für Eval und ersten Payout nach `account_rules` und `personal_rules`, mit Risiko-Vergleich.
- **Wochen-Review** (`weekly_reviews`): Wochenbilanz, Coach-Analyse, Reflexion und ein Fokus für die nächste Woche.
- **Chart-Screenshots** an Trades (Artifact-Assets), **Backup** aller Sammlungen als JSON (Regeln & Ziele).
- **Erinnerungen aufs Handy** (geplante Aufgaben): Mo–Fr 07:16 Markt-Briefing, 14:34 Check-in/Tagesplan, 21:33 Import/Abend-Log/Wochen-Review.

## Trades importieren (Tradovate)

Tradovate → **Account Reports → Performance** → Zeitraum → **Export CSV**. In der App: **Trades → Tradovate importieren**, Konto oder Copy-Gruppe wählen, Datei hineinziehen. Auch über TradingView ausgeführte Trades stehen im Tradovate-Export.

- Teil-Ausstiege derselben Einstiegs-Order werden zu einem Trade zusammengefasst.
- Trades, die du während der Session per Schnelleingabe erfasst hast (gleiches Konto, gleiche Richtung, Einstieg ±5 Min.), werden ergänzt statt doppelt angelegt. Setup, Gefühle und Notizen bleiben.
- Erneuter Import derselben Datei legt nichts doppelt an.
- Der Export enthält den P&L vor Gebühren. Die Gebühr je Kontrakt (Round Turn) wird je Instrument gespeichert.
- Beispieldatei: `tests/fixtures/tradovate-performance-beispiel.csv`

## Tests

```bash
npm test
```

```bash
node scripts/smoke.js /tmp
```

## Veröffentlichen

`index.html`, `logic.js` und `config/seed.json` werden zusammen auf dieselbe Artifact-URL veröffentlicht.
