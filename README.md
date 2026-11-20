# Ranca Strategix

Interne Trading-Software von Ranca: Markt-Lage, Daily Check-in, Journal, Dashboard, Prop-Kalender, Strategix Coach.

- **Live-App:** https://claude.ai/artifact/S7DArUyTrmaRwN8Urm3uwv (claude.ai-Artifact)
- **Spezifikation Dezember:** [docs/dezember-spec.md](docs/dezember-spec.md)

## Aufbau

| Pfad | Inhalt |
|---|---|
| `index.html` | Die komplette Oberfläche (Vanilla-JS, kein Build) |
| `logic.js` | Reine Rechenlogik (Regeln, Risiko, Zeitzone), im Browser als `window.RS`, in Node per `require` |
| `config/seed.json` | Startwerte für Regelsätze und persönliche Regeln (gilt nur, solange die Datenbank leer ist) |
| `tests/` | Unit-Tests für `logic.js` |
| `scripts/smoke.js` | Browser-Rauchtest mit Playwright |
| `desktop/` | Mac-App (Electron-Fenster um die Live-App) |

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

## Tests

```bash
npm test
```

```bash
node scripts/smoke.js /tmp
```

## Veröffentlichen

`index.html`, `logic.js` und `config/seed.json` werden zusammen auf dieselbe Artifact-URL veröffentlicht.
