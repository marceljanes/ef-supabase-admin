import React from 'react';

interface SearchBarProps {
  searchTerm: string;
  statusFilter: 'all' | 'active' | 'inactive';
  typeFilter: string;
  onSearchChange: (term: string) => void;
  onStatusChange: (status: 'all' | 'active' | 'inactive') => void;
  onTypeChange: (type: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  statusFilter,
  typeFilter,
  onSearchChange,
  onStatusChange,
  onTypeChange
}) => {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search knowledge..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white placeholder-zinc-400"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value as any)}
            className="px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => onTypeChange(e.target.value)}
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
  );
};

interface KnowledgeCardProps {
  item: any;
  onOpenDocument: (item: any) => void;
  onEditKnowledge: (item: any) => void;
  onDeleteKnowledge: (id: number) => void;
}

export const KnowledgeCard: React.FC<KnowledgeCardProps> = ({
  item,
  onOpenDocument,
  onEditKnowledge,
  onDeleteKnowledge
}) => {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden hover:border-zinc-600 transition-colors">
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
            {item.tags.slice(0, 3).map((tag: string, idx: number) => (
              <span key={idx} className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded text-xs">
                {tag}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="text-xs text-zinc-500">+{item.tags.length - 3}</span>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => onOpenDocument(item)}
            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
          >
            Open
          </button>
          <button
            onClick={() => onEditKnowledge(item)}
            className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-sm"
          >
            Edit
          </button>
          <button
            onClick={() => onDeleteKnowledge(item.id)}
            className="px-3 py-2 bg-zinc-600 hover:bg-zinc-500 text-white rounded text-sm"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 rounded-lg">
      <div className="text-sm text-zinc-400">
        Page {currentPage} of {totalPages}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white rounded text-sm"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white rounded text-sm"
        >
          Next
        </button>
      </div>
    </div>
  );
};

interface EmptyStateProps {
  hasItems: boolean;
  isFiltered: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ hasItems, isFiltered }) => {
  return (
    <div className="text-center py-12">
      <div className="text-zinc-400 text-lg mb-2">No knowledge documents found</div>
      <div className="text-zinc-500 text-sm">
        {!hasItems ? 'Create your first knowledge document above' : 'Try adjusting your search or filters'}
      </div>
    </div>
  );
};
