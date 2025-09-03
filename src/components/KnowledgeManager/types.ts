export interface KnowledgeManagerState {
  knowledge: any[];
  loading: boolean;
  error: string | null;
  showCreateForm: boolean;
  editingKnowledge: any | null;
  selectedDocument: any | null;
  chunks: any[];
  // Multiple document tabs
  openDocumentTabs: Array<{ id: number; title: string; document: any; chunks: any[] }>;
  activeDocumentTabId: number | null;
  searchTerm: string;
  statusFilter: 'all' | 'active' | 'inactive';
  typeFilter: string;
  selectedCategory: string;
  categories: string[];
  currentPage: number;
  showChunkForm: boolean;
  editingChunkId: number | null; // Für Update vs Create
  activeTab: 'overview' | 'document';
  movingChunkId: number | null; // Für visuelles Feedback beim Verschieben
  insertAfterOrder: number | null; // Für Insert-Between-Chunks
  newChunk: {
    title: string;
    content: string | { type: 'graphic'; graphic?: { shapes: any[] } };
    chunk_type: 'text' | 'code' | 'image' | 'table' | 'list' | 'title' | 'heading' | 'subheading' | 'graphic';
    chunk_order: number;
  };
  newKnowledge: {
    title: string;
    description: string;
    content: string;
    category: string;
    tags: string;
    is_active: boolean;
    document_type: string;
  };
  contextMenu: {
    show: boolean;
    x: number;
    y: number;
    position: number;
  };
  documentTheme: 'dark' | 'light';
  showEmptyDocumentMenu: boolean;
}

export interface KnowledgeManagerProps {
  className?: string;
}
