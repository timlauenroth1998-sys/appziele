# PROJ-6: Coach-Klienten-Ansicht

## Status: Planned
**Created:** 2026-04-03
**Last Updated:** 2026-04-03

## Dependencies
- Requires: PROJ-5 (Benutzerkonten) – Accounts für Coach und Klient erforderlich
- Requires: PROJ-3 (Dashboard) – Klienten-Dashboard muss für Coach lesbar sein

## User Stories
- Als Coach möchte ich Klienten per E-Mail-Einladung zu meinem Coach-Account hinzufügen, damit ich deren Ziele einsehen kann
- Als Coach möchte ich die Ziele und Roadmaps aller meiner Klienten in einer Übersicht sehen, damit ich Sessions besser vorbereiten kann
- Als Coach möchte ich zu einzelnen Aufgaben oder Zielen meiner Klienten Kommentare hinterlassen, damit ich Feedback geben kann
- Als Klient möchte ich bestimmen, welche Lebensbereiche mein Coach sehen darf (Datenschutz), damit private Bereiche geschützt sind
- Als Klient möchte ich Einladungen von Coaches akzeptieren oder ablehnen

## Acceptance Criteria
- [ ] Coach kann Klienten per E-Mail einladen (Einladungs-E-Mail via Supabase)
- [ ] Klient bekommt E-Mail mit Link zum Akzeptieren der Einladung
- [ ] Coach sieht eine Liste aller verbundenen Klienten mit letztem Aktivitätsstatus
- [ ] Coach kann das Dashboard und die Roadmap eines Klienten im "Read-Only"-Modus öffnen
- [ ] Coach kann Kommentare zu einzelnen Roadmap-Einträgen hinterlassen
- [ ] Klient sieht Kommentare des Coaches direkt bei der jeweiligen Aufgabe
- [ ] Klient kann pro Lebensbereich einstellen, ob Coach diesen sehen darf
- [ ] Coach kann eine Klienten-Verbindung trennen; Klient kann die Verbindung auch selbst trennen

## Edge Cases
- Was passiert, wenn ein Klient noch keinen Account hat? → Einladungs-E-Mail enthält Registrierungslink
- Was passiert, wenn der Klient die Einladung ablehnt? → Coach bekommt keine Benachrichtigung (Datenschutz)
- Was passiert, wenn ein Coach > 20 Klienten hat? → Paginierung in der Klientenliste
- Was passiert, wenn ein Klient alle Lebensbereiche für den Coach sperrt? → Coach sieht leeres Dashboard mit Hinweis
- Was passiert, wenn der Coach-Account gelöscht wird? → Verbindungen werden automatisch getrennt, Klienten-Daten bleiben erhalten

## Technical Requirements
- Supabase RLS: Coach-Zugriff nur auf explizit freigegebene Daten
- Datenbankschema: `coach_client_relations` Tabelle: coach_id, client_id, status (pending/active), created_at
- Datenbankschema: `area_permissions` Tabelle: client_id, coach_id, life_area, is_visible
- Datenbankschema: `roadmap_comments` Tabelle: id, coach_id, client_id, roadmap_entry_id, comment, created_at
- E-Mail-Versand via Supabase Auth Emails / Resend

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
