# Knowledge Management System

Ein vollständiges Wissensmanagementsystem für das EF-Backend mit strukturierter Speicherung und Chunking-Funktionalität.

## Datenbankstruktur

### Knowledge Tabelle (Hauptdokumente)
```sql
knowledge (
  id - Eindeutige ID
  title - Titel des Dokuments (erforderlich)
  description - Kurze Beschreibung
  content - Hauptinhalt des Dokuments
  category - Kategorie für Gruppierung
  tags - Array von Tags für flexible Kategorisierung
  is_active - Status (aktiv/inaktiv)
  created_at/updated_at - Zeitstempel
  created_by - Ersteller
  file_path - Pfad zur Datei (falls hochgeladen)
  document_type - Typ (text, markdown, pdf, etc.)
  word_count - Automatisch berechnete Wortanzahl
  reading_time_minutes - Automatisch berechnete Lesezeit
)
```

### Knowledge_Chunks Tabelle (Dokumentenabschnitte)
```sql
knowledge_chunks (
  id - Eindeutige ID
  knowledge_id - Referenz auf knowledge.id
  chunk_order - Reihenfolge im Dokument
  title - Titel des Abschnitts
  content - Inhalt des Chunks (erforderlich)
  chunk_type - Typ (text, code, table, list, etc.)
  metadata - JSON-Metadaten
  word_count - Automatisch berechnete Wortanzahl
  tokens - Geschätzte Token-Anzahl für AI
  embedding - Vektor für semantische Suche
  created_at/updated_at - Zeitstempel
)
```

## Features

### 📚 **Knowledge Management**
- **Vollständige CRUD-Operationen**: Erstellen, Lesen, Aktualisieren, Löschen
- **Strukturierte Kategorisierung**: Kategorien und Tags für flexible Organisation
- **Automatische Statistiken**: Wortanzahl und Lesezeit werden automatisch berechnet
- **Suchfunktionalität**: Suche nach Titel, Beschreibung und Inhalt
- **Pagination**: Effiziente Handhabung großer Datenmengen

### 🧩 **Chunking System**
- **Automatische Chunk-Erstellung**: Dokumente werden in verwaltbare Abschnitte unterteilt
- **Flexible Chunk-Typen**: Text, Code, Tabellen, Listen, etc.
- **Metadata-Unterstützung**: JSON-Metadaten für erweiterte Funktionen
- **AI-Integration**: Token-Schätzung und Embedding-Unterstützung für semantische Suche

### 🔍 **Such- und Filterfunktionen**
- **Volltext-Suche**: Durchsucht Titel, Beschreibung und Inhalt
- **Kategorie-Filter**: Filterung nach Kategorien
- **Tag-System**: Flexible Verschlagwortung
- **Status-Filter**: Aktive/Inaktive Dokumente

### 📊 **Automatisierte Features**
- **Word Count**: Automatische Wortanzahl-Berechnung
- **Reading Time**: Geschätzte Lesezeit (200 Wörter/Minute)
- **Token Estimation**: Token-Schätzung für AI-Anwendungen
- **Auto-Timestamps**: Automatische Zeitstempel-Updates

## Verwendung

### Neues Knowledge-Dokument erstellen
1. **Knowledge-Tab** öffnen
2. **"Add Knowledge"** Button klicken
3. **Formular ausfüllen**:
   - Titel (erforderlich)
   - Beschreibung
   - Kategorie
   - Tags (komma-getrennt)
   - Hauptinhalt (erforderlich)
   - Dokumenttyp auswählen
4. **"Create Knowledge"** klicken

### Knowledge-Dokument verwalten
- **View**: Vollständige Ansicht mit allen Chunks
- **Edit**: Bearbeitung der Grunddaten
- **Delete**: Löschen (mit Bestätigung)

### Suchen und Filtern
- **Suchfeld**: Globale Suche in Titel, Beschreibung und Inhalt
- **Kategorie-Dropdown**: Filter nach spezifischen Kategorien
- **Pagination**: Navigation durch große Datenmengen

## API-Funktionen

### Knowledge-Operationen
```typescript
// Alle Knowledge-Dokumente abrufen
dbService.getKnowledge({ page, limit, category, search, includeChunks })

// Einzelnes Dokument mit Chunks
dbService.getKnowledgeById(id)

// Neues Dokument erstellen
dbService.createKnowledge(payload)

// Dokument aktualisieren
dbService.updateKnowledge(id, payload)

// Dokument löschen
dbService.deleteKnowledge(id)

// Kategorien abrufen
dbService.getKnowledgeCategories()
```

### Chunk-Operationen
```typescript
// Chunks für ein Dokument
dbService.getKnowledgeChunks(knowledgeId)

// Neuen Chunk erstellen
dbService.createKnowledgeChunk(payload)

// Chunk aktualisieren
dbService.updateKnowledgeChunk(id, payload)

// Chunk löschen
dbService.deleteKnowledgeChunk(id)
```

## Technische Details

### Datenbankfeatures
- **Auto-Triggers**: Automatische Berechnung von Statistiken
- **Indexierung**: Optimierte Performance für Suche und Filterung
- **Cascade Delete**: Chunks werden automatisch mit dem Hauptdokument gelöscht
- **Vector Support**: Vorbereitet für AI-Embeddings (pgvector)

### Frontend-Komponenten
- **KnowledgeManager.tsx**: Hauptkomponente für Knowledge Management
- **Responsive Design**: Optimiert für alle Bildschirmgrößen
- **Moderne UI**: Dunkles Theme mit klarer Benutzerführung

### Performance-Optimierungen
- **Pagination**: Effiziente Datenladung
- **Lazy Loading**: Chunks werden nur bei Bedarf geladen
- **Optimistic Updates**: Schnelle UI-Reaktionen
- **Error Handling**: Umfassende Fehlerbehandlung

## Zukünftige Erweiterungen

### 🤖 **AI-Integration**
- Automatische Chunk-Generierung
- Semantische Suche mit Embeddings
- Content-Empfehlungen
- Automatische Zusammenfassungen

### 📁 **File Management**
- PDF-Upload und -Verarbeitung
- Markdown-Import
- Batch-Import von Dokumenten
- File-Preview

### 🔗 **Integration**
- Verknüpfung mit Exam-Questions
- Cross-Referencing zwischen Dokumenten
- Export-Funktionen
- API für externe Systeme

## Sicherheit
- **Input Validation**: Alle Eingaben werden validiert
- **SQL Injection Schutz**: Durch Supabase ORM
- **Access Control**: Vorbereitet für Benutzerrollen
- **Data Integrity**: Referenzielle Integrität durch Constraints

Das Knowledge Management System ist vollständig funktional und bereit für den produktiven Einsatz unter **http://localhost:3001** im "Knowledge"-Tab!
