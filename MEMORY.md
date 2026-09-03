# Reiseplaner PWA — Projektstand & Grundprinzip

## Status: FERTIG UND LIVE

**Live-URL:** https://mechmes.github.io/Reisplanungsapp/
**Repo:** `Mechmes/Reisplanungsapp` (öffentlich), Branch `main`
**Deployment:** automatisch via GitHub Actions bei jedem Push auf `main`
  (`.github/workflows/pages.yml`, deployt Ordner `reiseplaner-app/` auf
  GitHub Pages, Pages-Source ist auf "GitHub Actions" gestellt)

## Was die App kann

- **Übersicht** (`index.html`/`app.js`): Reisen anlegen (Titel + Start),
  auflisten, löschen, öffnen
- **Reise-Detail** (`trip.html`/`trip.js`): Titel, Start- **und**
  Enddatum; daraus werden automatisch Tages-Kacheln erzeugt (inkl.
  Datum/Wochentag pro Kachel, z. B. "Tag 3 · Mi., 03.05.2027")
- Pro Tag drei getrennte Felder: **Titel**, **Hotel**, **Beschreibung**
  (statt einem großen Freitextfeld)
- Manuelles Speichern mit Statusanzeige ("Ungespeicherte Änderungen" /
  "Wird gespeichert …" / "Gespeichert") — exaktes Muster aus dem
  ursprünglichen Artifact-Grundprinzip (siehe unten)
- **Geteilte Daten über alle Geräte/Personen hinweg** via Supabase
  (siehe Backend-Abschnitt) — kein Login nötig, jeder mit dem Link kann
  mitplanen
- Installierbar auf iPhone/iPad: Safari → Teilen-Symbol → "Zum
  Home-Bildschirm hinzufügen" (läuft danach im Vollbild wie eine native
  App)
- **Passwortschirm beim Öffnen** (`auth.js`, geladen nach `store.js` und
  vor `app.js`/`trip.js` in `index.html`/`trip.html`): Passwort liegt in
  Supabase (Tabelle `app_settings`/`app_settings_dev`, Zeile
  `key='password'`; Zugriff über `Store.getPassword()`/
  `Store.setPassword()` in `store.js`). Eingabe wird nach Erfolg in
  `localStorage` (`reiseplaner_unlocked`) gemerkt, danach kein erneutes
  Abfragen auf diesem Gerät. `FALLBACK_PASSWORD` in `auth.js`
  (`reise2027`) greift nur, wenn Supabase gerade nicht erreichbar ist.
  **Nur Sichtschutz, keine echte Sicherheit** — die Supabase-Tabellen
  bleiben über den im Frontend sichtbaren API-Key weiterhin direkt les-
  und schreibbar, unabhängig vom Passwort (siehe Backend-Abschnitt).
  Reicht, um Zufallsbesucher/Suchmaschinen fernzuhalten, nicht um die
  Reisedaten wirklich abzusichern.
- **Passwort ändern in der App**: Zahnrad-Icon (⚙) oben rechts in der
  Übersicht (`index.html`, `#settingsBtn`) öffnet ein Modal
  (`#passwordModal`), das aktuelles + neues Passwort abfragt
  (`changeAppPassword()` in `auth.js`, Logik in `app.js`). Ändert die
  Zeile in Supabase — gilt sofort für alle, die sich danach neu
  einloggen. Geräte, die bereits entsperrt sind (`localStorage`-Flag
  gesetzt), bleiben es trotz Passwortänderung — es gibt keinen
  Fern-Logout.
- Einmalig nötig, bevor das nutzbar ist: SQL aus
  `supabase_setup_app_settings.sql` im Supabase SQL-Editor ausführen
  (legt `app_settings` + `app_settings_dev` an, Startpasswort
  `reise2027`).
- **CSV-Export einer Reise** (`trip.html`/`trip.js`): Button "⤓ CSV"
  oben rechts in der Reise-Detailansicht. Baut clientseitig eine CSV
  (Spalten Tag/Datum/Titel/Hotel/Beschreibung, Semikolon-getrennt, mit
  UTF-8-BOM für Excel) und löst den Download über einen
  `Blob`+`<a download>`-Link aus — kein Server/Backend nötig.

## Backend: Supabase (aktiv, seit diesem Durchlauf)

- Projekt-URL: `https://gnjpwehxwhngqybazytc.supabase.co`
- API-Key-Typ: neuer "publishable" Key (`sb_publishable_...`), fest in
  `store.js` als `SUPABASE_URL`/`SUPABASE_KEY` hinterlegt (unkritisch,
  da App bewusst ohne Login/öffentlich zugänglich ist)
- Tabelle `trips`: `id text PK, title text, start date, "end" date,
  days jsonb, created_at, updated_at` — Setup-SQL liegt als
  `supabase_setup.sql` vor (falls Tabelle je neu aufgesetzt werden muss)
- Row Level Security ist **aktiv, aber komplett offen** (`using(true)`
  für select/insert/update/delete) — bewusst so gewählt, weil kein
  Login vorgesehen ist. Das bedeutet: theoretisch kann jeder mit dem
  API-Key (der im Frontend-Code sichtbar ist) beliebig lesen/schreiben.
  Für dieses Projekt (Freunde/Familie planen gemeinsam) akzeptiert.
- `store.js` kapselt alle Zugriffe (`listTrips`, `createTrip`,
  `deleteTrip`, `getTripState`, `saveTripState`) als **async**-Funktionen
  über die PostgREST-API von Supabase (`fetch` mit `apikey`/
  `Authorization`-Header). `app.js`/`trip.js` rufen sie mit `await` auf.

## Wichtige Lessons Learned aus diesem Durchlauf

1. **GitHub-Schreibzugriff** musste erst über
   `claude.ai/customize/connectors?auth_start=github&auth_start_force=1`
   freigegeben werden (Repo war zunächst nicht in der Claude-GitHub-App
   freigeschaltet) — danach hat der Push sofort funktioniert.
2. **GitHub Pages + Unterordner:** Die UI von Pages ("Deploy from a
   branch") kann keinen beliebigen Unterordner deployen, nur Root oder
   `/docs`. Lösung: eigener GitHub-Actions-Workflow
   (`upload-pages-artifact` mit `path: reiseplaner-app`), Pages-Source
   auf "GitHub Actions" umgestellt.
3. **Environment-Protection-Falle:** Die von GitHub automatisch
   angelegte `github-pages`-Environment hatte eine Branch-Regel, die nur
   den alten Arbeits-Branch erlaubte, nicht `main` → Workflow schlug mit
   "Branch 'main' is not allowed to deploy... due to environment
   protection rules" fehl. Fix: unter Settings → Environments →
   github-pages → "Deployment branches and tags" → `main` als erlaubten
   Branch hinzufügen (oder auf "All branches" stellen).
4. **Deploy-Pfad:** Da `upload-pages-artifact` mit `path:
   reiseplaner-app` den Inhalt dieses Ordners als Website-**Root**
   hochlädt, ist die korrekte URL `https://mechmes.github.io/
   Reisplanungsapp/` (ohne zusätzliches `/reiseplaner-app/` im Pfad).
5. **Service-Worker-Falle (wichtigster Bug):** Der ursprüngliche
   Service Worker war "cache-first" für **alle** GET-Requests inkl.
   fremder Origins. Das führte dazu, dass (a) Browser nach einem
   Code-Update weiter die alte, localStorage-basierte JS-Version
   auslieferten, und (b) Supabase-Anfragen theoretisch mit gecached
   werden konnten. Symptom beim Nutzer: "PC speichert nicht, Handy sieht
   nichts". Fix in `sw.js`: nur noch same-origin-Requests behandeln,
   Strategie auf network-first (mit Cache nur als Offline-Fallback)
   umgestellt, Cache-Name auf `reiseplaner-v2` erhöht, um alte Caches zu
   invalidieren. **Merke für künftige Änderungen:** nach jeder
   JS-Änderung ggf. Cache-Namen in `sw.js` weiter hochzählen, sonst
   sehen Nutzer mit bereits installiertem Service Worker die alte
   Version, bis sie hart neu laden.
6. Mein Sandbox-Netzwerk kann weder `*.github.io` noch
   `*.supabase.co` direkt erreichen (Egress-Proxy blockiert es) — Tests
   dieser Art müssen über den Nutzer laufen (Screenshots/Konsolen-Output
   erbitten), nicht per `curl`/`WebFetch` von hier aus.

## Offene / mögliche nächste Schritte (nicht umgesetzt)

- Eigenes App-Icon statt Platzhalter (`icons/icon-192.png`,
  `icons/icon-512.png` sind einfache Kreisgrafiken)
- Kein Echtzeit-Sync (kein Supabase-Realtime-Abo) — Änderungen anderer
  Personen sieht man erst nach Neuladen der Seite, nicht live
- Kein Konfliktschutz beim gleichzeitigen Speichern zweier Personen
  (letzter Schreibzugriff gewinnt, kein Compare-and-Set wie im
  ursprünglichen Artifact-Muster)
- Kein Zugriffsschutz/Login — jeder mit Link UND jeder, der den
  API-Key aus dem Frontend-Code ausliest, kann Daten lesen/ändern/löschen

---

# Grundprinzip (Ursprungsmuster): Geteiltes Artifact mit manuellem Speichern

(unverändert aus dem ursprünglichen Konzept — Referenz für ähnliche
zukünftige Claude-Artifact-Projekte, nicht direkt Teil dieser PWA)

Muster für ein HTML-Artifact (claude.ai), das mehrere Personen gemeinsam
bearbeiten können, mit einem Speichern-Button statt Auto-Save:

1. Eine HTML-Datei: Kopf (Styles), Body-Grundgerüst, Zustand als JSON
   (`<script type="application/json" id="stateData">`), Logik-Skript.
2. Geteilter Speicher über `window.claude.use('artifact')` +
   `artifactApi.publish(html)` — Compare-and-Set, `not_writer`/
   `not_granted` für Nur-Lese-Ansicht behandeln.
3. **Nie** aus dem Live-DOM neu bauen (`document.head`/`body` können vom
   Viewer injizierten Code enthalten) — feste String-Konstanten
   `STATIC_HEAD`/`STATIC_BODY` verwenden.
4. Manuelles statt automatisches Speichern: `markDirty()` bei jeder
   Eingabe, `persist()` nur im Button-Handler, Statuszeile zeigt
   Speicherzustand.
5. Bei `conflict`-Antwort laden alle Ansichten automatisch die neuere
   Version — normales Verhalten, kein Bug.
