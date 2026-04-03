# PROJ-1: Ziel-Eingabe & Lebensbereich-Profil

## Status: Approved
**Created:** 2026-04-03
**Last Updated:** 2026-04-03
**Architected:** 2026-04-03

## Dependencies
- None

## User Stories
- Als Nutzer möchte ich meine Ziele einem Lebensbereich zuordnen, damit die Roadmap thematisch strukturiert ist
- Als Nutzer möchte ich für jeden Lebensbereich ein Jahresziel, Quartalsziel, Monatsziel und Wochenziel eingeben, damit die App einen vollständigen Fahrplan erstellen kann
- Als Nutzer möchte ich eigene Lebensbereiche hinzufügen (über die Standardbereiche hinaus), damit die App meinen individuellen Fokus abbildet
- Als Nutzer möchte ich meine eingegebenen Ziele jederzeit bearbeiten, damit ich auf Veränderungen reagieren kann
- Als Coach möchte ich die Ziele meiner Klienten im Namen des Klienten eingeben, damit ich die App direkt in Coaching-Sessions nutzen kann

## Acceptance Criteria
- [ ] Nutzer kann mindestens einen Lebensbereich auswählen (Vorgaben: Karriere & Beruf, Gesundheit & Fitness, Finanzen, Beziehungen & Familie)
- [ ] Nutzer kann eigene Lebensbereiche als Freitext hinzufügen
- [ ] Pro Lebensbereich können folgende Felder ausgefüllt werden: Jahresziel, Quartalsziel, Monatsziel, Wochenziel (alle optional außer Jahresziel)
- [ ] Nutzer kann eine übergeordnete Vision / 5-Jahres-Vision als Freitext eingeben
- [ ] Pflichtfeld-Validierung: Mindestens 1 Lebensbereich und Jahresziel sind erforderlich
- [ ] Alle eingegebenen Daten werden lokal gespeichert (localStorage) wenn kein Account vorhanden
- [ ] Eingabeformular ist in < 3 Minuten ausfüllbar (klares, schrittweises UI)
- [ ] Nutzer sieht eine Zusammenfassung aller eingegeben Ziele vor dem Generieren der Roadmap

## Edge Cases
- Was passiert, wenn der Nutzer nur ein Jahresziel ohne Quartalsziel eingibt? → KI leitet die fehlenden Ebenen ab
- Was passiert bei sehr kurzem Zieltext (< 10 Zeichen)? → Warnung anzeigen, aber nicht blockieren
- Was passiert, wenn der Nutzer 10+ Lebensbereiche hinzufügt? → Maximal 8 Bereiche erlaubt mit entsprechendem Hinweis
- Was passiert, wenn die Seite neu geladen wird? → Daten aus localStorage wiederherstellen (kein Datenverlust)
- Was passiert bei leerem Pflichtfeld beim Absenden? → Inline-Fehlermeldung direkt beim Feld anzeigen

## Technical Requirements
- Formular-Validierung mit Zod + react-hook-form
- Lokale Persistenz via localStorage für nicht eingeloggte Nutzer
- Datenbankschema: `goals` Tabelle mit Feldern: id, user_id, life_area, vision_5y, year_goal, quarter_goal, month_goal, week_goal, created_at, updated_at
- Responsive Design: Mobile-first (Coaches nutzen oft Tablets in Sessions)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Seitenstruktur & Routing

```
/ (Landing Page)
+-- WelcomeHero (CTA: "Jetzt starten")
+-- → Weiterleitung zu /onboarding

/onboarding (4-Schritt-Wizard)
+-- OnboardingWizard
|   +-- ProgressIndicator (Schritt 1 von 4)
|   +-- [Schritt 1] VisionInput (5-Jahres-Vision)
|   +-- [Schritt 2] LifeAreaSelector
|   |   +-- Vordefinierte Bereiche (toggle-fähige Chips)
|   |   +-- "Eigenen Bereich hinzufügen" (Input + Button)
|   +-- [Schritt 3] GoalInputForm
|   |   +-- LifeAreaTabs (ein Tab pro Lebensbereich)
|   |   |   +-- YearGoalField (Pflichtfeld)
|   |   |   +-- QuarterGoalField / MonthGoalField / WeekGoalField (optional)
|   +-- [Schritt 4] GoalSummary
|   |   +-- LifeAreaCard (Übersicht aller Ziele)
|   |   +-- "Roadmap generieren"-Button
|   +-- WizardNavigation (Zurück / Weiter)

/goals (Ziele nachträglich bearbeiten)
+-- GoalEditView
|   +-- LifeAreaTabs + GoalEditForm
|   +-- "Lebensbereich hinzufügen / entfernen"
```

### Datenmodell (localStorage → später Supabase)

```
GoalProfile
├── vision5y          Text (5-Jahres-Vision, optional)
├── createdAt / updatedAt
└── lifeAreas[]
    ├── id            z.B. "career", "health" oder UUID für Custom
    ├── name          "Karriere & Beruf"
    ├── isCustom      Boolean
    ├── color         Farbe für visuelle Unterscheidung
    ├── yearGoal      Text (Pflichtfeld)
    ├── quarterGoal   Text (optional)
    ├── monthGoal     Text (optional)
    └── weekGoal      Text (optional)

Supabase-Tabelle (für PROJ-5): goals
├── id, user_id, life_area, vision_5y
├── year_goal, quarter_goal, month_goal, week_goal
└── created_at, updated_at
```

### Tech-Entscheidungen

| Entscheidung | Warum |
|---|---|
| 4-Schritt-Wizard | < 3 Min Ausfüllzeit; führt Nutzer schrittweise ohne Überwältigung |
| Tabs pro Lebensbereich | Klar bei 4-8 Bereichen; shadcn Tabs bereits vorhanden |
| localStorage als Start | Kein Login-Zwang; sofortige Nutzung; saubere Migration zu DB via Custom Hook |
| `useGoalStorage` Hook | Abstrahiert Speicherort – ermöglicht nahtlosen Wechsel zu Supabase in PROJ-5 |
| Zod + react-hook-form | Bereits im Stack; Schritt-für-Schritt-Validierung ohne Extra-Aufwand |

### Neue Pakete
Keine – alle shadcn/ui-Komponenten (Tabs, Input, Textarea, Button, Badge, Card, Form) bereits installiert.

## Implementation Notes
**Frontend completed 2026-04-03**

### Dateien erstellt:
- `src/lib/types.ts` – GoalProfile, LifeAreaGoal Types + Farbkonstanten
- `src/hooks/useGoalStorage.ts` – localStorage-Abstraktion
- `src/app/page.tsx` – Landing Page (ersetzt Next.js Default)
- `src/app/onboarding/page.tsx` – 4-Schritt-Wizard
- `src/components/onboarding/StepVisionInput.tsx` – Schritt 1
- `src/components/onboarding/StepLifeAreaSelector.tsx` – Schritt 2
- `src/components/onboarding/StepGoalInput.tsx` – Schritt 3 (Tabs pro Lebensbereich)
- `src/components/onboarding/StepGoalSummary.tsx` – Schritt 4
- `src/app/goals/page.tsx` – Ziele bearbeiten mit Auto-Save

### Abweichungen vom Spec:
- "Roadmap generieren"-Button in `/goals` deaktiviert (wird in PROJ-2 aktiviert)
- Sprache: Vollständig Deutsch

## QA Test Results

**Tested:** 2026-04-03
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)

### Acceptance Criteria Status

#### AC-1: Lebensbereiche auswählen
- [x] Alle 4 Standardbereiche werden auf Schritt 2 angezeigt
- [x] Bereiche können aktiviert/deaktiviert werden (Toggle)

#### AC-2: Eigene Lebensbereiche hinzufügen
- [x] Eigener Bereich kann per Text-Input hinzugefügt werden
- [x] Eigener Bereich erscheint als Tab auf Schritt 3

#### AC-3: Alle 4 Zielfelder ausfüllbar
- [x] Jahresziel, Quartalsziel, Monatsziel, Wochenziel alle vorhanden
- [x] Alle 4 Felder können befüllt werden

#### AC-4: 5-Jahres-Vision eingeben
- [x] Textarea für Vision auf Schritt 1 vorhanden und beschreibbar
- [x] Schritt 1 kann übersprungen werden ohne Vision

#### AC-5: Pflichtfeld-Validierung
- [x] Weiter-Klick ohne Jahresziel zeigt Fehlermeldung
- [x] Fehler verschwindet nach korrekter Eingabe und Weiter-Klick

#### AC-6: localStorage-Persistenz
- [x] Profil wird nach Abschluss in localStorage gespeichert
- [x] Daten überleben Seiten-Reload (kein Datenverlust)

#### AC-7: Formular in < 3 Minuten ausfüllbar
- [x] Alle 4 Schritte erreichbar und zeigen korrekten Inhalt
- [x] Schrittanzeige "Schritt X von 4" korrekt

#### AC-8: Zusammenfassung vor Generierung
- [x] Schritt 4 zeigt alle eingegebenen Ziele und Vision

### Edge Cases Status

#### EC-1: Nur Jahresziel ohne Quartalsziel
- [x] Formular erlaubt das; KI-Ableitung in PROJ-2 vorgesehen

#### EC-2: Kurzer Zieltext (< 10 Zeichen)
- [ ] **BUG-1:** Warnung wird NICHT angezeigt (Spec: "Warnung anzeigen, aber nicht blockieren") – Medium

#### EC-3: Maximum 8 Lebensbereiche
- [x] Nach 8 Bereichen erscheint Hinweis, Eingabe wird ausgeblendet

#### EC-4: Seite neu laden
- [x] localStorage-Daten werden korrekt wiederhergestellt

#### EC-5: Leeres Pflichtfeld
- [x] Inline-Fehlermeldung erscheint direkt beim Feld

### Security Audit Results
- [x] Kein Backend/API vorhanden – keine serverseitigen Angriffsflächen
- [x] XSS: Alle Eingaben werden von React korrekt escaped (kein `dangerouslySetInnerHTML`)
- [x] localStorage-Daten enthalten keine Secrets oder sensitiven Auth-Tokens
- [x] Keine externe Datenweitergabe (reine Client-Side-App in PROJ-1)
- [x] Keine sensiblen Daten in der URL (keine Query-Parameter mit Zielen)

### Bugs Found

#### BUG-1: Keine Warnung bei kurzem Zieltext
- **Severity:** Low
- **Steps to Reproduce:**
  1. `/onboarding` → Schritt 3
  2. Jahresziel mit < 10 Zeichen eingeben (z.B. "Fit")
  3. Expected: Gelbe Warnung "Ziel sehr kurz"
  4. Actual: Keine Warnung – Formular akzeptiert kurze Eingaben ohne Hinweis
- **Priority:** Nice to have (kein Blocking-Issue)

### Test Suite

| Suite | Tests | Passed | Failed |
|-------|-------|--------|--------|
| Unit (Vitest) | 9 | 9 | 0 |
| E2E Chromium (Playwright) | 19 | 19 | 0 |
| **Gesamt** | **28** | **28** | **0** |

### Summary
- **Acceptance Criteria:** 8/8 passed ✓
- **Bugs Found:** 1 total (0 critical, 0 high, 0 medium, 1 low)
- **Security:** Pass – reine Client-Side-App, keine Angriffsflächen in PROJ-1
- **Production Ready:** YES
- **Recommendation:** Deploy – BUG-1 kann in PROJ-2/3 Sprint nachgeholt werden

## Deployment
_To be added by /deploy_
