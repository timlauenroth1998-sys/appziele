# PROJ-5: Benutzerkonten & optionaler Login

## Status: In Progress
**Created:** 2026-04-03
**Last Updated:** 2026-04-16

## Dependencies
- Requires: PROJ-1 (Ziel-Eingabe) – localStorage-Profil wird bei Migration in DB übertragen
- Requires: PROJ-2 (KI-Roadmap) – localStorage-Roadmap wird bei Migration in DB übertragen

## User Stories
- Als Nutzer möchte ich die App vollständig ohne Account nutzen, damit ich sie unverbindlich ausprobieren kann
- Als Nutzer möchte ich mich jederzeit mit E-Mail und Passwort registrieren, damit meine Daten sicher in der Cloud gespeichert werden
- Als Nutzer möchte ich mich einloggen und meine Ziele auf mehreren Geräten sehen, damit ich überall Zugriff habe
- Als Nutzer möchte ich beim ersten Login meine lokalen Daten automatisch migriert bekommen, damit ich nichts verliere
- Als Nutzer möchte ich mein Passwort zurücksetzen können, wenn ich es vergessen habe
- Als Nutzer möchte ich mich ausloggen können, damit meine Daten auf gemeinsam genutzten Geräten sicher sind

## Acceptance Criteria
- [ ] App ist vollständig ohne Login nutzbar (localStorage bleibt primärer Speicher für nicht eingeloggte Nutzer)
- [ ] "Anmelden"-Button in der Nav-Bar auf /goals und /roadmap (nur wenn nicht eingeloggt)
- [ ] Eigene Seite /auth mit Login- und Registrierungs-Tab
- [ ] Registrierung mit E-Mail + Passwort (Passwort min. 8 Zeichen)
- [ ] Login mit E-Mail + Passwort
- [ ] Bei erstem Login/Registrierung: localStorage-Daten (Profil + Roadmap + Completions) werden automatisch still in die Supabase-DB migriert
- [ ] Eingeloggter Nutzer lädt Daten aus Supabase (nicht localStorage)
- [ ] Logout-Funktion (Klick auf Avatar/Name in Nav-Bar) → sofortige Session-Beendigung
- [ ] Passwort-Reset: E-Mail-Link zum Zurücksetzen
- [ ] Session bleibt 30 Tage aktiv (Supabase default: Refresh Token)
- [ ] Nav-Bar zeigt nach Login Avatar/Initial des Nutzers statt "Anmelden"-Button

## Edge Cases
- Was passiert, wenn E-Mail bereits registriert ist? → Klare Fehlermeldung "Diese E-Mail ist bereits registriert" + Link zu Login
- Was passiert, wenn localStorage-Daten vorhanden sind und Nutzer sich in **bestehenden** Account einloggt? → Lokale Daten werden trotzdem in DB geschrieben (merge: Cloud-Daten haben Vorrang bei Konflikten)
- Was passiert, wenn Nutzer auf Gerät 2 einloggt und Gerät 1 hat neuere lokale Daten? → Cloud-Daten gewinnen; lokale Daten werden verworfen
- Was passiert bei falschem Passwort? → "E-Mail oder Passwort falsch" (keine Unterscheidung aus Security-Gründen)
- Was passiert bei nicht bestätigter E-Mail? → Hinweis "Bitte bestätige deine E-Mail-Adresse" + Resend-Button
- Was passiert bei sehr schwachem Passwort (< 8 Zeichen)? → Inline-Validierung vor dem Submit

## Technical Requirements
- Supabase Auth (E-Mail/Passwort)
- Kein Magic Link, kein OAuth im MVP
- Row Level Security (RLS) auf allen user-spezifischen Tabellen (`goal_profiles`, `roadmaps`, `completions`)
- Supabase-Tabellen: `goal_profiles` (user_id, data jsonb), `roadmaps` (user_id, data jsonb), `completions` (user_id, item_ids jsonb)
- Next.js Middleware: /auth frei, alle anderen Seiten bleiben öffentlich (kein Redirect-Gate)
- Datenmigrations-Funktion: läuft einmalig nach erfolgreichem Login/Registrierung
- Keine geschützten Routen (Login bleibt optional für alle Seiten)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
**Date:** 2026-04-16

### Komponentenstruktur

```
/auth (neue Seite)
+-- AuthPage
    +-- Tabs: "Anmelden" | "Registrieren"
    +-- LoginForm (E-Mail + Passwort + "Passwort vergessen?"-Link)
    +-- RegisterForm (E-Mail + Passwort mit Inline-Validierung)
    +-- ForgotPasswordForm (E-Mail → Reset-Link senden)

Nav-Bar (bestehend — /goals, /roadmap)
+-- [nicht eingeloggt] "Anmelden"-Button → /auth
+-- [eingeloggt]       UserAvatar (Initial)
                       +-- DropdownMenu: E-Mail + "Abmelden"
```

### Datenhaltung

```
Nicht eingeloggt (wie bisher): localStorage
Eingeloggt: Supabase-Tabellen

  goal_profiles:  user_id (UUID) | data (JSON: GoalProfile) | updated_at
  roadmaps:       user_id (UUID) | data (JSON: Roadmap)     | updated_at
  completions:    user_id (UUID) | item_ids (JSON-Array)    | updated_at

Datenmigration: einmalig still nach erstem Login
  localStorage → Supabase (kein Dialog, kein Interrupt)
```

### Neue Hooks

```
useAuth          → Supabase-Session global beobachten, User-State bereitstellen
useMigration     → Einmalig lokale Daten nach Login in Supabase übertragen

Bestehende Hooks (useGoalStorage, useRoadmapStorage, useCompletions):
  → Werden erweitert: eingeloggt → Supabase | nicht eingeloggt → localStorage
```

### Auth-Flow

```
1. "Anmelden"-Button in Nav → /auth
2. Login/Register mit E-Mail + Passwort (Supabase Auth)
3. Bei Erfolg: silent Migration lokaler Daten → Supabase
4. Redirect zurück zu /goals oder /roadmap
5. Nav zeigt UserAvatar statt "Anmelden"-Button
6. Session: 30 Tage (Supabase Refresh Token)
```

### Sicherheit

```
Row Level Security auf allen Tabellen:
  - Lesen/Schreiben/Löschen: nur eigene Zeilen (user_id = auth.uid())
```

### Tech-Entscheidungen

| Entscheidung | Warum |
|---|---|
| Supabase Auth | Bereits im Stack, kostenfrei, E-Mail+Passwort out-of-the-box |
| JSON-Spalten (nicht normalisiert) | GoalProfile/Roadmap sind komplexe Objekte — JSON flexibel, kein Schema-Migration-Risiko |
| Bestehende Hooks erweitern | Minimale Änderungen an Pages — nur Storage-Schicht tauscht aus |
| Kein Redirect-Gate | Login bleibt freiwillig, kein Nutzer wird ausgesperrt |

### Neue Packages
Keine — `@supabase/supabase-js` ist bereits installiert. `src/lib/supabase.ts` muss nur aktiviert werden.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
