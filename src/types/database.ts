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
