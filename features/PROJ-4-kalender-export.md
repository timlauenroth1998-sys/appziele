# PROJ-4: Kalender-Export (iCal / .ics)

## Status: Deployed
**Created:** 2026-04-03
**Last Updated:** 2026-04-16

## Dependencies
- Requires: PROJ-2 (KI-Roadmap) – Roadmap muss generiert worden sein, um Termine zu exportieren

## User Stories
- Als Nutzer möchte ich meine gesamte Roadmap als .ics-Datei exportieren, damit ich alle Ziele in meinen Kalender (Apple, Google, Outlook) importieren kann
- Als Nutzer möchte ich wählen können, welche Zeitebenen exportiert werden (z.B. nur Wochen- und Monatsziele), damit mein Kalender nicht überfüllt wird
- Als Nutzer möchte ich wählen können, welche Lebensbereiche exportiert werden, damit ich nur relevante Ziele im Kalender sehe
- Als Nutzer möchte ich, dass Wochenziele als wiederkehrende Termine oder Erinnerungen angelegt werden, damit ich sie nicht vergesse
- Als Nutzer möchte ich einen Exportlink (iCal-Subscription URL) erhalten, damit mein Kalender automatisch aktualisiert wird (Optional/P1)

## Acceptance Criteria
- [ ] "Kalender exportieren"-Button ist im Dashboard und auf der Roadmap-Seite sichtbar
- [ ] Nutzer kann vor dem Export wählen: welche Zeitebenen (Wochen / Monate / Quartale) und welche Lebensbereiche
- [ ] Export erzeugt eine gültige .ics-Datei (RFC 5545 konform)
- [ ] Jedes Ziel/jede Aufgabe wird als Kalendereintrag mit Titel, Beschreibung und Datum angelegt
- [ ] Wochenziele → Termin am Montag der jeweiligen Woche (ganztägig)
- [ ] Monatsziele → Termin am 1. des jeweiligen Monats (ganztägig)
- [ ] Quartalsziele → Termin am 1. des jeweiligen Quartals (ganztägig)
- [ ] .ics-Datei wird direkt heruntergeladen (kein E-Mail-Versand nötig)
- [ ] Export funktioniert ohne Account (für nicht eingeloggte Nutzer)

## Edge Cases
- Was passiert, wenn die Roadmap Daten aus der Vergangenheit enthält? → Trotzdem exportieren, Nutzer entscheidet (mit Warnung)
- Was passiert, wenn der Nutzer keinen iCal-fähigen Kalender hat? → Kurze Anleitung für Apple/Google/Outlook im Export-Dialog
- Was passiert, wenn 200+ Einträge exportiert werden? → Maximale Anzahl auf 100 begrenzen mit Hinweis; granulare Auswahl erzwingen
- Was passiert bei fehlenden Daten in der Roadmap (z.B. kein Monatsziel für Oktober)? → Diesen Monat überspringen, kein leerer Eintrag

## Technical Requirements
- iCal-Generierung via `ical-generator` NPM-Paket (RFC 5545)
- API Route: `GET /api/export/ical?levels=week,month&areas=career,health`
- Content-Type: `text/calendar`
- Content-Disposition: `attachment; filename="ziele-roadmap.ics"`
- Keine Authentifizierung erforderlich für den Export (signed URL ausreichend)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
**Date:** 2026-04-16
**Tester:** Claude QA Agent

### Acceptance Criteria
| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 1 | "Kalender exportieren"-Button sichtbar im Dashboard/Roadmap | ✅ Pass | `📅 Kalender` Button in Nav-Bar, sichtbar wenn Roadmap geladen |
| 2 | Nutzer kann Zeitebenen und Lebensbereiche wählen | ✅ Pass | Checkboxen für Wochen/Monate/Quartale/Jahresziele + farbige Area-Toggle-Buttons |
| 3 | Export erzeugt gültige .ics-Datei (RFC 5545) | ✅ Pass | Unit-Test verifiziert `BEGIN:VCALENDAR`, `METHOD:PUBLISH`, `BEGIN:VEVENT` |
| 4 | Jedes Ziel als Kalendereintrag mit Titel, Beschreibung und Datum | ✅ Pass | `SUMMARY`, `DESCRIPTION`, `DTSTART` vorhanden |
| 5 | Wochenziele → Montag der jeweiligen Woche (ganztägig) | ✅ Pass | Berechnung via `dayOfWeek + 6) % 7` korrekt |
| 6 | Monatsziele → 1. des jeweiligen Monats | ✅ Pass | Unit-Test: März → `20260301` ✓ (Bug gefixt: UTC statt Lokalzeit) |
| 7 | Quartalsziele → 1. des jeweiligen Quartals | ✅ Pass | Unit-Tests: Q1→Jan, Q2→Apr, Q3→Jul, Q4→Okt alle korrekt |
| 8 | .ics direkt heruntergeladen | ✅ Pass | `Content-Disposition: attachment; filename="ziele-roadmap.ics"` |
| 9 | Export funktioniert ohne Account | ✅ Pass | Keine Auth-Prüfung in der Route |

### Bugs Found & Fixed
| ID | Severity | Description | Fix |
|----|----------|-------------|-----|
| B1 | High | `new Date(year, month, 1)` verwendete Lokalzeit → Datum um 1 Tag verschoben (z.B. März → Feb 28) | Gefixt mit `Date.UTC(year, month, 1)` |
| B2 | Medium | `/→.*$/s` Regex-Flag `s` erfordert ES2018, tsconfig target ist ES2017 → TypeScript-Fehler | Gefixt mit `/→[\s\S]*$/` |

### Security Audit
- Keine Authentifizierung absichtlich weggelassen (spec-konform, kein Account erforderlich)
- Input wird als `Roadmap`-Typ geparst – keine SQL-Injection oder XSS möglich (reiner iCal-Output, kein HTML)
- Kein Datenbankzugriff in dieser Route – nur clientseitige Roadmap-Daten werden verarbeitet
- `Content-Type: text/calendar` verhindert Browser-Rendering als HTML

### Automated Tests
- **Unit tests:** 15/15 passed (`src/app/api/export/ical/route.test.ts`)
  - stripFormatting, shortTitle, event cap (100), date assignments (alle Monate + Quartale), RFC 5545 format, Content-Type/Disposition, error handling, area filtering, empty roadmap
- **Existing tests:** 32/32 passed (keine Regressionen)

### Production-Ready: YES

## Deployment
**Date:** 2026-04-16
**Production URL:** https://appziele-r2zlz6riv-timlauenroth1998-9851s-projects.vercel.app
**Build:** ✅ `npm run build` passed locally (0 errors)
**Tests:** ✅ 32/32 unit tests passing
