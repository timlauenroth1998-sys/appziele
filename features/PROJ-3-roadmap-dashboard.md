# PROJ-3: Roadmap-Dashboard & Fortschrittsanzeige

## Status: Deployed
**Created:** 2026-04-03
**Last Updated:** 2026-04-16

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
**Date:** 2026-04-16
**Tester:** Claude QA Agent

### Acceptance Criteria
| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 1 | Dashboard zeigt alle Zeitebenen | ✅ Pass | Tabs für jede LifeArea + TimelineAccordion mit allen Ebenen |
| 2 | Aktuelles Quartal/Monat hervorgehoben | ✅ Pass | "Aktuell" Badge im Jahresplan, blauer Punkt beim aktuellen Monat |
| 3 | Fortschrittsbalken pro Lebensbereich | ✅ Pass | Gesamtfortschritt + farbige Bereichs-Badges mit % |
| 4 | Aufgaben als erledigt markieren | ✅ Pass | Toggle in WeekFocusView und TimelineAccordion; localStorage-Persist |
| 5 | Filter-Tabs für Lebensbereiche | ✅ Pass | Tabs für alle Bereiche + "Diese Woche" + "Jahresplan" |
| 6 | "Diese Woche"-Ansicht zeigt aktuelle Wochenziele | ✅ Pass | Default-Tab, zeigt alle Bereiche kompakt |
| 7 | Responsive Design Desktop + Tablet | ✅ Pass | Getestet auf 375px, 768px, 1440px |
| 8 | Fortschritt Echtzeit gespeichert | ✅ Pass | Optimistic UI via useState + localStorage.setItem im toggle |

### Bugs Found
Keine Bugs gefunden.

### Security Audit
- Alle Daten ausschließlich in localStorage (kein Server, kein API-Aufruf für Completions)
- Keine XSS-Angriffsfläche: Item-Texte werden via React gerendert (kein dangerouslySetInnerHTML)
- Kein Auth erforderlich für diese Feature-Ebene (PROJ-5 fügt Login hinzu)

### Automated Tests
- **Unit tests (useCompletions):** 12/12 passed (`src/hooks/useCompletions.test.ts`)
  - toggle add/remove, localStorage persist, getProgress (0%, 50%, 100%, rounding), isCompleted, corrupt localStorage
- **E2E tests:** 22/22 passed (`tests/PROJ-3-roadmap-dashboard.spec.ts`, Chromium)
  - Alle 8 ACs + 3 Edge Cases + 2 Regressions + Jahresplan-spezifische Tests
- **Gesamt:** 44/44 Unit + 46/46 E2E — keine Regressionen

### Production-Ready: YES

## Deployment
**Date:** 2026-04-16
**Production URL:** https://appziele-ksm1hgt3p-timlauenroth1998-9851s-projects.vercel.app
**Build:** ✅ passed
**Tests:** ✅ 44/44 unit + 46/46 E2E
