import React from 'react';

interface HeaderProps {
  activeTab: 'overview' | 'document';
  selectedDocument: any | null;
  onShowCreateForm: () => void;
  onSetActiveTab: (tab: 'overview' | 'document') => void;
  onCloseDocument: () => void;
}

export const KnowledgeHeader: React.FC<HeaderProps> = ({
  activeTab,
  selectedDocument,
  onShowCreateForm,
  onSetActiveTab,
  onCloseDocument
}) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium text-white">Knowledge Management</h2>
        {activeTab === 'overview' && (
          <button
            onClick={onShowCreateForm}
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
            onClick={() => onSetActiveTab('overview')}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-zinc-400 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Overview
          </button>
          {selectedDocument && (
            <div className="flex items-center">
              <button
                onClick={() => onSetActiveTab('document')}
                className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'document'
                    ? 'border-zinc-400 text-white'
                    : 'border-transparent text-zinc-400 hover:text-zinc-300'
                }`}
              >
                {selectedDocument.title}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseDocument();
                }}
                className="text-zinc-500 hover:text-zinc-300 ml-2 pb-2"
                title="Dokument schließen"
              >
                ×
              </button>
            </div>
          )}
        </nav>
      </div>
    </div>
  );
};

interface ErrorDisplayProps {
  error: string | null;
  onClearError: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onClearError }) => {
  if (!error) return null;

  return (
    <div className="bg-red-900/50 border border-red-700 rounded p-3 text-red-300 text-sm">
      {error}
      <button onClick={onClearError} className="ml-2 text-red-400 hover:text-red-300">×</button>
    </div>
  );
};

interface LoadingSpinnerProps {
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ className = '' }) => {
  return (
    <div className={`${className} space-y-4`}>
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border border-zinc-600 border-t-white"></div>
      </div>
    </div>
  );
};
