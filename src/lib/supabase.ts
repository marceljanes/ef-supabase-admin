import { createClient } from '@supabase/supabase-js';
import { Question as BaseQuestion, ExamPage as BaseExamPage, ExamCategory as BaseExamCategory, Answer } from '@/types/database';

// Local helper types (DB uses numeric ids for questions often)
export interface QuestionLike extends Omit<BaseQuestion,'id'> { id: number | string; }
// inactive optional to allow payloads without explicit inactive value
export interface UpdateQuestionPayload { id: number | string; question: string; answers: Answer[]; explanation: string; category?: string | null; level: string; exam_code: string; inactive?: boolean; }
// Allow nullable updates for all ExamPage fields, require id
type ExamPageNullableUpdate = { [K in keyof BaseExamPage]?: BaseExamPage[K] | null };
export type ExamPageUpdate = { id: number } & ExamPageNullableUpdate;
export type NewExamCategory = Partial<{ [K in keyof BaseExamCategory]: BaseExamCategory[K] | null }> & { exam_code: string; category_name: string };
export type InsertQuestionPayload = Partial<QuestionLike> & { question: string; answers: Answer[]; explanation: string; level: string; exam_code: string; category?: string | null };
export type CreateExamPageInput = Partial<BaseExamPage> & { exam_code: string; exam_name: string };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase Config Debug:', {
  url: supabaseUrl,
  keyLength: supabaseAnonKey?.length,
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: !!supabaseUrl,
    key: !!supabaseAnonKey
  });
  throw new Error('Missing Supabase configuration');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
});

// Simple test function
export async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase
      .from('exam_pages')
      .select('id')
      .limit(1);
    
    console.log('Supabase test result:', { data, error });
    
    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    throw error;
  }
}

// Database service functions
export const dbService = {
  // Test connection function
  async testConnection() {
    return testSupabaseConnection();
  },

  // Get accurate counts for dashboard stats
  async getAccurateCounts() {
    try {
      console.log('Getting accurate counts...');
      
      // Count exams from exam_pages table
      const { count: examCount, error: examError } = await supabase
        .from('exam_pages')
        .select('*', { count: 'exact', head: true });

      if (examError) {
        throw new Error(`Error counting exams: ${examError.message}`);
      }

      // Count questions from questions table
      const { count: questionCount, error: questionError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true });

      if (questionError) {
        throw new Error(`Error counting questions: ${questionError.message}`);
      }

      // Count unique categories from questions table
      const { data: categoryData, error: categoryError } = await supabase
        .from('questions')
        .select('category');

      if (categoryError) {
        throw new Error(`Error fetching categories: ${categoryError.message}`);
      }

      const uniqueCategories = new Set(
        categoryData?.map(item => item.category).filter(Boolean)
      );

      const counts = {
        totalExams: examCount || 0,
        totalQuestions: questionCount || 0,
        totalCategories: uniqueCategories.size,
        totalCompetitors: 0 // Placeholder for competitor data
      };

      console.log('Accurate counts:', counts);
      return counts;
    } catch (error) {
      console.error('getAccurateCounts error:', error);
      throw error;
    }
  },

  // Get dashboard stats with active exam calculation
  async getDashboardStats() {
    try {
      console.log('Loading dashboard stats...');
      
      const baseCounts = await this.getAccurateCounts();
      
      // Count active exams: try `is_active` (boolean) first, then fall back to `status`, otherwise heuristic
      let activeExamCountValue: number | undefined;

      try {
        // Try is_active boolean column
        const { count: isActiveCount, error: isActiveError } = await supabase
          .from('exam_pages')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        if (!isActiveError) {
          activeExamCountValue = isActiveCount || 0;
        } else if (String(isActiveError.message || isActiveError).includes('column "is_active" does not exist')) {
          // is_active doesn't exist, try status column
          const { count: statusCount, error: statusError } = await supabase
            .from('exam_pages')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');

          if (!statusError) {
            activeExamCountValue = statusCount || 0;
          } else if (String(statusError.message || statusError).includes('column "status" does not exist')) {
            console.warn('Neither `is_active` nor `status` columns exist on exam_pages — falling back to heuristic.');
          } else {
            console.error('activeExamError raw (status):', statusError);
            throw new Error(`Error counting active exams: ${statusError.message || JSON.stringify(statusError)}`);
          }
        } else {
          console.error('activeExamError raw (is_active):', isActiveError);
          throw new Error(`Error counting active exams: ${isActiveError.message || JSON.stringify(isActiveError)}`);
        }
      } catch (err) {
        console.error('Unexpected error counting active exams:', err);
      }

      const stats = {
        ...baseCounts,
        activeExams: activeExamCountValue || Math.floor(baseCounts.totalExams * 0.7), // Fallback to 70% if no status/is_active field
        featuredExams: Math.floor(baseCounts.totalExams * 0.3) // Placeholder calculation
      };

      console.log('Dashboard stats loaded:', stats);
      return stats;
    } catch (error) {
      console.error('getDashboardStats error:', error);
      throw error;
    }
  },

  // Get paginated questions with exam_code filtering
  async getQuestions(page = 1, limit = 20) {
    try {
      console.log(`Fetching questions: page ${page}, limit ${limit}`);
      
      const startIndex = (page - 1) * limit;
      
      const { data, error, count } = await supabase
        .from('questions')
        .select('*', { count: 'exact' })
        .range(startIndex, startIndex + limit - 1)
        .order('id', { ascending: true });

      if (error) {
        throw new Error(`Error fetching questions: ${error.message}`);
      }

      const result = {
        questions: data || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      };

      console.log(`Fetched ${result.questions.length} questions out of ${result.total} total`);
      return result;
    } catch (error) {
      console.error('getQuestions error:', error);
      throw error;
    }
  },

  // Get unique exam codes for filtering
  async getExamCodes() {
    try {
      console.log('Fetching unique exam codes...');
      
      const { data, error } = await supabase
        .from('questions')
        .select('exam_code')
        .not('exam_code', 'is', null);

      if (error) {
        throw new Error(`Error fetching exam codes: ${error.message}`);
      }

      // Extract unique exam codes and filter out null/empty values
      const uniqueExamCodes = [...new Set(data?.map(item => item.exam_code).filter(Boolean))].sort();
      
      console.log('Unique exam codes:', uniqueExamCodes);
      return uniqueExamCodes;
    } catch (error) {
      console.error('getExamCodes error:', error);
      throw error;
    }
  },

  // Get all questions without pagination for client-side filtering
  async getAllQuestions() {
    try {
      console.log('Fetching all questions...');
      
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        throw new Error(`Error fetching all questions: ${error.message}`);
      }

      console.log(`Fetched ${data?.length || 0} total questions`);
      return data || [];
    } catch (error) {
      console.error('getAllQuestions error:', error);
      throw error;
    }
  },

  // Get questions with exam_code filter (for debugging)
  async getQuestionsWithExamCode() {
    try {
      console.log('Fetching questions with exam_code filter...');
      
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .not('exam_code', 'is', null)
        .order('exam_code', { ascending: true })
        .order('id', { ascending: true });

      if (error) {
        throw new Error(`Error fetching questions with exam_code: ${error.message}`);
      }

      console.log(`Fetched ${data?.length || 0} questions with exam_code`);
      return data || [];
    } catch (error) {
      console.error('getQuestionsWithExamCode error:', error);
      throw error;
    }
  },

  // Get questions for a specific exam code
  async getQuestionsByExamCode(examCode: string) {
    try {
      console.log(`Fetching questions for exam code: ${examCode}`);
      
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_code', examCode)
        .order('id', { ascending: true });

      if (error) {
        throw new Error(`Error fetching questions for exam code ${examCode}: ${error.message}`);
      }

      console.log(`Fetched ${data?.length || 0} questions for exam code: ${examCode}`);
      
      return data || [];
    } catch (error) {
      console.error('getQuestionsByExamCode error:', error);
      throw error;
    }
  },

  // Update a question
  async updateQuestion(question: UpdateQuestionPayload) {
    try {
      console.log('Updating question:', question.id);
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('questions')
        .update({
          question: question.question,
          answers: question.answers,
            explanation: question.explanation,
          category: question.category,
          level: question.level,
          exam_code: question.exam_code,
          inactive: question.inactive,
          updated_at: nowIso // new timestamp field
        })
        .eq('id', question.id)
        .select()
        .single();
      if (error) {
        throw new Error(`Error updating question: ${error.message}`);
      }
      console.log('Question updated successfully:', data);
      return data;
    } catch (error) {
      console.error('updateQuestion error:', error);
      throw error;
    }
  },

  // Delete a question
  async deleteQuestion(questionId: string) {
    try {
      console.log('Deleting question:', questionId);
      
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (error) {
        throw new Error(`Error deleting question: ${error.message}`);
      }

      console.log('Question deleted successfully');
      return true;
    } catch (error) {
      console.error('deleteQuestion error:', error);
      throw error;
    }
  },

  // Get categories for a specific exam code
  async getCategoriesByExamCode(examCode: string) {
    try {
      console.log(`Fetching categories for exam code: ${examCode}`);
      
      const { data, error } = await supabase
        .from('exam_categories')
        .select('category_name')
        .eq('exam_code', examCode)
        .order('category_name', { ascending: true });

      if (error) {
        throw new Error(`Error fetching categories for exam code ${examCode}: ${error.message}`);
      }

      // Extract just the category names
      const categories = data?.map(item => item.category_name) || [];
      console.log(`Fetched ${categories.length} categories for exam code: ${examCode}`, categories);
      
      return categories;
    } catch (error) {
      console.error('getCategoriesByExamCode error:', error);
      throw error;
    }
  },

  // New: fetch exam_pages
  async getExamPages() {
    try {
      console.log('Fetching exam_pages...');
      const { data, error } = await supabase
        .from('exam_pages')
        .select('*')
        .order('display_order', { ascending: true })
        .order('exam_code', { ascending: true });
      if (error) throw new Error(`Error fetching exam_pages: ${error.message}`);
      console.log(`Fetched ${data?.length || 0} exam_pages`);
      return data || [];
    } catch (error) {
      console.error('getExamPages error:', error);
      throw error;
    }
  },

  // New: update single exam_page row
  async updateExamPage(page: ExamPageUpdate) {
    try {
      if (!page || typeof page.id === 'undefined') {
        throw new Error('updateExamPage requires an object with an id');
      }
      const { id, ...updates } = page;
      console.log('Updating exam_page id:', id, 'with', updates);
      const { data, error } = await supabase
        .from('exam_pages')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw new Error(`Error updating exam_page ${id}: ${error.message}`);
      console.log('Exam page updated:', data);
      return data;
    } catch (error) {
      console.error('updateExamPage error:', error);
      throw error;
    }
  },

  // Exam Categories CRUD
  async getExamCategories(examCode: string) {
    try {
      const { data, error } = await supabase
        .from('exam_categories')
        .select('*')
        .eq('exam_code', examCode)
        .order('display_order', { ascending: true });
      if (error) throw new Error(`Error fetching exam categories: ${error.message}`);
      return data || [];
    } catch (e) {
      console.error('getExamCategories error:', e);
      throw e;
    }
  },
  async createExamCategory(category: NewExamCategory) {
    try {
      const { data, error } = await supabase
        .from('exam_categories')
        .insert(category)
        .select('*')
        .single();
      if (error) throw new Error(`Error creating exam category: ${error.message}`);
      return data;
    } catch (e) {
      console.error('createExamCategory error:', e);
      throw e;
    }
  },
  async deleteExamCategory(id: number) {
    try {
      const { error } = await supabase
        .from('exam_categories')
        .delete()
        .eq('id', id);
      if (error) throw new Error(`Error deleting exam category: ${error.message}`);
      return true;
    } catch (e) {
      console.error('deleteExamCategory error:', e);
      throw e;
    }
  },

  async getInactiveExamsWithoutCategories() {
    try {
      const { data: inactiveExams, error } = await supabase
        .from('exam_pages')
        .select('id, exam_code, exam_name, is_active')
        .eq('is_active', false);
      if (error) throw new Error(`Error fetching inactive exams: ${error.message}`);
      if (!inactiveExams || inactiveExams.length === 0) return [];
      const results: { exam_code: string; exam_name: string }[] = [];
      for (const ex of inactiveExams) {
        const { data: cats, error: catErr } = await supabase
          .from('exam_categories')
          .select('id', { count: 'exact', head: false })
          .eq('exam_code', ex.exam_code);
        if (catErr) {
          console.warn('Category check failed for', ex.exam_code, catErr.message);
          continue;
        }
        if (!cats || cats.length === 0) {
          results.push({ exam_code: ex.exam_code, exam_name: ex.exam_name });
        }
      }
      return results.sort((a,b)=>a.exam_code.localeCompare(b.exam_code));
    } catch (e) {
      console.error('getInactiveExamsWithoutCategories error:', e);
      return [];
    }
  },

  // New: get exams with categories
  async getExamsWithCategories() {
    try {
      // fetch all categories grouped by exam_code
      const { data, error } = await supabase
        .from('exam_categories')
        .select('exam_code')
        .order('exam_code', { ascending: true });
      if (error) throw new Error(error.message);
      const codes = [...new Set((data || []).map(d => d.exam_code))];
      if (codes.length === 0) return [];
      // fetch exam metadata from exam_pages
      const { data: exams, error: examErr } = await supabase
        .from('exam_pages')
        .select('exam_code, exam_name, vendor, is_active')
        .in('exam_code', codes);
      if (examErr) throw new Error(examErr.message);
      return (exams || []).sort((a,b)=>a.exam_code.localeCompare(b.exam_code));
    } catch (e) {
      console.error('getExamsWithCategories error:', e);
      return [];
    }
  },
  async insertQuestion(question: InsertQuestionPayload) {
    try {
      // Ensure created_at is always set on creation (single or bulk loop usage)
      const payload = { ...question };
      if (!('created_at' in payload) || !payload.created_at) {
        payload.created_at = new Date().toISOString();
      }
      const { data, error } = await supabase
        .from('questions')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data;
    } catch (e) {
      console.error('insertQuestion error:', e);
      throw e;
    }
  },

  // New: fetch distinct vendors from exam_pages
  async getVendors() {
    try {
      const { data, error } = await supabase
        .from('exam_pages')
        .select('vendor')
        .not('vendor','is',null);
      if (error) throw new Error(error.message);
      const vendors = [...new Set((data||[]).map(d=>d.vendor).filter(Boolean))].sort();
      return vendors;
    } catch (e) {
      console.error('getVendors error:', e);
      return [];
    }
  },

  // New: fetch exam_code and category_name pairs
  async getExamCodeCategoryMap() {
    try {
      const { data, error } = await supabase
        .from('exam_categories')
        .select('exam_code, category_name');
      if (error) throw new Error(error.message);
      return data || [];
    } catch (e) {
      console.error('getExamCodeCategoryMap error:', e);
      return [];
    }
  },

  // New: fetch 10 newest created and 10 newest updated questions
  async getRecentQuestionsActivity() {
    try {
      let created: QuestionLike[] = [];
      // Try created_at first
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
        if (error) throw error;
        created = data || [];
      } catch (err: unknown) {
        const msg = typeof err === 'object' && err && 'message' in err ? String((err as any).message) : String(err);
        if (msg.toLowerCase().includes('created_at')) {
          console.warn('created_at column missing on questions – falling back to id desc');
          const { data: fallback, error: fbErr } = await supabase
            .from('questions')
            .select('*')
            .order('id', { ascending: false })
            .limit(10);
          if (!fbErr) created = fallback || []; else console.warn('fallback id query failed', fbErr?.message);
        } else {
          console.warn('Unexpected error fetching created questions', msg);
        }
      }

      // Recently updated (where updated_at not null) ordered by updated_at desc
      let updated: QuestionLike[] = [];
      try {
        const { data: upd, error: updErr } = await supabase
          .from('questions')
          .select('*')
          .not('updated_at','is', null)
          .order('updated_at', { ascending: false })
          .limit(10);
        if (updErr) throw updErr;
        updated = upd || [];
      } catch (e) {
        console.warn('Error fetching updated questions', (e as Error)?.message);
      }

      return { created, updated };
    } catch (e) {
      console.error('getRecentQuestionsActivity error (outer):', e);
      return { created: [], updated: [] };
    }
  },

  // New: create exam_page
  async createExamPage(payload: CreateExamPageInput) {
    try {
      if(!payload.exam_code || !payload.exam_name) throw new Error('exam_code & exam_name required');
      const defaults = {
        vendor: null,
        is_active: true,
        is_featured: false,
        difficulty_level: null,
        display_order: null,
        header_label: null,
        url_path: null,
        icon_name: null,
        seo_title: null,
        seo_h1: null,
        seo_meta_description: null,
        seo_keywords: null,
        seo_canonical_url: null,
        seo_google_snippet: null,
        estimated_duration: null
      };
      const insert = { ...defaults, ...payload };
      const { data, error } = await supabase
        .from('exam_pages')
        .insert(insert)
        .select('*')
        .single();
      if(error) throw new Error(error.message);
      return data;
    } catch(e) {
      console.error('createExamPage error:', e);
      throw e;
    }
  },
};
