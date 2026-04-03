# PROJ-5: Benutzerkonten & optionaler Login

## Status: Planned
**Created:** 2026-04-03
**Last Updated:** 2026-04-03

## Dependencies
- None (kann parallel zu PROJ-1-4 entwickelt werden, erweitert deren Funktionen)

## User Stories
- Als Nutzer möchte ich mich registrieren und einloggen, damit meine Ziele und Roadmaps auf allen Geräten verfügbar sind
- Als Nutzer möchte ich die App auch ohne Account nutzen, damit ich sie unverbindlich ausprobieren kann
- Als Nutzer möchte ich meine lokal gespeicherten Daten in einen Account überführen, wenn ich mich registriere
- Als Nutzer möchte ich mich über E-Mail/Passwort oder Magic Link einloggen
- Als Coach möchte ich einen eigenen Account haben, über den ich meine Klienten verwalten kann

## Acceptance Criteria
- [ ] Registrierung möglich mit E-Mail + Passwort
- [ ] Login möglich mit E-Mail + Passwort sowie Magic Link (E-Mail)
- [ ] Ohne Login: App vollständig nutzbar, Daten in localStorage gespeichert
- [ ] Bei Registrierung: localStorage-Daten werden automatisch in die Datenbank migriert
- [ ] Eingeloggter Nutzer sieht Daten über alle Geräte hinweg (Cloud-Sync)
- [ ] Logout-Funktion mit Bestätigungsdialog
- [ ] Passwort-Reset über E-Mail
- [ ] Session bleibt 30 Tage aktiv (Persistent Login)

## Edge Cases
- Was passiert, wenn eine E-Mail-Adresse bereits registriert ist? → Klare Fehlermeldung + "Passwort vergessen"-Link
- Was passiert, wenn localStorage-Daten vorhanden sind und der Nutzer sich in einen bestehenden Account einloggt? → Dialog: "Möchtest du deine lokalen Daten in deinen Account importieren?"
- Was passiert bei einem abgelaufenen Magic Link? → Erklärende Fehlermeldung + Option, neuen Link anzufordern
- Was passiert bei deaktiviertem JavaScript? → Hinweis, dass die App JS benötigt

## Technical Requirements
- Supabase Auth (E-Mail/Passwort + Magic Link)
- Row Level Security (RLS) für alle User-Daten-Tabellen
- Middleware für geschützte Routen (Next.js Middleware)
- Keine Social Logins im MVP (Google, Apple etc. kommen in P2)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
