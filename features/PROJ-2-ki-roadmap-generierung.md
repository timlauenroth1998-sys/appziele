# PROJ-2: KI-Roadmap-Generierung (Hybrid)

## Status: Architected
**Created:** 2026-04-03
**Last Updated:** 2026-04-03
**Architected:** 2026-04-03

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

### Seitenstruktur & Komponentenbaum

```
/goals (bestehend – Button wird aktiviert)
+-- "Roadmap generieren →"-Button  [war deaktiviert, jetzt aktiv]

/roadmap (neue Seite)
+-- RoadmapNav
|   +-- ← Zurück zu Zielen
|   +-- "Roadmap neu generieren"-Button (mit Bestätigung)
|   +-- OutdatedBanner (wenn Ziele seit letzter Generierung geändert wurden)
+-- [Zustand A: Wird generiert]
|   +-- GeneratingProgress (Spinner + progressive Text-Chunks)
+-- [Zustand B: Fehler]
|   +-- ErrorAlert + Retry-Button
+-- [Zustand C: Fertig]
    +-- LifeAreaTabs (Alle / Karriere / Gesundheit / ...)
    +-- TimelineAccordion
    |   +-- AccordionItem: 5-Jahres-Vision
    |   +-- AccordionItem: 3-Jahresziele
    |   +-- AccordionItem: Jahresziele
    |   +-- AccordionItem: Q1 / Q2 / Q3 / Q4
    |   +-- AccordionItem: Jan–Dez (12 Monate)
    |   +-- AccordionItem: Woche 1-4
    |       +-- RoadmapItem
    |           +-- Text (KI-generiert oder bearbeitet)
    |           +-- "Manuell bearbeitet"-Badge
    |           +-- Inline-Edit-Button → EditableTextField
    |   +-- SectionRegenerateButton (↺ pro Zeitebene)

API:
POST /api/roadmap/generate
+-- Empfängt: GoalProfile (JSON-Body)
+-- Antwortet: SSE-Stream mit strukturiertem JSON
+-- Nutzt: Anthropic SDK (claude-sonnet-4-6, structured output)
```

### Datenmodell (localStorage, Key: `ziele_roadmap`)

```
Roadmap
├── generatedAt      ISO-Zeitstempel
├── profileHash      Fingerabdruck des GoalProfile (für "Ziele geändert"-Banner)
└── lifeAreaRoadmaps[]
    ├── lifeAreaId    "career"
    ├── lifeAreaName  "Karriere & Beruf"
    └── timeline
        ├── vision5y[]   RoadmapItem[]
        ├── goals3y[]    RoadmapItem[]
        ├── goals1y[]    RoadmapItem[]
        ├── quarters     { q1[], q2[], q3[], q4[] }
        ├── months       { jan[], feb[], ..., dez[] }
        └── weeks        { w1[], w2[], w3[], w4[] }

RoadmapItem
├── id         UUID
├── text       KI-generierter Aktionsschritt
├── isEdited   Boolean
└── editedAt   ISO-Zeitstempel (optional)
```

### Tech-Entscheidungen

| Entscheidung | Warum |
|---|---|
| **Streaming (SSE)** | Roadmap erscheint progressiv → gefühlte Performance besser als Warten auf komplettes JSON |
| **Next.js API Route** | Claude API-Key bleibt serverseitig – nie im Browser sichtbar |
| **Structured JSON (Tool Use)** | Claude gibt exaktes Schema zurück → kein fehleranfälliges Text-Parsen |
| **shadcn Accordion** | Bereits installiert; ideal für 6 aufklappbare Zeitebenen |
| **`useRoadmapStorage` Hook** | Analoges Muster zu `useGoalStorage` → saubere DB-Migration in PROJ-5 |
| **profileHash** | Einfacher Fingerabdruck → "Ziele geändert"-Banner ohne DB-Vergleich |
| **Kein Rate Limiting** | MVP-Entscheidung; kann nachgezogen werden |

### Datenfluss

```
Klick "Roadmap generieren"
→ GoalProfile aus localStorage
→ POST /api/roadmap/generate
→ Claude claude-sonnet-4-6 streamt JSON (SSE)
→ Frontend rendert progressiv
→ Fertig: in localStorage gespeichert
→ Nutzer sieht vollständige, editierbare Roadmap
```

### Neue Pakete
- `@anthropic-ai/sdk` – Anthropic SDK für Claude API mit Streaming-Support

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
