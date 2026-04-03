# PROJ-3: Roadmap-Dashboard & Fortschrittsanzeige

## Status: Planned
**Created:** 2026-04-03
**Last Updated:** 2026-04-03

## Dependencies
- Requires: PROJ-1 (Ziel-Eingabe) – Ziele müssen vorhanden sein
- Requires: PROJ-2 (KI-Roadmap) – Roadmap muss generiert worden sein

## User Stories
- Als Nutzer möchte ich alle Zeitebenen meiner Roadmap in einer Übersicht sehen, damit ich den Gesamtüberblick behalte
- Als Nutzer möchte ich meine aktuellen Wochenziele auf einen Blick sehen, damit ich weiß, was heute zu tun ist
- Als Nutzer möchte ich Aufgaben als "erledigt" markieren, damit ich meinen Fortschritt verfolgen kann
- Als Nutzer möchte ich sehen, wie viel Prozent meiner Jahresziele ich bereits erreicht habe, damit ich motiviert bleibe
- Als Nutzer möchte ich zwischen verschiedenen Lebensbereichen wechseln/filtern, damit ich mich fokussieren kann

## Acceptance Criteria
- [ ] Dashboard zeigt alle Zeitebenen: 5-Jahres-Vision, 3-Jahresziele, Jahresziele, Q1-Q4, Monatsziele, Wochenziele
- [ ] Aktuelles Quartal und aktueller Monat sind automatisch hervorgehoben / expanded
- [ ] Fortschrittsbalken pro Lebensbereich (basierend auf erledigten Aufgaben)
- [ ] Nutzer kann Aufgaben/Ziele als "erledigt" markieren (Checkbox oder Toggle)
- [ ] Filter-Tabs für Lebensbereiche (alle / Karriere / Gesundheit / etc.)
- [ ] "Diese Woche"-Ansicht zeigt nur die aktuellen Wochenziele aller Lebensbereiche kompakt
- [ ] Responsive Design: funktioniert auf Desktop und Tablet
- [ ] Fortschritt wird in Echtzeit gespeichert (kein separater Speichern-Button)

## Edge Cases
- Was passiert, wenn keine Wochenziele generiert wurden? → Hinweis "Generiere zuerst deine Roadmap" mit CTA
- Was passiert, wenn ein Ziel als erledigt markiert wird, das übergeordnete Ziel aber noch offen ist? → Keine automatische Weitergabe, Nutzer entscheidet selbst
- Was passiert am Wochenübergang (Montag)? → Alte Wochenziele archivieren, neue Wochenziele hervorheben
- Was passiert, wenn der Nutzer 8 Lebensbereiche hat? → Scrollbare Tab-Navigation, keine Überfüllung

## Technical Requirements
- Optimistic UI updates für Checkbox-Interaktionen (kein Lag)
- Datenbankschema: `task_completions` Tabelle: task_id, user_id, completed_at
- Aktuelle Woche/Monat/Quartal via Datumslogik bestimmen (date-fns)
- Performance: Dashboard-Load < 500ms (Client-Side Filtering)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
