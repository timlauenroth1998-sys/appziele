# PROJ-6: Coach-Klienten-Ansicht

## Status: Planned
**Created:** 2026-04-03
**Last Updated:** 2026-04-16

## Dependencies
- Requires: PROJ-5 (Benutzerkonten) – Accounts für Coach und Klient erforderlich
- Requires: PROJ-3 (Dashboard) – Klienten-Roadmap muss für Coach im Read-Only-Modus darstellbar sein

## User Stories
- Als Admin möchte ich einem Nutzer Coach-Rechte erteilen (via /admin), damit nur geprüfte Coaches Klienten einladen können
- Als Coach möchte ich Klienten per E-Mail einladen, damit sie mir Zugriff auf ihre Roadmap geben können
- Als Klient möchte ich Einladungen von Coaches akzeptieren oder ablehnen, damit ich selbst entscheide wer meine Ziele sieht
- Als Coach möchte ich die Roadmap meiner Klienten im Read-Only-Modus sehen, damit ich Sessions besser vorbereiten kann
- Als Coach möchte ich zu einzelnen Roadmap-Items meiner Klienten Kommentare hinterlassen, damit ich gezieltes Feedback geben kann
- Als Klient möchte ich Kommentare des Coaches direkt am jeweiligen Roadmap-Item sehen (Sprechblase/Badge)
- Als Klient möchte ich pro Lebensbereich einstellen, ob mein Coach diesen sehen darf
- Als Coach möchte ich eine E-Mail erhalten, wenn ein Klient seine Roadmap aktualisiert
- Als Coach oder Klient möchte ich die Verbindung jederzeit trennen können

## Acceptance Criteria
- [ ] Admin kann auf /admin einem Nutzer die Rolle "coach" zuweisen
- [ ] Coach sieht in der Nav einen neuen Menüpunkt "Meine Klienten" → /coach
- [ ] Coach kann auf /coach Klienten per E-Mail einladen (Einladungs-E-Mail mit Akzeptieren-Link)
- [ ] Klient mit Account bekommt E-Mail + In-App-Hinweis; Klient ohne Account bekommt E-Mail mit Registrierungslink
- [ ] Klient kann Einladung akzeptieren oder ablehnen (kein Feedback an Coach bei Ablehnung)
- [ ] Coach sieht Liste aller verbundenen Klienten (Name/E-Mail + letzter Aktivitätsstatus)
- [ ] Coach kann Roadmap eines Klienten im Read-Only-Modus öffnen (keine Bearbeitungsmöglichkeit)
- [ ] Coach sieht nur Lebensbereiche, die der Klient für ihn freigegeben hat
- [ ] Coach kann an einzelnen Roadmap-Items einen Kommentar hinterlassen (max. 500 Zeichen)
- [ ] Klient sieht Kommentar-Badge (Sprechblasen-Icon) am jeweiligen Item; Klick öffnet den Kommentar
- [ ] Klient kann pro Lebensbereich in den Einstellungen festlegen, ob Coach diesen sehen darf
- [ ] Coach erhält E-Mail-Benachrichtigung, wenn verbundener Klient Roadmap neu generiert oder Ziele ändert
- [ ] Coach und Klient können Verbindung jeweils einseitig trennen (sofortiger Entzug des Zugriffs)

## Edge Cases
- Was passiert, wenn ein Klient noch keinen Account hat? → Einladungs-E-Mail enthält Registrierungslink; nach Registrierung erscheint die ausstehende Einladung
- Was passiert, wenn der Klient die Einladung ablehnt? → Status bleibt "abgelehnt", Coach bekommt keine Benachrichtigung (Datenschutz)
- Was passiert, wenn ein Klient alle Lebensbereiche für den Coach sperrt? → Coach sieht leeres Dashboard mit Hinweis "Klient hat keinen Bereich freigegeben"
- Was passiert, wenn ein Coach > 20 Klienten hat? → Paginierung/Scroll in der Klientenliste (20 pro Seite)
- Was passiert, wenn der Coach-Account gelöscht wird? → Alle Verbindungen automatisch getrennt; Klienten-Daten bleiben unverändert
- Was passiert, wenn ein Klient einen Lebensbereich sperrt, zu dem bereits Kommentare existieren? → Kommentare bleiben in DB, aber Coach sieht den Bereich nicht mehr; Klient sieht seine eigenen Kommentare weiterhin
- Was passiert bei doppelter Einladung (gleiche E-Mail nochmal)? → "Einladung bereits gesendet" Hinweis, kein zweiter Send
- Was passiert, wenn Coach sich selbst einlädt? → Validierung: eigene E-Mail kann nicht eingeladen werden

## Technical Requirements
- **Coach-Rolle:** Neues Feld `role` (enum: `user` | `coach`) in Supabase `auth.users` (via `user_metadata`) — gesetzt durch Admin via Service-Role-Key
- **Neue Tabellen:**
  - `coach_client_relations`: coach_id, client_id, status (`pending` | `active` | `declined`), created_at, updated_at
  - `area_permissions`: client_id, coach_id, life_area_id, is_visible (Default: true)
  - `roadmap_comments`: id, coach_id, client_id, roadmap_item_id, comment (max 500 Zeichen), created_at
- **RLS:** Coach-Zugriff auf `goal_profiles`/`roadmaps` nur via `coach_client_relations` (active) + `area_permissions`
- **E-Mail:** Einladungs-E-Mail und Benachrichtigungs-E-Mail via Supabase Auth Emails oder Resend
- **Read-Only-Ansicht:** Gleiche Roadmap-Komponenten wie /roadmap, aber ohne Edit/Generate-Buttons und Completion-Toggle
- **Admin:** Bestehende /admin-Seite erhält Coach-Freischaltungs-UI

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
