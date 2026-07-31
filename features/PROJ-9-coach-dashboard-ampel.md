# PROJ-9: Coach-Dashboard mit Ampel

## Status: Planned
**Created:** 2026-07-31
**Last Updated:** 2026-07-31

## Ziel des Features
Die heutige Coach-Ansicht (`/coach`) listet Klienten auf, ohne zu zeigen, wie es ihnen geht. Ein Coach muss jeden Klienten einzeln öffnen, um das herauszufinden — ab etwa zehn Klienten ist das unbrauchbar. Dieses Feature macht aus der Liste ein Arbeitswerkzeug: Ein Blick genügt, um zu erkennen, wer im Fluss ist, wer stockt und wer ausgestiegen ist.

Das PRD nennt als Erfolgsmetrik, dass Coaches mindestens zwei Klienten einladen. Ohne diese Übersicht gibt es wenig Grund, darüber hinauszugehen.

## Dependencies
- **Requires: PROJ-8** (Wöchentlicher Check-in) — liefert Aktualität und Erfüllungsquote, aus denen die Ampel berechnet wird. **Ohne PROJ-8 hat dieses Feature keine Datengrundlage und kann nicht gebaut werden.**
- **Requires: PROJ-6** (Coach-Klienten-Ansicht) — liefert Klientenliste, Coach-Rolle und Berechtigungsmodell; dieses Feature erweitert die bestehende Seite `/coach`
- **Requires: PROJ-5** (Benutzerkonten) — Coach-Rolle setzt ein Konto voraus

## Ampel-Logik
Die Ampel kombiniert **Aktualität** und **Erfüllung**. Beides einzeln wäre blind für einen der beiden häufigen Fälle: der Klient, der brav eincheckt und trotzdem nichts schafft — und der, der schlicht verschwunden ist.

| Status | Bedingung |
|---|---|
| 🟢 **Im Fluss** | Check-in für die laufende **oder** vorige Woche vorhanden **UND** Erfüllungsquote der letzten 3 Check-ins ≥ 50 % |
| 🟡 **Stockt** | Genau eine der beiden Bedingungen erfüllt |
| 🔴 **Ausgestiegen** | Keine der beiden Bedingungen — insbesondere kein Check-in seit 2 oder mehr Wochen |
| ⚪ **Noch kein Start** | Klient hat noch keinen Check-in abgeschlossen oder noch keine Roadmap generiert |

**Wichtig:** Die Aktualitätsprüfung fragt, ob die laufende oder vorige Woche *inhaltlich abgedeckt* ist (`week_start`) — nicht, wann zuletzt irgendetwas abgeschickt wurde (`submitted_at`). Ein Klient, der acht Altwochen an einem Abend nachträgt, wird dadurch **nicht** grün. Siehe PROJ-8.

Liegen weniger als 3 Check-ins vor, wird die Quote über die vorhandenen berechnet.

## User Stories
- Als **Coach** möchte ich auf einen Blick sehen, welche meiner Klienten stocken, damit ich gezielt nachfassen kann statt alle gleich zu behandeln.
- Als **Coach** möchte ich meine Klientenliste nach Status sortieren, damit die Fälle, die Aufmerksamkeit brauchen, oben stehen.
- Als **Coach** möchte ich pro Klient die letzte Check-in-Woche und die aktuelle Erfüllungsquote sehen, damit ich den Status einordnen kann, ohne die Detailansicht zu öffnen.
- Als **Coach** möchte ich von der Übersicht direkt in die Detailansicht eines Klienten springen, damit der Weg vom Auffallen zum Handeln kurz ist.
- Als **Coach** möchte ich erkennen, welche Klienten noch gar nicht gestartet sind, damit ich sie beim Einstieg begleite statt sie mit Aussteigern zu verwechseln.
- Als **Coach** möchte ich den Stimmungsverlauf eines Klienten sehen, damit ich sinkende Zufriedenheit bemerke, bevor der Klient abbricht.

## Acceptance Criteria

### Übersicht
- [ ] `/coach` zeigt pro Klient eine Karte oder Zeile mit: Name bzw. E-Mail, Ampelstatus, letzter Check-in-Woche, Erfüllungsquote der letzten 3 Check-ins
- [ ] Der Ampelstatus wird gemäß der Tabelle oben berechnet und ist als Farbe **und** als Textlabel dargestellt (nicht allein über Farbe — Barrierefreiheit)
- [ ] Über der Liste steht eine Zusammenfassung im Format „3 im Fluss · 2 stocken · 1 ausgestiegen"
- [ ] Die Liste ist standardmäßig so sortiert, dass 🔴 vor 🟡 vor 🟢 vor ⚪ steht
- [ ] Die Sortierung lässt sich alternativ auf alphabetisch und auf „letzter Check-in" umstellen
- [ ] Ein Klick auf eine Zeile öffnet die bestehende Detailansicht `/coach/[clientId]`

### Statusberechnung
- [ ] Ein Klient mit Check-in für die laufende Woche und Quote ≥ 50 % wird als 🟢 dargestellt
- [ ] Ein Klient mit aktuellem Check-in aber Quote < 50 % wird als 🟡 dargestellt
- [ ] Ein Klient mit Quote ≥ 50 %, dessen letzter Check-in aber die vorletzte Woche betrifft, wird als 🟡 dargestellt
- [ ] Ein Klient ohne Check-in seit 2 oder mehr Wochen wird als 🔴 dargestellt, unabhängig von seiner früheren Quote
- [ ] Ein Klient ohne jeden Check-in oder ohne Roadmap wird als ⚪ dargestellt und **nicht** als 🔴
- [ ] Nachgetragene Check-ins für weiter zurückliegende Wochen verändern den Aktualitätsteil des Status nicht

### Stimmungsverlauf
- [ ] Die Detailansicht `/coach/[clientId]` zeigt den Verlauf der Stimmungswerte der letzten bis zu 12 Check-ins
- [ ] Fehlende Wochen sind im Verlauf als Lücke erkennbar und werden nicht stillschweigend übersprungen
- [ ] Liegt weniger als ein Check-in vor, wird ein Leerzustand angezeigt statt eines leeren Diagramms

### Sichtbarkeit und Sicherheit
- [ ] Die Ampel berücksichtigt **ausschließlich** Check-ins, die der Klient freigegeben hat
- [ ] Hat ein Klient alle Check-ins privat gestellt, erscheint er als ⚪ mit dem Hinweis „Keine Freigabe" — nicht als 🔴
- [ ] Nur Nutzer mit Coach-Rolle und aktiver Verbindung zum jeweiligen Klienten erhalten dessen Daten; durchgesetzt über RLS, nicht allein über die Oberfläche
- [ ] Ein Coach kann über direkten API-Zugriff keine Daten von Klienten abrufen, mit denen keine aktive Verbindung besteht
- [ ] Ausstehende (`pending`) Einladungen erscheinen weiterhin getrennt und erhalten keinen Ampelstatus

### Leerzustände
- [ ] Ein Coach ohne verbundene Klienten sieht einen Leerzustand mit Aufforderung zur Einladung — nicht eine leere Tabelle
- [ ] Beim Laden werden Skeleton-Platzhalter angezeigt statt eines Sprungs von leer auf voll

## Edge Cases

- **Der Klient hat freigegeben, dann widerrufen.** → Bereits berechnete Ampel muss auf ⚪ „Keine Freigabe" zurückfallen, sobald keine sichtbaren Check-ins mehr existieren. Kein Weiterzeigen zwischengespeicherter Werte.
- **Ein Coach hat sehr viele Klienten.** → Die Übersicht muss auch bei 50+ Klienten in unter einer Sekunde laden. Erfordert eine aggregierte Abfrage statt einer Abfrage pro Klient (kein N+1).
- **Der Klient hat gerade erst zugesagt.** → Zwischen Verbindung und erstem Check-in vergeht mindestens eine Woche. In dieser Zeit ⚪, damit kein falscher Alarm entsteht.
- **Der Klient generiert seine Roadmap neu.** → Alte Check-ins zählen weiterhin in die Quote, sind aber als „frühere Roadmap" markiert (siehe PROJ-8). Die Ampel bleibt stabil und springt nicht auf ⚪.
- **Jahreswechsel.** → Die Wochenberechnung muss über Jahresgrenzen korrekt sein. KW 1 des Folgejahres darf gegenüber KW 52 nicht als „2 Wochen her" fehlinterpretiert werden.
- **Zeitzonen zwischen Coach und Klient.** → Der Status wird auf Basis der `week_start`-Daten des Klienten berechnet, nicht in der Zeitzone des Coaches. Ein Coach in einer anderen Zeitzone sieht denselben Status.
- **Der Klient checkt zwar ein, hakt aber nie etwas ab.** → Quote 0 %, aber Aktualität erfüllt → 🟡. Das ist gewollt: Der Klient ist ansprechbar, kommt aber nicht voran — genau der Fall, den ein Coach früh sehen will.

## Technical Requirements
- Aggregierte Abfrage über alle Klienten eines Coaches in **einer** Datenbankabfrage; kein N+1
- Ladezeit der Übersicht < 1 s bei 50 Klienten
- Responsive ab 375 px — die Kartenansicht ersetzt auf Mobilgeräten die Tabelle
- Ampelstatus nie allein über Farbe kommuniziert (WCAG); Textlabel und Icon ergänzen die Farbe
- Statusberechnung als testbare reine Funktion, unabhängig von der Datenbankabfrage, damit die Schwellenwerte per Unit-Test abgesichert sind

## Non-Goals (bewusst nicht in diesem Feature)
- **Automatische Session-Briefings** — eigenes Feature, würde auf dieser Datenbasis aufsetzen
- **Benachrichtigung des Coaches bei Statuswechsel** — eigenes Feature (Mail-Versand)
- **Konfigurierbare Schwellenwerte pro Coach** — feste Schwellen im MVP; erst nach Praxiserfahrung sinnvoll anpassbar
- **Direktnachricht an den Klienten aus der Übersicht** — bestehende Kommentarfunktion bleibt der Kanal
- **Export der Übersicht** — nicht im MVP

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
