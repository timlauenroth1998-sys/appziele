# PROJ-7: Coaching Library

## Status: Architected
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
**Date:** 2026-04-19

### Überblick

Ein Großteil des Backends existiert bereits (Upload, Embedding, Suche). Der Fokus liegt auf drei Lücken: **Sicherheit** (alle API-Routen absichern), **Teilen** (neuer Datenfluss Coach → Klient) und **KI-Anreicherung** (Roadmap-API um Library-Kontext erweitern).

---

### Komponentenstruktur

```
/admin/library (existiert — wird gesichert + mit Nav versehen)
+-- Nav (← zurück zu /admin, UserAuthButton)
+-- LibraryUploadArea (Drag-&-Drop PDF, Fortschrittsbalken)
+-- LibraryDocumentList
    +-- Dokument-Karte (Name, Größe, Chunks, Datum, Löschen-Button)

/coach/library (neue Unterseite)
+-- Nav (← zurück zu /coach)
+-- LibrarySearchBox (Freitext-Eingabe + Suchen-Button)
+-- LibrarySearchResults (max. 5 Treffer)
    +-- Treffer-Karte (Chunk-Text, Dokumentname, Relevanz-Score)

/coach/[clientId] (erweitert — neuer Tab)
+-- Tabs: Roadmap | Kommentare | Bibliothek (neu)
    +-- Tab "Bibliothek"
        +-- ShareDocumentPanel
            +-- Liste aller Bibliotheksdokumente
            +-- "Teilen / Nicht teilen" Toggle pro Dokument
            +-- Bereits-geteilt-Badge

/documents (neue Seite — nur für Klienten)
+-- Nav
+-- SharedDocumentList
    +-- Dokument-Karte (Name, Coach, geteilt am)
    +-- Klick → DocumentTextViewer (Dialog mit ganzem Dokument-Text)
```

---

### Datenmodell

**Vorhandene Tabellen (bleiben unverändert):**

```
documents
  id (UUID), name, size_bytes, chunk_count, created_at

document_chunks
  id (UUID), document_id → documents, content (Text),
  embedding (vector 1024), chunk_index
```

**Neue Tabelle:**

```
document_shares
  id (UUID)
  document_id → documents (ON DELETE CASCADE)
  coach_id    → auth.users
  client_id   → auth.users
  created_at

Unique: (document_id, coach_id, client_id)
```

**RLS-Regeln:**

| Tabelle | Wer darf was |
|---------|-------------|
| `documents` | Admin: alle Operationen; Coach: nur lesen; Klient: kein Zugriff |
| `document_chunks` | Admin: alle Operationen; Coach: lesen (für Suche via RPC); Klient: kein Zugriff |
| `document_shares` | Coach: eigene Zeilen anlegen/löschen; Klient: eigene Zeilen lesen |
| `match_chunks` (RPC) | Alle authentifizierten Nutzer (Coach benötigt Zugriff für Suche) |

---

### API-Routen

**Bestehend — wird gesichert:**

| Route | Änderung |
|-------|---------|
| `POST /api/library/upload` | + Admin-Auth-Check |
| `GET /api/library/documents` | + Admin-Auth-Check |
| `DELETE /api/library/documents` | + Admin-Auth-Check |
| `POST /api/library/search` | + Coach/Admin-Auth-Check |

**Neu:**

| Route | Zweck | Wer |
|-------|-------|-----|
| `POST /api/library/share` | Dokument mit Klient teilen | Coach |
| `DELETE /api/library/share` | Teilen aufheben | Coach |
| `GET /api/library/shared` | Liste geteilter Docs für den Klienten | Klient |
| `GET /api/library/content/[id]` | Vollen Text eines Dokuments lesen | Klient (nur wenn geteilt) |

**Geändert:**

| Route | Änderung |
|-------|---------|
| `POST /api/roadmap/generate` | Vor Claude-Aufruf: Top-5 Library-Chunks laden und als Kontext einbetten |

---

### KI-Anreicherung der Roadmap (Ablauf)

```
Nutzer startet Roadmap-Generierung
    ↓
Server: Ziele + Vision des Nutzers als Query embedden
    ↓
Suche: Top-5 ähnliche Chunks aus Bibliothek (min. 30% Ähnlichkeit)
    ↓
Chunks gefunden?
  JA  → Chunks als "Coaching-Materialien" in den Claude-Prompt einbauen
  NEIN → Normaler Claude-Prompt (kein Fehler, kein Hinweis nötig)
    ↓
Claude generiert Roadmap (mit oder ohne Library-Kontext)
```

---

### Neue Hooks

```
useLibrarySearch      → Suche in der Bibliothek (Coach, /coach/library)
useDocumentShares     → Geteilte Docs eines Klienten verwalten (Coach, /coach/[clientId])
useSharedDocuments    → Liste geteilter Docs abrufen (Klient, /documents)
```

---

### Tech-Entscheidungen

| Entscheidung | Warum |
|---|---|
| Bestehende Upload/Suche-Infrastruktur behalten | Funktioniert bereits, kein Grund neu zu bauen |
| Auth nachrüsten statt neu schreiben | Minimaler Eingriff — nur `getUserFromRequest` + Rollencheck vorne |
| `document_shares` als eigene Tabelle | Klare Trennung Coach/Klient-Sichtbarkeit; CASCADE-Delete vereinfacht Cleanup |
| Klient liest Dokument-Text via `content/[id]` | Kein PDF-Storage nötig; Text wurde beim Upload bereits extrahiert und in Chunks gespeichert |
| Roadmap-Anreicherung serverseitig | Voyage-API-Key darf nicht im Browser sein |
| Kein Volltext-Speicher | Text ist in `document_chunks.content` stückweise vorhanden; für die Textansicht werden alle Chunks eines Dokuments zusammengesetzt |

---

### Keine neuen Packages

Alle benötigten Libraries sind bereits installiert:
- `unpdf` — PDF-Textextraktion
- `@supabase/supabase-js` — Datenbankzugriff
- Voyage AI — eigene `src/lib/voyageai.ts` (kein Package, direkter Fetch)

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
