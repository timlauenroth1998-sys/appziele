# PROJ-9: Coach-Dashboard mit Ampel

## Status: Architected
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
**Erstellt:** 2026-07-31

### Kurzfassung
Überwiegend **Frontend auf vorhandener Datenbasis**. Es entsteht **keine neue Tabelle** — die Ampel wird aus den Check-in-Daten von PROJ-8 berechnet. Backend-Arbeit fällt nur an einer Stelle an: eine gebündelte Abfrage, damit die Übersicht auch bei 50 Klienten schnell bleibt.

**Baut zwingend auf PROJ-8 auf.** Ohne Check-ins hat die Ampel keine Grundlage.

### A) Komponentenstruktur

```
Coach-Seite /coach                               (bestehend, wird erweitert)
+-- Zusammenfassung "3 im Fluss · 2 stocken · 1 ausgestiegen"   (NEU)
+-- Sortierumschalter                            (NEU)
|   +-- nach Status (Standard) / alphabetisch / letzter Check-in
+-- Klientenliste                                (bestehend, wird erweitert)
|   +-- je Klient:
|       +-- Name bzw. E-Mail                     (bestehend)
|       +-- Ampel: Farbe + Textlabel             (NEU)
|       +-- letzte Check-in-Woche                (NEU)
|       +-- Quote der letzten 3 Check-ins        (NEU)
|       +-- Klick -> Detailansicht               (bestehend)
+-- Offene Einladungen                           (bestehend, ohne Ampel)
+-- Leerzustand "Noch keine Klienten"            (NEU)
+-- Ladeplatzhalter                              (NEU)

Detailansicht /coach/[clientId]                  (bestehend, wird erweitert)
+-- Stimmungsverlauf der letzten bis zu 12 Check-ins    (NEU)
|   +-- Lücken für Wochen ohne Check-in sichtbar
|   +-- Leerzustand bei weniger als einem Check-in
+-- Roadmap mit Kommentaren                      (bestehend)
```

### B) Datenmodell

**Keine neue Tabelle.** Gelesen werden:

- **Check-ins** (aus PROJ-8) — aber ausschließlich die freigegebenen
- **Coach-Klienten-Verbindungen** (aus PROJ-6) — wer gehört zu wem, und ist die Verbindung aktiv
- **Zielprofil und Roadmap** — nur zur Unterscheidung „noch nicht gestartet" von „ausgestiegen"

Für die Übersicht wird je Klient ein **verdichteter Datensatz** gebildet:

- Datum der zuletzt abgedeckten Check-in-Woche
- Durchschnittliche Erfüllungsquote der letzten drei Check-ins
- Anzahl vorhandener Check-ins
- Ob überhaupt eine Roadmap existiert

Daraus errechnet sich die Ampel. Der Status selbst wird **nicht gespeichert**, sondern bei jeder Anzeige neu bestimmt — sonst müsste er bei jedem Check-in, jedem Widerruf einer Freigabe und schlicht durch Zeitablauf nachgeführt werden. Ein gespeicherter Status wäre dauerhaft veraltet.

### C) Technische Entscheidungen

**Warum eine gebündelte Abfrage statt einer Abfrage pro Klient?**
Das ist die einzige echte technische Anforderung dieses Features. Bei 50 Klienten würde die naive Variante 50 einzelne Datenbankabfragen auslösen — die Übersicht bräuchte spürbar Sekunden. Die Verdichtung gehört deshalb in die Datenbank: Sie liefert eine Zeile pro Klient, fertig gerechnet. Die Projektregeln fordern das ohnehin ausdrücklich.

**Warum wird der Status als reine Berechnung umgesetzt?**
Die Schwellenwerte — aktuell oder nicht, über oder unter 50 Prozent — sind die inhaltliche Substanz dieses Features. Als eigenständige Funktion, getrennt von der Datenbankabfrage, lassen sie sich mit erfundenen Beispielwerten vollständig durchtesten: jede Kombination aus Aktualität und Quote, jede Grenze. Wären sie in die Abfrage eingebacken, bräuchte jeder Test eine Datenbank mit vorbereiteten Daten.

**Warum unterscheiden wir Grau von Rot?**
Ein Klient, der gerade erst zugesagt hat, sieht sonst aus wie einer, der aufgegeben hat. Der Coach würde nachfassen, wo nichts nachzufassen ist — und das Vertrauen in die Ampel wäre nach zwei Fehlalarmen dahin. Grau bedeutet „noch keine Aussage möglich", Rot bedeutet „hier ist etwas passiert".

**Warum zählt für die Aktualität die abgedeckte Woche und nicht die letzte Aktivität?**
Weil Nachtragen beliebig erlaubt ist (Entscheidung aus PROJ-8). Wer acht Altwochen an einem Abend nachpflegt, war acht Wochen nicht dran — das darf nicht als grün erscheinen. Die Prüfung lautet deshalb: *Gibt es einen Check-in für die laufende oder die vorige Woche?*

**Warum Farbe immer zusammen mit Text?**
Rot-Grün-Sehschwäche betrifft etwa jeden zwölften Mann. Eine Ampel, die ihre Aussage allein über Farbe transportiert, ist für diese Nutzer wertlos. Farbe plus Wort kostet nichts und macht die Übersicht außerdem in Screenshots und Ausdrucken lesbar.

**Warum sind Lücken im Stimmungsverlauf sichtbar?**
Würden fehlende Wochen einfach übersprungen, sähe ein Verlauf mit drei Aussetzern aus wie ein durchgehender. Genau die Aussetzer sind aber das, was ein Coach sehen muss.

**Warum keine einstellbaren Schwellenwerte?**
Feste Werte im ersten Wurf. Welche Schwelle in der Praxis trägt, weiß man erst, wenn echte Coaches mit echten Klienten damit gearbeitet haben. Eine Einstellmöglichkeit jetzt zu bauen hieße, eine Frage zu beantworten, die noch niemand gestellt hat.

### D) Abhängigkeiten

**Keine neuen Pakete.**

Für den Stimmungsverlauf ist **keine Diagramm-Bibliothek nötig** — bis zu zwölf Werte lassen sich als schlichte Balken- oder Punktreihe mit Bordmitteln darstellen. Eine Bibliothek wie Recharts würde das Auslieferungspaket deutlich vergrößern für eine einzige kleine Darstellung. Sollte später ein echtes Diagramm gewünscht sein, ist der Austausch an dieser einen Stelle unkritisch.

Verwendet werden vorhandene shadcn/ui-Bausteine: `Card`, `Badge`, `Select`, `Skeleton`, `Table`.

**Neu anzulegen:** eine Datenbank-Migration für die verdichtende Abfrage.

### E) Risiken und Grenzen

| Risiko | Einschätzung |
|---|---|
| Zugriffsregeln und gebündelte Abfrage geraten in Konflikt | Häufige Fehlerquelle: Eine verdichtende Abfrage kann die Zugriffsregeln umgehen, wenn sie mit erhöhten Rechten läuft. Muss beim Bau ausdrücklich geprüft werden — ein Coach darf über diesen Weg keine Daten fremder Klienten sehen. |
| Klient widerruft alle Freigaben | Ampel fällt auf Grau mit dem Hinweis „Keine Freigabe" zurück, nicht auf Rot. Ein Widerruf ist kein Scheitern. |
| Jahreswechsel | Kalenderwoche 1 darf gegenüber Woche 52 nicht als „zwei Wochen her" gelten. Wird über Datumsdifferenzen gerechnet, nicht über Wochennummern. |
| Coach und Klient in verschiedenen Zeitzonen | Gerechnet wird auf den Wochendaten des Klienten. Beide sehen denselben Status. |
| Ampel wirkt als Bewertung des Menschen | Gestalterisch abzufedern: Die Formulierungen lauten „im Fluss", „stockt", „ausgestiegen" — Beschreibungen einer Situation, keine Urteile über eine Person. |

### F) Testbarkeit
Die Statusberechnung ist der Kern und vollständig ohne Datenbank prüfbar: jede Kombination aus Aktualität und Quote, die Grenzfälle bei genau 50 Prozent und bei exakt zwei Wochen, Klienten ohne Check-in, Klienten ohne Roadmap, Klienten ohne Freigabe. Zusätzlich ein Zugriffstest, der belegt, dass ein Coach über die gebündelte Abfrage keine fremden Daten erhält, und ein Lasttest mit vielen Klienten gegen die Ein-Sekunden-Vorgabe.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
