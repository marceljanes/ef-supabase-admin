import { Question } from './database';

export interface DashboardStats {
  totalExams: number;
  totalQuestions: number;
  totalCategories: number;
  totalCompetitors: number;
  activeExams: number;
  featuredExams: number;
}

export interface QuestionsData {
  questions: Question[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DeletingState {
  [key: string]: boolean;
}

// New: exam_pages row type
export interface ExamPage {
  id: number;
  idx?: number;
  vendor?: string | null;
  exam_code: string;
  exam_name: string;
  header_label?: string | null;
  url_path?: string | null;
  icon_name?: string | null;
  display_order?: number | null;
  seo_title?: string | null;
  seo_h1?: string | null;
  seo_meta_description?: string | null;
  seo_keywords?: string | null;
  seo_canonical_url?: string | null;
  is_active: boolean;
  is_featured: boolean;
  difficulty_level?: string | null;
  estimated_duration?: number | null;
  question_count?: number | null;
  created_at?: string;
  updated_at?: string;
  seo_google_snippet?: string | null;
}
