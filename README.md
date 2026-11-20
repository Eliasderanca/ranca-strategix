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

Daten liegen in der Datenbank des Artifacts (Sammlungen wie `trades`, `accounts`, `account_rules`, `personal_rules`). Außerhalb von claude.ai speichert die App in localStorage.

## Tests

```bash
npm test
```

```bash
node scripts/smoke.js /tmp
```

## Veröffentlichen

`index.html`, `logic.js` und `config/seed.json` werden zusammen auf dieselbe Artifact-URL veröffentlicht.
