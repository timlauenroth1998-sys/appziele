# PROJ-2: KI-Roadmap-Generierung (Hybrid)

## Status: Planned
**Created:** 2026-04-03
**Last Updated:** 2026-04-03

## Dependencies
- Requires: PROJ-1 (Ziel-Eingabe) – Ziele müssen vorhanden sein, bevor die Roadmap generiert werden kann

## User Stories
- Als Nutzer möchte ich auf Knopfdruck aus meinen Zielen einen vollständigen Fahrplan erhalten, damit ich sofort weiß, was zu tun ist
- Als Nutzer möchte ich, dass die KI fehlende Zeitebenen ableitet (z.B. Quartalsziele aus dem Jahresziel), damit ich nicht alles manuell ausfüllen muss
- Als Nutzer möchte ich die generierte Roadmap manuell anpassen, damit ich die KI-Vorschläge verfeinern kann
- Als Nutzer möchte ich die Roadmap pro Lebensbereich sehen, damit ich den Überblick behalte
- Als Nutzer möchte ich eine neue Roadmap regenerieren, wenn meine Ziele sich ändern

## Acceptance Criteria
- [ ] Claude AI generiert auf Basis der eingegebenen Ziele einen strukturierten Plan für alle Zeitebenen: 5-Jahres-Vision, 3-Jahresziele, Jahresziele, Quartalsziele (Q1-Q4), Monatsziele (12 Monate), Wochenziele (erste 4 Wochen)
- [ ] Jede Zeitebene enthält 1-3 konkrete, umsetzbare Aktionsschritte pro Lebensbereich
- [ ] Generierung dauert < 10 Sekunden mit Ladeindikator
- [ ] Nutzer kann jeden generierten Schritt direkt im UI bearbeiten (Inline-Editing)
- [ ] Roadmap wird nach Generierung automatisch gespeichert (localStorage oder DB)
- [ ] Nutzer kann einzelne Zeitebenen neu generieren, ohne die gesamte Roadmap zurückzusetzen
- [ ] KI-Prompt berücksichtigt Lebensbereich, Vision und alle eingegebenen Zielfelder
- [ ] Bei API-Fehler: klare Fehlermeldung + Retry-Button

## Edge Cases
- Was passiert, wenn nur ein Jahresziel ohne weitere Felder eingegeben wurde? → KI leitet alle anderen Ebenen intelligent ab
- Was passiert bei einem API-Timeout? → Retry-Logik (max. 3 Versuche), dann Fehlermeldung
- Was passiert, wenn der Nutzer während der Generierung die Seite verlässt? → Generierung abbrechen, kein Speichern von Teilergebnissen
- Was passiert bei sehr allgemeinen Zielen (z.B. "glücklicher sein")? → KI fragt nach konkreten Unterbereichen oder schlägt Beispiele vor
- Was passiert, wenn die manuell bearbeitete Roadmap und die KI-Version divergieren? → "Manuell bearbeitet"-Badge anzeigen

## Technical Requirements
- Claude AI API (claude-sonnet-4-6) für Roadmap-Generierung
- Strukturierter JSON-Output via Claude Tool Use / Structured Output
- API Route: `POST /api/roadmap/generate`
- Streaming-Response für bessere UX (Roadmap erscheint schrittweise)
- Datenbankschema: `roadmaps` Tabelle mit JSON-Feld für die komplette Roadmap-Struktur
- Rate Limiting: max. 10 Generierungen pro Nutzer pro Tag (Free Tier)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
