# Dezember-Spezifikation – Ranca Strategix

Stand: 20.11.2026. Quelle: Anforderungen von Elias im Chat. Diese Datei ist die verbindliche Spezifikation für die Erweiterung.

## Rahmen

- Vorhandenen Stack nutzen: eine HTML-Datei mit Vanilla-JS als claude.ai-Artifact, Datenhaltung in der Artifact-Datenbank (Sammlungen), Fallback localStorage. Keine neuen Frameworks oder Datenbanken.
- Jede „Tabelle“ der Spezifikation ist eine Sammlung in der Artifact-Datenbank.
- Regeln, Zahlen und Texte sind Konfiguration (Datenbank bzw. `config/seed.json`), nicht hart im Code.
- Reine Logik liegt in `logic.js` (Browser + Node). Unit-Tests mit `node --test` (eingebauter Test-Runner, keine Abhängigkeit).
- UI-Sprache Deutsch, Zeitzone Europe/Berlin.
- Bestehende Features bleiben erhalten: Daily Check-in (= Morgen-Readiness-Check), Journal/Abend-Review (= Abend-Log), Dashboard, Strategix Coach (= AI-Kommentar), Markt-Lage, Prop-Kalender, Playbook, Agenten.
- Nach jeder Phase: Zusammenfassung + Testanleitung, dann auf OK warten.

Entscheidungen vom 20.11.2026:
1. Phasen-Aufteilung wie unten.
2. GitHub-Repo anlegen (sobald GitHub verbunden ist).
3. Logik in `logic.js` auslagern: ok.
4. Bei Session-Sperre (ROT) bleiben Abend-Log und Mindset erreichbar; gesperrt sind Trade-Erfassung und Pre-Trade-Check.
5. `personal_rules` ersetzt die alten Einstellungen unter „Regeln & Ziele“; alte Werte werden übernommen.
6. Abo-Erinnerung nur als Hinweis in der App.

---

## Phase 1 – Konfiguration und Kontotyp

### Sammlung `account_rules`

Regelsatz „FTMO Futures Pro 50K“:

| Feld | Wert |
|---|---|
| start_balance | 50000 |
| profit_target_eval | 3000 |
| max_drawdown | 3000, Typ `EOD_TRAILING`, trailt am höchsten Tagesschlussstand, lockt bei start_balance |
| daily_loss_limit | 1000, Typ `HARD` (Konto verloren bei Erreichen) |
| eval_consistency | bester Tag ≤ 50 % des Gesamtprofits |
| funded_contract_scaling | 2 Minis (= 20 Micros) bis +999 $, 3 Minis ab +1000 $, 5 Minis ab +2000 $ |
| payout_qualifying_day_min | 200 ($ Tagesgewinn) |
| payout_qualifying_days_required | 5 |
| payout_cap | 5000 |
| profit_split | 0.9 |
| monthly_fee | 139 (Eval-Abo, endet nach Bestehen) |

Phasen pro Konto: `EVAL` → `FUNDED` → `BREACHED` / `PAYOUT`. Bis zu 4 Konten gleichzeitig aktiv. Option „Copy-Gruppe“: identisch gehandelte Konten als Gruppe markieren und gemeinsam anzeigen.

### Sammlung `personal_rules` (strenger als die Firma)

| Feld | Wert |
|---|---|
| risk_per_trade_phase1 | 150 $ (bis das Konto +600 $ erreicht) |
| risk_per_trade_phase2 | 200 $ (ab +600 $ im Konto) |
| daily_stop_phase1 | −450 $ |
| daily_stop_phase2 | −600 $ |
| max_losing_trades_per_day | 3 |
| max_trades_per_day | 4; Trade 4 nur, wenn Tages-PnL > 0 |
| after_two_red_days_risk | 100 $ (gilt für den nächsten Tag, danach zurück zur normalen Phase) |
| stop_after_two_winners | true |
| eval_daily_profit_soft_cap | 1200 $ (Hinweis „Feierabend“, wegen Konsistenzregel) |
| eval_daily_profit_hard_warning | 1500 $ |

## Phase 2 – Risk-Engine, Sperre, Positionsgröße, Konto-Kennzahlen

### Risk-Engine (zentrale Funktion, überall im UI genutzt)

Berechnet für heute:
- erlaubtes Risiko pro Trade
- verbleibender Tagesverlust bis zum persönlichen Stop
- verbleibender Abstand zum harten FTMO-Tageslimit
- Anzahl erlaubter Trades

Ampel:
- GRÜN: normal
- GELB: 1 Verlust oder 50 % des Tages-Stops verbraucht
- ROT = SESSION GESPERRT: Tages-Stop erreicht, 3 Verlusttrades, 2 Gewinner erreicht oder Tilt-Sperre (Phase 3)

ROT zeigt einen Vollbild-Screen „Session beendet“ ohne Button zum Übergehen bis 00:00 Uhr (Europe/Berlin). Abend-Log und Mindset bleiben erreichbar.

### Positionsgrößen-Rechner

- Eingabe: Instrument (MNQ = 2 $/Punkt, MES = 5 $/Punkt, NQ = 20 $/Punkt), Stopweite in Punkten
- Ausgabe: Kontrakte = floor(erlaubtes Risiko / (Stop-Punkte × $/Punkt)), tatsächliches Risiko in $, Zielwerte für 1:2, 1:3, 1:4
- Warnung, wenn die Kontraktzahl über dem FTMO-Scaling-Limit der aktuellen Phase liegt

### Kennzahlen pro Konto im Dashboard

Abstand zur Drawdown-Grenze, bester Tag in % vom Gesamtprofit (Konsistenz), Payout-Qualifikationstage (x/5), nächster möglicher Payout-Termin, Fortschritt zum Profit Target.

## Phase 3 – Trade-Journal, Trading-Tage, Tilt-Frühwarnung, Statistik

Trade-Journal mit schneller Eingabe (unter 20 Sekunden pro Trade, auch mobil).

### Sammlung `trades`

id, account_ids (Array, wegen Copy-Gruppe), date, time, instrument, direction, setup (VAL-Long, VAH-Short, POC-Reversion, VWAP-Reclaim, VWAP-Rejection, Sonstiges), contracts, stop_points, planned_rr, result_r, pnl, followed_plan (ja/nein), emotion_before (Auswahl + Intensität 1–10), emotion_after (Auswahl + Intensität 1–10), notes.

Emotionen: ruhig, fokussiert, ungeduldig, gierig, ängstlich, frustriert, wütend, euphorisch, gelangweilt, unter Druck.

### Sammlung `trading_days`

date, pnl_total, trades_count, wins, losses, rule_breaks (Anzahl), day_type (automatisch, Phase 4), readiness_score (aus Daily Check-in), mood_evening, reflection_text.

### Tilt-Frühwarnung

Pflicht-Popup nach JEDEM Verlusttrade, bevor ein neuer Trade erfasst werden kann:
1. „Wie stark ist der Drang, den Verlust zurückzuholen?“ (1–10)
2. „Ist der nächste Trade ein A-Setup aus meinem Plan?“ (ja/nein)
3. Atem-/Pause-Timer, 5 Minuten, nicht überspringbar

Regel: Drang ≥ 7 ODER Frage 2 = nein → ROT (Session gesperrt). Drang 5–6 → GELB + Hinweis „Nur noch halbe Größe“.

Zusätzlich: emotion_before „euphorisch“ oder „gierig“ mit Intensität ≥ 7 → „Overconfidence-Warnung: Der Markt schuldet dir nichts. Gleiche Größe, gleiche Kriterien.“

### Statistik-Seite

- Winrate und Ø R getrennt nach Emotion vor dem Trade
- Ergebnis des Trades direkt nach einem Verlust gegenüber allen anderen Trades
- Ergebnis von Trade 1, 2, 3 und 4 des Tages
- Regelbrüche pro Woche (Trend)
- Ø R je Setup

## Phase 4 – „Mein Trader-Profil“ und Mindset-Modul

### Trader-Profil (eigene Seite)

Hinweis oben: „Selbsteinschätzung zur Reflexion, keine klinische Diagnose. Wiederholen: 1× pro Monat.“

**Teil A – 40 Aussagen**, Skala 1–5 (1 = trifft gar nicht zu, 5 = trifft voll zu). (R) = umgekehrt werten (6 − Antwort).

Dimension 1 – Verlust-Tilt:
1. Nach einem Verlusttrade fühle ich mich, als müsste ich das Geld heute noch zurückholen.
2. Ein Stop-Loss fühlt sich für mich wie eine persönliche Niederlage an.
3. Ich verschiebe oder entferne manchmal meinen Stop, weil ich den Verlust nicht realisieren will.
4. Ich kann einen Verlusttag abhaken und am nächsten Tag neutral starten. (R)
5. Nach zwei Verlusten in Folge steigen meine Positionsgröße oder meine Tradefrequenz.

Dimension 2 – Revenge- und Ungerechtigkeits-Tilt:
6. Wenn der Preis mich ausstoppt und dann in meine Richtung läuft, steige ich sofort wieder ein.
7. Ich habe das Gefühl, dass der Markt gegen mich arbeitet.
8. Nach einem Verlust nehme ich Setups, die nicht in meinem Plan stehen.
9. Nach einem Verlust mache ich bewusst eine Pause von mindestens 15 Minuten. (R)

Dimension 3 – Overconfidence:
10. Nach mehreren Gewinntagen erhöhe ich das Risiko, ohne dass es im Plan steht.
11. Nach einem großen Gewinn habe ich das Gefühl, genau zu wissen, wohin der Preis läuft.
12. An grünen Tagen trade ich weiter, obwohl mein Tagesziel erreicht ist.
13. Ich glaube, dass ich mir nach guten Tagen einen Verlust leisten kann.
14. Gewinne schreibe ich eher meinem Können zu, Verluste eher dem Pech.

Dimension 4 – FOMO:
15. Wenn ein Move ohne mich startet, steige ich verspätet ein.
16. Einen Tag ohne Trade empfinde ich als verlorenen Tag.
17. Ich habe Angst, das eine große Setup des Tages zu verpassen.
18. Ich kann zusehen, wie der Markt ohne mich läuft, ohne unruhig zu werden. (R)

Dimension 5 – Angst und Perfektionismus:
19. Ich nehme Gewinne zu früh mit, weil ich Angst habe, dass sie verschwinden.
20. Ich zögere bei A-Setups so lange, bis der Einstieg vorbei ist.
21. Ein Fehler beschäftigt mich noch Stunden oder Tage danach.
22. Nach einem verpassten Trade bin ich wütend auf mich selbst.

Dimension 6 – Finanzieller Druck und Payout-Fixierung:
23. Ich rechne während der Session aus, wie viel mir noch bis zum Payout fehlt.
24. Ich brauche das Geld aus Payouts für laufende Kosten.
25. Der Preis der Eval oder des Resets spielt beim Traden in meinem Kopf eine Rolle.
26. Wenn ein Konto kurz vor dem Ziel ist, trade ich anders als sonst.
27. Ich trade nur mit Geld, dessen Verlust mich nicht belasten würde. (R)

Dimension 7 – Disziplin und Impulsivität:
28. Ich halte mich an meine maximale Anzahl Trades pro Tag. (R)
29. Ich trade auch, wenn ich müde, gestresst oder abgelenkt bin.
30. Ich führe mein Journal auch an schlechten Tagen vollständig. (R)
31. Ich steige ein, bevor alle Kriterien meines Setups erfüllt sind.
32. In den ersten Minuten nach der Eröffnung handle ich impulsiv.

Dimension 8 – Selbstwert und Identität:
33. Meine Stimmung am Abend hängt stark vom Tages-PnL ab.
34. Nach Verlusttagen zweifle ich an mir als Person, nicht nur am Trade.
35. Ich erzähle anderen lieber von Gewinnen als von Verlusten.
36. Wenn ich meinen Plan befolgt habe, habe ich Frieden, unabhängig vom Ergebnis. (R)

Dimension 9 – Zustand und Umfeld:
37. Schlechter Schlaf beeinflusst meine Trades spürbar.
38. Streit oder Sorgen außerhalb des Tradings nehme ich mit an den Chart.
39. Ich habe eine feste Routine vor der Session. (R)
40. Ich bemerke körperliche Signale (Puls, Anspannung), bevor ich Fehler mache. (R)

Auswertung: Dimensions-Score = Mittelwert der Items (nach Umkehrung), umgerechnet auf 0–100 mit (Mittelwert − 1) / 4 × 100.
- 0–39 = GRÜN (Stärke), 40–64 = GELB (beobachten), 65–100 = ROT (Hauptrisiko)
- Top 3 Risiken als Karten mit kurzer Erklärung und einer konkreten Gegenregel, z. B.:
  - Verlust-Tilt rot → „Nach jedem Verlust 5 Minuten Pause, Tages-Stop ist heilig“
  - Overconfidence rot → „Nach 2 Gewinnern ist Schluss, keine Größenerhöhung außerhalb des Plans“
  - FOMO rot → „Kein Einstieg nach mehr als X Punkten Bewegung ohne Retest“
  - Payout-Druck rot → „PnL-Anzeige während der Session ausblenden“ (Toggle in den Einstellungen)
- Radar-Chart aller 9 Dimensionen, Verlauf über mehrere Testdurchläufe

**Teil B – Trigger-Checkliste** (Mehrfachauswahl, je Trigger Stärke 1–3): nach 1 Verlust · nach 2+ Verlusten · nach großem Gewinn · nach 3+ grünen Tagen · verpasstes Setup · Stop knapp gerissen und dann Gegenbewegung · News-Spike · Konto nah am Drawdown · Konto nah am Ziel · Geldsorgen · wenig Schlaf · Streit oder Stress privat · Langeweile in ruhigen Phasen · Social Media / andere Trader sehen · Technikprobleme

**Teil C – Persönliche Tilt-Map** (Freitext, frei nach Jared Tendler, „The Mental Game of Trading“):
- Stufe 1–3 (frühe Zeichen): Welche Gedanken, Gefühle und Körpersignale merke ich zuerst?
- Stufe 4–6 (kippt): Was ändere ich dann an meinem Verhalten (Größe, Frequenz, Stop)?
- Stufe 7–10 (Kontrollverlust): Wie sieht ein typischer Tilt-Tag bei mir aus?
- Was hat in der Vergangenheit geholfen, wieder runterzukommen?
- Mein Satz an mich selbst, wenn ich auf Stufe 5 bin

**Teil D – Realitäts-Check** (automatisch ab ≥ 20 Trades im Journal): Selbsteinschätzung gegen echte Daten, z. B. Verlust-Tilt-Score gegen „Ø R des Trades nach einem Verlust“ und „Größenänderung nach Verlusten“, Overconfidence gegen „Trades nach Erreichen des Tagesziels“, Disziplin gegen „Regelbrüche pro Woche“. Abweichung als Hinweis: „Du schätzt dich hier stärker ein, als deine Daten zeigen.“

Speichern: Sammlung `psych_profile` mit scores (JSON), top_risks, triggers (JSON), tilt_map (JSON), created_at. Das neueste Profil ist aktiv.

### Mindset-Modul

Text erscheint (a) morgens auf dem Startscreen (Typ PRE_SESSION) und (b) nach Abschluss des Tages im Abend-Log (Typ je nach Tag).

Automatische Bestimmung von day_type:
- NO_TRADE: 0 Trades
- WIN_PLAN: PnL > 0 und 0 Regelbrüche
- WIN_RULEBREAK: PnL > 0 und ≥ 1 Regelbruch (gilt NICHT als guter Tag)
- LOSS_CONTROLLED: PnL < 0, Verlust ≤ persönlicher Tages-Stop, 0 Regelbrüche
- LOSS_RULEBREAK: PnL < 0 und ≥ 1 Regelbruch oder Tages-Stop überschritten
- Zusatz-Flags: STREAK_WIN (3+ grüne Tage in Folge), STREAK_LOSS (2+ rote Tage in Folge, dann zusätzlich Hinweis „Morgen 100 $ Risiko“)

Auswahl-Logik: zufällig aus der passenden Kategorie, kein Text wiederholt sich innerhalb von 10 Tagen. Overconfidence ROT im Profil → an Gewinntagen IMMER einen Overconfidence-Text. Verlust-Tilt ROT → an Verlusttagen zusätzlich „Mein Satz an mich selbst“ aus der Tilt-Map. Unter jedem Text die Bibelstelle als Referenz (nur Angabe), Tippen öffnet bibleserver.com.

Sammlung `mindset_messages` (category, text, bible_ref), eigene Texte ergänzbar. Startinhalt:

PRE_SESSION
1. „Heute ist dein Job nicht, Geld zu verdienen. Dein Job ist, A-Setups sauber auszuführen und Verluste klein zu halten. Das Geld ist die Folge, nicht das Ziel.“ – 2. Timotheus 1,7
2. „Du darfst heute 0 Trades machen. Kein Setup = kein Trade = ein erfolgreicher Tag.“ – Psalm 37,7
3. „Der Juli hat funktioniert, weil du lernen wolltest. Geh heute als Lernender in die Session, nicht als jemand, der etwas beweisen muss.“ – Sprüche 21,5
4. „Prüfe vor dem ersten Trade: Schlaf, Kopf, Konto. Wenn eins davon rot ist, ist heute ein Beobachtungstag.“ – Sprüche 25,28

WIN_PLAN
1. „Guter Tag. Aber du hast den Preis nicht vorhergesagt. Du hast einen Vorteil sauber ausgeführt, und der Markt hat dieses Mal mitgespielt. Morgen gleiche Größe, gleiche Regeln.“ – Jakobus 4,13–15
2. „Gewinntage sind gefährlicher als Verlusttage, weil sie dir einreden, du hättest den Markt verstanden. Bleib demütig: Niemand weiß, was der morgige Tag bringt.“ – Sprüche 27,1
3. „Du hast heute aufgehört, als die Regel es sagte. Genau das ist der Gewinn, nicht der Betrag.“ – Sprüche 16,18
4. „Notiere jetzt, was du richtig gemacht hast, nicht wie viel du verdient hast. Prozesse kann man wiederholen, Ergebnisse nicht.“ – Sprüche 13,11

WIN_RULEBREAK
1. „Grün, aber mit Regelbruch. Das ist kein guter Tag, sondern ein Glückstag, der dich morgen Geld kosten kann. Schreib auf, welche Regel du gebrochen hast und warum.“ – Sprüche 25,28
2. „Der Markt hat dich heute für einen Fehler belohnt. Das ist die gefährlichste Lektion überhaupt. Bewerte den Tag als ROT.“ – 1. Korinther 10,12

LOSS_CONTROLLED
1. „Kontrollierter Verlusttag = erfolgreicher Tag. Du hast genau das getan, was Profis von Amateuren unterscheidet: Du hast den Schaden begrenzt.“ – Klagelieder 3,22–23
2. „Du musst keinen grünen Tag erzwingen. Gewinntage kommen. Deine einzige Aufgabe ist, dass Verlusttage nicht wehtun. Mission erfüllt.“ – Matthäus 6,34
3. „Dieser Verlust ist bereits eingepreist. Er gehört zu den Kosten deines Geschäfts wie Miete für einen Laden. Morgen beginnt neu.“ – Philipper 4,11–12
4. „Du hast gestoppt, als es wehtat. Genau dieser Moment baut das Konto, das am Ende ausgezahlt wird.“ – Galater 6,9

LOSS_RULEBREAK
1. „Heute haben die Emotionen gehandelt, nicht der Plan. Das ist kein Weltuntergang, aber es braucht eine ehrliche Notiz: Wann bin ich gekippt, und was war der Auslöser?“ – Sprüche 24,16
2. „Schuld bringt dich nicht weiter, Klarheit schon. Benenne den Fehler, vergib dir und setz für morgen eine einzige konkrete Regel.“ – 1. Johannes 1,9
3. „Morgen gilt: halbe Größe, maximal 2 Trades. Nicht als Strafe, sondern damit du wieder Stabilität aufbaust.“ – Sprüche 21,5

NO_TRADE
1. „Kein Setup, kein Trade. Geduld ist eine Position, und zwar oft die beste.“ – Psalm 37,7
2. „Ein Tag ohne Trade kostet dich 0 $. Ein FOMO-Trade kostet dich das Konto. Gut gemacht.“ – Prediger 3,1

STREAK_WIN (Zusatztext)
„3 grüne Tage in Folge. Jetzt ist die Zeit für Wachsamkeit, nicht für mehr Risiko. Wer meint, er stehe fest, soll zusehen, dass er nicht fällt.“ – 1. Korinther 10,12

STREAK_LOSS (Zusatztext)
„2 rote Tage. Morgen 100 $ Risiko, maximal 2 Trades. Du brauchst jetzt keinen großen Tag, sondern einen ruhigen.“ – Galater 6,9

## Phase 5 – Coach-Erweiterung und Dezember-Cockpit

### AI-Coach

Vor jeder Coach-Antwort wird automatisch mitgeschickt:
- aktives psych_profile (Scores, Top-3-Risiken, Trigger, Tilt-Map-Texte)
- personal_rules und heutiger Risk-Engine-Status
- die letzten 10 trading_days (PnL, day_type, Regelbrüche, Emotionen)
- Konto-Status (Phase, Abstand zum Drawdown, Payout-Tage x/5)

Systemprompt (als Konfiguration gespeichert):
„Du bist ein direkter, ehrlicher Trading-Coach für einen Futures-Prop-Trader (MNQ, Volume Profile + VWAP). Du bist kein Ja-Sager. Deine Prioritäten: 1. Regeleinhaltung, 2. Verlustbegrenzung, 3. Prozessqualität, erst dann Profit. Du erkennst Muster aus seinem Profil (Tilt, Overconfidence, Payout-Druck) und sprichst sie konkret an. Nach Gewinntagen warnst du vor Selbstüberschätzung, nach kontrollierten Verlusttagen bestärkst du. Du schlägst nie mehr Risiko vor als personal_rules erlaubt. Bei Status ROT empfiehlst du niemals einen weiteren Trade. Der Trader ist bibelgläubiger Christ; wenn es passt, darfst du kurz und respektvoll eine Bibelstelle als Referenz nennen. Antworte auf Deutsch, kurz und mit konkreten Zahlen.“

Schnellfragen: „Ich will gerade revenge-traden“, „Bin ich heute bereit?“, „Analysiere meine Woche“, „Was ist gerade mein größtes Risiko?“

### Dezember-Cockpit (eigene Seite)

- Budget: 400 € gesamt, ausgegebene Fees, Reserve, Payouts (brutto/netto nach 90 %-Split), ROI in %
- Timeline: Kauf bis 30.11. · Eval 1.–11.12. · Nachkauf nur bis 7.12. · Funded-Qualifikationstage 14.–18.12. · Payout-Antrag ca. 18.–21.12. · Abo-Kündigung prüfen
- Erinnerung (in der App): „FTMO-Abo kündigen, falls Eval nicht bestanden“, 3 Tage vor dem Verlängerungsdatum
- Break-even: benötigter Bruttogewinn = ausgegebene Fees / 0,9 (in $ und €, Wechselkurs manuell)
- CSV-Import der 2026-Historie: Spalten Account, Firm, Date, Eval Fee, Reset, Eval Status, Activation Fee, Total Spend, Payout, Net, Status, Notes; Trennzeichen „;“, Zahlen im deutschen Format mit Komma und €. Sammlung `cost_history`.
