export interface ExamPage {
  idx: number;
  id: number;
  vendor: string;
  exam_code: string;
  exam_name: string;
  header_label: string;
  url_path: string;
  icon_name: string | null;
  display_order: number;
  seo_title: string;
  seo_h1: string;
  seo_meta_description: string;
  seo_keywords: string;
  seo_canonical_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  difficulty_level: string;
  estimated_duration: number;
  question_count: number;
  created_at: string;
  updated_at: string;
  seo_google_snippet: string | null;
}

export interface Question {
  id: string;
  question: string;
  answers: Answer[];
  explanation: string;
  level: string;
  category: string | null;
  exam_code: string;
  inactive: boolean;
  updated_at?: string; // added
  created_at?: string; // added for recent activity
  embedding?: number[] | null; // vector embedding (pgvector)
  searchable_text?: string | null; // denormalized hybrid search text
}

export interface Answer {
  text: string;
  isCorrect: boolean;
}

export interface ExamCategory {
  idx: number;
  id: number;
  exam_code: string;
  category_name: string;
  category_slug: string;
  display_order: number;
  description: string;
  icon_name: string;
  question_count: number;
  estimated_time: number;
  difficulty_level: string;
  is_active: boolean;
  is_featured: boolean;
  seo_title: string;
  seo_description: string;
  created_at: string;
  updated_at: string;
}

export interface CompetitorAnalysis {
  idx: number;
  id: number;
  exam_name: string;
  exam_code: string;
  vendor: string;
  category: string;
  primary_search_query: string;
  monthly_search_volume: number;
  avg_salary_impact: string;
  difficulty: string;
  exam_cost_usd: string;
  top_competitors: string;
  market_trend: string;
  priority_level: string;
  exam_summary: string;
  created_at: string;
  updated_at: string;
}

export interface Knowledge {
  id: number;
  title: string;
  description?: string | null;
  content?: string | null;
  category?: string | null;
  tags?: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  file_path?: string | null;
  document_type: string;
  word_count: number;
  reading_time_minutes: number;
}

export interface KnowledgeChunk {
  id: number;
  knowledge_id: number;
  title?: string;
  content: string;
  chunk_type: 'text' | 'code' | 'image' | 'table' | 'list';
  chunk_order: number;
  word_count: number;
  tokens: number;
  created_at: string;
  updated_at: string;
}

// User Management Types
export interface AppUser {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'editor' | 'contributor' | 'user';
  status: 'active' | 'inactive';
  created_at: string;
  last_login?: string;
  avatar_url?: string;
  email_confirmed_at?: string;
}

export interface UserProfile {
  idx: number;
  id: string;
  email: string;
  full_name?: string;
  status: 'pending' | 'approved' | 'rejected';
  role: 'user' | 'admin' | 'superadmin';
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  is_approved: boolean;
}

export interface KnowledgeWithChunks extends Knowledge {
  chunks?: KnowledgeChunk[];
}

// Task Management Types for PMI Kanban Board
export interface Task {
  id: string;
  title: string;
  description?: string | null;
  author_id: string;
  assignee_id?: string | null;
  status: 'idea' | 'demand' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  question_count: number;
  exam_code?: string | null;
  category?: string | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'mixed';
  due_date?: string | null;
  tags?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface TaskWithProfiles extends Task {
  author: UserProfile;
  assignee?: UserProfile | null;
}
