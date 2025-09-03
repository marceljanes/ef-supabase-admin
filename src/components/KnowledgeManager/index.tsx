import React, { useEffect } from 'react';
import { Knowledge, KnowledgeChunk } from '@/types/database';
import { KnowledgeManagerProps } from './types';
import { useKnowledgeManager } from './hooks';
import { 
  KnowledgeHeader, 
  ErrorDisplay, 
  LoadingSpinner 
} from './components';
import { 
  CreateKnowledgeForm, 
  EditKnowledgeForm 
} from './forms';
import { 
  SearchBar, 
  KnowledgeCard, 
  Pagination, 
  EmptyState 
} from './overview';
import { 
  DocumentHeader, 
  ChunkRenderer, 
  ChunkForm, 
  ContextMenu 
} from './document';

export default function KnowledgeManager({ className = '' }: KnowledgeManagerProps) {
  const {
    state,
    setState,
    loadKnowledge,
    loadCategories,
    loadKnowledgeDetail,
    openDocument,
    closeDocument,
    closeDocumentTab,
    switchToTab,
    updateActiveTabChunks,
    createChunk,
    updateChunk,
    updateChunkDirect,
    createChunkDirect,
    createGraphicChunk,
    createImageChunk,
    insertChunkBetween,
    renumberToHundreds,
    createKnowledge,
    updateKnowledge,
    deleteKnowledge,
    editChunk,
    deleteChunk,
    moveChunkUp,
    moveChunkDown,
    renumberChunks,
    closeContextMenu,
    resetForm
  } = useKnowledgeManager();

  useEffect(() => {
    loadKnowledge();
    loadCategories();
  }, [state.currentPage, state.searchTerm, state.selectedCategory]);

  // Filter knowledge based on search terms and filters
  const filteredKnowledge = state.knowledge.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
                         (item.description && item.description.toLowerCase().includes(state.searchTerm.toLowerCase()));
    
    const matchesStatus = state.statusFilter === 'all' || 
                         (state.statusFilter === 'active' && item.is_active) ||
                         (state.statusFilter === 'inactive' && !item.is_active);
    
    const matchesType = !state.typeFilter || item.document_type === state.typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Calculate pagination
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredKnowledge.length / itemsPerPage);
  const currentItems = filteredKnowledge.slice(
    (state.currentPage - 1) * itemsPerPage,
    state.currentPage * itemsPerPage
  );

  // Context menu handler with 100er system
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    
    // Find insertion position based on chunk order, not DOM position
    const sortedChunks = [...state.chunks].sort((a, b) => a.chunk_order - b.chunk_order);
    
    // Find the chunk elements to determine where to insert
    const chunkElements = Array.from(e.currentTarget.children).filter(child => 
      (child as HTMLElement).classList.contains('group')
    );
    
    let insertAfterOrder: number | null = null;
    
    if (sortedChunks.length === 0) {
      // First chunk
      insertAfterOrder = null; // Will create at 100
    } else {
      // Find which chunk we're closest to
      for (let i = 0; i < chunkElements.length; i++) {
        const element = chunkElements[i] as HTMLElement;
        const elementRect = element.getBoundingClientRect();
        const elementY = elementRect.top - rect.top;
        
        if (y < elementY + elementRect.height / 2) {
          // Insert before this chunk
          if (i === 0) {
            insertAfterOrder = null; // Insert at beginning
          } else {
            insertAfterOrder = sortedChunks[i - 1].chunk_order;
          }
          break;
        }
      }
      
      // If we didn't find a position, insert at the end
      if (insertAfterOrder === null && sortedChunks.length > 0) {
        insertAfterOrder = sortedChunks[sortedChunks.length - 1].chunk_order;
      }
    }

    setState(prev => ({
      ...prev,
      contextMenu: {
        show: true,
        x: e.clientX,
        y: e.clientY,
        position: insertAfterOrder || 0 // Store the chunk_order to insert after
      }
    }));
  };

  if (state.loading && state.knowledge.length === 0) {
    return <LoadingSpinner className={className} />;
  }

  return (
    <div className={`${className} space-y-6`}>
      {/* Header */}
      <KnowledgeHeader
        activeTab={state.activeTab}
        selectedDocument={state.selectedDocument}
        onShowCreateForm={() => setState(prev => ({ ...prev, showCreateForm: true }))}
        onSetActiveTab={(tab) => setState(prev => ({ ...prev, activeTab: tab }))}
        onCloseDocument={closeDocument}
      />

      {/* Error Display */}
      <ErrorDisplay 
        error={state.error} 
        onClearError={() => setState(prev => ({ ...prev, error: null }))} 
      />

      {/* Document Tabs */}
      {state.openDocumentTabs.length > 0 && (
        <div className="border-b border-zinc-700 bg-zinc-800 rounded-t-lg">
          <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto">
            {state.openDocumentTabs.map((tab) => (
              <div
                key={tab.id}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg border-b-2 min-w-0 max-w-xs ${
                  state.activeDocumentTabId === tab.id
                    ? 'bg-zinc-900 border-blue-400 text-white'
                    : 'bg-zinc-700 border-transparent text-zinc-300 hover:bg-zinc-600 hover:text-white'
                } transition-all cursor-pointer`}
              >
                <button
                  onClick={() => switchToTab(tab.id)}
                  className="flex items-center gap-2 min-w-0 flex-1"
                  title={tab.title}
                >
                  <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
                  <span className="truncate text-sm font-medium">
                    {tab.title}
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeDocumentTab(tab.id);
                  }}
                  className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full hover:bg-zinc-600 transition-colors"
                  title="Dokument schließen"
                >
                  <span className="text-zinc-400 hover:text-white text-sm">×</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overview Tab */}
      {state.activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Create Form */}
          {state.showCreateForm && (
            <CreateKnowledgeForm
              newKnowledge={state.newKnowledge}
              onCreateKnowledge={createKnowledge}
              onResetForm={resetForm}
              onSetNewKnowledge={(knowledge) => setState(prev => ({ ...prev, newKnowledge: knowledge }))}
            />
          )}

          {/* Edit Form */}
          {state.editingKnowledge && (
            <EditKnowledgeForm
              editingKnowledge={state.editingKnowledge}
              onUpdateKnowledge={updateKnowledge}
              onSetEditingKnowledge={(knowledge) => setState(prev => ({ ...prev, editingKnowledge: knowledge }))}
              onCancel={() => setState(prev => ({ ...prev, editingKnowledge: null }))}
            />
          )}

          {/* Search Bar */}
          <SearchBar
            searchTerm={state.searchTerm}
            statusFilter={state.statusFilter}
            typeFilter={state.typeFilter}
            onSearchChange={(term) => setState(prev => ({ ...prev, searchTerm: term }))}
            onStatusChange={(filter) => setState(prev => ({ ...prev, statusFilter: filter }))}
            onTypeChange={(filter) => setState(prev => ({ ...prev, typeFilter: filter }))}
          />

          {/* Knowledge Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentItems.map((item) => (
              <KnowledgeCard
                key={item.id}
                item={item}
                onOpenDocument={openDocument}
                onEditKnowledge={(item) => setState(prev => ({ ...prev, editingKnowledge: item }))}
                onDeleteKnowledge={deleteKnowledge}
              />
            ))}
          </div>

          {/* Empty State */}
          {currentItems.length === 0 && (
            <EmptyState hasItems={filteredKnowledge.length > 0} isFiltered={state.searchTerm.length > 0 || state.statusFilter !== 'all' || state.typeFilter !== ''} />
          )}

          {/* Pagination */}
          <Pagination
            currentPage={state.currentPage}
            totalPages={totalPages}
            onPageChange={(page) => setState(prev => ({ ...prev, currentPage: page }))}
          />
        </div>
      )}

      {/* Document Tab */}
      {state.activeTab === 'document' && state.selectedDocument && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl w-full min-h-[800px]">
          {/* Document Header */}
          <DocumentHeader
            selectedDocument={state.selectedDocument}
            documentTheme={state.documentTheme}
            onEditDocument={(doc) => setState(prev => ({ ...prev, editingKnowledge: doc }))}
            onCloseDocument={closeDocument}
            onToggleTheme={() => setState(prev => ({ 
              ...prev, 
              documentTheme: prev.documentTheme === 'dark' ? 'light' : 'dark' 
            }))}
          />

          {/* Document Content */}
          <div className={`p-12 transition-colors ${
            state.documentTheme === 'light' ? 'bg-gray-50' : 'bg-zinc-900'
          }`}>
            <div className="max-w-none px-20">
              <div 
                className={`border rounded-lg p-12 shadow-inner min-h-[600px] transition-colors ${
                  state.documentTheme === 'light' 
                    ? 'bg-white border-gray-200' 
                    : 'bg-zinc-800 border-zinc-600'
                }`}
                onContextMenu={handleContextMenu}
              >
                {state.chunks.length === 0 ? (
                  <div className={`text-center py-12 ${
                    state.documentTheme === 'light' ? 'text-gray-500' : 'text-zinc-400'
                  }`}>
                    <div className="text-lg mb-4">Leeres Dokument</div>
                    <div className="text-sm mb-8">
                      Beginnen Sie mit dem Hinzufügen Ihres ersten Chunks.
                    </div>
                    
                    {/* Centered Add Button for Empty Document */}
                    <div className="relative inline-block">
                      <button
                        onClick={() => setState(prev => ({ ...prev, showEmptyDocumentMenu: !prev.showEmptyDocumentMenu }))}
                        className={`w-16 h-16 rounded-full shadow-xl transition-all duration-200 ease-in-out transform hover:scale-110 active:scale-95 flex items-center justify-center text-2xl font-bold ${
                          state.documentTheme === 'light'
                            ? 'bg-green-500 border-2 border-green-400 text-white hover:bg-green-600'
                            : 'bg-green-600 border-2 border-green-500 text-white hover:bg-green-700'
                        }`}
                        title="Ersten Chunk hinzufügen"
                      >
                        +
                      </button>
                      
                      {/* Insert Menu for Empty Document */}
                      {state.showEmptyDocumentMenu && (
                        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50">
                          <div className={`rounded-lg shadow-xl border p-3 min-w-[140px] ${
                            state.documentTheme === 'light' 
                              ? 'bg-white border-gray-200' 
                              : 'bg-zinc-800 border-zinc-600'
                          }`}>
                            <button
                              onClick={() => {
                                setState(prev => ({ 
                                  ...prev, 
                                  insertAfterOrder: null,
                                  showChunkForm: true,
                                  showEmptyDocumentMenu: false,
                                  newChunk: {
                                    ...prev.newChunk,
                                    chunk_type: 'text',
                                    title: '',
                                    content: ''
                                  }
                                }));
                              }}
                              className={`w-full px-4 py-3 text-left rounded transition-colors text-sm flex items-center gap-3 ${
                                state.documentTheme === 'light'
                                  ? 'hover:bg-gray-100 text-gray-700'
                                  : 'hover:bg-zinc-700 text-zinc-200'
                              }`}
                            >
                              <span className="text-green-500 font-bold">T</span>
                              Text-Chunk
                            </button>
                            <button
                              onClick={() => {
                                if (state.selectedDocument) {
                                  createGraphicChunk(state.selectedDocument.id!);
                                  setState(prev => ({ ...prev, showEmptyDocumentMenu: false }));
                                }
                              }}
                              className={`w-full px-4 py-3 text-left rounded transition-colors text-sm flex items-center gap-3 ${
                                state.documentTheme === 'light'
                                  ? 'hover:bg-gray-100 text-gray-700'
                                  : 'hover:bg-zinc-700 text-zinc-200'
                              }`}
                            >
                              <span className="text-blue-500">📊</span>
                              Grafik-Chunk
                            </button>
                            <button
                              onClick={() => {
                                // Create file input and trigger file selection
                                const fileInput = document.createElement('input');
                                fileInput.type = 'file';
                                fileInput.accept = 'image/*';
                                fileInput.onchange = (e) => {
                                  const file = (e.target as HTMLInputElement).files?.[0];
                                  if (file && state.selectedDocument) {
                                    createImageChunk(state.selectedDocument.id!, file);
                                  }
                                };
                                fileInput.click();
                                setState(prev => ({ ...prev, showEmptyDocumentMenu: false }));
                              }}
                              className={`w-full px-4 py-3 text-left rounded transition-colors text-sm flex items-center gap-3 ${
                                state.documentTheme === 'light'
                                  ? 'hover:bg-gray-100 text-gray-700'
                                  : 'hover:bg-zinc-700 text-zinc-200'
                              }`}
                            >
                              <span className="text-purple-500">🖼️</span>
                              Bild-Chunk
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {[...state.chunks].sort((a, b) => a.chunk_order - b.chunk_order).map((chunk, index, sortedChunks) => (
                      <div
                        key={chunk.id}
                        className="transform transition-all duration-500 ease-out"
                        style={{
                          animationDelay: `${index * 50}ms`,
                        }}
                      >
                        <ChunkRenderer
                          chunk={chunk}
                          documentTheme={state.documentTheme}
                          isFirst={index === 0}
                          isLast={index === sortedChunks.length - 1}
                          isMoving={state.movingChunkId === chunk.id}
                          onEditChunk={(chunk) => {
                            // For non-graphic chunks, use direct inline editing
                            if (chunk.chunk_type !== 'graphic') {
                              return; // Inline editing is handled directly in ChunkRenderer
                            } else {
                              // For graphic chunks, still use the modal
                              editChunk(chunk);
                            }
                          }}
                          onUpdateChunkDirect={(chunkData) => {
                            // Direct update for inline editing
                            if (state.selectedDocument) {
                              updateChunkDirect(state.selectedDocument.id!, chunk.id, chunkData);
                            }
                          }}
                          onDeleteChunk={deleteChunk}
                          onMoveChunkUp={moveChunkUp}
                          onMoveChunkDown={moveChunkDown}
                          onInsertTextChunkAfter={(chunkOrder) => {
                            // This will be handled by inline chunk creation
                            // No modal needed
                          }}
                          onCreateChunkDirect={(chunkData, insertAfter) => {
                            // Direct creation for inline chunk creation
                            if (state.selectedDocument) {
                              createChunkDirect(state.selectedDocument.id!, chunkData, insertAfter);
                            }
                          }}
                          onInsertGraphicChunkAfter={(chunkOrder) => {
                            // Directly create graphic chunk between
                            if (state.selectedDocument) {
                              insertChunkBetween(state.selectedDocument.id!, chunkOrder, 'graphic');
                            }
                          }}
                          onInsertImageChunkAfter={(chunkOrder, file) => {
                            // Directly create image chunk with uploaded file
                            if (state.selectedDocument) {
                              createImageChunk(state.selectedDocument.id!, file, chunkOrder);
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>


          {/* Chunk Form */}
          {state.showChunkForm && (
            <ChunkForm
              newChunk={state.newChunk}
              documentTheme={state.documentTheme}
              isEditing={state.editingChunkId !== null}
              onCreateChunk={() => state.selectedDocument && createChunk(state.selectedDocument.id!, state.insertAfterOrder || undefined)}
              onUpdateChunk={() => state.selectedDocument && state.editingChunkId && updateChunk(state.selectedDocument.id!, state.editingChunkId)}
              onCancel={() => setState(prev => ({ 
                ...prev, 
                showChunkForm: false, 
                editingChunkId: null,
                insertAfterOrder: null
              }))}
              onSetNewChunk={(chunk) => setState(prev => ({ ...prev, newChunk: chunk }))}
            />
          )}
        </div>
      )}

      {/* Context Menu */}
      <ContextMenu
        contextMenu={state.contextMenu}
        onCreateAtPosition={() => {
          // Use the new 100er system for context menu insertions
          const insertAfterOrder = state.contextMenu.position === 0 ? null : state.contextMenu.position;
          
          setState(prev => ({
            ...prev,
            insertAfterOrder: insertAfterOrder,
            showChunkForm: true,
            newChunk: {
              ...prev.newChunk,
              chunk_type: 'text',
              title: '',
              content: ''
            }
          }));
          closeContextMenu();
        }}
        onClose={closeContextMenu}
      />
    </div>
  );
}
