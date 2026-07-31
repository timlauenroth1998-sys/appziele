# PROJ-8: Wöchentlicher Check-in

## Status: Architected
**Created:** 2026-07-31
**Last Updated:** 2026-07-31

## Ziel des Features
Die App erzeugt heute einen Plan und wird danach still. Der Wochen-Check-in schließt diese Lücke: Er ist das wiederkehrende Ritual, das aus einer einmaligen Roadmap eine begleitete Umsetzung macht. Der Klient hakt einmal pro Woche seine Wochenziele ab und bewertet die Woche auf einer Skala. Daraus entstehen die Daten, die PROJ-9 (Coach-Dashboard) und spätere Auswertungen überhaupt erst möglich machen.

## Dependencies
- **Requires: PROJ-2** (KI-Roadmap-Generierung) — der Check-in hakt die generierten Wochenziele ab; ohne Roadmap gibt es nichts zu prüfen
- **Requires: PROJ-5** (Benutzerkonten) — Check-ins werden serverseitig pro Nutzer gespeichert, Login ist Voraussetzung
- **Requires: PROJ-6** (Coach-Klienten-Ansicht) — liefert die Coach-Verbindung, gegen die der Teilen-Schalter prüft
- **Enables: PROJ-9** (Coach-Dashboard mit Ampel) — die Ampel wird aus Check-in-Aktualität und Erfüllungsquote berechnet

## Produktentscheidungen
Diese Punkte wurden bewusst so entschieden und sind kein Versehen:

| Entscheidung | Gewählt | Begründung |
|---|---|---|
| Login | Erforderlich | Historie und Coach-Freigabe brauchen serverseitige Daten. Die übrige App bleibt ohne Login nutzbar. |
| Nachtragen | Beliebig weit zurück | Urlaub und Krankheit sollen keine dauerhafte Lücke hinterlassen. Missbrauchsrisiko wird über die getrennte Zeiterfassung entschärft (siehe unten). |
| Inhalt | Abhaken + Stimmungs-Skala, **kein Freitext** | Sehr schnell ausfüllbar und maschinell auswertbar. Bewusster Verzicht: Der Coach sieht das „Warum" nicht — dieses Gespräch findet in der Session statt, nicht im Formular. |
| Sichtbarkeit | Klient entscheidet pro Check-in | Standard ist geteilt, aber einzeln abwählbar. Ehrliche Antworten setzen die Option auf Privatheit voraus. |

### Nachtragen ohne die Ampel zu entwerten
Jeder Check-in speichert **zwei getrennte Zeitangaben**:
- `week_start` — die Woche, um die es inhaltlich geht
- `submitted_at` — wann der Eintrag tatsächlich abgeschickt wurde

Die Aktualitäts-Prüfung in PROJ-9 fragt ausschließlich: *Existiert ein Check-in für die laufende oder die vorige Woche?* Nachträge zu weiter zurückliegenden Wochen erzeugen also keine grüne Ampel. Liegt `submitted_at` mehr als 7 Tage nach `week_start`, gilt der Eintrag als nachgetragen und wird als solcher gekennzeichnet — für den Coach ist das eine nützliche Information, kein Makel.

## User Stories
- Als **Klient** möchte ich einmal pro Woche meine Wochenziele abhaken, damit ich sehe, was ich tatsächlich geschafft habe statt es nur zu schätzen.
- Als **Klient** möchte ich meine Zufriedenheit mit der Woche auf einer Skala festhalten, damit ich über mehrere Wochen Muster erkenne.
- Als **Klient** möchte ich pro Check-in entscheiden, ob mein Coach ihn sieht, damit ich ehrlich antworten kann und nicht das schreibe, was gut aussieht.
- Als **Klient** möchte ich vergangene Wochen nachtragen können, damit Urlaub oder Krankheit keine dauerhafte Lücke in meiner Historie hinterlässt.
- Als **Klient** möchte ich meine bisherigen Check-ins als Verlauf sehen, damit mein Fortschritt über Wochen sichtbar wird.
- Als **Coach** möchte ich die freigegebenen Check-ins meiner Klienten einsehen, damit ich die nächste Session vorbereiten kann, ohne nachfragen zu müssen.

## Acceptance Criteria

### Einstieg
- [ ] Eingeloggte Nutzer mit vorhandener Roadmap sehen auf `/roadmap` einen Einstiegspunkt „Wochen-Check-in", der die laufende Woche mit Datumsspanne benennt (z. B. „KW 31 · 28.07.–03.08.")
- [ ] Nicht eingeloggte Nutzer sehen an derselben Stelle einen Hinweis mit Link auf `/auth` statt des Check-in-Einstiegs
- [ ] Nutzer ohne generierte Roadmap sehen den Einstiegspunkt nicht
- [ ] Ist der Check-in der laufenden Woche bereits abgeschlossen, zeigt der Einstiegspunkt stattdessen die erreichte Quote und die Bezeichnung „Bearbeiten"

### Check-in ausfüllen
- [ ] Der Check-in listet alle Wochenziele der gewählten Woche über **alle** Lebensbereiche hinweg, gruppiert und farblich nach Lebensbereich getrennt
- [ ] Jedes Wochenziel lässt sich als erledigt / nicht erledigt markieren
- [ ] Der Check-in enthält genau eine Stimmungs-Skala von 1 bis 10 zur Frage „Wie zufrieden bist du mit dieser Woche?"
- [ ] Die Stimmungs-Skala ist Pflichtfeld — ohne Auswahl lässt sich der Check-in nicht abschließen, und der Nutzer erhält eine sichtbare Fehlermeldung
- [ ] Das Abhaken einzelner Ziele ist **nicht** Pflicht; ein Check-in mit null erledigten Zielen ist ein gültiger Eintrag
- [ ] Ein Schalter „Mit meinem Coach teilen" ist voreingestellt aktiv, solange eine aktive Coach-Verbindung besteht, und lässt sich pro Check-in abwählen
- [ ] Besteht keine aktive Coach-Verbindung, wird der Schalter gar nicht angezeigt
- [ ] Nach dem Absenden zeigt die App die berechnete Erfüllungsquote der Woche im Klartext (z. B. „5 von 8 Zielen erreicht")

### Woche wählen und nachtragen
- [ ] Über eine Wochenauswahl lässt sich jede vergangene Woche ab dem Generierungsdatum der Roadmap auswählen und nachtragen
- [ ] Zukünftige Wochen sind nicht auswählbar
- [ ] Wochen mit vorhandenem Check-in sind in der Auswahl visuell von offenen Wochen unterscheidbar
- [ ] Ein abgeschlossener Check-in lässt sich erneut öffnen und ändern; die Änderung überschreibt den bestehenden Eintrag, statt einen zweiten anzulegen
- [ ] Pro Nutzer und Woche existiert höchstens ein Check-in (auf Datenbankebene erzwungen, nicht nur in der UI)

### Persistenz und Historie
- [ ] Jeder Check-in speichert `week_start` und `submitted_at` als getrennte Werte
- [ ] Nach einem Reload sind alle Eingaben unverändert vorhanden
- [ ] Eine Historien-Ansicht listet alle Check-ins absteigend nach Woche, je mit Quote und Stimmungswert
- [ ] Check-ins, deren `submitted_at` mehr als 7 Tage nach `week_start` liegt, sind in der Historie als „nachgetragen" gekennzeichnet

### Sichtbarkeit und Sicherheit
- [ ] Ein Coach sieht ausschließlich Check-ins, die vom Klienten freigegeben wurden — durchgesetzt über RLS-Policy, nicht allein über die Oberfläche
- [ ] Ein Nutzer ohne Coach-Verbindung kann fremde Check-ins auch bei direktem API-Zugriff nicht lesen
- [ ] Das nachträgliche Abwählen der Freigabe entzieht dem Coach den Zugriff sofort

## Edge Cases

- **Die Roadmap ist älter als vier Wochen.** Das Datenmodell kennt nur `w1`–`w4`. Welche Wochenziele gelten in Woche 5? → Vorschlag: Ab Woche 5 rotieren die Wochenebenen (`w1` erneut), begleitet von einem Hinweis „Deine Roadmap ist über einen Monat alt — Zeit für eine Aktualisierung?". Alternative wäre eine Sperre; das wäre aber ein Abbruch für genau die Nutzer, die durchhalten. **In der Architekturphase zu entscheiden.**
- **Die Roadmap wird neu generiert.** Die `RoadmapItem`-IDs ändern sich, bestehende Check-ins zeigen auf nicht mehr existente Ziele. → Alte Check-ins bleiben mit ihrer gespeicherten Quote bestehen und werden als „zu einer früheren Roadmap" markiert. Die Zieltexte müssen im Check-in mitgespeichert werden, nicht nur die IDs.
- **Ein Wochenziel wird inline bearbeitet, nachdem der Check-in abgeschlossen wurde.** → Der Check-in behält den Text zum Zeitpunkt des Ausfüllens; nachträgliche Änderungen am Ziel verändern die Historie nicht.
- **Der Klient trennt die Coach-Verbindung.** → Bereits geteilte Check-ins sind für den ehemaligen Coach nicht mehr einsehbar. Die Freigabe hängt an der aktiven Verbindung, nicht am Zeitpunkt der Erstellung.
- **Der Klient checkt auf zwei Geräten gleichzeitig ein.** → Letzter Schreibvorgang gewinnt. Kein Merge-Konflikt-Dialog im MVP.
- **Ein Lebensbereich hat gar keine Wochenziele.** → Der Bereich wird im Check-in mit einem Leerzustand aufgeführt statt weggelassen, damit die Lücke sichtbar wird.
- **Wochengrenze und Zeitzone.** → Die Woche beginnt Montag 00:00 in der lokalen Zeitzone des Nutzers. `week_start` wird als Datum ohne Zeitanteil gespeichert, um Verschiebungen über Zeitzonen zu vermeiden.
- **Supabase ist nicht erreichbar.** → Der Check-in zeigt eine Fehlermeldung und verwirft die Eingabe nicht, damit der Nutzer erneut absenden kann.

## Technical Requirements
- Neue Tabelle für Check-ins mit `UNIQUE (user_id, week_start)` und aktivem RLS
- Die bestehende `completions`-Tabelle bleibt vorerst unangetastet; eine Zusammenführung ist ein eigenes Feature (siehe Non-Goals)
- Ladezeit der Check-in-Ansicht < 500 ms bei bis zu 8 Lebensbereichen
- Vollständig bedienbar auf Mobilgeräten ab 375 px Breite — der Check-in wird überwiegend am Telefon ausgefüllt
- Tastaturbedienbar und mit ARIA-Labels für die Skala

## Non-Goals (bewusst nicht in diesem Feature)
- **Freitext-Reflexion** — bewusst zugunsten der Ausfüllgeschwindigkeit weggelassen. Kann später ergänzt werden, ohne das Datenmodell zu brechen.
- **Erinnerungs-Mails** — eigenes Feature, setzt diesen Check-in voraus
- **Streaks und Fortschrittskurven** — die Datenbasis entsteht hier, die Auswertung ist ein eigenes Feature
- **Zusammenführung mit der bestehenden `completions`-Tabelle** — eigenständige Migration
- **Check-ins für Monats- oder Quartalsziele** — nur Wochenebene im MVP

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
**Erstellt:** 2026-07-31

### Kurzfassung
Braucht **Frontend und Backend**. Neu sind: eine Datenbanktabelle mit Zugriffsregeln, eine eigene Seite für den Check-in, eine Verlaufsansicht und ein Einstiegspunkt auf der Roadmap-Seite. Der Umfang entspricht etwa PROJ-6 (Coach-Klienten-Ansicht) — dort gibt es ein gutes Vorbild für Tabelle plus Zugriffsregeln plus Coach-Freigabe.

### A) Komponentenstruktur

```
Roadmap-Seite                                    (bestehend)
+-- Einstiegskarte "Wochen-Check-in"             (NEU)
    +-- offen:      Woche + Aufforderung
    +-- erledigt:   erreichte Quote + "Bearbeiten"
    +-- ohne Login: Hinweis + Link zur Anmeldung

Check-in-Seite                                   (NEU, eigene Route)
+-- Wochenauswahl
|   +-- Liste vergangener Wochen, erledigte markiert
|   +-- zukünftige Wochen nicht wählbar
+-- Zielliste, gruppiert nach Lebensbereich
|   +-- je Ziel: Text + Erledigt-Schalter
|   +-- Lebensbereich ohne Wochenziele: Leerzustand
+-- Stimmungs-Skala 1-10                         (Pflichtfeld)
+-- Schalter "Mit meinem Coach teilen"           (nur bei aktiver Verbindung)
+-- Abschluss
    +-- Ergebnis "5 von 8 Zielen erreicht"

Verlaufsansicht                                  (NEU)
+-- Liste aller Check-ins, neueste zuerst
    +-- je Eintrag: Woche, Quote, Stimmung
    +-- Kennzeichen "nachgetragen"
    +-- Kennzeichen "zu einer früheren Roadmap"
```

Dazu ein **Check-in-Speicher** als eigener Baustein, analog zu den vorhandenen Speicher-Bausteinen für Ziele, Roadmap und Coach-Kommentare.

### B) Datenmodell

Ein Check-in enthält:

- **Wer** — Verweis auf das Nutzerkonto
- **Für welche Woche** — das Datum des Montags dieser Woche
- **Wann abgeschickt** — Zeitpunkt des Absendens
- **Welche Ziele erledigt wurden** — Liste der Zielkennungen
- **Wie die Ziele damals lauteten** — eine Textkopie aller abgefragten Ziele
- **Stimmungswert** — Zahl von 1 bis 10
- **Freigabe** — mit dem Coach geteilt: ja oder nein

**Regel:** Pro Nutzer und Woche höchstens ein Eintrag. Diese Regel wird in der Datenbank verankert, nicht nur in der Oberfläche — sonst entstehen bei Doppelklick oder zwei Geräten stille Duplikate.

**Ablage:** Supabase. Login erforderlich.

**Warum die Textkopie der Ziele?** Wird die Roadmap neu generiert, ändern sich alle Zielkennungen. Ohne Kopie zeigten alte Check-ins auf Ziele, die es nicht mehr gibt — der Verlauf wäre wertlos. Mit Kopie bleibt jeder Eintrag für sich lesbar, unabhängig davon, wie oft die Roadmap seither erneuert wurde.

**Zugriffsregeln** (in der Datenbank durchgesetzt, nicht nur in der Oberfläche):
- Ein Nutzer sieht und ändert ausschließlich seine eigenen Check-ins
- Ein Coach sieht einen Check-in nur, wenn **beides** gilt: der Klient hat ihn freigegeben **und** die Coach-Verbindung ist aktiv
- Niemand sonst hat Zugriff

Das entspricht dem Muster, das PROJ-6 für Roadmap-Kommentare bereits verwendet.

### C) Technische Entscheidungen

**Welche Woche ist „diese Woche"? — die offene Frage aus der Spec**

Die Roadmap kennt nur vier Wochenebenen. Sie werden ab dem Generierungsdatum gezählt: Woche 1 ist die Woche der Generierung, Woche 4 die vierte danach. Was danach kommt, war ungeklärt.

**Empfehlung: Die vier Wochen wiederholen sich, begleitet von einer Aufforderung zur Aktualisierung.** Ab Woche 5 fragt der Check-in wieder die Ziele von Woche 1 ab. Zusätzlich erscheint auf der Roadmap-Seite ein deutlicher Hinweis: *„Deine Roadmap ist über einen Monat alt — Zeit für eine Aktualisierung."*

Begründung: Die Alternative wäre, den Check-in nach vier Wochen zu sperren. Das würde ausgerechnet die Nutzer bestrafen, die durchhalten — und sie in dem Moment aus dem Ritual werfen, in dem es zu greifen beginnt. Die Wiederholung ist inhaltlich unsauber (dieselben Ziele erneut), hält aber die Gewohnheit am Leben und erzeugt genau den richtigen Druck, die Roadmap zu erneuern.

Die Mechanik dafür ist schon da: PROJ-2 erkennt über einen Vergleichswert, wenn sich die Ziele geändert haben, und zeigt bereits einen „Roadmap aktualisieren"-Hinweis. Dieser wird nur um das Alterskriterium erweitert.

**Das ist ausdrücklich eine Übergangslösung.** Die saubere Antwort ist eine Roadmap, die sich auf Basis des tatsächlichen Fortschritts fortschreibt — also KI-gestützte Neuplanung statt Wiederholung. Das ist ein eigenes Feature und setzt genau die Check-in-Daten voraus, die hier erst entstehen. Die Reihenfolge stimmt also; hier wird nur nichts verbaut.

**Warum eine neue Tabelle und nicht die bestehende Erledigt-Liste erweitern?**
Die vorhandene Tabelle für Erledigungen speichert **eine Zeile pro Nutzer** mit einer Liste erledigter Kennungen — ohne Zeitbezug. Sie beantwortet „was ist erledigt", nicht „wann". Für Streaks, Verlauf und die Ampel in PROJ-9 ist der Zeitpunkt aber die entscheidende Information. Beides zusammenzuführen wäre eine eigene Migration mit Risiko für bestehende Daten. Die neue Tabelle steht daher zunächst daneben; die Zusammenführung ist als eigenes Vorhaben vermerkt.

**Warum wird ein bestehender Check-in überschrieben statt ergänzt?**
Ein zweiter Eintrag für dieselbe Woche würde jede Auswertung mehrdeutig machen — welcher zählt? Eine Woche hat genau einen Stand.

**Warum zwei getrennte Zeitangaben (Woche und Absendezeitpunkt)?**
Weil beliebiges Nachtragen erlaubt ist. Ohne die Trennung könnte jemand acht Altwochen an einem Abend nachpflegen und stünde in PROJ-9 auf Grün. Die Ampel fragt deshalb nach der *abgedeckten Woche*, nicht nach der letzten Aktivität. Nebeneffekt: Der Abstand zwischen beiden Werten zeigt an, dass nachgetragen wurde — für einen Coach eine nützliche Information.

**Warum ist die Stimmungs-Skala Pflicht, das Abhaken aber nicht?**
Ein Check-in ohne erledigte Ziele ist eine ehrliche und wichtige Aussage — die muss möglich sein. Die Skala dagegen ist der einzige Wert, der jede Woche vergleichbar macht; fehlt er, entstehen Lücken im Verlauf, die man später nicht mehr füllen kann.

**Warum eine eigene Seite statt eines Dialogs auf der Roadmap?**
Bei bis zu acht Lebensbereichen mit je mehreren Wochenzielen wird die Liste lang. Auf dem Telefon — wo der Check-in überwiegend stattfinden wird — ist ein Dialog dafür der falsche Rahmen. Eine eigene Seite ist außerdem verlinkbar, was die späteren Erinnerungs-Mails direkt nutzen können.

### D) Abhängigkeiten

**Keine neuen Pakete.** Alles Nötige ist vorhanden: Supabase-Anbindung, Authentifizierung, das Coach-Verbindungsmodell aus PROJ-6, und die shadcn/ui-Bausteine (`Card`, `Checkbox`, `Slider` oder `RadioGroup` für die Skala, `Switch` für die Freigabe, `Select` für die Wochenauswahl, `Badge`, `Progress`).

**Neu anzulegen:** eine Datenbank-Migration im vorhandenen Ordner `supabase/migrations/`, benannt nach dem etablierten Schema.

### E) Risiken und Grenzen

| Risiko | Einschätzung |
|---|---|
| Wochenwiederholung ab Woche 5 wirkt unpassend | Bewusste Übergangslösung, siehe oben. Der Aktualisierungs-Hinweis mildert es. |
| Zwei Geräte gleichzeitig | Letzter Schreibvorgang gewinnt; die Eindeutigkeitsregel verhindert Duplikate. |
| Zeitzonen | Die Woche beginnt Montag in der lokalen Zeit des Nutzers; gespeichert wird ein reines Datum ohne Uhrzeit, damit nichts über Zeitgrenzen verrutscht. |
| Zwei parallele Erledigt-Systeme | Bewusst in Kauf genommen, um keine Migration bestehender Daten zu riskieren. Als eigenes Vorhaben vermerkt. |
| Coach-Freigabe wird widerrufen | Zugriff endet sofort, weil die Regel bei jeder Abfrage neu greift und nicht zwischengespeichert wird. |

### F) Testbarkeit
Die Wochenberechnung (welche Woche gilt gerade, was passiert am Jahreswechsel, was ab Woche 5) wird als eigenständige Funktion umgesetzt und ist damit direkt prüfbar — ohne Datenbank, ohne Browser. Die Zugriffsregeln brauchen einen Test, der bestätigt, dass ein Coach ohne Freigabe **auch bei direktem Zugriff** nichts sieht; die Oberfläche allein ist kein Nachweis. Dazu ein Durchlauf im Browser über den vollständigen Ablauf inklusive Nachtragen.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
