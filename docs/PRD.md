# Product Requirements Document

## Vision
Eine web-basierte Coaching-App, die Coaches und ihre Klienten dabei unterstützt, persönliche Ziele strukturiert zu definieren und automatisch in einen konkreten Fahrplan (5-Jahresplan → Wochenziele) umzuwandeln. Der Fokus liegt darauf, vom Plan direkt in die Umsetzung zu kommen – durch KI-gestützte Roadmap-Generierung und nahtlosen Kalender-Export.

## Target Users

**Primär: Coaches & Berater**
- Nutzen die App mit ihren Klienten in Sessions
- Brauchen eine strukturierte Methode, Ziele herunterzubrechen
- Wollen Fortschritte ihrer Klienten im Blick behalten

**Sekundär: Privatpersonen**
- Wollen persönliche Ziele (Karriere, Gesundheit, Finanzen, Beziehungen) strukturieren
- Haben Schwierigkeiten, vom großen Ziel zur konkreten Wochenaufgabe zu gelangen
- Wollen den Plan im eigenen Kalender (Apple, Google, Outlook) umsetzen

**Pain Points:**
- Ziele bleiben abstrakt und werden nicht in umsetzbare Schritte übersetzt
- Kein Überblick darüber, was heute/diese Woche getan werden muss
- Manuelle Planung ist zeitaufwendig und wird schnell aufgegeben

## Core Features (Roadmap)

| Priority | Feature | Status |
|----------|---------|--------|
| P0 (MVP) | Ziel-Eingabe & Lebensbereich-Profil | Planned |
| P0 (MVP) | KI-Roadmap-Generierung (Hybrid) | Planned |
| P0 (MVP) | Roadmap-Dashboard & Fortschrittsanzeige | Planned |
| P0 (MVP) | Kalender-Export (iCal/.ics) | Planned |
| P1 | Benutzerkonten & optionaler Login | Planned |
| P1 | Coach-Klienten-Ansicht | Deployed |
| P1 | Coaching Library (PDF-Upload, KI-Suche, Teilen) | Planned |

## Success Metrics
- Nutzer erstellen ihren ersten vollständigen Fahrplan in < 5 Minuten
- Mindestens 60% der Nutzer exportieren den Kalender nach Roadmap-Erstellung
- Wiederkehrende Nutzung: Nutzer checken Wochenziele mindestens 1x pro Woche
- Coach-Nutzung: Coaches laden mindestens 2 Klienten ein

## Constraints
- Solo-Entwickler, schnelles MVP
- Tech Stack: Next.js 16, Supabase, Claude AI API
- Kalender: iCal-Export (.ics) im MVP – kein direktes Google/Outlook API
- Budget: Minimal (Supabase Free Tier + Vercel Free Tier als Start)

## Non-Goals
- Native Mobile App (iOS/Android) – nicht in Version 1
- Direkte Google Calendar / Outlook API-Integration – nur iCal-Export im MVP
- Team-/Unternehmens-Features mit Rollen-Hierarchien – kommt nach MVP
- Gamification / Reward-System – nicht in Version 1
- Offline-Modus / PWA – nicht in Version 1

---

Use `/requirements` to create detailed feature specifications for each item in the roadmap above.
