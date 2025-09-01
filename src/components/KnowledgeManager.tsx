import React, { useState, useEffect } from 'react';
import { Knowledge, KnowledgeChunk } from '@/types/database';
import { dbService } from '@/lib/supabase';

interface KnowledgeManagerProps {
  className?: string;
}

export default function KnowledgeManager({ className = '' }: KnowledgeManagerProps) {
  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingKnowledge, setEditingKnowledge] = useState<Knowledge | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Knowledge | null>(null);
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showChunkForm, setShowChunkForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'document'>('overview');
  const [newChunk, setNewChunk] = useState({
    title: '',
    content: '',
    chunk_type: 'text' as 'text' | 'code' | 'image' | 'table' | 'list',
    chunk_order: 1
  });
  const [newKnowledge, setNewKnowledge] = useState({
    title: '',
    description: '',
    content: '',
    category: '',
    tags: '',
    is_active: true,
    document_type: 'text'
  });

  useEffect(() => {
    loadKnowledge();
    loadCategories();
  }, [currentPage, searchTerm, selectedCategory]);

  const loadKnowledge = async () => {
    try {
      setLoading(true);
      const result = await dbService.getKnowledge({
        page: currentPage,
        limit: 10,
        category: selectedCategory || undefined,
        search: searchTerm || undefined
      });
      setKnowledge(result.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await dbService.getKnowledgeCategories();
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadKnowledgeDetail = async (id: number) => {
    try {
      const detail = await dbService.getKnowledgeById(id);
      setSelectedDocument(detail);
      setChunks(detail.chunks || []);
      setActiveTab('document');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openDocument = async (item: Knowledge) => {
    await loadKnowledgeDetail(item.id);
  };

  const closeDocument = () => {
    setSelectedDocument(null);
    setChunks([]);
    setActiveTab('overview');
    setShowChunkForm(false);
  };

  // Filter and pagination logic
  const filteredKnowledge = knowledge.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (item.content?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && item.is_active) ||
                         (statusFilter === 'inactive' && !item.is_active);
    const matchesType = !typeFilter || item.document_type === typeFilter;
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    
    return matchesSearch && matchesStatus && matchesType && matchesCategory;
  });

  const itemsPerPage = 9; // 3x3 grid
  const totalPages = Math.ceil(filteredKnowledge.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredKnowledge.slice(startIndex, startIndex + itemsPerPage);

  const createChunk = async (knowledgeId: number) => {
    if (!newChunk.content.trim()) {
      setError('Chunk content is required');
      return;
    }

    try {
      await dbService.createKnowledgeChunk({
        knowledge_id: knowledgeId,
        ...newChunk
      });

      setNewChunk({
        title: '',
        content: '',
        chunk_type: 'text',
        chunk_order: 1
      });
      setShowChunkForm(false);
      
      // Reload chunks for this knowledge
      await loadKnowledgeDetail(knowledgeId);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const createKnowledge = async () => {
    if (!newKnowledge.title.trim() || !newKnowledge.content.trim()) {
      setError('Title and content are required');
      return;
    }

    try {
      const tagsArray = newKnowledge.tags 
        ? newKnowledge.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : [];

      await dbService.createKnowledge({
        ...newKnowledge,
        tags: tagsArray.length > 0 ? tagsArray : null
      });

      setNewKnowledge({
        title: '',
        description: '',
        content: '',
        category: '',
        tags: '',
        is_active: true,
        document_type: 'text'
      });
      setShowCreateForm(false);
      loadKnowledge();
      loadCategories();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const updateKnowledge = async () => {
    if (!editingKnowledge) return;

    try {
      await dbService.updateKnowledge(editingKnowledge.id, editingKnowledge);
      setEditingKnowledge(null);
      loadKnowledge();
      
      // Reload document if it was edited
      if (selectedDocument && selectedDocument.id === editingKnowledge.id) {
        await loadKnowledgeDetail(editingKnowledge.id);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteKnowledge = async (id: number) => {
    if (!confirm('Are you sure you want to delete this knowledge document?')) return;

    try {
      await dbService.deleteKnowledge(id);
      loadKnowledge();
      
      // Close document if it was deleted
      if (selectedDocument && selectedDocument.id === id) {
        closeDocument();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatTags = (tags: string[] | null) => {
    if (!tags || tags.length === 0) return '';
    return tags.join(', ');
  };

  const resetForm = () => {
    setNewKnowledge({
      title: '',
      description: '',
      content: '',
      category: '',
      tags: '',
      is_active: true,
      document_type: 'text'
    });
    setShowCreateForm(false);
    setError(null);
  };

  if (loading && knowledge.length === 0) {
    return (
      <div className={`${className} space-y-4`}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border border-zinc-600 border-t-white"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} space-y-6`}>
      {/* Header with Tabs */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium text-white">Knowledge Management</h2>
          {activeTab === 'overview' && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-1 px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-sm font-medium"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14"/>
              </svg>
              Add Knowledge
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-zinc-700">
          <nav className="flex space-x-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-zinc-400 text-white'
                  : 'border-transparent text-zinc-400 hover:text-zinc-300'
              }`}
            >
              Overview
            </button>
            {selectedDocument && (
              <button
                onClick={() => setActiveTab('document')}
                className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'document'
                    ? 'border-zinc-400 text-white'
                    : 'border-transparent text-zinc-400 hover:text-zinc-300'
                }`}
              >
                <span>{selectedDocument.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeDocument();
                  }}
                  className="text-zinc-500 hover:text-zinc-300 ml-1"
                >
                  ×
                </button>
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded p-3 text-red-300 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-300">×</button>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Create Form */}
          {showCreateForm && (
            <div className="border border-zinc-700 bg-zinc-900/70 rounded p-4 space-y-4">
              <h3 className="text-lg font-medium text-white">Create New Knowledge Document</h3>
              {/* ...existing form content... */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-zinc-400">Title *</label>
                  <input
                    type="text"
                    value={newKnowledge.title}
                    onChange={(e) => setNewKnowledge(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white placeholder-zinc-400"
                    placeholder="Knowledge document title"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-zinc-400">Category</label>
                  <input
                    type="text"
                    value={newKnowledge.category}
                    onChange={(e) => setNewKnowledge(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white placeholder-zinc-400"
                    placeholder="e.g. Cloud Computing"
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="block text-sm font-medium text-zinc-400">Description</label>
                <textarea
                  value={newKnowledge.description}
                  onChange={(e) => setNewKnowledge(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white placeholder-zinc-400"
                  placeholder="Brief description of the knowledge document"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-zinc-400">Content *</label>
                <textarea
                  value={newKnowledge.content}
                  onChange={(e) => setNewKnowledge(prev => ({ ...prev, content: e.target.value }))}
                  rows={8}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white placeholder-zinc-400"
                  placeholder="Main content of the knowledge document"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-zinc-400">Tags</label>
                  <input
                    type="text"
                    value={newKnowledge.tags}
                    onChange={(e) => setNewKnowledge(prev => ({ ...prev, tags: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white placeholder-zinc-400"
                    placeholder="tag1, tag2, tag3"
                  />
                  <p className="text-xs text-zinc-500">Separate tags with commas</p>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-zinc-400">Document Type</label>
                  <select
                    value={newKnowledge.document_type}
                    onChange={(e) => setNewKnowledge(prev => ({ ...prev, document_type: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
                  >
                    <option value="text">Text</option>
                    <option value="markdown">Markdown</option>
                    <option value="pdf">PDF</option>
                    <option value="documentation">Documentation</option>
                    <option value="tutorial">Tutorial</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={createKnowledge}
                  className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded font-medium"
                >
                  Create Knowledge
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Edit Knowledge Modal */}
          {editingKnowledge && (
            <div className="border border-zinc-700 bg-zinc-900/70 rounded p-4 space-y-4">
              <h3 className="text-lg font-medium text-white">Edit Knowledge Document</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-zinc-400">Title *</label>
                  <input
                    type="text"
                    value={editingKnowledge.title}
                    onChange={(e) => setEditingKnowledge(prev => prev ? ({ ...prev, title: e.target.value }) : null)}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white placeholder-zinc-400"
                    placeholder="Knowledge document title"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-zinc-400">Category</label>
                  <input
                    type="text"
                    value={editingKnowledge.category || ''}
                    onChange={(e) => setEditingKnowledge(prev => prev ? ({ ...prev, category: e.target.value }) : null)}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white placeholder-zinc-400"
                    placeholder="e.g. Cloud Computing"
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="block text-sm font-medium text-zinc-400">Description</label>
                <textarea
                  value={editingKnowledge.description || ''}
                  onChange={(e) => setEditingKnowledge(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                  rows={3}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white placeholder-zinc-400"
                  placeholder="Brief description of the knowledge document"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-zinc-400">Content *</label>
                <textarea
                  value={editingKnowledge.content || ''}
                  onChange={(e) => setEditingKnowledge(prev => prev ? ({ ...prev, content: e.target.value }) : null)}
                  rows={8}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white placeholder-zinc-400"
                  placeholder="Main content of the knowledge document"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-zinc-400">Tags</label>
                  <input
                    type="text"
                    value={editingKnowledge.tags ? editingKnowledge.tags.join(', ') : ''}
                    onChange={(e) => {
                      const tagsArray = e.target.value 
                        ? e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                        : [];
                      setEditingKnowledge(prev => prev ? ({ ...prev, tags: tagsArray.length > 0 ? tagsArray : null }) : null);
                    }}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white placeholder-zinc-400"
                    placeholder="tag1, tag2, tag3"
                  />
                  <p className="text-xs text-zinc-500">Separate tags with commas</p>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-zinc-400">Document Type</label>
                  <select
                    value={editingKnowledge.document_type}
                    onChange={(e) => setEditingKnowledge(prev => prev ? ({ ...prev, document_type: e.target.value }) : null)}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
                  >
                    <option value="text">Text</option>
                    <option value="markdown">Markdown</option>
                    <option value="pdf">PDF</option>
                    <option value="documentation">Documentation</option>
                    <option value="tutorial">Tutorial</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingKnowledge.is_active}
                    onChange={(e) => setEditingKnowledge(prev => prev ? ({ ...prev, is_active: e.target.checked }) : null)}
                    className="bg-zinc-800 border border-zinc-600 rounded"
                  />
                  <span className="text-sm text-zinc-400">Active</span>
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={updateKnowledge}
                  className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded font-medium"
                >
                  Update Knowledge
                </button>
                <button
                  onClick={() => setEditingKnowledge(null)}
                  className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Search and Filter Bar */}
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search knowledge..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white placeholder-zinc-400"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white"
                >
                  <option value="">All Types</option>
                  <option value="text">Text</option>
                  <option value="markdown">Markdown</option>
                  <option value="pdf">PDF</option>
                  <option value="documentation">Documentation</option>
                  <option value="tutorial">Tutorial</option>
                </select>
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentItems.map((item) => (
              <div key={item.id} className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden hover:border-zinc-600 transition-colors">
                {/* Card Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-medium text-white line-clamp-1">{item.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs shrink-0 ml-2 ${
                      item.is_active 
                        ? 'bg-zinc-700 text-zinc-300' 
                        : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm text-zinc-400 mb-2">
                    <span>{item.document_type}</span>
                    <span>•</span>
                    <span>{item.word_count} words</span>
                    <span>•</span>
                    <span>{item.reading_time_minutes} min</span>
                  </div>

                  {item.description && (
                    <p className="text-zinc-300 text-sm mb-3 line-clamp-2">{item.description}</p>
                  )}
                  
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {item.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                      {item.tags.length > 3 && (
                        <span className="text-xs text-zinc-500">+{item.tags.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* Card Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => openDocument(item)}
                      className="flex-1 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-sm font-medium"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => setEditingKnowledge(item)}
                      className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteKnowledge(item.id)}
                      className="px-3 py-2 bg-zinc-600 hover:bg-zinc-500 text-white rounded text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {currentItems.length === 0 && (
            <div className="text-center py-12">
              <div className="text-zinc-400 text-lg mb-2">No knowledge documents found</div>
              <div className="text-zinc-500 text-sm">
                {filteredKnowledge.length === 0 ? 'Create your first knowledge document above' : 'Try adjusting your search or filters'}
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 rounded-lg">
              <div className="text-sm text-zinc-400">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white rounded text-sm"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white rounded text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Document View Tab */}
      {activeTab === 'document' && selectedDocument && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl w-full min-h-[800px]">
          {/* Document Header */}
          <div className="bg-zinc-800 border-b border-zinc-600 p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-3 leading-tight">{selectedDocument.title}</h1>
                <div className="flex items-center gap-6 text-sm text-zinc-300">
                  <span className="bg-zinc-700 px-3 py-1 rounded-full">{selectedDocument.document_type}</span>
                  <span>{selectedDocument.word_count} words</span>
                  <span>{selectedDocument.reading_time_minutes} minutes read</span>
                  <span>Updated {new Date(selectedDocument.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEditingKnowledge(selectedDocument)}
                  className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Edit Document
                </button>
                <button
                  onClick={closeDocument}
                  className="px-4 py-2 bg-zinc-600 hover:bg-zinc-500 text-white rounded-lg text-sm transition-colors"
                >
                  Close
                </button>
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
                {selectedDocument.tags.map((tag, idx) => (
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

          {/* Document Content - Word-like styling */}
          <div className="p-12 bg-zinc-900">
            <div className="max-w-none">
              {/* Document content with Word-like formatting */}
              <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-12 shadow-inner min-h-[600px]">
                <div className="text-white leading-loose whitespace-pre-wrap text-lg font-light tracking-wide">
                  {selectedDocument.content}
                </div>
              </div>
            </div>
          </div>

          {/* Chunks Section */}
          <div className="border-t border-zinc-600 bg-zinc-800 p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                Knowledge Chunks ({chunks.length})
              </h3>
              <button
                onClick={() => setShowChunkForm(!showChunkForm)}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {showChunkForm ? 'Cancel' : 'Add Chunk'}
              </button>
            </div>

            {/* Add Chunk Form */}
            {showChunkForm && (
              <div className="mb-8 p-6 bg-zinc-900 rounded-lg border border-zinc-600">
                <h4 className="font-medium text-white mb-4 text-lg">Add New Chunk</h4>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Chunk title (optional)"
                    value={newChunk.title}
                    onChange={(e) => setNewChunk(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-400 text-sm focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500"
                  />
                  <textarea
                    placeholder="Chunk content"
                    value={newChunk.content}
                    onChange={(e) => setNewChunk(prev => ({ ...prev, content: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-400 text-sm h-32 resize-none focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500"
                    required
                  />
                  <div className="flex gap-3">
                    <select
                      value={newChunk.chunk_type}
                      onChange={(e) => setNewChunk(prev => ({ ...prev, chunk_type: e.target.value as any }))}
                      className="px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500"
                    >
                      <option value="text">Text</option>
                      <option value="code">Code</option>
                      <option value="image">Image</option>
                      <option value="table">Table</option>
                      <option value="list">List</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Order"
                      value={newChunk.chunk_order}
                      onChange={(e) => setNewChunk(prev => ({ ...prev, chunk_order: parseInt(e.target.value) || 1 }))}
                      className="w-24 px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500"
                      min="1"
                    />
                    <button
                      onClick={() => createChunk(selectedDocument.id)}
                      className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Add Chunk
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Chunks List */}
            <div className="space-y-4">
              {chunks.map((chunk) => (
                <div key={chunk.id} className="bg-zinc-900 rounded-lg border border-zinc-600 p-6 hover:border-zinc-500 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    {chunk.title && (
                      <h5 className="font-medium text-white text-base">{chunk.title}</h5>
                    )}
                    <div className="flex items-center gap-3">
                      <span className="text-xs px-3 py-1 bg-zinc-700 text-zinc-300 rounded-full">
                        {chunk.chunk_type}
                      </span>
                      <span className="text-xs text-zinc-400">#{chunk.chunk_order}</span>
                    </div>
                  </div>
                  <p className="text-zinc-200 text-sm mb-3 leading-relaxed">{chunk.content}</p>
                  <div className="text-xs text-zinc-400 flex gap-4">
                    <span>{chunk.word_count} words</span>
                    <span>•</span>
                    <span>{chunk.tokens} tokens</span>
                  </div>
                </div>
              ))}
              {chunks.length === 0 && (
                <div className="text-center py-12 text-zinc-400">
                  <div className="text-lg mb-2">No chunks yet</div>
                  <div className="text-sm text-zinc-500">
                    Add your first chunk above to break down this document into smaller, manageable pieces.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
