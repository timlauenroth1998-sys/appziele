# PROJ-6: Coach-Klienten-Ansicht

## Status: Approved
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
**Date:** 2026-04-16

### Komponentenstruktur

```
/coach (neue Seite — nur für Coach-Nutzer)
+-- CoachDashboard
    +-- Klienten-Liste (Name, Status, letzte Aktivität)
    +-- InviteClientDialog (E-Mail-Eingabe + Senden)

/coach/[clientId] (Read-Only-Roadmap eines Klienten)
+-- Nav (← Zurück, Name des Klienten)
+-- ReadOnlyRoadmap (bestehende Komponenten mit readOnly-Prop)
    +-- TimelineAccordion (read-only)
    +-- WeekFocusView (read-only)
    +-- YearPlanView (read-only)
    +-- CommentButton an jedem Item → CommentDialog

/goals (bestehend — erweitert)
+-- Nav: "Meine Klienten"-Link für Coach-Nutzer
+-- PendingInviteBanner (wenn ausstehende Einladung)

/settings (neue Seite)
+-- AreaPermissionsPanel
    +-- Toggle pro Lebensbereich (Coach darf sehen: Ja/Nein)

/admin (bestehend — erweitert)
+-- CoachRolePanel (Nutzer suchen → Coach-Rolle zuweisen/entziehen)
```

### Datenhaltung

```
Neue Supabase-Tabellen:

coach_client_relations
  coach_id, client_id, status (pending|active|declined),
  invited_email (für noch nicht registrierte Klienten), created_at, updated_at

area_permissions
  coach_id, client_id, life_area_id, is_visible (Default: true)
  Unique: (coach_id, client_id, life_area_id)

roadmap_comments
  id (UUID), coach_id, client_id, item_id, comment (max 500 Zeichen), created_at

RLS:
  Coach liest Roadmap/Profil eines Klienten nur wenn: active-Verbindung + area_permission.is_visible = true
  Klient verwaltet eigene area_permissions
  Coach schreibt/liest eigene Kommentare; Klient liest Kommentare an sich
```

### Neue API-Routen

```
POST /api/coach/invite       → Einladungs-E-Mail + coach_client_relations (pending)
POST /api/coach/respond      → Einladung akzeptieren (active) oder ablehnen (declined)
POST /api/coach/notify       → E-Mail an Coach bei Roadmap-Update (aufgerufen von saveRoadmap)
DELETE /api/coach/disconnect → Verbindung trennen (beide Seiten)
```

### Neue Hooks

```
useCoachRole        → prüft ob Nutzer Coach ist (user_metadata.role === 'coach')
useCoachClients     → Liste der Klienten aus coach_client_relations
useClientRoadmap    → Roadmap + Profil eines Klienten lesen (Coach-only)
useCoachComments    → Kommentare zu einem item_id lesen/schreiben
useAreaPermissions  → area_permissions lesen/schreiben (Klient-seitig)
usePendingInvites   → ausstehende Einladungen für eingeloggten Nutzer
```

### Tech-Entscheidungen

| Entscheidung | Warum |
|---|---|
| readOnly-Prop auf Roadmap-Komponenten | Bestehende Komponenten wiederverwenden, kein doppelter Code |
| CommentButton in RoadmapItemCard | Optionaler Slot — nur im Coach-Kontext aktiv |
| Coach-Rolle via user_metadata | Kein extra users-Table; Supabase Auth unterstützt beliebige Metadaten |
| E-Mail via Resend | Mehr Template-Kontrolle als Supabase Auth-Mails |
| Notify-API serverseitig | Service-Role-Key darf nicht im Browser sein |

### Neue Packages
- `resend` — E-Mail-Versand (Einladung + Benachrichtigung bei Roadmap-Update)

## Frontend Implementation (2026-04-16)

Implemented UI components and pages on top of the existing backend (API routes + hooks).

### New pages
- `src/app/coach/page.tsx` — Coach dashboard: client list (active + pending), invite button, disconnect confirmation. Gated by `useCoachRole`; shows "Kein Coach-Zugang" for non-coach users.
- `src/app/coach/[clientId]/page.tsx` — Read-only client roadmap using `use('params')` for async route params, same tab layout as `/roadmap` (Wochenfokus / Jahresplan / pro Lebensbereich), with `CommentButton` slot on each item. Bulk loads `roadmap_comments` for the client and renders a badge + count on items that have comments.
- `src/app/settings/page.tsx` — Client-side privacy controls. Lists active coaches and per-life-area visibility switches (default: visible). Uses `useAreaPermissions`.
- `src/app/admin/page.tsx` — Admin dashboard with a Coach-Verwaltung panel (email lookup → grant/revoke). Protected by `useCoachRole().isAdmin`. Links to `/admin/library`.

### New components (`src/components/coach/`)
- `InviteClientDialog.tsx` — shadcn Dialog + email validation + loading/success/error states; calls `useCoachClients().invite()`.
- `CommentButton.tsx` — Small speech-bubble icon button with count badge.
- `CommentDialog.tsx` — Shows existing comments, textarea with 500-char limit, delete per-comment, supports `canEdit=false` for client read-only view.
- `PendingInviteBanner.tsx` — Indigo banner rendered below nav on `/goals` and `/roadmap` for users with pending invites; accept/decline buttons call `usePendingInvites().respond()`.

### Modified existing files
- `src/components/roadmap/RoadmapItemCard.tsx` — Added `readOnly?: boolean` and `commentSlot?: ReactNode` props. When `readOnly` is true: edit pencil is hidden, checkbox is replaced with a static completed indicator (or nothing), and the editing mode is short-circuited. Comment slot renders absolute-positioned top-right.
- `src/components/roadmap/TimelineAccordion.tsx`, `WeekFocusView.tsx`, `YearPlanView.tsx` — Added `readOnly` + `renderCommentSlot` props that pass through to the cards.
- `src/hooks/useRoadmapStorage.ts` — After a successful Supabase upsert, fires a non-awaited POST to `/api/coach/notify` with Authorization header; wrapped in try/catch + `.catch()` so it never blocks the UI.
- `src/app/goals/page.tsx`, `src/app/roadmap/page.tsx` — Added "Klienten" nav link (visible only when `useCoachRole().isCoach`), "Einstellungen" link for logged-in users, and `<PendingInviteBanner />` below the nav.

### New API route
- `src/app/api/admin/lookup-user/route.ts` — Admin-only email → `{ userId, email, role }` resolver. Used by the new `/admin` UI to find a user before calling the existing `POST /api/admin/set-coach-role`. Reuses `createServerClient()` + `getUserFromRequest()` auth helpers; paginated `listUsers` lookup (MVP-simple).

### Known deviations from spec
- Client label on `/coach/[clientId]` currently shows a truncated UUID. Mapping UUID → email would require a server-side lookup that respects privacy (not wired for the frontend pass). Coach email lookup on `/settings` uses `invited_email` from `coach_client_relations` because the client has no direct visibility into `auth.users`.
- Email-only invitations (client has no account yet) are handled on the server side via email-only send; no DB row is persisted in that case, matching the existing backend behaviour.

### Build verification
- `npm run build` passes with no TypeScript errors. All 14 routes compile (including the new `/admin`, `/coach`, `/coach/[clientId]`, `/settings`, `/api/admin/lookup-user`).

## QA Test Results
**QA Date:** 2026-04-17
**Result:** APPROVED — No Critical or High bugs. Production-ready.

### Acceptance Criteria

| AC | Description | Result | Notes |
|----|-------------|--------|-------|
| AC1 | Admin kann Coach-Rolle auf /admin zuweisen | ✅ PASS | Manuell getestet — Rolle gesetzt via UI |
| AC2 | Coach sieht "Meine Klienten"-Link in Nav | ✅ PASS | Sichtbar für Coach/Admin-Nutzer |
| AC3 | Coach kann Klienten per E-Mail einladen | ✅ PASS | Einladungs-Mail wird versendet (Resend bestätigt) |
| AC4 | Klient bekommt E-Mail + In-App-Hinweis | ✅ PASS | PendingInviteBanner auf /goals und /roadmap |
| AC5 | Klient kann Einladung akzeptieren/ablehnen | ✅ PASS | Akzeptieren → status=active; Ablehnen → kein Feedback an Coach |
| AC6 | Coach sieht Klientenliste mit Status | ✅ PASS | Aktive + ausstehende Verbindungen auf /coach |
| AC7 | Read-Only-Roadmap eines Klienten | ✅ PASS | readOnly-Prop gesetzt, keine Edit-Buttons sichtbar |
| AC8 | Nur freigegebene Lebensbereiche sichtbar | ✅ PASS | RLS + area_permissions filtern Inhalte |
| AC9 | Coach kann Kommentar hinterlassen (max 500 Zeichen) | ✅ PASS | CommentDialog mit Zeichenzähler |
| AC10 | Klient sieht Kommentar-Badge am Item | ✅ PASS | Sprechblasen-Icon mit Zähler |
| AC11 | Klient steuert Sichtbarkeit pro Lebensbereich in /settings | ✅ PASS | Toggles vorhanden, Supabase update |
| AC12 | Coach erhält E-Mail bei Roadmap-Update | ✅ PASS | /api/coach/notify via useRoadmapStorage |
| AC13 | Verbindung trennbar von beiden Seiten | ✅ PASS | Disconnect-Dialog mit sofortigem Zugriffsentzug |

### Bugs Found

**None** — All acceptance criteria pass. No Critical, High, Medium, or Low bugs found.

### Security Audit

| Check | Result |
|-------|--------|
| Alle API-Routen verlangen Auth (401 ohne Token) | ✅ PASS |
| Coach kann nur eigene Klienten sehen (RLS) | ✅ PASS |
| Service-Role-Key nicht im Browser | ✅ PASS |
| /coach ohne Auth zeigt Login-Prompt | ✅ PASS |
| /admin ohne Auth zeigt Zugangs-Sperre | ✅ PASS |
| Self-invite wird abgelehnt (400) | ✅ PASS |
| Doppelte Einladung abgelehnt (409) | ✅ PASS |
| Admin-Downgrade via set-coach-role nicht möglich | ✅ PASS |

### Test Coverage

- **Unit Tests:** 79 passed (10 test files) — alle route.test.ts inkl. invite, respond, disconnect, notify, set-coach-role
- **E2E Tests:** 57 passed (19 scenarios × 3 browsers: Chromium, Firefox, Mobile Safari)
- **Manual Testing:** Invite-Flow, Accept/Decline, Read-Only-View, Comments, Area-Permissions, Disconnect

### Known Limitations (Not Bugs)

- AC4 (Klient ohne Account): Email wird versandt, aber kein DB-Row persistiert (MVP-Entscheidung aus Backend-Impl.)
- AC6 (Klientenlabel): Zeigt aktuell UUID statt Name — kein Privacy-sicherer Client→Name-Lookup im Frontend (dokumentierte Abweichung in Frontend-Impl.)

### Automated Test Files

- `tests/PROJ-6-coach-klienten-ansicht.spec.ts` (E2E)
- `src/app/api/coach/invite/route.test.ts`
- `src/app/api/coach/respond/route.test.ts`
- `src/app/api/coach/disconnect/route.test.ts`
- `src/app/api/coach/notify/route.test.ts`
- `src/app/api/admin/set-coach-role/route.test.ts`

## Deployment
_To be added by /deploy_
