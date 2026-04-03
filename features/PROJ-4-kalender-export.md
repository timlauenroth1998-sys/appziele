# PROJ-4: Kalender-Export (iCal / .ics)

## Status: Planned
**Created:** 2026-04-03
**Last Updated:** 2026-04-03

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
_To be added by /qa_

## Deployment
_To be added by /deploy_
