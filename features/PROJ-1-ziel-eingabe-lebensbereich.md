# PROJ-1: Ziel-Eingabe & Lebensbereich-Profil

## Status: Planned
**Created:** 2026-04-03
**Last Updated:** 2026-04-03

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
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
