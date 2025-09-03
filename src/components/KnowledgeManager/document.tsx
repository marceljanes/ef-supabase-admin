import React, { useMemo, useState, useEffect } from 'react';
import { GraphicEditor } from './GraphicEditor';

// Safe date formatting for SSR
const useSafeDate = (dateString: string) => {
  const [formattedDate, setFormattedDate] = useState('');
  
  useEffect(() => {
    setFormattedDate(new Date(dateString).toLocaleDateString());
  }, [dateString]);
  
  return formattedDate;
};

interface DocumentHeaderProps {
  selectedDocument: any;
  documentTheme: 'dark' | 'light';
  onEditDocument: (doc: any) => void;
  onCloseDocument: () => void;
  onToggleTheme: () => void;
  onRenumberChunks?: () => void;
}

export const DocumentHeader: React.FC<DocumentHeaderProps> = ({
  selectedDocument,
  documentTheme,
  onEditDocument,
  onCloseDocument,
  onToggleTheme,
  onRenumberChunks
}) => {
  const formattedDate = useSafeDate(selectedDocument.updated_at);

  return (
    <div className="bg-zinc-800 border-b border-zinc-600 p-8">
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-white mb-3 leading-tight">{selectedDocument.title}</h1>
          <div className="flex items-center gap-6 text-base text-zinc-300">
            <span className="bg-zinc-700 px-3 py-1 rounded-full">{selectedDocument.document_type}</span>
            <span>{selectedDocument.word_count} words</span>
            <span>{selectedDocument.reading_time_minutes} minutes read</span>
            <span>Updated {formattedDate}</span>
          </div>
        </div>
        
      </div>

      {selectedDocument.category && (
        <div className="mb-3">
          <span className="text-sm text-zinc-400 mr-2">Category:</span>
          <span className="bg-zinc-700 px-3 py-1 rounded-full text-sm text-zinc-200">{selectedDocument.category}</span>
        </div>
      )}

      {selectedDocument.tags && selectedDocument.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedDocument.tags.map((tag: string, idx: number) => (
            <span key={idx} className="bg-blue-900/50 text-blue-300 px-3 py-1 rounded-full text-xs border border-blue-800">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {selectedDocument.description && (
        <div className="mt-6 p-4 bg-zinc-900/50 rounded-lg border-l-4 border-zinc-500">
          <p className="text-zinc-300 italic leading-relaxed">{selectedDocument.description}</p>
        </div>
      )}
    </div>
  );
};

interface ChunkProps {
  chunk: any;
  documentTheme: 'dark' | 'light';
  isFirst?: boolean;
  isLast?: boolean;
  isMoving?: boolean;
  onEditChunk: (chunk: any) => void;
  onUpdateChunkDirect?: (chunkData: any) => void;
  onDeleteChunk: (chunkId: number) => void;
  onMoveChunkUp?: (chunkId: number) => void;
  onMoveChunkDown?: (chunkId: number) => void;
  onInsertTextChunkAfter?: (chunkOrder: number) => void;
  onCreateChunkDirect?: (chunkData: any, insertAfter?: number) => void;
  onInsertGraphicChunkAfter?: (chunkOrder: number) => void;
  onInsertImageChunkAfter?: (chunkOrder: number, file: File) => void;
}

export const ChunkRenderer: React.FC<ChunkProps> = ({ 
  chunk, 
  documentTheme, 
  isFirst = false,
  isLast = false,
  isMoving = false,
  onEditChunk, 
  onUpdateChunkDirect,
  onDeleteChunk,
  onMoveChunkUp,
  onMoveChunkDown,
  onInsertTextChunkAfter,
  onCreateChunkDirect,
  onInsertGraphicChunkAfter,
  onInsertImageChunkAfter
}) => {
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editTitle, setEditTitle] = useState(chunk.title || '');
  const [editContent, setEditContent] = useState(chunk.content || '');
  const [editType, setEditType] = useState(chunk.chunk_type || 'text');
  
  // State for inline chunk creation
  const [newChunkTitle, setNewChunkTitle] = useState('');
  const [newChunkContent, setNewChunkContent] = useState('');
  const [newChunkType, setNewChunkType] = useState('text');

  // Initialize edit values when chunk changes
  React.useEffect(() => {
    setEditTitle(chunk.title || '');
    setEditContent(chunk.content || '');
    setEditType(chunk.chunk_type || 'text');
  }, [chunk.title, chunk.content, chunk.chunk_type]);

  const handleSaveEdit = () => {
    // Use direct update to bypass modal
    if (onUpdateChunkDirect) {
      const updatedChunk = {
        title: editTitle,
        content: editContent,
        chunk_type: editType
      };
      onUpdateChunkDirect(updatedChunk);
      setIsEditing(false);
    } else {
      // Fallback to original method
      const updatedChunk = {
        ...chunk,
        title: editTitle,
        content: editContent,
        chunk_type: editType
      };
      onEditChunk(updatedChunk);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset to original values
    setEditTitle(chunk.title || '');
    setEditContent(chunk.content || '');
    setEditType(chunk.chunk_type || 'text');
    setIsEditing(false);
  };

  const handleCreateChunk = () => {
    if (onCreateChunkDirect && newChunkContent.trim()) {
      const chunkData = {
        title: newChunkTitle,
        content: newChunkContent,
        chunk_type: newChunkType
      };
      onCreateChunkDirect(chunkData, chunk.chunk_order);
      
      // Reset form
      setNewChunkTitle('');
      setNewChunkContent('');
      setNewChunkType('text');
      setIsCreating(false);
    }
  };

  const handleCancelCreate = () => {
    setNewChunkTitle('');
    setNewChunkContent('');
    setNewChunkType('text');
    setIsCreating(false);
  };
  const renderChunkContent = () => {
    if (isEditing) {
      // Render editable inputs for all chunk types
      return (
        <div className="space-y-3">
          {/* Chunk Type Selector */}
          <div className="flex items-center gap-3 mb-4">
            <select
              value={editType}
              onChange={(e) => setEditType(e.target.value)}
              className={`px-3 py-2 rounded-lg border text-sm ${
                documentTheme === 'light'
                  ? 'bg-white border-gray-300 text-black'
                  : 'bg-zinc-700 border-zinc-600 text-white'
              }`}
            >
              <option value="title">Titel</option>
              <option value="heading">Überschrift</option>
              <option value="subheading">Unterüberschrift</option>
              <option value="text">Text</option>
              <option value="list">Liste</option>
              <option value="code">Code</option>
              <option value="table">Tabelle</option>
              <option value="graphic">Grafik</option>
              <option value="image">Bild</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Speichern
              </button>
              <button
                onClick={handleCancelEdit}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  documentTheme === 'light'
                    ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    : 'bg-zinc-600 hover:bg-zinc-500 text-white'
                }`}
              >
                Abbrechen
              </button>
            </div>
          </div>

          {/* Title Input (for all chunk types except title which uses content) */}
          {editType !== 'title' && editType !== 'heading' && editType !== 'subheading' && (
            <input
              type="text"
              placeholder="Titel (optional)"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${
                documentTheme === 'light'
                  ? 'bg-white border-gray-300 text-black placeholder-gray-500'
                  : 'bg-zinc-700 border-zinc-600 text-white placeholder-zinc-400'
              }`}
            />
          )}

          {/* Content Input */}
          {editType === 'title' || editType === 'heading' || editType === 'subheading' ? (
            <input
              type="text"
              placeholder={`${editType === 'title' ? 'Titel' : editType === 'heading' ? 'Überschrift' : 'Unterüberschrift'} eingeben...`}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-lg font-medium ${
                documentTheme === 'light'
                  ? 'bg-white border-gray-300 text-black placeholder-gray-500'
                  : 'bg-zinc-700 border-zinc-600 text-white placeholder-zinc-400'
              }`}
            />
          ) : (
            <textarea
              placeholder="Inhalt eingeben..."
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={editType === 'code' || editType === 'table' ? 12 : 8}
              className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${
                documentTheme === 'light'
                  ? 'bg-white border-gray-300 text-black placeholder-gray-500'
                  : 'bg-zinc-700 border-zinc-600 text-white placeholder-zinc-400'
              } ${editType === 'code' ? 'font-mono' : ''}`}
            />
          )}
        </div>
      );
    }

    // Render static content when not editing
    switch (chunk.chunk_type) {
      case 'title':
        return (
          <h1 className={`text-3xl font-bold mb-6 leading-tight ${
            documentTheme === 'light' ? 'text-black' : 'text-white'
          }`}>
            {chunk.title || chunk.content}
          </h1>
        );
      case 'heading':
        return (
          <h2 className={`text-2xl font-semibold mb-4 leading-tight ${
            documentTheme === 'light' ? 'text-black' : 'text-white'
          }`}>
            {chunk.title || chunk.content}
          </h2>
        );
      case 'subheading':
        return (
          <h3 className={`text-xl font-medium mb-3 leading-tight ${
            documentTheme === 'light' ? 'text-black' : 'text-white'
          }`}>
            {chunk.title || chunk.content}
          </h3>
        );
      case 'text':
        return (
          <div className="mb-4">
            {chunk.title && (
              <h4 className={`text-lg font-medium mb-2 ${
                documentTheme === 'light' ? 'text-black' : 'text-white'
              }`}>{chunk.title}</h4>
            )}
            <p className={`text-base leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere ${
              documentTheme === 'light' ? 'text-black' : 'text-zinc-200'
            }`}>
              {chunk.content}
            </p>
          </div>
        );
      case 'list':
        return (
          <div className="mb-4">
            {chunk.title && (
              <h4 className={`text-lg font-medium mb-2 ${
                documentTheme === 'light' ? 'text-black' : 'text-white'
              }`}>{chunk.title}</h4>
            )}
            <ul className={`list-disc pl-6 text-base leading-relaxed ${
              documentTheme === 'light' ? 'text-black' : 'text-zinc-200'
            }`}>
              {chunk.content.split('\n').filter((line: string) => line.trim()).map((item: string, i: number) => (
                <li key={i} className="mb-1">{item.replace(/^[-*•]\s*/, '')}</li>
              ))}
            </ul>
          </div>
        );
      case 'code':
        return (
          <div className="mb-4">
            {chunk.title && (
              <h4 className={`text-lg font-medium mb-2 ${
                documentTheme === 'light' ? 'text-black' : 'text-white'
              }`}>{chunk.title}</h4>
            )}
            <pre className={`border rounded p-4 text-sm font-mono overflow-x-auto ${
              documentTheme === 'light' 
                ? 'bg-gray-100 border-gray-300 text-black' 
                : 'bg-zinc-900 border-zinc-700 text-zinc-200'
            }`}>
              <code>{chunk.content}</code>
            </pre>
          </div>
        );
      case 'table':
        return (
          <div className="mb-4">
            {chunk.title && (
              <h4 className={`text-lg font-medium mb-2 ${
                documentTheme === 'light' ? 'text-black' : 'text-white'
              }`}>{chunk.title}</h4>
            )}
            <div className={`border rounded overflow-hidden ${
              documentTheme === 'light' ? 'border-gray-300' : 'border-zinc-600'
            }`}>
              <table className="w-full text-sm">
                <tbody>
                  {chunk.content.split('\n').filter((line: string) => line.trim()).map((row: string, i: number) => (
                    <tr key={i} className={
                      i === 0 
                        ? documentTheme === 'light' 
                          ? 'bg-gray-100 text-black font-medium' 
                          : 'bg-zinc-700 text-white font-medium'
                        : documentTheme === 'light' 
                          ? 'bg-white text-black' 
                          : 'bg-zinc-800 text-zinc-200'
                    }>
                      {row.split('|').filter((cell: string) => cell.trim()).map((cell: string, j: number) => (
                        <td key={j} className={`px-3 py-2 last:border-r-0 ${
                          documentTheme === 'light' ? 'border-r border-gray-300' : 'border-r border-zinc-600'
                        }`}>
                          {cell.trim()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'graphic':
        let shapes = [];
        try {
          if (typeof chunk.content === 'string') {
            const parsed = JSON.parse(chunk.content);
            shapes = parsed.graphic?.shapes || parsed.shapes || [];
          } else if (chunk.content?.graphic?.shapes) {
            shapes = chunk.content.graphic.shapes;
          }
        } catch (e) {
          console.error('Error parsing graphic content:', e);
        }
        
        return (
          <div className="mb-4">
            {chunk.title && (
              <h4 className={`text-lg font-medium mb-2 ${
                documentTheme === 'light' ? 'text-black' : 'text-white'
              }`}>{chunk.title}</h4>
            )}
            <GraphicEditor
              theme={documentTheme}
              shapes={shapes}
              onChange={() => {}} // Read-only in document view
              isEditable={false} // View-Modus: keine Palette, keine Anweisungen
            />
          </div>
        );
      case 'image':
        let imageData;
        try {
          if (typeof chunk.content === 'string') {
            imageData = JSON.parse(chunk.content);
          } else {
            imageData = chunk.content;
          }
        } catch (e) {
          console.error('Error parsing image content:', e);
          imageData = { url: chunk.content }; // Fallback for simple URL string
        }
        
        return (
          <div className="mb-4">
            {chunk.title && (
              <h4 className={`text-lg font-medium mb-2 ${
                documentTheme === 'light' ? 'text-black' : 'text-white'
              }`}>{chunk.title}</h4>
            )}
            <div className={`border rounded-lg overflow-hidden ${
              documentTheme === 'light' ? 'border-gray-300' : 'border-zinc-600'
            }`}>
              <img 
                src={imageData.url || imageData} 
                alt={imageData.alt || chunk.title || 'Uploaded image'}
                className="w-full h-auto max-w-full"
                style={{ maxHeight: '500px', objectFit: 'contain' }}
                onError={(e) => {
                  console.error('Image failed to load:', imageData.url || imageData);
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              {imageData.caption && (
                <div className={`p-3 text-sm text-center ${
                  documentTheme === 'light' 
                    ? 'bg-gray-50 text-gray-600 border-t border-gray-300' 
                    : 'bg-zinc-800 text-zinc-400 border-t border-zinc-600'
                }`}>
                  {imageData.caption}
                </div>
              )}
            </div>
          </div>
        );
      default:
        return (
          <p className={`text-base leading-relaxed whitespace-pre-wrap ${
            documentTheme === 'light' ? 'text-black' : 'text-zinc-200'
          }`}>
            {chunk.content}
          </p>
        );
    }
  };

  return (
    <div className={`mb-2 group relative rounded-lg p-4 transition-all duration-300 ease-in-out transform ${
      isMoving 
        ? 'scale-105 shadow-lg ring-2 ring-blue-400 ring-opacity-50'
        : ''
    } ${
      documentTheme === 'light' 
        ? 'hover:bg-gray-50 hover:shadow-sm' 
        : 'hover:bg-zinc-700/20 hover:shadow-lg hover:shadow-zinc-900/20'
    }`}>
      {renderChunkContent()}
      
      {/* Loading overlay when moving */}
      {isMoving && (
        <div className="absolute inset-0 bg-blue-500/10 rounded-lg flex items-center justify-center">
          <div className="flex items-center gap-2 text-blue-600">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm font-medium">Verschieben...</span>
          </div>
        </div>
      )}
      
      {/* Left Side: Order Controls */}
      <div className={`absolute -left-12 top-1/2 -translate-y-1/2 transition-all duration-300 ease-in-out transform ${
        isMoving 
          ? 'opacity-50 pointer-events-none' 
          : 'opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2'
      }`}>
        <div className="flex flex-col gap-2">
          {!isFirst && onMoveChunkUp && (
            <button
              onClick={() => onMoveChunkUp(chunk.id!)}
              disabled={isMoving}
              className={`w-8 h-8 rounded-full shadow-lg transition-all duration-200 ease-in-out transform hover:scale-110 active:scale-95 flex items-center justify-center text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                documentTheme === 'light'
                  ? 'bg-gray-100 border border-gray-300 text-gray-600 hover:bg-gray-200'
                  : 'bg-zinc-700 border border-zinc-600 text-zinc-300 hover:bg-zinc-600'
              }`}
              title="Nach oben verschieben"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          )}
          {!isLast && onMoveChunkDown && (
            <button
              onClick={() => onMoveChunkDown(chunk.id!)}
              disabled={isMoving}
              className={`w-8 h-8 rounded-full shadow-lg transition-all duration-200 ease-in-out transform hover:scale-110 active:scale-95 flex items-center justify-center text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                documentTheme === 'light'
                  ? 'bg-white border-2 border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:shadow-blue-200'
                  : 'bg-zinc-700 border-2 border-zinc-600 text-zinc-300 hover:border-blue-400 hover:text-blue-400 hover:shadow-blue-900/50'
              }`}
              title="Nach unten verschieben"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      {/* Right Side: Edit Controls */}
      <div className={`absolute -right-12 top-1/2 -translate-y-1/2 transition-all duration-300 ease-in-out transform ${
        isMoving 
          ? 'opacity-50 pointer-events-none' 
          : 'opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-2'
      }`}>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              // For graphic chunks, still use modal
              if (chunk.chunk_type === 'graphic') {
                onEditChunk(chunk);
              } else {
                // For other chunks, use inline editing
                setIsEditing(true);
              }
            }}
            disabled={isMoving}
            className={`w-8 h-8 rounded-full shadow-lg transition-all duration-200 ease-in-out transform hover:scale-110 active:scale-95 flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              documentTheme === 'light'
                ? 'bg-gray-100 border border-gray-300 text-gray-600 hover:bg-gray-200'
                : 'bg-zinc-700 border border-zinc-600 text-zinc-300 hover:bg-zinc-600'
            }`}
            title={chunk.chunk_type === 'graphic' ? 'Bearbeiten' : 'Inline bearbeiten'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDeleteChunk(chunk.id!)}
            disabled={isMoving}
            className={`w-8 h-8 rounded-full shadow-lg transition-all duration-200 ease-in-out transform hover:scale-110 active:scale-95 flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              documentTheme === 'light'
                ? 'bg-gray-100 border border-gray-300 text-gray-600 hover:bg-gray-200'
                : 'bg-zinc-700 border border-zinc-600 text-zinc-300 hover:bg-zinc-600'
            }`}
            title="Löschen"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Insert Button Between Chunks - appear after each chunk including the last */}
      {(
        <div className="flex justify-center py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 relative">
          <button
            onClick={() => setShowInsertMenu(!showInsertMenu)}
            className={`w-8 h-8 rounded-full shadow-lg transition-all duration-200 ease-in-out transform hover:scale-110 active:scale-95 flex items-center justify-center text-xl font-bold ${
              documentTheme === 'light'
                ? 'bg-green-500 border border-green-400 text-white hover:bg-green-600'
                : 'bg-green-600 border border-green-500 text-white hover:bg-green-700'
            }`}
            title="Chunk hinzufügen"
          >
            +
          </button>
          
          {/* Insert Menu */}
          {showInsertMenu && (
            <div className="absolute top-10 left-1/2 transform -translate-x-1/2 z-50">
              <div className={`rounded-lg shadow-xl border p-2 min-w-[120px] ${
                documentTheme === 'light' 
                  ? 'bg-white border-gray-200' 
                  : 'bg-zinc-800 border-zinc-600'
              }`}>
                <button
                  onClick={() => {
                    // Use inline chunk creation
                    setIsCreating(true);
                    setShowInsertMenu(false);
                  }}
                  className={`w-full px-3 py-2 text-left rounded transition-colors text-sm flex items-center gap-2 ${
                    documentTheme === 'light'
                      ? 'hover:bg-gray-100 text-gray-700'
                      : 'hover:bg-zinc-700 text-zinc-200'
                  }`}
                >
                  <span className="text-green-500 font-bold">T</span>
                  Text
                </button>
                <button
                  onClick={() => {
                    onInsertGraphicChunkAfter && onInsertGraphicChunkAfter(chunk.chunk_order);
                    setShowInsertMenu(false);
                  }}
                  className={`w-full px-3 py-2 text-left rounded transition-colors text-sm flex items-center gap-2 ${
                    documentTheme === 'light'
                      ? 'hover:bg-gray-100 text-gray-700'
                      : 'hover:bg-zinc-700 text-zinc-200'
                  }`}
                >
                  <span className="text-blue-500">📊</span>
                  Grafik
                </button>
                <button
                  onClick={() => {
                    // Create file input and trigger file selection
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = 'image/*';
                    fileInput.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file && onInsertImageChunkAfter) {
                        onInsertImageChunkAfter(chunk.chunk_order, file);
                      }
                    };
                    fileInput.click();
                    setShowInsertMenu(false);
                  }}
                  className={`w-full px-3 py-2 text-left rounded transition-colors text-sm flex items-center gap-2 ${
                    documentTheme === 'light'
                      ? 'hover:bg-gray-100 text-gray-700'
                      : 'hover:bg-zinc-700 text-zinc-200'
                  }`}
                >
                  <span className="text-purple-500">🖼️</span>
                  Bild
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inline Chunk Creation */}
      {isCreating && (
        <div className={`mt-4 p-4 border rounded-lg ${
          documentTheme === 'light' 
            ? 'bg-gray-50 border-gray-300' 
            : 'bg-zinc-700 border-zinc-600'
        }`}>
          <div className="space-y-3">
            <div className="flex items-center gap-3 mb-4">
              <select
                value={newChunkType}
                onChange={(e) => setNewChunkType(e.target.value)}
                className={`px-3 py-2 rounded-lg border text-sm ${
                  documentTheme === 'light'
                    ? 'bg-white border-gray-300 text-black'
                    : 'bg-zinc-800 border-zinc-600 text-white'
                }`}
              >
                <option value="title">Titel</option>
                <option value="heading">Überschrift</option>
                <option value="subheading">Unterüberschrift</option>
                <option value="text">Text</option>
                <option value="list">Liste</option>
                <option value="code">Code</option>
                <option value="table">Tabelle</option>
              </select>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateChunk}
                  disabled={!newChunkContent.trim()}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Erstellen
                </button>
                <button
                  onClick={handleCancelCreate}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    documentTheme === 'light'
                      ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      : 'bg-zinc-600 hover:bg-zinc-500 text-white'
                  }`}
                >
                  Abbrechen
                </button>
              </div>
            </div>

            {/* Title Input (for chunk types that need it) */}
            {newChunkType !== 'title' && newChunkType !== 'heading' && newChunkType !== 'subheading' && (
              <input
                type="text"
                placeholder="Titel (optional)"
                value={newChunkTitle}
                onChange={(e) => setNewChunkTitle(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  documentTheme === 'light'
                    ? 'bg-white border-gray-300 text-black placeholder-gray-500'
                    : 'bg-zinc-800 border-zinc-600 text-white placeholder-zinc-400'
                }`}
              />
            )}

            {/* Content Input */}
            {newChunkType === 'title' || newChunkType === 'heading' || newChunkType === 'subheading' ? (
              <input
                type="text"
                placeholder={`${newChunkType === 'title' ? 'Titel' : newChunkType === 'heading' ? 'Überschrift' : 'Unterüberschrift'} eingeben...`}
                value={newChunkContent}
                onChange={(e) => setNewChunkContent(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-lg font-medium ${
                  documentTheme === 'light'
                    ? 'bg-white border-gray-300 text-black placeholder-gray-500'
                    : 'bg-zinc-800 border-zinc-600 text-white placeholder-zinc-400'
                }`}
              />
            ) : (
              <textarea
                placeholder="Inhalt eingeben..."
                value={newChunkContent}
                onChange={(e) => setNewChunkContent(e.target.value)}
                rows={newChunkType === 'code' || newChunkType === 'table' ? 10 : 6}
                className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${
                  documentTheme === 'light'
                    ? 'bg-white border-gray-300 text-black placeholder-gray-500'
                    : 'bg-zinc-800 border-zinc-600 text-white placeholder-zinc-400'
                } ${newChunkType === 'code' ? 'font-mono' : ''}`}
              />
            )}
          </div>
        </div>
      )}
      
    </div>
  );
};

interface ChunkFormProps {
  newChunk: any;
  documentTheme: 'dark' | 'light';
  isEditing?: boolean;
  onCreateChunk: () => void;
  onUpdateChunk?: () => void;
  onCancel: () => void;
  onSetNewChunk: (chunk: any) => void;
}

export const ChunkForm: React.FC<ChunkFormProps> = ({
  newChunk,
  documentTheme,
  isEditing = false,
  onCreateChunk,
  onUpdateChunk,
  onCancel,
  onSetNewChunk
}) => {
  const [titleFocused, setTitleFocused] = useState(false);
  const [contentFocused, setContentFocused] = useState(false);
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className={`bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl max-h-[95vh] overflow-y-auto ${
        newChunk.content.type === 'graphic' ? 'w-full max-w-6xl' : 'w-full max-w-lg'
      }`}>
        {/* Close button - always visible at the top */}
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-700 p-4 flex justify-between items-center">
          <h4 className="font-medium text-white text-lg">
            {isEditing ? 'Chunk bearbeiten' : 'Neuen Chunk hinzufügen'}
          </h4>
          <button
            onClick={onCancel}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
            title="Schließen"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <input
              type="text"
              placeholder={titleFocused || newChunk.title ? "" : "Titel (optional)"}
              value={newChunk.title}
              onFocus={() => setTitleFocused(true)}
              onBlur={() => setTitleFocused(false)}
              onChange={(e) => onSetNewChunk({ ...newChunk, title: e.target.value })}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-400 text-sm focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500"
            />
                          {newChunk.content.type === 'graphic' && (
                <div className="h-80 border border-zinc-600 rounded-lg p-2 overflow-hidden">
                  <GraphicEditor
                    shapes={typeof newChunk.content === 'object' && newChunk.content.graphic?.shapes || []}
                    theme={documentTheme}
                    onChange={(shapes: any) => onSetNewChunk({
                      ...newChunk,
                      content: {
                        type: 'graphic',
                        graphic: { shapes }
                      }
                    })}
                    isEditable={true}
                    layout="compact" // Kompaktes Layout für Modal
                  />
                </div>
              )}
              {(!newChunk.content.type || newChunk.content.type !== 'graphic') && (
                <textarea
                  placeholder={contentFocused || (typeof newChunk.content === 'string' && newChunk.content) ? "" : "Inhalt eingeben..."}
                  value={typeof newChunk.content === 'string' ? newChunk.content : ''}
                  onFocus={() => setContentFocused(true)}
                  onBlur={() => setContentFocused(false)}
                  onChange={(e) => onSetNewChunk({ ...newChunk, content: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-400 text-sm h-32 resize-none focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500"
                  required
                />
              )}
            <div className="flex gap-3">
              <select
                value={newChunk.chunk_type}
                onChange={(e) => {
                  const newType = e.target.value as any;
                  const newContent = newType === 'graphic' 
                    ? { type: 'graphic', graphic: { shapes: [] } }
                    : (typeof newChunk.content === 'string' ? newChunk.content : '');
                  onSetNewChunk({ 
                    ...newChunk, 
                    chunk_type: newType,
                    content: newContent
                  });
                }}
                className="px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500"
              >
                <option value="title">Titel</option>
                <option value="heading">Überschrift</option>
                <option value="subheading">Unterüberschrift</option>
                <option value="text">Text</option>
                <option value="list">Liste</option>
                <option value="code">Code</option>
                <option value="table">Tabelle</option>
                <option value="graphic">Grafik</option>
                <option value="image">Bild</option>
              </select>
              <input
                type="number"
                placeholder="Position"
                value={newChunk.chunk_order}
                onChange={(e) => onSetNewChunk({ ...newChunk, chunk_order: parseInt(e.target.value) || 1 })}
                className="w-24 px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500"
                min="1"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={isEditing ? onUpdateChunk : onCreateChunk}
              className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors"
            >
              {isEditing ? 'Chunk aktualisieren' : 'Chunk erstellen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ContextMenuProps {
  contextMenu: {
    show: boolean;
    x: number;
    y: number;
    position: number;
  };
  onCreateAtPosition: () => void;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  contextMenu,
  onCreateAtPosition,
  onClose
}) => {
  if (!contextMenu.show) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div
        className="absolute rounded-lg bg-zinc-800 border border-zinc-700 shadow-lg"
        style={{ top: contextMenu.y, left: contextMenu.x }}
      >
        <div className="flex flex-col p-4">
          <span className="text-sm text-zinc-400 mb-2">
            {contextMenu.position === 0 
              ? "Chunk am Anfang hinzufügen" 
              : `Chunk nach Position ${contextMenu.position} hinzufügen`
            }
          </span>
          <div className="flex gap-2">
            <button
              onClick={onCreateAtPosition}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
            >
              Text-Chunk erstellen
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-600 hover:bg-zinc-500 text-white rounded-lg text-sm"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
