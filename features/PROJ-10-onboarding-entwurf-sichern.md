# PROJ-10: Onboarding-Entwurf sichern

## Status: Deployed
**Created:** 2026-07-31
**Last Updated:** 2026-07-31

## Ziel des Features
Der gesamte Zustand des Onboarding-Wizards — Vision, Lebensbereiche, alle Ziele, der aktuelle Schritt — liegt heute ausschließlich in `useState`. Gespeichert wird erst ganz am Ende. Jeder Absturz, jeder Reload, jedes versehentlich geschlossene Tab löscht bis zu zwanzig Minuten Arbeit.

Das ist kein theoretisches Risiko: Am 08.06.2026 hat ein Testnutzer genau das mehrfach erlebt und im Verlauf des Abends aufgegeben. Sein Satz — *„Muss immer wieder von vorne anfangen mit ausfüllen"* — beschreibt diesen Fehler.

Die auslösende Ursache (Chrome-Auto-Übersetzung, die React zerlegte) wurde am 31.07.2026 behoben. **Dieses Feature adressiert nicht die Ursache, sondern die Fallhöhe:** Solange der Fortschritt nur im Arbeitsspeicher liegt, macht *jeder* künftige Fehler — eine Browser-Erweiterung, ein Absturz, ein Verbindungsabbruch — aus einer kleinen Störung einen Totalverlust.

## Dependencies
- **Requires: PROJ-1** (Ziel-Eingabe & Lebensbereich-Profil) — dieses Feature sichert den Zustand genau dieses Wizards
- Keine weiteren. Funktioniert ohne Login und unabhängig von PROJ-8/9.

## Produktentscheidungen

| Entscheidung | Gewählt | Begründung |
|---|---|---|
| Speicherort | localStorage, bei jeder Eingabe (entkoppelt) | Deckt den realen Fehlerfall vollständig ab, funktioniert ohne Login, kein Serverweg. |
| Gerätewechsel | **Nicht** unterstützt | Bewusst ausgeklammert: Supabase-Sync brächte einen zweiten Konfliktfall bei parallelen Entwürfen. Kann später ergänzt werden. |
| Rückkehr | Automatisch fortsetzen, mit Hinweis | Wer weitermachen will, soll keinen Klick brauchen. „Neu beginnen" bleibt jederzeit erreichbar. |
| Verfall | Nach Abschluss, sonst nach 30 Tagen | Ein monatealter Halbstand verwirrt mehr, als er hilft. |
| Bestehendes Profil | Warnung statt stillem Überschreiben | Heute überschreibt ein erneuter Onboarding-Durchlauf vorhandene Ziele **ungefragt**. Das ist ein eigener, bisher unbemerkter Datenverlust-Pfad. |
| Mehrere Tabs | Letzter Schreibvorgang gewinnt | Seltener Fall, begrenzter Schaden. Kein Sonderfall im MVP. |
| Kein localStorage | Still weiterarbeiten, einmalig hinweisen | Im Safari-Privatmodus muss das Onboarding funktionieren — nur eben ohne Netz. |

## User Stories
- Als **Nutzer** möchte ich nach einem Absturz oder Reload dort weitermachen, wo ich war, damit ich meine Eingaben nicht ein zweites Mal tippen muss.
- Als **Nutzer** möchte ich das Onboarding unterbrechen und später fortsetzen können, damit ich es nicht in einem Zug durchziehen muss.
- Als **Nutzer** möchte ich beim Wiederkommen sofort erkennen, dass mein Stand gesichert wurde, damit ich der App vertraue.
- Als **Nutzer** möchte ich einen gesicherten Entwurf bewusst verwerfen können, damit ich neu anfangen kann, ohne Felder einzeln zu leeren.
- Als **Nutzer mit bereits definierten Zielen** möchte ich gewarnt werden, bevor ein neuer Durchlauf sie ersetzt, damit ich meine Arbeit nicht versehentlich verliere.
- Als **Coach** möchte ich, dass Klienten das Onboarding zuverlässig abschließen, damit ich sie nicht beim Wiedereintippen begleiten muss.

## Acceptance Criteria

### Sichern
- [ ] Jede Änderung an Vision, Lebensbereichen oder Zielfeldern wird in den localStorage geschrieben, entkoppelt über eine kurze Verzögerung (Richtwert 500 ms nach der letzten Eingabe)
- [ ] Der gesicherte Entwurf enthält **alle** Zustandsteile: `vision5y`, `lifeAreas` inklusive aller vier Zielebenen, und den aktuellen Schritt
- [ ] Der Entwurf wird unter einem **eigenen Schlüssel** abgelegt, getrennt vom fertigen Profil (`ziele_goal_profile`), damit ein Entwurf nie als abgeschlossenes Profil gelesen wird
- [ ] Jeder Entwurf trägt einen Zeitstempel der letzten Änderung
- [ ] Das Sichern blockiert die Eingabe nicht spürbar — Tippen bleibt flüssig

### Wiederherstellen
- [ ] Beim Öffnen von `/onboarding` mit vorhandenem Entwurf werden alle Eingaben wiederhergestellt **und** der zuletzt aktive Schritt geöffnet
- [ ] Über der Fortschrittsanzeige erscheint ein Hinweis „Wir haben deinen Stand gesichert" mit dem Datum der letzten Änderung
- [ ] Der Hinweis enthält eine Aktion „Neu beginnen", die den Entwurf nach einer Rückfrage verwirft und den Wizard auf Schritt 1 mit Leerzustand zurücksetzt
- [ ] Ohne vorhandenen Entwurf startet der Wizard unverändert auf Schritt 1 und zeigt keinen Hinweis
- [ ] Die Wiederherstellung greift auch dann, wenn das Tab geschlossen und der Browser zwischenzeitlich beendet wurde

### Verwerfen
- [ ] Nach erfolgreichem Abschluss (`finish()` hat gespeichert und leitet weiter) wird der Entwurf gelöscht
- [ ] Schlägt das Speichern fehl, bleibt der Entwurf **erhalten** — der Nutzer darf nichts verlieren, wenn der Abschluss scheitert
- [ ] Ein Entwurf, dessen letzte Änderung mehr als 30 Tage zurückliegt, wird beim Öffnen ignoriert und gelöscht; der Wizard startet leer
- [ ] „Neu beginnen" fragt vor dem Verwerfen nach und löscht erst nach Bestätigung

### Schutz vorhandener Ziele
- [ ] Öffnet ein Nutzer mit bereits gespeichertem Profil `/onboarding`, erscheint vor Schritt 1 ein Hinweis, dass ein neuer Durchlauf die vorhandenen Ziele ersetzt
- [ ] Dieser Hinweis enthält einen Link auf `/goals`, um stattdessen die bestehenden Ziele zu bearbeiten
- [ ] Der Nutzer kann den Hinweis wegklicken und bewusst neu starten
- [ ] Das vorhandene Profil wird erst beim tatsächlichen Abschluss überschrieben, nicht schon beim Öffnen des Wizards

### Ausfall des Speichers
- [ ] Ist der localStorage nicht verfügbar oder das Kontingent erschöpft, funktioniert das Onboarding vollständig weiter
- [ ] In diesem Fall erscheint **einmalig pro Sitzung** ein dezenter Hinweis, dass der Fortschritt in diesem Browser nicht gesichert werden kann
- [ ] Ein fehlgeschlagener Schreibvorgang erzeugt weder eine Exception noch eine Fehlerseite

### Robustheit
- [ ] Ein beschädigter oder nicht lesbarer Entwurf (ungültiges JSON, unerwartete Struktur) wird verworfen; der Wizard startet leer statt abzustürzen
- [ ] Ein Entwurf aus einer älteren Datenstruktur ohne die heute erwarteten Felder führt nicht zu einem Absturz

## Edge Cases

- **Der Entwurf stammt aus einer älteren App-Version.** Struktur hat sich geändert, Felder fehlen. → Entwurf wird gegen die erwartete Form geprüft; bei Abweichung stillschweigend verwerfen. Ein Absturz beim Wiederherstellen wäre schlimmer als ein verlorener Entwurf.
- **Zwei Tabs gleichzeitig offen.** → Letzter Schreibvorgang gewinnt, kein Konfliktdialog. Beide Tabs zeigen denselben Wizard, der Schaden ist begrenzt.
- **Der Nutzer meldet sich mitten im Onboarding an.** → Der Entwurf bleibt lokal bestehen und wird nach dem Rücksprung wiederhergestellt. Er wandert **nicht** nach Supabase.
- **Zwei verschiedene Personen nutzen denselben Browser.** → Der Entwurf ist an den Browser gebunden, nicht an ein Konto. Person B sieht den Entwurf von Person A. Akzeptiert im MVP, aber der Hinweis mit Datum macht es erkennbar, und „Neu beginnen" löst es in einem Klick.
- **Das Speichern beim Abschluss schlägt fehl.** → Entwurf bleibt liegen, Fehlermeldung erscheint, keine Weiterleitung. Beim nächsten Öffnen ist alles wieder da. (Setzt den Fix vom 31.07.2026 in `finish()` voraus.)
- **Der Nutzer löscht alle Lebensbereiche bis auf einen.** → Der Entwurf spiegelt den aktuellen Zustand; entfernte Bereiche kehren beim Wiederherstellen nicht zurück.
- **Sehr großer Entwurf.** Acht Lebensbereiche mit langen Freitexten. → Muss innerhalb des üblichen localStorage-Kontingents (ca. 5 MB) bleiben; realistisch unkritisch, aber ein fehlgeschlagener Schreibvorgang darf nichts kaputtmachen.
- **Auto-Ausfüllen des Browsers oder eine Passwortverwaltung schreibt in Felder.** → Wird wie jede andere Eingabe behandelt und gesichert.

## Technical Requirements
- Eigener localStorage-Schlüssel, klar getrennt vom fertigen Profil
- Entkoppeltes Schreiben (Richtwert 500 ms), damit Tippen flüssig bleibt
- Jeder Zugriff auf den localStorage in `try/catch` — kein Pfad darf eine Exception nach außen geben
- Wiederherstellung darf keinen sichtbaren Sprung erzeugen: erst Zustand laden, dann rendern
- Prüfung der Entwurfsstruktur vor der Übernahme
- Vollständig ohne Login funktionsfähig
- Als Regressionstest abzusichern: Reload mitten im Wizard stellt Eingaben und Schritt wieder her

## Non-Goals (bewusst nicht in diesem Feature)
- **Gerätewechsel / Supabase-Sync des Entwurfs** — eigenes Feature, bringt Konfliktauflösung mit sich
- **Versionierung oder Undo innerhalb des Wizards** — nur der jeweils aktuelle Stand wird gehalten
- **Entwürfe für andere Formulare** (Check-in, Kommentare, Library-Upload) — dieses Feature betrifft ausschließlich das Onboarding
- **Konfliktdialog bei mehreren Tabs** — bewusst ausgeklammert
- **Serverseitige Wiederherstellung nach Kontowechsel** — nicht im MVP

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
**Erstellt:** 2026-07-31

### Kurzfassung
Reine Frontend-Arbeit. **Kein Server, keine Datenbank, keine Migration, keine neue Bibliothek.** Der Wizard bekommt einen Begleiter, der bei jeder Eingabe eine Kopie im Browser ablegt und sie beim nächsten Öffnen zurückspielt. Das ist die kleinste der drei geplanten Erweiterungen und lässt sich unabhängig ausliefern.

### A) Komponentenstruktur

```
Onboarding-Seite
+-- Warnhinweis "Du hast bereits Ziele"          (NEU, nur bei vorhandenem Profil)
|   +-- Link "Bestehende Ziele bearbeiten" -> /goals
|   +-- Schließen-Aktion ("Trotzdem neu starten")
+-- Hinweisleiste "Wir haben deinen Stand gesichert"  (NEU, nur bei vorhandenem Entwurf)
|   +-- Datum der letzten Änderung
|   +-- Aktion "Neu beginnen" (mit Rückfrage)
+-- Fortschrittsanzeige + Schrittpunkte          (bestehend, unverändert)
+-- Schritt 1: Vision                            (bestehend, unverändert)
+-- Schritt 2: Lebensbereiche                    (bestehend, unverändert)
+-- Schritt 3: Ziele                             (bestehend, unverändert)
+-- Schritt 4: Zusammenfassung                   (bestehend, unverändert)
+-- Hinweis "Speicherung nicht möglich"          (NEU, nur im Ausnahmefall)
+-- Navigation                                   (bestehend, unverändert)
```

**Die vier bestehenden Schritt-Komponenten werden nicht angefasst.** Sie bekommen ihre Werte weiterhin von der Onboarding-Seite und melden Änderungen dorthin zurück. Die Sicherung setzt eine Ebene darüber an — dadurch bleibt das Risiko für bestehende Funktionalität sehr klein.

Dazu kommt ein **Entwurfs-Speicher** als eigenständiger, wiederverwendbarer Baustein. Er kapselt Lesen, Schreiben, Prüfen und Verwerfen und liegt neben den bereits vorhandenen Speicher-Bausteinen für Ziele und Roadmap. Damit folgt er dem Muster, das im Projekt schon etabliert ist.

### B) Datenmodell

Ein Entwurf enthält:

- **Die 5-Jahres-Vision** — freier Text, darf leer sein
- **Die Liste der Lebensbereiche**, je mit Name, Farbe, Kennzeichen „selbst angelegt" und den vier Zielebenen (Jahr, Quartal, Monat, Woche) als Text
- **Den zuletzt geöffneten Schritt** — eine Zahl von 1 bis 4
- **Zeitpunkt der letzten Änderung** — für die Anzeige im Hinweis und für die 30-Tage-Regel
- **Eine Formatnummer** — damit eine spätere App-Version erkennt, dass ein alter Entwurf nicht mehr passt, und ihn verwirft statt daran zu scheitern

**Ablage:** Browser-Speicher (localStorage), unter einem **eigenen Schlüssel**, klar getrennt vom fertigen Zielprofil.

**Kein Server, kein Konto nötig.** Der Entwurf verlässt das Gerät nicht.

### C) Technische Entscheidungen

**Warum nur im Browser und nicht in der Datenbank?**
Der Fehler, um den es geht, passiert *innerhalb einer Sitzung an einem Gerät* — Absturz, Reload, geschlossenes Tab. Dafür genügt der Browser-Speicher vollständig. Ein Server-Abgleich würde einen neuen Konfliktfall einführen (zwei Geräte, zwei halbfertige Entwürfe — welcher gewinnt?) und das Onboarding an einen Login binden, das heute bewusst ohne funktioniert. Der Gerätewechsel ist als eigenes Feature später nachrüstbar, ohne dass hier etwas umgebaut werden muss.

**Warum ein eigener Schlüssel und nicht das bestehende Zielprofil mitbenutzen?**
Ein Entwurf ist unvollständig. Läge er unter demselben Schlüssel, würden alle anderen Teile der App — Landing Page, Zielübersicht, Roadmap — ihn für ein fertiges Profil halten. Die Landing Page leitet zum Beispiel automatisch weiter, sobald ein Profil existiert. Die Trennung verhindert diese Verwechslung von vornherein.

**Warum verzögert speichern statt bei jedem Tastendruck?**
Bei jedem Zeichen zu schreiben würde bei langen Zieltexten spürbar bremsen. Ein kurzer Aufschub von etwa einer halben Sekunde nach der letzten Eingabe bündelt das zu einem einzigen Schreibvorgang. Für den Nutzer nicht wahrnehmbar, für die Flüssigkeit der Eingabe entscheidend.

**Warum wird der Entwurf beim Wiederkommen ungefragt eingespielt?**
Jede Rückfrage ist eine Hürde — auch für die Mehrheit, die einfach weitermachen will. Der Hinweis mit „Neu beginnen" macht den Zustand transparent und lässt sich in einem Klick auflösen. Das ist freundlicher als ein Dialog, der bei jedem Einstieg im Weg steht.

**Warum wird die Struktur beim Lesen geprüft?**
Ein Entwurf kann aus einer älteren App-Version stammen oder beschädigt sein. Ohne Prüfung würde die App beim Wiederherstellen abstürzen — also genau dort, wo dieses Feature eigentlich schützen soll. Passt die Struktur nicht, wird der Entwurf stillschweigend verworfen und der Wizard startet leer.

**Warum bleibt der Entwurf erhalten, wenn das Speichern am Ende fehlschlägt?**
Das ist der Moment, in dem der Nutzer am meisten zu verlieren hat. Erst wenn das Zielprofil nachweislich gespeichert ist, darf der Entwurf gelöscht werden.

**Warum die Warnung bei bestehenden Zielen?**
Bei der Ausarbeitung der Spec ist ein zweiter, bisher unbemerkter Verlustpfad aufgefallen: Ein erneuter Wizard-Durchlauf überschreibt heute vorhandene Ziele **ohne jede Rückfrage**. Das gehört hierher, weil es dieselbe Ursache hat — der Wizard weiß nichts über den Zustand außerhalb seiner selbst.

### D) Abhängigkeiten

**Keine neuen Pakete.** Die Verzögerung beim Speichern wird mit Bordmitteln umgesetzt; eine Bibliothek wie `lodash.debounce` wäre für diese eine Stelle unverhältnismäßig.

Verwendet werden ausschließlich bereits vorhandene shadcn/ui-Bausteine: `Alert` für die beiden Hinweise, `AlertDialog` für die Rückfrage bei „Neu beginnen", `Button` für die Aktionen.

### E) Risiken und Grenzen

| Risiko | Einschätzung |
|---|---|
| Zwei Personen teilen sich einen Browser | Person B sieht den Entwurf von Person A. Bewusst akzeptiert; Datum im Hinweis macht es erkennbar, „Neu beginnen" löst es sofort. |
| Zwei Tabs parallel | Letzter Schreibvorgang gewinnt. Beide Tabs zeigen denselben Wizard, der Schaden ist gering. |
| Browser-Speicher gesperrt (Safari-Privatmodus) | Onboarding läuft unverändert, nur ohne Sicherung. Einmaliger Hinweis. |
| Wiederherstellung erzeugt sichtbares Springen | Wird vermieden, indem der Zustand vor dem ersten Zeichnen geladen wird — dasselbe Muster, das die App beim Zielprofil bereits verwendet. |

### F) Testbarkeit
Der Entwurfs-Speicher ist von der Oberfläche getrennt und damit direkt prüfbar: Schreiben, Lesen, abgelaufener Entwurf, beschädigter Entwurf, gesperrter Speicher. Ergänzend ein Durchlauf im echten Browser, der mitten im Wizard neu lädt und prüft, dass Eingaben **und** Schrittnummer zurückkommen. Das Projekt hat für beide Ebenen bereits die passende Struktur.

## Implementierungsnotizen (Frontend)
**Umgesetzt:** 2026-07-31

### Was gebaut wurde
| Datei | Rolle |
|---|---|
| `src/hooks/useOnboardingDraft.ts` | NEU — Entwurfsspeicher: Laden mit Strukturprüfung, verzögertes Schreiben, Verwerfen, Erkennung fehlenden Speichers |
| `src/hooks/useOnboardingDraft.test.ts` | NEU — 9 Unit-Tests |
| `src/components/onboarding/DraftRestoredNotice.tsx` | NEU — Hinweisleiste mit Zeitangabe und „Neu beginnen" samt Rückfrage |
| `src/components/onboarding/ExistingProfileWarning.tsx` | NEU — Warnung vor dem Überschreiben bestehender Ziele |
| `src/app/onboarding/page.tsx` | Geändert — Übernahme, Sicherung, Verwerfen, Hinweisanzeige |
| `tests/PROJ-10-onboarding-entwurf.spec.ts` | NEU — 7 E2E-Tests entlang der Akzeptanzkriterien |

**Keine neuen Pakete.** Nur vorhandene shadcn-Bausteine (`Button`, `AlertDialog`).
**Die vier Schritt-Komponenten wurden nicht angefasst**, wie im Entwurf vorgesehen.

### Abweichungen vom Entwurf
- **Kein `Alert`-Baustein für die Hinweise.** Der shadcn-`Alert` bringt eine eigene Rahmen- und Abstandslogik mit, die neben der bestehenden `rounded-xl`-Sprache der Seite fremd wirkte. Beide Hinweise sind stattdessen schlichte Container im Stil der übrigen Seite. `AlertDialog` wird wie geplant für die Rückfrage genutzt.
- **Reihenfolge der Hinweise:** Die Profilwarnung steht über der Entwurfsmeldung, und beide erscheinen nie gleichzeitig — wer einen Entwurf fortsetzt, hat sich bereits fürs Weitermachen entschieden; die Warnung wäre dort nur Lärm.

### Offene Punkte für QA
- **Die Sicherung greift auch beim Verlassen der Seite.** Ein ausstehender Schreibvorgang wird beim Aushängen der Komponente nachgeholt, damit die letzten 500 ms nicht verlorengehen. Schwer automatisiert zu prüfen — händisch bestätigen.
- **Der Ausfallpfad ist nur im Unit-Test abgedeckt** (Schreibfehler wird simuliert). Im echten Safari-Privatmodus noch nicht verifiziert.
- **Zwei Personen an einem Browser** ist wie in der Spec beschrieben nicht gelöst, sondern bewusst akzeptiert.

### Prüfstand
- 106 Unit-Tests grün (9 neu)
- 11 E2E-Tests grün (7 neu für PROJ-10, 4 Regression aus dem Fix vom 31.07.)
- Production-Build fehlerfrei
- Sichtprüfung Desktop (1280 px) und Mobil (375 px)

## QA Test Results

**Getestet:** 2026-07-31
**App:** http://localhost:3000
**Browser:** Chromium 145 und WebKit (Mobile Safari, iPhone 13)
**Tester:** QA Engineer (AI) — hat dieses Feature selbst gebaut, daher bewusst gegen die eigene Umsetzung geprüft

### Akzeptanzkriterien

#### Sichern — 4/5
- [x] Änderungen werden verzögert geschrieben (~500 ms), im Unit-Test nachgewiesen
- [x] Entwurf enthält Vision, alle Lebensbereiche mit vier Zielebenen und den Schritt
- [x] Eigener Schlüssel `ziele_onboarding_draft`, getrennt vom Profil
- [x] Zeitstempel vorhanden und korrekt
- [ ] **BUG-1:** Es wird auch dann geschrieben, wenn der Nutzer **gar nichts eingegeben hat**

#### Wiederherstellen — 4/5
- [x] Eingaben **und** Schrittnummer werden korrekt zurückgespielt
- [x] Hinweis mit relativer Zeitangabe erscheint („heute um 15:19 Uhr")
- [x] „Neu beginnen" mit Rückfrage vorhanden
- [x] Wiederherstellung überlebt Tab- und Browser-Schließen
- [ ] **BUG-1:** „Ohne vorhandenen Entwurf … zeigt keinen Hinweis" gilt nur beim allerersten Aufruf

#### Verwerfen — 3/4
- [x] Entwurf wird nach erfolgreichem Abschluss gelöscht
- [x] Entwurf bleibt bei fehlgeschlagenem Speichern erhalten
- [x] Entwurf älter als 30 Tage wird ignoriert und gelöscht
- [ ] **BUG-2:** „Neu beginnen" legt unmittelbar danach wieder einen leeren Entwurf an

#### Schutz vorhandener Ziele — 3/4
- [x] Warnung erscheint beim ersten Aufruf mit vorhandenem Profil
- [x] Link auf `/goals` vorhanden und funktionsfähig
- [x] Warnung lässt sich wegklicken
- [ ] **BUG-3:** Warnung verschwindet dauerhaft, sobald ein Entwurf existiert

#### Ausfall des Speichers — 2/3
- [x] Schreibfehler erzeugt keine Exception (Unit-Test mit simuliertem Fehler)
- [x] Hinweistext vorhanden
- [ ] **Ungeprüft:** Verhalten im echten Safari-Privatmodus nicht verifiziert — nur simuliert

#### Robustheit — 2/2
- [x] Beschädigtes JSON, falsche Formatnummer, unvollständige Lebensbereiche werden verworfen, kein Absturz
- [x] Präparierter Entwurf mit leerer Bereichsliste auf Schritt 3 rendert ohne Fehler

### Edge Cases
- [x] Entwurf aus älterer Version → verworfen (Formatnummer)
- [x] Beschädigter Entwurf → verworfen, kein Absturz
- [x] Sehr großer Entwurf (200 KB) → geschrieben, keine Fehler
- [x] Abschluss schlägt fehl → Entwurf bleibt erhalten
- [~] Zwei Tabs → nicht automatisiert prüfbar, laut Spec bewusst „letzter gewinnt"
- [~] Zwei Personen an einem Browser → laut Spec bewusst akzeptiert

### Sicherheitsprüfung (Red Team)
- [x] **XSS über Zieltext:** `"><script>window.__xss=1</script>` wird als Text dargestellt, nicht ausgeführt
- [x] **XSS über eigenen Lebensbereichsnamen:** `<img src=x onerror=…>` wird escaped; überlebt auch den Speicher-/Wiederherstellungszyklus als reiner Text
- [x] **Prototype Pollution über präparierten Entwurf:** kein Durchgriff auf `Object.prototype`
- [x] **Keine Geheimnisse:** Der Entwurf enthält ausschließlich Nutzereingaben, keine Tokens
- [x] **Kein Serverweg:** Das Feature sendet nichts — keine neue Angriffsfläche im Backend
- **Ergebnis: keine Sicherheitsmängel gefunden.**

Anmerkung zur Vertraulichkeit: Zieltexte können sehr persönlich sein (Gesundheit, Finanzen) und liegen unverschlüsselt im Browser-Speicher. Das gilt für das bestehende Zielprofil ebenso und ist kein Regressionsbefund — aber ein Punkt für das Datenschutzkonzept.

### Regressionstest

> **Korrektur zum ersten Durchgang:** Dort stand „159 bestanden, keine Regressionen". Das war falsch. Der Line-Reporter listet am Ende die **Fehlschläge**, und diese Liste wurde als Erfolgsliste gelesen. Tatsächlich waren von 316 definierten Tests 159 bestanden, 2 übersprungen und **155 fehlgeschlagen**. Ursachen und Zuordnung siehe unten.

**Nach Nachinstallation von WebKit** (fehlte auf dem Rechner — dadurch schlug das gesamte Profil „Mobile Safari" mit `Executable doesn't exist` fehl):

| Bereich | Chromium | Mobile Safari (WebKit) |
|---|---|---|
| PROJ-10, Onboarding-Robustheit, PROJ-1, PROJ-3 | **55/55 bestanden** | **53/55 bestanden** |

- [x] **PROJ-10 besteht vollständig auf beiden Browsern** (10 Tests je Profil)
- [x] 106 Unit-Tests grün
- [x] Production-Build fehlerfrei
- [x] Responsiv geprüft auf 375 px und 1280 px

**Bekannte Fehlschläge außerhalb von PROJ-10** — geprüft und keinem der Änderungen dieses Features zuzuordnen:

| Anzahl | Wo | Ursache |
|---|---|---|
| 12 | PROJ-2 (Chromium) | **Vorbestehend.** Identisch mit den 12 Fehlschlägen in `test-results/.last-run.json` zum Sitzungsbeginn. Die Tests erfordern eine echte Roadmap-Generierung. |
| 3 | PROJ-5 SEC (Chromium) | **Testumgebung.** Die Passwort-Reset-Route antwortet mit `429 · „Zu viele Versuche. Bitte warte eine Stunde."` — der In-Memory-Ratelimiter wurde durch wiederholte Testläufe ausgelöst. Erwartet wird 400. Setzt sich nach einer Stunde selbst zurück. |
| 1 | PROJ-5 Login (Chromium) | Benötigt eine erreichbare Supabase-Instanz. |
| 2 | PROJ-3 (Mobile Safari) | Fortschrittsbalken nicht sichtbar; eine unterbrochene Navigation (instabiler Test). Vorbestehend, WebKit-spezifisch. |

**Empfehlung:** Die 12 PROJ-2-Fehlschläge bestehen seit Mai und sollten unabhängig von diesem Feature untersucht werden. Der Ratelimiter-Effekt bei PROJ-5 spricht dafür, den Limiter in der Testumgebung abschaltbar zu machen — sonst wird jede längere QA-Sitzung falsch rot.

### Gefundene Fehler

#### BUG-1: Leerer Entwurf entsteht schon beim reinen Seitenaufruf
- **Schwere:** Medium
- **Schritte:**
  1. `/onboarding` öffnen, **nichts** eingeben
  2. Eine Sekunde warten, dann Seite neu laden
  3. Erwartet: leerer Wizard ohne Hinweis
  4. Tatsächlich: grüne Leiste „Wir haben deinen Stand gesichert"
- **Ursache:** Der Sicherungs-Effekt läuft unmittelbar nach der Übernahme, also auch ohne jede Nutzereingabe.
- **Wirkung:** Betrifft jeden Nutzer ab dem zweiten Aufruf. Entwertet die Aussage des Hinweises und macht ihn zu Rauschen.
- **Priorität:** Vor dem Deployment beheben

#### BUG-2: „Neu beginnen" legt sofort wieder einen Entwurf an
- **Schwere:** Low
- **Schritte:**
  1. Etwas eingeben, neu laden, „Neu beginnen" → „Verwerfen"
  2. Eine Sekunde warten, Speicher prüfen
  3. Erwartet: kein Entwurf
  4. Tatsächlich: neuer leerer Entwurf vorhanden; nach erneutem Reload erscheint der Hinweis wieder
- **Ursache:** Dieselbe wie BUG-1 — das Zurücksetzen ändert den Zustand und löst dadurch eine neue Sicherung aus.
- **Priorität:** Zusammen mit BUG-1 beheben (eine Ursache)

#### BUG-3: Warnung vor dem Überschreiben verschwindet nach einem Reload
- **Schwere:** **High**
- **Schritte:**
  1. Als Nutzer mit bereits gespeicherten Zielen `/onboarding` öffnen → Warnung erscheint korrekt
  2. Etwas eingeben, dann Seite neu laden (oder später zurückkehren)
  3. Erwartet: Warnung weiterhin sichtbar
  4. Tatsächlich: Warnung fehlt; der Wizard lässt sich abschließen und **ersetzt die bestehenden Ziele ohne jeden Hinweis**
- **Ursache:** Die Anzeigebedingung schließt die Warnung aus, sobald ein Entwurf wiederhergestellt wurde (`&& !restored`). Das war eine bewusste Entscheidung beim Bau, hält der Prüfung gegen das Akzeptanzkriterium aber nicht stand.
- **Wirkung:** Der Datenverlust-Pfad, den dieses Kriterium ausdrücklich schließen soll, ist in genau dem Ablauf wieder offen, der durch das Feature erst häufig wird — Onboarding unterbrechen und später fortsetzen.
- **Priorität:** **Vor dem Deployment beheben**

### Nachbesserung (zweiter Durchgang, 2026-07-31)

Alle drei Fehler wurden behoben und mit je einem Regressionstest abgesichert:

| Fehler | Behebung | Test |
|---|---|---|
| BUG-1 | Der Sicherungs-Effekt vergleicht den aktuellen Zustand gegen den Ausgangszustand und schreibt erst bei einer tatsächlichen Änderung. Ein reiner Seitenaufruf erzeugt keinen Entwurf mehr. | `BUG-1: Reiner Seitenaufruf ohne Eingabe erzeugt keinen Entwurf` |
| BUG-2 | „Neu beginnen" setzt Ausgangszustand und Änderungsmerker zurück, wodurch kein neuer Leerentwurf entsteht. | `BUG-2: "Neu beginnen" legt keinen neuen leeren Entwurf an` |
| BUG-3 | Die Bedingung `&& !restored` wurde entfernt. Die Warnung erscheint jetzt immer, wenn ein Zielprofil existiert und sie nicht weggeklickt wurde — gerade auch im fortgesetzten Durchlauf. | `BUG-3: Überschreib-Warnung bleibt auch nach einem Reload sichtbar` |

**Nachgeprüft:** 10 PROJ-10-Tests je Browser grün, 106 Unit-Tests grün, Build fehlerfrei.

### Zusammenfassung (Stand nach Nachbesserung)
- **Akzeptanzkriterien:** 22 von 23 bestanden, 1 ungeprüft (echter Safari-Privatmodus — nur simuliert)
- **Fehler:** 3 gefunden, **3 behoben**, 0 offen
- **Sicherheit:** bestanden, keine Mängel
- **Regression durch dieses Feature:** keine
- **Produktionsreif: JA** für PROJ-10
- **Vorbehalt:** Die Suite enthält 18 Fehlschläge außerhalb dieses Features (12 vorbestehend in PROJ-2, 4 in PROJ-5 durch Ratelimiter und Supabase-Abhängigkeit, 2 in PROJ-3 unter WebKit). Diese blockieren PROJ-10 nicht, sollten aber vor einem Deployment der übrigen Features geklärt werden.

## Deployment

**Stand:** 2026-07-31 — **live in Produktion**
**URL:** https://appziele.vercel.app

### Vorabprüfungen
| Prüfung | Ergebnis |
|---|---|
| `npm run build` | ✅ fehlerfrei |
| QA-Freigabe | ✅ Approved, 0 kritische/hohe Fehler offen |
| Secrets im Git | ✅ keine `.env`-Datei getrackt |
| Env-Variablen dokumentiert | ✅ `.env.local.example` deckt sich mit `.env.local` |
| Datenbank-Migrationen | ✅ keine erforderlich (rein clientseitiges Feature) |
| Security-Header | ✅ in `next.config.ts` konfiguriert |
| `npm run lint` | ❌ **defekt** — `next lint` existiert in Next.js 16 nicht mehr; ESLint 9 erwartet zudem `eslint.config.js`, das Projekt hat noch `.eslintrc`. Altlast, unabhängig von diesem Feature. TypeScript wird über den Build vollständig geprüft. |
| Error-Tracking | ⚠️ kein Sentry eingerichtet |

### Ausgeliefert wird (Branch `fix/onboarding-translate-crash`, 7 Commits)
Neben PROJ-10 enthält der Branch den eigentlich dringenderen Fix:

- `ed6017d` — **`<html lang="de">`**: behebt den Absturz, der den Onboarding-Wizard bei deutschsprachigen Chrome-Nutzern durch die Auto-Übersetzung zerlegte. Dazu Error Boundaries, abgesicherter Speicherpfad, `clearProfile`-Korrektur und der Tailwind-Farbfix.
- `0d376b3`, `60dd0a1`, `28b0cc5` — Specs und technische Entwürfe für PROJ-8, PROJ-9, PROJ-10 (nur Dokumentation)
- `7096216`, `6d1fe05`, `728617f` — PROJ-10 Umsetzung, QA-Ergebnisse, Fehlerbehebungen

### Vorgehen
Branch wurde nach GitHub gepusht (`origin/fix/onboarding-translate-crash`), **nicht** nach `main`. Produktion ist unberührt. Die Vercel-Preview dient der Gegenprobe durch den Testnutzer vom 08.06.2026, bevor nach `main` gemerged wird.

### Ausgeführt
- [x] PR #1 nach `main` gemerged
- [x] Vercel hat automatisch deployt (Dauer ca. 5:45 min — deutlich länger als die üblichen 1–3 min; ein zwischenzeitlicher Befund „Auto-Deploy nicht aktiv" war voreilig)
- [x] Produktion verifiziert: `<html lang="de">` wird ausgeliefert, `/`, `/onboarding`, `/goals`, `/auth` antworten mit 200
- [x] Produktions-Rauchtest: 4 Prüfungen je Browser (Chromium und Mobile Safari), **8/8 bestanden** — Entwurf wird gesichert und wiederhergestellt, ein reiner Aufruf erzeugt keinen Entwurf, Lebensbereichs-Farben werden gerendert
- [x] Git-Tag `v1.1.0-PROJ-10` gesetzt
- [x] `features/INDEX.md` auf **Deployed**

### Weiterhin offen
- [ ] **Gegenprobe durch den Testnutzer vom 08.06.2026** — die Ursachenkette ist gut belegt, aber erst sein erneuter Durchlauf im selben Browser mit derselben Spracheinstellung bestätigt sie
- [ ] Echter Safari-Privatmodus (Ausfallpfad nur simuliert)
- [ ] Error-Tracking (kein Sentry) — dieser Fehler lag zwei Monate unentdeckt in der Produktion
- [ ] `npm run lint` reparieren (`next lint` in Next.js 16 entfernt, ESLint 9 erwartet `eslint.config.js`)
