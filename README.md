# Tagesmanager

Persönlicher Tagesmanager-Agent für Android. Alle Daten (Chat, Aufgaben, Protokoll, Notizen) liegen lokal auf dem Handy
(SQLite). Der Claude-API-Key wird in der App eingegeben und verschlüsselt im Android-Keystore gespeichert, nie im Code.

## Funktionen
- Agent-Chat mit Claude (Haiku 5.5 oder Sonnet 5.5), Werkzeuge für Kalender und Aufgaben
- Statusleiste auf jedem Screen, Live-Ansicht mit allen Schritten, Stopp-Knopf
- Bestätigungskarten für Termin-Änderungen, Protokoll mit Rückgängig
- Heute-Übersicht, Aufgaben (Hausaufgaben, Klausuren, Projekte), Morgenbriefing, Tagesplan, Plan B, Lernplan
- Kosten-Notbremse (Tageslimit für Tokens)

## Berechtigungen
Internet und Kalender (lesen/schreiben). Sonst nichts.

## APK bauen
Push auf `main` startet den Workflow `Build APK`. Die APK liegt danach als Artifact und als GitHub-Release bereit.
Lokal: `npm ci && npx expo prebuild --platform android && cd android && ./gradlew assembleRelease`.
