import { useState, useEffect } from 'react';
import { dbService } from '@/lib/supabase';
import { KnowledgeManagerState } from './types';

export const useKnowledgeManager = () => {
  const [state, setState] = useState<KnowledgeManagerState>({
    knowledge: [],
    loading: false,
    error: null,
    showCreateForm: false,
    editingKnowledge: null,
    selectedDocument: null,
    chunks: [],
    searchTerm: '',
    statusFilter: 'all',
    typeFilter: '',
    selectedCategory: '',
    categories: [],
    currentPage: 1,
    showChunkForm: false,
    editingChunkId: null,
    activeTab: 'overview',
    movingChunkId: null,
    insertAfterOrder: null,
    newChunk: {
      title: '',
      content: '',
      chunk_type: 'text',
      chunk_order: 100
    },
    newKnowledge: {
      title: '',
      description: '',
      content: '',
      category: '',
      tags: '',
      is_active: true,
      document_type: 'text'
    },
    contextMenu: {
      show: false,
      x: 0,
      y: 0,
      position: 0
    },
    documentTheme: 'dark',
    showEmptyDocumentMenu: false
  });

  const loadKnowledge = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const result = await dbService.getKnowledge({
        page: state.currentPage,
        limit: 10,
        category: state.selectedCategory || undefined,
        search: state.searchTerm || undefined
      });
      setState(prev => ({ ...prev, knowledge: result.data }));
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await dbService.getKnowledgeCategories();
      setState(prev => ({ ...prev, categories: cats }));
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadKnowledgeDetail = async (id: number) => {
    try {
      const detail = await dbService.getKnowledgeById(id);
      
      // Ensure chunks are properly sorted by chunk_order
      const sortedChunks = (detail.chunks || []).sort((a: any, b: any) => a.chunk_order - b.chunk_order);
      
      console.log('Loaded chunks (sorted):', sortedChunks.map((c: any) => ({ id: c.id, order: c.chunk_order, title: c.title?.slice(0, 20) })));
      
      setState(prev => ({
        ...prev,
        selectedDocument: detail,
        chunks: sortedChunks,
        activeTab: 'document'
      }));
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message }));
    }
  };

  const openDocument = async (item: any) => {
    await loadKnowledgeDetail(item.id);
  };

  const closeDocument = () => {
    setState(prev => ({
      ...prev,
      selectedDocument: null,
      chunks: [],
      activeTab: 'overview',
      showChunkForm: false
    }));
  };

  const createChunk = async (knowledgeId: number, insertAfterOrder?: number) => {
    // Use insertAfterOrder from state if not provided as parameter
    const targetInsertAfter = insertAfterOrder ?? state.insertAfterOrder;
    
    // Validate content - only string content now
    const hasContent = typeof state.newChunk.content === 'string' && state.newChunk.content.trim();

    if (!hasContent) {
      setState(prev => ({ ...prev, error: 'Chunk content is required' }));
      return;
    }

    try {
      let nextOrder: number;
      
      if (targetInsertAfter !== undefined && targetInsertAfter !== null) {
        // Insert between chunks - new chunk gets the order of the lower chunk
        // All chunks below get shifted by +100
        const sortedChunks = [...state.chunks].sort((a, b) => a.chunk_order - b.chunk_order);
        
        // Find the chunk after the insertion point
        const insertAfterIndex = sortedChunks.findIndex(c => c.chunk_order === targetInsertAfter);
        const nextChunk = insertAfterIndex >= 0 && insertAfterIndex < sortedChunks.length - 1 
          ? sortedChunks[insertAfterIndex + 1] 
          : null;
        
        if (nextChunk) {
          // New chunk gets the order of the next chunk
          nextOrder = nextChunk.chunk_order;
          
          // All chunks from this position and below get +100
          const chunksToShift = sortedChunks.slice(insertAfterIndex + 1);
          
          for (const chunk of chunksToShift) {
            await dbService.updateKnowledgeChunk(chunk.id!, {
              chunk_order: chunk.chunk_order + 100
            });
          }
          
          console.log('Creating chunk between chunks. New chunk gets order:', nextOrder, 'Shifted', chunksToShift.length, 'chunks by +100');
        } else {
          // Insert at end - use 100er steps after the last chunk
          nextOrder = targetInsertAfter + 100;
          console.log('Creating chunk at end after:', targetInsertAfter, 'New order:', nextOrder);
        }
      } else {
        // Append at end - use 100er steps
        const maxOrder = state.chunks.length > 0 ? Math.max(...state.chunks.map(c => c.chunk_order)) : 0;
        nextOrder = Math.ceil((maxOrder + 100) / 100) * 100; // Round up to next 100
        console.log('Creating chunk at end with order:', nextOrder, 'Current max order:', maxOrder);
      }

      // Serialize content for storage
      const content = state.newChunk.chunk_type === 'graphic' 
        ? JSON.stringify(state.newChunk.content)
        : state.newChunk.content;

      await dbService.createKnowledgeChunk({
        knowledge_id: knowledgeId,
        ...state.newChunk,
        chunk_order: nextOrder, // Use calculated order instead of form value
        content: content as string
      });

      setState(prev => ({
        ...prev,
        newChunk: {
          title: '',
          content: '',
          chunk_type: 'text',
          chunk_order: 100 // Reset form value to first 100er step
        },
        showChunkForm: false,
        insertAfterOrder: null // Clear insert position
      }));
      
      await loadKnowledgeDetail(knowledgeId);
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message }));
    }
  };

  const createKnowledge = async () => {
    if (!state.newKnowledge.title.trim() || !state.newKnowledge.content.trim()) {
      setState(prev => ({ ...prev, error: 'Title and content are required' }));
      return;
    }

    try {
      const tagsArray = state.newKnowledge.tags 
        ? state.newKnowledge.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : [];

      await dbService.createKnowledge({
        ...state.newKnowledge,
        tags: tagsArray.length > 0 ? tagsArray : null
      });

      setState(prev => ({
        ...prev,
        newKnowledge: {
          title: '',
          description: '',
          content: '',
          category: '',
          tags: '',
          is_active: true,
          document_type: 'text'
        },
        showCreateForm: false
      }));
      
      await loadKnowledge();
      await loadCategories();
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message }));
    }
  };

  const updateKnowledge = async () => {
    if (!state.editingKnowledge) return;

    try {
      await dbService.updateKnowledge(state.editingKnowledge.id, state.editingKnowledge);
      setState(prev => ({ ...prev, editingKnowledge: null }));
      await loadKnowledge();
      
      if (state.selectedDocument && state.selectedDocument.id === state.editingKnowledge.id) {
        await loadKnowledgeDetail(state.editingKnowledge.id);
      }
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message }));
    }
  };

  const deleteKnowledge = async (id: number) => {
    if (!confirm('Are you sure you want to delete this knowledge document?')) return;

    try {
      await dbService.deleteKnowledge(id);
      await loadKnowledge();
      
      if (state.selectedDocument && state.selectedDocument.id === id) {
        closeDocument();
      }
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message }));
    }
  };

  const editChunk = (chunk: any) => {
    // Spezielle Behandlung für Grafik-Chunks
    if (chunk.chunk_type === 'graphic') {
      let graphicContent;
      try {
        // Parse JSON content für Grafik-Chunks
        graphicContent = typeof chunk.content === 'string' 
          ? JSON.parse(chunk.content) 
          : chunk.content;
      } catch (error) {
        // Fallback für ungültiges JSON
        graphicContent = { type: 'graphic', graphic: { shapes: [] } };
      }
      
      setState(prev => ({
        ...prev,
        newChunk: {
          title: chunk.title || '',
          content: graphicContent,
          chunk_type: chunk.chunk_type,
          chunk_order: chunk.chunk_order
        },
        editingChunkId: chunk.id, // Set ID für Update-Modus
        showChunkForm: true
      }));
    } else {
      // Normale Behandlung für Text-Chunks
      setState(prev => ({
        ...prev,
        newChunk: {
          title: chunk.title || '',
          content: chunk.content,
          chunk_type: chunk.chunk_type,
          chunk_order: chunk.chunk_order
        },
        editingChunkId: chunk.id, // Set ID für Update-Modus
        showChunkForm: true
      }));
    }
  };

  const updateChunk = async (knowledgeId: number, chunkId: number) => {
    try {
      // Serialize content for storage
      const content = state.newChunk.chunk_type === 'graphic' 
        ? JSON.stringify(state.newChunk.content)
        : state.newChunk.content;

      await dbService.updateKnowledgeChunk(chunkId, {
        ...state.newChunk,
        content: content as string
      });

      setState(prev => ({
        ...prev,
        newChunk: {
          title: '',
          content: '',
          chunk_type: 'text',
          chunk_order: 1
        },
        editingChunkId: null,
        showChunkForm: false
      }));
      
      await loadKnowledgeDetail(knowledgeId);
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message }));
    }
  };

  const deleteChunk = async (chunkId: number) => {
    if (!confirm('Möchten Sie diesen Chunk wirklich löschen?')) return;
    
    try {
      await dbService.deleteKnowledgeChunk(chunkId);
      if (state.selectedDocument) {
        await loadKnowledgeDetail(state.selectedDocument.id!);
      }
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message }));
    }
  };

  const renumberChunks = async () => {
    if (!state.selectedDocument) return;
    
    try {
      console.log('🔧 Renumbering chunks...');
      
      // Sort chunks by current order and renumber them sequentially
      const sortedChunks = [...state.chunks].sort((a: any, b: any) => a.chunk_order - b.chunk_order);
      
      console.log('Before renumbering:', sortedChunks.map((c: any) => ({ id: c.id, order: c.chunk_order })));
      
      // Update each chunk with new sequential order
      for (let i = 0; i < sortedChunks.length; i++) {
        const chunk = sortedChunks[i];
        const newOrder = i + 1;
        
        if (chunk.chunk_order !== newOrder) {
          console.log(`Updating chunk ${chunk.id} from order ${chunk.chunk_order} to ${newOrder}`);
          await dbService.updateKnowledgeChunk(chunk.id!, { chunk_order: newOrder });
        }
      }
      
      console.log('✅ Chunks renumbered successfully');
      
      // Reload document
      await loadKnowledgeDetail(state.selectedDocument.id!);
    } catch (err: any) {
      console.error('❌ Renumber chunks error:', err);
      setState(prev => ({ ...prev, error: err.message }));
    }
  };

  const moveChunkUp = async (chunkId: number) => {
    if (!state.selectedDocument || state.movingChunkId) return;
    
    try {
      // Set moving state for visual feedback
      setState(prev => ({ ...prev, movingChunkId: chunkId }));
      
      console.log('=== MOVE CHUNK UP DEBUG (100er System) ===');
      console.log('Target chunk ID:', chunkId);
      
      // Sort chunks by order to get current display sequence
      const sortedChunks = [...state.chunks].sort((a, b) => a.chunk_order - b.chunk_order);
      console.log('Sorted chunks:', sortedChunks.map(c => ({ id: c.id, order: c.chunk_order, title: c.title?.slice(0, 20) })));
      
      const currentIndex = sortedChunks.findIndex(c => c.id === chunkId);
      console.log('Current index in sorted array:', currentIndex);
      
      if (currentIndex <= 0) {
        console.log('❌ Cannot move up - already at top or not found');
        setState(prev => ({ ...prev, movingChunkId: null }));
        return;
      }
      
      const currentChunk = sortedChunks[currentIndex];
      const targetChunk = sortedChunks[currentIndex - 1]; // The chunk that is currently ABOVE
      
      console.log('Current chunk:', { id: currentChunk.id, order: currentChunk.chunk_order, title: currentChunk.title?.slice(0, 20) });
      console.log('Target chunk (to swap with):', { id: targetChunk.id, order: targetChunk.chunk_order, title: targetChunk.title?.slice(0, 20) });
      
      // Simply swap the chunk_order values (works with any numbering)
      const currentOrder = currentChunk.chunk_order;
      const targetOrder = targetChunk.chunk_order;
      
      console.log('Swapping orders:', { current: currentOrder, target: targetOrder });
      
      // Update both chunks with swapped orders
      await dbService.updateKnowledgeChunk(currentChunk.id!, { chunk_order: targetOrder });
      await dbService.updateKnowledgeChunk(targetChunk.id!, { chunk_order: currentOrder });
      
      console.log('✅ Database updated successfully');
      
      // Reload document to reflect changes
      await loadKnowledgeDetail(state.selectedDocument.id!);
      console.log('✅ Document reloaded');
      
    } catch (err: any) {
      console.error('❌ Move chunk up error:', err);
      setState(prev => ({ ...prev, error: err.message }));
    } finally {
      setState(prev => ({ ...prev, movingChunkId: null }));
    }
  };

  const moveChunkDown = async (chunkId: number) => {
    if (!state.selectedDocument || state.movingChunkId) return;
    
    try {
      // Set moving state for visual feedback
      setState(prev => ({ ...prev, movingChunkId: chunkId }));
      
      console.log('=== MOVE CHUNK DOWN DEBUG (100er System) ===');
      console.log('Target chunk ID:', chunkId);
      
      // Sort chunks by order to get current display sequence
      const sortedChunks = [...state.chunks].sort((a, b) => a.chunk_order - b.chunk_order);
      console.log('Sorted chunks:', sortedChunks.map(c => ({ id: c.id, order: c.chunk_order, title: c.title?.slice(0, 20) })));
      
      const currentIndex = sortedChunks.findIndex(c => c.id === chunkId);
      console.log('Current index in sorted array:', currentIndex);
      
      if (currentIndex < 0 || currentIndex >= sortedChunks.length - 1) {
        console.log('❌ Cannot move down - at bottom or not found');
        setState(prev => ({ ...prev, movingChunkId: null }));
        return;
      }
      
      const currentChunk = sortedChunks[currentIndex];
      const targetChunk = sortedChunks[currentIndex + 1]; // The chunk that is currently BELOW
      
      console.log('Current chunk:', { id: currentChunk.id, order: currentChunk.chunk_order, title: currentChunk.title?.slice(0, 20) });
      console.log('Target chunk (to swap with):', { id: targetChunk.id, order: targetChunk.chunk_order, title: targetChunk.title?.slice(0, 20) });
      
      // Simply swap the chunk_order values (works with any numbering)
      const currentOrder = currentChunk.chunk_order;
      const targetOrder = targetChunk.chunk_order;
      
      console.log('Swapping orders:', { current: currentOrder, target: targetOrder });
      
      // Update both chunks with swapped orders
      await dbService.updateKnowledgeChunk(currentChunk.id!, { chunk_order: targetOrder });
      await dbService.updateKnowledgeChunk(targetChunk.id!, { chunk_order: currentOrder });
      
      console.log('✅ Database updated successfully');
      
      // Reload document to reflect changes
      await loadKnowledgeDetail(state.selectedDocument.id!);
      console.log('✅ Document reloaded');
      
    } catch (err: any) {
      console.error('❌ Move chunk down error:', err);
      setState(prev => ({ ...prev, error: err.message }));
    } finally {
      setState(prev => ({ ...prev, movingChunkId: null }));
    }
  };

  const closeContextMenu = () => {
    setState(prev => ({
      ...prev,
      contextMenu: { show: false, x: 0, y: 0, position: 0 }
    }));
  };

  const resetForm = () => {
    setState(prev => ({
      ...prev,
      showCreateForm: false,
      showChunkForm: false,
      editingChunkId: null,
      movingChunkId: null,
      newKnowledge: {
        title: '',
        description: '',
        content: '',
        category: '',
        tags: '',
        is_active: true,
        document_type: 'text'
      },
      newChunk: {
        title: '',
        content: '',
        chunk_type: 'text',
        chunk_order: 1
      },
      error: null
    }));
  };

  const insertChunkBetween = async (knowledgeId: number, insertAfterOrder: number, chunkType: 'text' | 'graphic' = 'text') => {
    try {
      if (chunkType === 'graphic') {
        await createGraphicChunk(knowledgeId, insertAfterOrder);
      } else {
        // For text chunks, we need to set up the form first
        setState(prev => ({
          ...prev,
          showChunkForm: true,
          newChunk: {
            ...prev.newChunk,
            chunk_type: 'text',
            title: 'Neuer Text-Chunk',
            content: 'Hier Text eingeben...'
          }
        }));
        // The actual creation will happen when user submits the form
        // We'll pass the insertAfterOrder to createChunk
      }
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message }));
    }
  };

  const createGraphicChunk = async (knowledgeId: number, insertAfterOrder?: number) => {
    try {
      let nextOrder: number;
      
      if (insertAfterOrder !== undefined && insertAfterOrder !== null) {
        // Insert between chunks - shift all following chunks by +100
        const chunksToShift = state.chunks.filter(c => c.chunk_order > insertAfterOrder);
        
        // Update all following chunks first
        for (const chunk of chunksToShift) {
          await dbService.updateKnowledgeChunk(chunk.id!, {
            chunk_order: chunk.chunk_order + 100
          });
        }
        
        nextOrder = insertAfterOrder + 100;
        console.log('Creating graphic chunk between chunks. Insert after:', insertAfterOrder, 'New order:', nextOrder);
      } else {
        // Append at end - use 100er steps
        const maxOrder = state.chunks.length > 0 ? Math.max(...state.chunks.map(c => c.chunk_order)) : 0;
        nextOrder = Math.ceil((maxOrder + 100) / 100) * 100; // Round up to next 100
        console.log('Creating graphic chunk at end with order:', nextOrder, 'Current max order:', maxOrder);
      }

      // Create a default graphic content
      const defaultGraphicContent = {
        type: 'graphic',
        graphic: {
          shapes: []
        }
      };

      await dbService.createKnowledgeChunk({
        knowledge_id: knowledgeId,
        title: 'Neue Grafik',
        content: JSON.stringify(defaultGraphicContent),
        chunk_type: 'graphic',
        chunk_order: nextOrder
      });
      
      await loadKnowledgeDetail(knowledgeId);
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message }));
    }
  };

  const createImageChunk = async (knowledgeId: number, imageFile: File, insertAfterOrder?: number) => {
    try {
      console.log('Creating image chunk with file:', imageFile.name);
      
      // Upload the image first
      const uploadResult = await dbService.uploadImage(imageFile, 'knowledge-images');
      
      let nextOrder: number;
      
      if (insertAfterOrder !== undefined && insertAfterOrder !== null) {
        // Insert between chunks - shift all following chunks by +100
        const chunksToShift = state.chunks.filter(c => c.chunk_order > insertAfterOrder);
        
        // Update all following chunks first
        for (const chunk of chunksToShift) {
          await dbService.updateKnowledgeChunk(chunk.id!, {
            chunk_order: chunk.chunk_order + 100
          });
        }
        
        nextOrder = insertAfterOrder + 100;
        console.log('Creating image chunk between chunks. Insert after:', insertAfterOrder, 'New order:', nextOrder);
      } else {
        // Append at end - use 100er steps
        const maxOrder = state.chunks.length > 0 ? Math.max(...state.chunks.map(c => c.chunk_order)) : 0;
        nextOrder = Math.ceil((maxOrder + 100) / 100) * 100; // Round up to next 100
        console.log('Creating image chunk at end with order:', nextOrder, 'Current max order:', maxOrder);
      }

      // Create image content with metadata
      const imageContent = {
        type: 'image',
        url: uploadResult.url,
        fileName: uploadResult.fileName,
        filePath: uploadResult.path,
        alt: '', // Can be edited later
        caption: '' // Can be edited later
      };

      await dbService.createKnowledgeChunk({
        knowledge_id: knowledgeId,
        title: `Bild: ${uploadResult.fileName}`,
        content: JSON.stringify(imageContent),
        chunk_type: 'image',
        chunk_order: nextOrder
      });
      
      console.log('Image chunk created successfully');
      await loadKnowledgeDetail(knowledgeId);
    } catch (err: any) {
      console.error('Error creating image chunk:', err);
      setState(prev => ({ ...prev, error: err.message }));
    }
  };

  const renumberToHundreds = async () => {
    if (!state.selectedDocument || state.chunks.length === 0) return;
    
    try {
      console.log('=== RENUMBERING TO 100er STEPS ===');
      
      // Sort chunks by current order
      const sortedChunks = [...state.chunks].sort((a, b) => a.chunk_order - b.chunk_order);
      console.log('Current chunks:', sortedChunks.map(c => ({ id: c.id, order: c.chunk_order, title: c.title?.slice(0, 20) })));
      
      // Renumber to 100, 200, 300, etc.
      for (let i = 0; i < sortedChunks.length; i++) {
        const chunk = sortedChunks[i];
        const newOrder = (i + 1) * 100;
        
        console.log(`Updating chunk ${chunk.id} from order ${chunk.chunk_order} to ${newOrder}`);
        
        await dbService.updateKnowledgeChunk(chunk.id!, {
          chunk_order: newOrder
        });
      }
      
      console.log('✅ Chunks renumbered to 100er steps successfully');
      
      // Reload document
      await loadKnowledgeDetail(state.selectedDocument.id!);
    } catch (err: any) {
      console.error('❌ Renumber to hundreds error:', err);
      setState(prev => ({ ...prev, error: err.message }));
    }
  };

  return {
    state,
    setState,
    loadKnowledge,
    loadCategories,
    loadKnowledgeDetail,
    openDocument,
    closeDocument,
    createChunk,
    updateChunk,
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
  };
};
