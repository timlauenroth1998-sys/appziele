# PROJ-5: Benutzerkonten & optionaler Login

## Status: In Review
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
**Tested:** 2026-04-16
**Tester:** QA skill (automated)
**Environments:** Chromium (desktop + 375/768/1440 viewports). Mobile Safari (webkit) browser not installed locally — cross-browser coverage on webkit/firefox remains OPEN. No Firefox run.
**Test suites:**
- Unit tests: 52/52 passed (44 pre-existing + 8 new `useAuth` tests)
- E2E tests (Chromium): 41/42 passed in `tests/PROJ-5-benutzerkonten.spec.ts`
- Regression (full E2E on Chromium): 87 passed, 13 failed. 12 of 13 failures are pre-existing PROJ-2 failures (identical to `.last-run.json` before QA started, unrelated to PROJ-5). 1 failure is a real PROJ-5 bug (BUG-P5-001).

### Acceptance Criteria Results

| # | Criterion | Status | Notes |
|---|-----------|:------:|-------|
| AC-1 | App ohne Login nutzbar (localStorage als Default) | PASS | `/goals`, `/roadmap`, `/onboarding`, `/` alle erreichbar ohne Auth. localStorage persistiert. |
| AC-2 | "Anmelden"-Button in Nav-Bar auf /goals und /roadmap | PARTIAL FAIL | Sichtbar auf `/goals` und `/roadmap`, solange ein Profil existiert. **BUG-P5-001:** Bei leerem Profil zeigt `/roadmap` (und `/goals`) einen Empty-State OHNE Nav-Bar — damit auch kein "Anmelden"-Button. |
| AC-3 | /auth mit Login- und Register-Tab | PASS | Beide Tabs sichtbar und wechselbar; Login-Tab ist Default. |
| AC-4 | Registrierung mit E-Mail + Passwort (min. 8 Zeichen) | PASS | Inline-Validierung blockt < 8-Zeichen-Passwörter; Submit verhindert. |
| AC-5 | Login mit E-Mail + Passwort | PASS | Deutsche Fehlermeldung bei falschen Credentials; `#login-email` + `#login-password` mit korrektem Typ. |
| AC-6 | Silent Migration localStorage → Supabase nach Login | NOT TESTED (real auth) | Logik durch Code-Review geprüft (`useMigration.ts`). E2E-Test mit echtem Login nicht durchgeführt (laut QA-Instruktionen). **Siehe BUG-P5-002** zu Race-Condition in `useMigration`. |
| AC-7 | Eingeloggter Nutzer lädt aus Supabase | NOT TESTED (real auth) | Nicht per E2E getestet. Code-Review zeigt: `useGoalStorage`/`useRoadmapStorage`/`useCompletions` lesen bei Session aus Supabase. |
| AC-8 | Logout-Funktion (Dropdown) | NOT TESTED (real auth) | Unit-Test-Coverage via `useAuth` (SIGNED_OUT), aber UI-Dropdown nicht E2E-getestet. |
| AC-9 | Passwort-Reset: E-Mail-Link | PASS (UI) | Forgot-Flow, Generic-Success-Message, E-Mail-Carryover, Back-Button alle PASS. Echte E-Mail-Zustellung nicht getestet. |
| AC-10 | Session 30 Tage aktiv (Refresh Token) | NOT TESTED | Supabase-Default (nicht konfiguriert anderweitig). Code zeigt `autoRefreshToken: true` in `supabase.ts`. Kein Bug gefunden. |
| AC-11 | Nav-Bar zeigt Avatar/Initial nach Login | NOT TESTED (real auth) | Code-Review: `UserAuthButton` zeigt `AvatarFallback` mit `email[0]`. Entspricht Anforderung. |

**Legende:** PASS = Kriterium erfüllt + getestet · PARTIAL FAIL = teilweise erfüllt · FAIL = Kriterium nicht erfüllt · NOT TESTED = Kriterium kann ohne echten Supabase-Login nicht per E2E geprüft werden

### Edge Cases

| Edge Case | Status | Notes |
|---|:---:|---|
| E-Mail bereits registriert | PASS (code) | `mapAuthError` liefert „Diese E-Mail ist bereits registriert." und setzt Tab auf Login; Email wird vorausgefüllt. |
| localStorage + bestehendes Cloud-Profil | PARTIAL | **BUG-P5-002:** `useMigration` schreibt nur, wenn KEINE Cloud-Daten existieren — das entspricht dem Spec-Statement „Cloud-Daten haben Vorrang bei Konflikten". ABER: Die parallelen Hooks `useGoalStorage`/`useRoadmapStorage` können lokale Daten still via `upsert` hochladen, wenn Cloud-Daten fehlen — Race-Condition möglich wenn Migration und Hook-Load gleichzeitig laufen. |
| Cloud neuer als local | PASS (by design) | `useMigration.ts` liest aus Cloud vor dem Schreiben; Cloud gewinnt. |
| Falsches Passwort | PASS | „E-Mail oder Passwort falsch." — ununterscheidbar (Security ok). |
| Nicht bestätigte E-Mail | PASS (code) | „Bitte bestätige zuerst deine E-Mail-Adresse." — kein Resend-Button allerdings (SPEC erwähnt „+ Resend-Button" — siehe BUG-P5-005). |
| Passwort < 8 Zeichen | PASS | Inline-Validierung; Submit geblockt. |

### Security Audit Results

| Test | Status | Notes |
|------|:---:|-------|
| XSS in Login-E-Mail-Feld | PASS | React escaped content; kein `dangerouslySetInnerHTML`; Payload landet als Plain-Text im Input. |
| XSS in Register-E-Mail-Feld | PASS | Siehe oben. |
| E-Mail-Enumeration via Reset-Endpoint | PASS | API liefert immer `{ success: true }` (Status 200), unabhängig davon, ob E-Mail existiert. |
| Input-Validierung Reset-Endpoint | PASS | Zod-Schema prüft E-Mail-Format; malformed JSON → 400; Missing field → 400. |
| Service-Role-Key im Browser geleakt | PASS | `service_role`-String nicht im HTML/Bundle; `createServerClient` nur serverseitig verwendet. |
| Passwort-Input maskiert | PASS | `type="password"` auf allen Passwort-Inputs (Login, Register, Reset). |
| Supabase RLS aktiviert | PASS (SQL) | `supabase/migrations/20260416_proj5_user_data.sql` aktiviert RLS auf `goal_profiles`, `roadmaps`, `completions`. Policy: `auth.uid() = user_id` für ALL-Operation. **Nicht live gegen produktiven Supabase getestet.** Manuelle Prüfung via SQL-Editor empfohlen vor Deploy. |
| HTTPS-Only Supabase-URL | PASS | Env-Var `NEXT_PUBLIC_SUPABASE_URL` verweist auf `https://…supabase.co`. |
| Rate-Limiting Reset-Endpoint | **FAIL** | **BUG-P5-003:** Kein Rate-Limit im eigenen `/api/auth/reset-password`. Ein Angreifer kann beliebig viele Reset-E-Mails triggern (E-Mail-Bomb, Supabase-Kontingent-Exhaustion, E-Mail-Reputation-Schaden). Supabase hat zwar einen globalen Default-Limit, dieser greift aber erst spät. |
| Security-Headers (next.config.ts) | **FAIL** | **BUG-P5-004:** `next.config.ts` setzt KEINE Security-Header: weder `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` noch `Strict-Transport-Security`. Verstoß gegen `.claude/rules/security.md`. Erhöhtes Clickjacking-, MIME-Sniffing- und Referrer-Leak-Risiko. |
| Auth-Tokens in localStorage | INFO | `supabase.ts` verwendet `storageKey: 'ziele_auth_session'` mit `persistSession: true`. Refresh-Token in localStorage — Standard-Supabase-Verhalten; XSS auf anderen Seiten könnte Token stehlen. Spec akzeptiert dieses Modell („Session 30 Tage aktiv"). |
| Redirect-Open-Redirect via `?from=` | **LOW** | **BUG-P5-006:** `/auth?from=…` wird direkt als `window.location.href = redirectTo` verwendet, ohne Whitelist. Mögliche Eingabe `?from=https://evil.com` redirected externen Host nach Login. Risikoarmut: erfordert Social Engineering (Nutzer klickt manipulierten Link). |

### Bug Reports

#### BUG-P5-001 · HIGH · Acceptance Criterion violated
**Title:** `/roadmap` und `/goals` zeigen KEINE Nav-Bar mit "Anmelden"-Button im Empty-State
**Severity:** HIGH (AC-2 nicht erfüllt)
**Priority:** P1 (vor Deploy fixen)
**Area:** Frontend (`src/app/roadmap/page.tsx` Zeile 174–183, `src/app/goals/page.tsx` Zeile 40–49)
**Reproduction:**
1. Inkognito-Browser öffnen (leerer localStorage)
2. Navigation zu `/roadmap` oder `/goals`
3. Page zeigt „Bitte gib zuerst deine Ziele ein." bzw. „Noch keine Ziele eingegeben."
4. Es existiert **keine** Nav-Bar, folglich kein „Anmelden"-Button
**Expected:** Auch im Empty-State muss die Nav-Bar mit `UserAuthButton` gerendert werden (AC-2).
**Impact:** Erst-Nutzer, die direkt auf `/roadmap` oder `/goals` linken, können sich nicht anmelden, ohne vorher `/onboarding` zu durchlaufen. Bricht User Story „App jederzeit ohne Account verwenden, aber jederzeit anmelden können".
**E2E-Test:** `tests/PROJ-5-benutzerkonten.spec.ts:88` schlägt fehl (Chromium).

#### BUG-P5-002 · MEDIUM · Race Condition
**Title:** Race-Condition zwischen `useMigration` und Storage-Hooks beim ersten Login
**Severity:** MEDIUM (Datenverlust-Risiko in Edge-Case)
**Priority:** P2
**Area:** `src/hooks/useMigration.ts` und `src/hooks/useGoalStorage.ts` (Zeile 31–42)
**Analyse:** Nach Login laufen beide Code-Pfade potentiell parallel:
- `useMigration.migrate()` liest Cloud → falls leer, schreibt localStorage-Profil in Cloud.
- `useGoalStorage` (auf `/goals`) liest gleichzeitig Cloud → falls leer, macht `upsert` mit localStorage-Daten.
Zwei parallele `upsert` mit gleichen `user_id`-Keys führen zu Überschreibung/Kollision. Reproduktion schwierig, aber in Slow-Network realistisch.
**Recommendation:** Migration vor dem Mount der Storage-Hooks abwarten (z. B. via `isMigrated`-State in `useAuth`) oder auf `INSERT ... ON CONFLICT DO NOTHING` umstellen statt `upsert`. Außerdem: catch-silenced `try`-Block in `useMigration` verschluckt Fehler.

#### BUG-P5-003 · MEDIUM · Security
**Title:** Kein Rate-Limit auf `/api/auth/reset-password`
**Severity:** MEDIUM (E-Mail-Bomb möglich)
**Priority:** P2
**Area:** `src/app/api/auth/reset-password/route.ts`
**Reproduction:**
```bash
for i in $(seq 1 200); do
  curl -s -X POST http://localhost:3000/api/auth/reset-password \
    -H 'Content-Type: application/json' \
    -d '{"email":"victim@example.com"}' &
done
```
**Expected:** 429 / Rate-Limit-Response nach n Versuchen.
**Actual:** Alle Requests liefern 200. Supabase hat einen internen Limit, aber der Angreifer kann das Postfach eines beliebigen Opfers fluten.
**Recommendation:** `@upstash/ratelimit` oder simple In-Memory-Map mit IP-Bucket (Per-IP ~5 Requests/Stunde). Richtlinie aus `.claude/rules/security.md` fordert „Implement rate limiting on authentication endpoints".

#### BUG-P5-004 · MEDIUM · Security
**Title:** Keine Security-Header in `next.config.ts`
**Severity:** MEDIUM
**Priority:** P2
**Area:** `next.config.ts`
**Finding:** `.claude/rules/security.md` fordert ausdrücklich:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: origin-when-cross-origin`
- `Strict-Transport-Security: ... includeSubDomains`
Keiner dieser Header wird gesetzt. Clickjacking auf `/auth` möglich (iframe-embed), MIME-Sniffing auf Assets.
**Recommendation:** `headers()` in `next.config.ts` hinzufügen.

#### BUG-P5-005 · LOW · Spec-Abweichung
**Title:** Kein „Resend Confirmation"-Button bei unbestätigter E-Mail
**Severity:** LOW
**Priority:** P3
**Area:** `src/app/auth/page.tsx` (Error-Mapping)
**Finding:** Spec: „Bei nicht bestätigter E-Mail? → Hinweis ,Bitte bestätige deine E-Mail-Adresse' + Resend-Button." Aktuell gibt es nur den Hinweis, keinen Resend-Button.
**Recommendation:** Button „Bestätigungs-E-Mail erneut senden" hinzufügen, der `supabase.auth.resend({ type: 'signup', email })` aufruft.

#### BUG-P5-006 · LOW · Security
**Title:** Open-Redirect via `?from=` Parameter
**Severity:** LOW
**Priority:** P3
**Area:** `src/app/auth/page.tsx` Zeile 40 + Zeilen 82/124 (`window.location.href = redirectTo`)
**Reproduction:**
1. `http://localhost:3000/auth?from=https://evil.example.com/phish` öffnen
2. Erfolgreich einloggen → Redirect zu `https://evil.example.com/phish`
**Expected:** `from`-Param nur akzeptieren, wenn er mit `/` beginnt und kein `//` enthält (Protokoll-relative URL).
**Recommendation:** Whitelist auf relative URLs: `const redirectTo = /^\/(?!\/)/.test(from) ? from : '/goals'`.

#### BUG-P5-007 · LOW · Accessibility
**Title:** `UserAuthButton` verschwindet während `isLoaded=false` ohne Platzhalter
**Severity:** LOW
**Priority:** P3
**Area:** `src/components/UserAuthButton.tsx` Zeile 21 (`if (!isLoaded) return null`)
**Finding:** Das Button-Element verschwindet während des initialen Session-Checks komplett — verursacht Layout-Shift (CLS). Ein Skelett (1,75rem Quadrat) wäre besser.
**Recommendation:** `<Skeleton className="h-8 w-8 rounded-full" />` statt `return null`.

#### BUG-P5-008 · INFO · Code-Quality
**Title:** `useMigration` swallow-alles-Errors ohne Logging
**Severity:** INFO
**Priority:** P3
**Area:** `src/hooks/useMigration.ts` Zeile 80 (`catch { /* silent */ }`)
**Finding:** Jeder Fehler wird komplett verschluckt. Bei Production-Debugging nicht nachvollziehbar, ob/warum Migration fehlschlägt.
**Recommendation:** Mindestens `console.error('[migration]', err)` im catch-Block.

### Regression
- Alle bestehenden PROJ-1, PROJ-3, PROJ-4 E2E-Tests: PASS (kein neues Regression-Delta durch PROJ-5)
- PROJ-2 E2E-Tests: 12/18 vorher schon failing — unverändert (Backend nicht erreichbar oder Roadmap-API rate-limited). NICHT PROJ-5-verursacht (Baseline-Snapshot vor QA-Start belegt identisches Muster).

### Priorisierung für Deploy
- **BLOCKIERT Deploy:** BUG-P5-001 (HIGH, Acceptance Criterion verletzt)
- **Sollte vor Deploy gelöst werden:** BUG-P5-002, BUG-P5-003, BUG-P5-004 (MEDIUM, Security/Robustheit)
- **Darf nachgeliefert werden:** BUG-P5-005 bis 008 (LOW/INFO, UX-Politur)

### Empfehlung
Status: **Needs Fixes** — Zurück zu `/backend` oder `/frontend` für BUG-P5-001 bis BUG-P5-004. Danach erneutes /qa-Run. Die `/auth`-UI selbst ist solide, die XSS-/Enumeration-Härtung ist vorbildlich.

### Test-Artefakte
- Neue Unit-Tests: `src/hooks/useAuth.test.ts` (8 Tests)
- Neue E2E-Tests: `tests/PROJ-5-benutzerkonten.spec.ts` (42 Tests, 41 passing)
- Playwright-HTML-Report: `playwright-report/index.html`

## Deployment
_To be added by /deploy_
