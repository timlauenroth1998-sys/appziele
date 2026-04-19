# PROJ-7: Coaching Library

## Status: Planned
**Created:** 2026-04-19
**Last Updated:** 2026-04-19

## Dependencies
- Requires: PROJ-5 (Benutzerkonten) — Auth für Admin/Coach/Klient
- Requires: PROJ-6 (Coach-Klienten-Ansicht) — Coach-Rolle, Klienten-Verbindung, Teilen-Kontext
- Requires: PROJ-2 (KI-Roadmap-Generierung) — Roadmap-API wird um Library-Kontext erweitert

## Vorhandene Implementierung (Teilweise)
Folgende Teile existieren bereits im Code, sind aber unfertig/unsicher:
- `/admin/library/page.tsx` — Upload-UI (kein Auth-Check, kein Redirect)
- `/api/library/upload` — PDF-Upload, Text-Extraktion, Voyage-AI-Embedding (kein Auth)
- `/api/library/search` — Semantic Search (kein Auth)
- `/api/library/documents` — Liste + Löschen (kein Auth)
- `src/lib/voyageai.ts`, `src/lib/chunker.ts` — Embedding-Hilfsfunktionen

**Diese müssen im Backend-Skill gesichert und erweitert werden.**

## User Stories
- Als Admin möchte ich PDFs in die Coaching-Bibliothek hochladen, damit sie als Wissensquelle für KI-Roadmaps genutzt werden können
- Als Admin möchte ich hochgeladene Dokumente einsehen und löschen können, damit die Bibliothek aktuell bleibt
- Als Coach möchte ich die Bibliothek per Freitext durchsuchen können, damit ich schnell relevante Inhalte für meine Klienten finde
- Als Coach möchte ich einzelne Dokumente an verbundene Klienten teilen, damit sie ergänzende Materialien erhalten
- Als Klient möchte ich mir geteilte Dokumente meines Coaches ansehen können, damit ich von seinem Wissen profitiere
- Als Nutzer möchte ich, dass meine Roadmap automatisch durch relevante Bibliotheksinhalte angereichert wird, ohne dass ich etwas tun muss

## Acceptance Criteria

### Admin — Bibliothek verwalten
- [ ] Admin kann auf `/admin/library` PDFs hochladen (max. 20 MB, nur .pdf)
- [ ] Admin sieht Liste aller hochgeladenen Dokumente (Name, Größe, Anzahl Chunks, Datum)
- [ ] Admin kann Dokumente löschen (inkl. aller zugehörigen Chunks in der DB)
- [ ] `/admin/library` ist nur für eingeloggte Admins zugänglich (Redirect zu /auth wenn nicht authentifiziert)
- [ ] Alle `/api/library/*`-Routen prüfen Authentication (401 ohne gültigen Token)

### KI-Integration — Automatische Anreicherung
- [ ] Bei jeder Roadmap-Generierung werden die Top-5 semantisch relevanten Chunks aus der Bibliothek automatisch als Kontext an Claude mitgegeben
- [ ] Wenn die Bibliothek leer ist, wird die Roadmap normal ohne Bibliotheks-Kontext generiert (kein Fehler)

### Coach — Suche
- [ ] Coach sieht auf `/coach` (oder `/coach/library`) eine Suchbox für die Bibliothek
- [ ] Coach kann per Freitext suchen — Ergebnisse zeigen Chunk-Inhalt + Dokumentname
- [ ] Suche gibt max. 5 relevante Treffer zurück, sortiert nach Relevanz

### Coach — Teilen mit Klienten
- [ ] Coach kann auf der Klientendetailseite `/coach/[clientId]` ein Dokument aus der Bibliothek mit dem Klienten teilen
- [ ] Coach sieht pro Klient welche Dokumente bereits geteilt wurden
- [ ] Coach kann eine Teilen-Verbindung auch wieder aufheben

### Klient — Geteilte Dokumente
- [ ] Klient sieht auf `/settings` oder einer neuen Seite `/documents` die ihm geteilten Dokumente (Dokumentname, Datum)
- [ ] Klient kann den Inhalt eines geteilten Dokuments lesen (Text-Ansicht, kein PDF-Download)

## Edge Cases
- Was passiert, wenn ein PDF keinen lesbaren Text enthält? → Fehlermeldung "PDF enthält keinen lesbaren Text", kein Upload
- Was passiert bei einem Doppel-Upload desselben Dokuments? → Erlaubt (anderer Timestamp), kein Duplikat-Check im MVP
- Was passiert, wenn die Bibliothek leer ist und die Roadmap generiert wird? → Normale Generierung ohne Bibliotheks-Kontext, kein Fehler
- Was passiert, wenn ein Klient getrennt wird, aber noch geteilte Dokumente hat? → Shared-Verbindungen werden beim Disconnect automatisch gelöscht (CASCADE)
- Was passiert, wenn ein Dokument gelöscht wird, das mit Klienten geteilt wurde? → Shared-Einträge werden ebenfalls gelöscht (CASCADE), Klient sieht das Dokument nicht mehr
- Was passiert bei sehr großen PDFs (>20 MB)? → Validierungsfehler vor Upload, klare Fehlermeldung
- Was passiert wenn der Coach kein verbundener Klient hat? → Teilen-UI zeigt "Keine verbundenen Klienten"
- Was passiert bei der Suche ohne Treffer? → Leerer Zustand mit Hinweis "Keine Treffer für deine Suche"

## Technical Requirements
- **Auth:** Alle API-Routen benötigen gültigen Supabase Session-Token (Admin-Routen zusätzlich Admin-Rolle)
- **Supabase pgvector:** `document_chunks.embedding` als `vector(1024)` für Voyage AI (bereits vorhanden)
- **Neue Tabelle:** `document_shares` (document_id, coach_id, client_id, created_at) mit RLS
- **RLS:** Admin schreibt/liest alle Dokumente; Coach liest alle (für Suche + Teilen); Klient liest nur via `document_shares`
- **Performance:** Upload-Route hat `maxDuration = 60` (Vercel Serverless Limit für Embedding-Batch)
- **Voyage AI:** `voyage-3` Modell, 1024-dimensionale Embeddings (bereits konfiguriert)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
