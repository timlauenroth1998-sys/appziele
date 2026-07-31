# PROJ-10: Onboarding-Entwurf sichern

## Status: Planned
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
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
