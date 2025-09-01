# Exam Creation Feature

Dieses Feature ermöglicht es, neue Examen anzulegen mit vollständigen Daten und Template-Funktionalität.

## Features

### 1. Erweiterte Exam-Erstellung
- **Vollständige Felder**: Alle verfügbaren Exam-Felder können beim Erstellen ausgefüllt werden
- **Validierung**: Exam-Codes werden auf Eindeutigkeit geprüft
- **Strukturierte Eingabe**: Felder sind in logische Gruppen aufgeteilt:
  - Basic Information (Code, Name, Vendor, Schwierigkeit)
  - Settings (Active, Featured, Display Order, Duration)
  - Page Details (Header Label, URL Path, Icon)
  - SEO Settings (Titel, H1, Meta Description, Keywords, etc.)

### 2. Template-Funktionalität
- **Template-Dropdown**: Dropdown-Auswahl aller Examen (aktiv und inaktiv) als Vorlage
- **"Copy" Button**: Jedes bestehende Exam kann direkt als Template verwendet werden
- **Smart Copy**: Relevante Daten werden kopiert, aber Code und URL werden leer gelassen
- **Template-Preview**: Vorschau des gewählten Templates mit Details und Status-Anzeige
- **Template-Hinweis**: Visuelle Anzeige des verwendeten Templates mit Möglichkeit zum Entfernen

### 3. Validierung
- **Frontend-Validierung**: Echtzeit-Prüfung der Exam-Code Eindeutigkeit
- **Backend-Validierung**: Zusätzliche Prüfung in der Datenbank vor dem Speichern
- **Fehleranzeige**: Klare Fehlermeldungen bei doppelten Codes

## Verwendung

### Neues Exam erstellen
1. Auf "Add Exam" Button klicken
2. **Optional**: Template aus Dropdown auswählen oder von Grund auf starten
3. Alle gewünschten Felder ausfüllen
4. Mindestens "Exam Code" und "Exam Name" sind erforderlich
5. "Create Exam" klicken

### Template verwenden

#### Methode 1: Template-Dropdown
1. "Add Exam" Button klicken
2. Im "Template Selection" Dropdown ein bestehendes Exam wählen
3. Daten werden automatisch geladen und als Vorlage verwendet
4. Exam Code anpassen (muss eindeutig sein)
5. Weitere Felder nach Bedarf anpassen
6. "Create Exam" klicken

#### Methode 2: Copy Button
1. Bei einem bestehenden Exam auf "Copy" Button klicken
2. Das Create-Formular öffnet sich mit vorbefüllten Daten
3. Exam Code anpassen (muss eindeutig sein)
4. Weitere Felder nach Bedarf anpassen
5. "Create Exam" klicken

### Validierung
- Der Exam Code wird automatisch großgeschrieben
- Bei doppelten Codes erscheint eine rote Fehlermeldung
- Das Formular kann nur bei gültigen Daten abgesendet werden

## Technische Details

### Frontend Änderungen
- `ExamsTable.tsx`: Erweitert um Template-Funktionalität und vollständige Create-Form
- Neue State-Variablen für Template-Daten und Validierung
- Template-Dropdown mit Vorschau und Status-Anzeige (aktive und inaktive Examen)
- Strukturierte UI mit Gruppierung der Felder
- Zwei Wege zur Template-Nutzung: Dropdown-Auswahl und Copy-Button

### Backend Änderungen
- `supabase.ts`: Erweitert um Exam-Code Eindeutigkeitsprüfung
- Case-insensitive Prüfung gegen bestehende Codes
- Klare Fehlermeldungen bei Konflikten

### Datentypen
- `CreateExamPageInput`: Unterstützt alle verfügbaren Exam-Felder
- Automatische Defaults für nicht ausgefüllte Felder

## Sicherheit
- Eingaben werden validiert
- SQL-Injection Schutz durch Supabase
- Eindeutigkeitsprüfung verhindert Dubletten

## UI/UX Verbesserungen
- Responsives Design für alle Bildschirmgrößen
- Klare Feldgruppierung und Labels
- Template-Dropdown mit allen Examen (inkl. inaktiven) und Status-Anzeige
- Template-Indikator mit Abbruchmöglichkeit
- Zwei intuitive Wege zur Template-Nutzung
- Progressiver Enhancement (alle Felder optional außer Code + Name)
