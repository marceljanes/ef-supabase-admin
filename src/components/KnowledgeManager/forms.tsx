import React from 'react';
import { KnowledgeManagerState } from './types';

interface FormProps {
  state: KnowledgeManagerState;
  onCreateKnowledge: () => void;
  onUpdateKnowledge: () => void;
  onResetForm: () => void;
  onSetNewKnowledge: (knowledge: any) => void;
  onSetEditingKnowledge: (knowledge: any) => void;
}

export const CreateKnowledgeForm: React.FC<{
  newKnowledge: any;
  onCreateKnowledge: () => void;
  onResetForm: () => void;
  onSetNewKnowledge: (knowledge: any) => void;
}> = ({ newKnowledge, onCreateKnowledge, onResetForm, onSetNewKnowledge }) => {
  return (
    <div className="border border-zinc-700 bg-zinc-900/70 rounded p-4 space-y-4">
      <h3 className="text-lg font-medium text-white">Create New Knowledge Document</h3>
      
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-400">Title *</label>
          <input
            type="text"
            value={newKnowledge.title}
            onChange={(e) => onSetNewKnowledge({ ...newKnowledge, title: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white placeholder-zinc-400"
            placeholder="Knowledge document title"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-400">Category</label>
          <input
            type="text"
            value={newKnowledge.category}
            onChange={(e) => onSetNewKnowledge({ ...newKnowledge, category: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white placeholder-zinc-400"
            placeholder="e.g. Cloud Computing"
          />
        </div>
      </div>
      
      <div className="space-y-1">
        <label className="block text-sm font-medium text-zinc-400">Description</label>
        <textarea
          value={newKnowledge.description}
          onChange={(e) => onSetNewKnowledge({ ...newKnowledge, description: e.target.value })}
          rows={3}
          className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white placeholder-zinc-400"
          placeholder="Brief description of the knowledge document"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-zinc-400">Content *</label>
        <textarea
          value={newKnowledge.content}
          onChange={(e) => onSetNewKnowledge({ ...newKnowledge, content: e.target.value })}
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
            onChange={(e) => onSetNewKnowledge({ ...newKnowledge, tags: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white placeholder-zinc-400"
            placeholder="tag1, tag2, tag3"
          />
          <p className="text-xs text-zinc-500">Separate tags with commas</p>
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-400">Document Type</label>
          <select
            value={newKnowledge.document_type}
            onChange={(e) => onSetNewKnowledge({ ...newKnowledge, document_type: e.target.value })}
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
          onClick={onCreateKnowledge}
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded font-medium"
        >
          Create Knowledge
        </button>
        <button
          onClick={onResetForm}
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export const EditKnowledgeForm: React.FC<{
  editingKnowledge: any;
  onUpdateKnowledge: () => void;
  onSetEditingKnowledge: (knowledge: any) => void;
  onCancel: () => void;
}> = ({ editingKnowledge, onUpdateKnowledge, onSetEditingKnowledge, onCancel }) => {
  return (
    <div className="border border-zinc-700 bg-zinc-900/70 rounded p-4 space-y-4">
      <h3 className="text-lg font-medium text-white">Edit Knowledge Document</h3>
      
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-400">Title *</label>
          <input
            type="text"
            value={editingKnowledge.title}
            onChange={(e) => onSetEditingKnowledge({ ...editingKnowledge, title: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white placeholder-zinc-400"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-400">Category</label>
          <input
            type="text"
            value={editingKnowledge.category || ''}
            onChange={(e) => onSetEditingKnowledge({ ...editingKnowledge, category: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white placeholder-zinc-400"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-zinc-400">Description</label>
        <textarea
          value={editingKnowledge.description || ''}
          onChange={(e) => onSetEditingKnowledge({ ...editingKnowledge, description: e.target.value })}
          rows={3}
          className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white placeholder-zinc-400"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-zinc-400">Content *</label>
        <textarea
          value={editingKnowledge.content || ''}
          onChange={(e) => onSetEditingKnowledge({ ...editingKnowledge, content: e.target.value })}
          rows={8}
          className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white placeholder-zinc-400"
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
              onSetEditingKnowledge({ 
                ...editingKnowledge, 
                tags: tagsArray.length > 0 ? tagsArray : null 
              });
            }}
            className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white placeholder-zinc-400"
            placeholder="tag1, tag2, tag3"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-400">Document Type</label>
          <select
            value={editingKnowledge.document_type}
            onChange={(e) => onSetEditingKnowledge({ ...editingKnowledge, document_type: e.target.value })}
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
            onChange={(e) => onSetEditingKnowledge({ ...editingKnowledge, is_active: e.target.checked })}
            className="bg-zinc-800 border border-zinc-600 rounded"
          />
          <span className="text-sm text-zinc-400">Active</span>
        </label>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onUpdateKnowledge}
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded font-medium"
        >
          Update Knowledge
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
