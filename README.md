# Reiseplaner PWA

Eine kleine Progressive Web App (PWA) zur einfachen Planung von Reisen: Reisen anlegen, pro Tag Notizen/Programm eintragen und alles offline im Browser speichern.

## Beschreibung

Reiseplaner ist eine reine Frontend-Anwendung (kein Server, kein Backend) auf Basis von HTML, CSS und Vanilla-JavaScript. Alle Daten werden lokal im `localStorage` des Browsers gespeichert. Durch den enthaltenen Service Worker funktioniert die App auch offline und lässt sich auf Mobilgeräten „wie eine native App" installieren (Add to Homescreen).

Die App besteht aus zwei Ansichten:

1. **Übersicht (`index.html`)** – Liste aller angelegten Reisen mit Titel und Startdatum. Neue Reisen anlegen, bestehende löschen, per Klick auf eine Karte zur Detailansicht wechseln.
2. **Reise-Detail (`trip.html`)** – Titel und Startdatum einer Reise bearbeiten, beliebig viele Tage hinzufügen/entfernen und pro Tag Freitext-Notizen (Programm) erfassen.

## Projektstruktur

```
reiseplaner-app/
├── index.html            Startseite / Reiseübersicht (Markup)
├── app.js                Logik der Übersichtsseite
├── trip.html             Detailseite einer einzelnen Reise (Markup)
├── trip.js               Logik der Detailseite (Tage, Notizen, Speichern)
├── store.js              Zentrale Datenschicht (localStorage-Zugriff)
├── sw.js                 Service Worker (Offline-Caching)
├── manifest.webmanifest  PWA-Manifest (Name, Icons, Startverhalten)
├── style.css             Globales Styling (Dark Theme)
└── icons/                App-Icons (192px / 512px) für Installation
```

## Funktionen im Detail

### Übersichtsseite (`index.html` / `app.js`)
- Zeigt alle Reisen als Karten (Titel + Startdatum) an.
- Leerer Zustand ("Noch keine Reise angelegt…"), wenn keine Reise existiert.
- „+"-Button (Floating Action Button) öffnet ein Modal zum Anlegen einer neuen Reise (Titel, Startdatum).
- Nach dem Anlegen wird direkt zur Detailseite der neuen Reise gesprungen.
- Jede Karte hat einen Löschen-Button (🗑), der ein Bestätigungs-Modal öffnet.
- Registriert beim Laden der Seite den Service Worker für Offline-Funktion.

### Reise-Detailseite (`trip.html` / `trip.js`)
- Titel und Startdatum der Reise sind direkt editierbar.
- „+ Tag hinzufügen" legt einen neuen, fortlaufend nummerierten Tag an.
- Pro Tag gibt es ein Textfeld für freie Notizen/Programmpunkte.
- Tage können einzeln über das ✕-Symbol entfernt werden.
- Eine Statusleiste am unteren Bildschirmrand zeigt den Speicherstatus:
  - „Gespeichert"
  - „Ungespeicherte Änderungen"
  - „Wird gespeichert …"
- Der „Speichern"-Button ist nur aktiv, wenn es ungespeicherte Änderungen gibt.
- Beim Verlassen der Seite mit ungespeicherten Änderungen warnt der Browser (`beforeunload`).
- Ist keine gültige Reise-ID in der URL vorhanden, wird automatisch zur Übersicht zurückgeleitet.

### Datenschicht (`store.js`)
Kapselt sämtlichen Datenzugriff hinter einem `Store`-Objekt, damit die Speicherung später (z. B. durch ein Supabase-Backend) ausgetauscht werden kann, ohne `index.html`/`trip.html` anzupassen. Aktuell nutzt sie `localStorage` mit zwei Arten von Einträgen:

- `reiseplaner.trips` – Index/Liste aller Reisen (Metadaten: `id`, `title`, `start`, `createdAt`, `updatedAt`).
- `reiseplaner.trip.<id>` – vollständiger Zustand einer einzelnen Reise (`id`, `title`, `start`, `days` als Objekt `{ tagNummer: notiztext }`).

Angebotene Methoden:
| Methode | Zweck |
|---|---|
| `listTrips()` | Alle Reisen absteigend nach letzter Änderung sortiert zurückgeben |
| `createTrip({ title, start })` | Neue Reise inkl. leerem Tagesplan anlegen |
| `deleteTrip(id)` | Reise und ihre Detaildaten löschen |
| `getTripState(id)` | Vollständigen Zustand einer Reise laden |
| `saveTripState(id, state)` | Zustand einer Reise speichern und Index-Metadaten aktualisieren |

### Offline-Fähigkeit (`sw.js`, `manifest.webmanifest`)
- Der Service Worker cached beim Installieren alle statischen App-Dateien (App-Shell) und liefert sie mit einer „stale-while-revalidate"-Strategie aus (gecachte Version sofort anzeigen, im Hintergrund aktualisieren).
- Alte Cache-Versionen werden beim Aktivieren automatisch entfernt.
- Das Web-App-Manifest definiert Name, Icons, Startseite, Vollbildmodus (`standalone`) und Farbschema, damit die App auf dem Homescreen installiert werden kann.

### Design (`style.css`)
Dunkles, mobil-optimiertes Design (Dark Theme) mit CSS-Variablen für Farben (`--surface`, `--border`, `--text` usw.), abgerundeten Karten, Modal-Dialogen und einer fixierten Speicherleiste.

## Technologie-Stack
- Reines HTML5 / CSS3 / JavaScript (ES6+), keine Frameworks oder Build-Tools.
- Browser `localStorage` als Datenspeicher (kein Server/Backend nötig).
- Service Worker + Web App Manifest für PWA-/Offline-Funktionalität.

## Nutzung / Lokales Starten
Da die App rein clientseitig läuft, genügt es, die Dateien über einen lokalen Webserver auszuliefern (für `localStorage` und Service Worker wird `http(s)://` oder `localhost` benötigt, `file://` funktioniert nicht zuverlässig):

```bash
cd reiseplaner-app
python3 -m http.server 8000
# dann im Browser: http://localhost:8000
```

## Bekannte Grenzen
- Daten werden ausschließlich lokal im Browser gespeichert (kein Sync zwischen Geräten, kein gemeinsames Bearbeiten trotz Beschreibung „Reisen gemeinsam planen").
- Kein Backend, keine Authentifizierung, keine automatisierten Tests.
- `store.js` ist bewusst so aufgebaut, dass ein künftiger Server-/Supabase-Adapter mit gleicher Schnittstelle ergänzt werden kann.
