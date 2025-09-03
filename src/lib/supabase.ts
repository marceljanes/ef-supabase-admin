import { createClient } from '@supabase/supabase-js';
import { Question as BaseQuestion, ExamPage as BaseExamPage, ExamCategory as BaseExamCategory, Answer, Knowledge, KnowledgeChunk, UserProfile, FreelancerProject, FreelancerProposal, ProjectCategory, ProjectType, ProjectStatus, ProposalStatus } from '@/types/database';

// Local helper types (DB uses numeric ids for questions often)
export interface QuestionLike extends Omit<BaseQuestion,'id'> { id: number | string; }
// inactive optional to allow payloads without explicit inactive value
export interface UpdateQuestionPayload { id: number | string; question: string; answers: Answer[]; explanation: string; category?: string | null; level: string; exam_code: string; inactive?: boolean; }
// Allow nullable updates for all ExamPage fields, require id
type ExamPageNullableUpdate = { [K in keyof BaseExamPage]?: BaseExamPage[K] | null };
export type ExamPageUpdate = { id: number } & ExamPageNullableUpdate;
export type NewExamCategory = Partial<{ [K in keyof BaseExamCategory]: BaseExamCategory[K] | null }> & { exam_code: string; category_name: string };
export type InsertQuestionPayload = Partial<QuestionLike> & { question: string; answers: Answer[]; explanation: string; level: string; exam_code: string; category?: string | null; created_by?: string | null };
export type CreateExamPageInput = Partial<BaseExamPage> & { exam_code: string; exam_name: string };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wzhkbmevwfiwndrrwbjl.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6aGtibWV2d2Zpd25kcnJ3YmpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTM4NDUsImV4cCI6MjA3MTE2OTg0NX0.AwqQTwnbJTVYFCzho1PN8sqc5FRh_1pclzBBWDRc5Vs';

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'your_supabase_project_url') {
  console.error('Missing or invalid Supabase configuration:', {
    url: supabaseUrl,
    hasKey: !!supabaseAnonKey
  });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'ef-supabase-auth-token',
    flowType: 'pkce'
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

      // Count questions without category
      const { count: noCategoryCount, error: noCategoryError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .or('category.is.null,category.eq.');

      if (noCategoryError) {
        console.error('Error counting questions without category:', noCategoryError);
      }

      // Count recently updated questions (last 6 months, updated_at > created_at)
      // Use same logic as admin tab - fetch data and filter in JavaScript
      let recentlyUpdatedCount = 0;
      try {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        const { data: updatedQuestions, error: updatedError } = await supabase
          .from('questions')
          .select('updated_at, created_at')
          .not('updated_at', 'is', null)
          .not('created_at', 'is', null)
          .gte('updated_at', sixMonthsAgo.toISOString());

        if (updatedError) {
          console.error('Error fetching recently updated questions:', updatedError);
        } else {
          // Apply same filtering logic as admin tab
          const FIVE_MIN = 5 * 60 * 1000;
          const filteredUpdated = (updatedQuestions || []).filter((q: any) => {
            if (!q.updated_at || isNaN(Date.parse(q.updated_at))) return false;
            if (!q.created_at || isNaN(Date.parse(q.created_at))) return false;
            const diff = new Date(q.updated_at).getTime() - new Date(q.created_at).getTime();
            if (diff < 0) return false; // corrupted timestamps
            if (diff < FIVE_MIN) return false; // exclude updates within first 5 minutes of creation
            return true;
          });
          recentlyUpdatedCount = filteredUpdated.length;
        }
      } catch (e) {
        console.error('Error counting recently updated questions:', e);
      }

      const stats = {
        ...baseCounts,
        activeExams: activeExamCountValue || Math.floor(baseCounts.totalExams * 0.7), // Fallback to 70% if no status/is_active field
        questionsWithoutCategory: noCategoryCount || 0,
        recentlyUpdatedQuestions: recentlyUpdatedCount || 0
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
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });

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
      
      // Get questions first
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });

      if (questionsError) {
        throw new Error(`Error fetching questions: ${questionsError.message}`);
      }

      if (!questions || questions.length === 0) {
        return [];
      }

      // Get unique created_by IDs
      const creatorIds = [...new Set(questions.map(q => q.created_by).filter(Boolean))];
      console.log('Found creator IDs:', creatorIds);

      // Get user profiles for these IDs
      const userProfiles: { [key: string]: { full_name?: string; email?: string } } = {};
      
      if (creatorIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('id, full_name, email')
          .in('id', creatorIds);

        if (profilesError) {
          console.error('Error fetching user profiles:', profilesError);
        } else {
          // Create lookup object
          (profiles || []).forEach(profile => {
            userProfiles[profile.id] = {
              full_name: profile.full_name,
              email: profile.email
            };
          });
          console.log('User profiles lookup:', userProfiles);
        }
      }

      // Combine questions with creator info
      const questionsWithCreators = questions.map(question => ({
        ...question,
        creator: question.created_by ? userProfiles[question.created_by] || null : null
      }));

      console.log(`Fetched ${questionsWithCreators.length} questions with creator info`);
      
      // Debug sample
      if (questionsWithCreators.length > 0) {
        const sample = questionsWithCreators[0];
        console.log('Sample question with creator:', {
          id: sample.id,
          created_by: sample.created_by,
          creator: sample.creator,
          creator_full_name: sample.creator?.full_name
        });
      }

      return questionsWithCreators;
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
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });

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
      
      // Get questions first
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_code', examCode)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });

      if (questionsError) {
        throw new Error(`Error fetching questions for exam code ${examCode}: ${questionsError.message}`);
      }

      if (!questions || questions.length === 0) {
        return [];
      }

      // Get unique created_by IDs
      const creatorIds = [...new Set(questions.map(q => q.created_by).filter(Boolean))];
      console.log('Found creator IDs for exam code:', examCode, creatorIds);

      // Get user profiles for these IDs
      const userProfiles: { [key: string]: { full_name?: string; email?: string } } = {};
      
      if (creatorIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('id, full_name, email')
          .in('id', creatorIds);

        if (profilesError) {
          console.error('Error fetching user profiles for exam code:', examCode, profilesError);
        } else {
          // Create lookup object
          (profiles || []).forEach(profile => {
            userProfiles[profile.id] = {
              full_name: profile.full_name,
              email: profile.email
            };
          });
          console.log('User profiles lookup for exam code:', examCode, userProfiles);
        }
      }

      // Combine questions with creator info
      const questionsWithCreators = questions.map(question => ({
        ...question,
        creator: question.created_by ? userProfiles[question.created_by] || null : null
      }));

      console.log(`Fetched ${questionsWithCreators.length} questions with creator info for exam code: ${examCode}`);
      
      return questionsWithCreators;
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
      // Get current user to set created_by field
      const currentUser = await this.getCurrentUser();
      
      // Ensure created_at is always set on creation (single or bulk loop usage)
      const payload = { ...question };
      if (!('created_at' in payload) || !payload.created_at) {
        payload.created_at = new Date().toISOString();
      }
      
      // Set created_by field if not already provided and user is authenticated
      if (currentUser && !payload.created_by) {
        payload.created_by = currentUser.id;
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
      
      // Check if exam_code already exists
      const { data: existingExam, error: checkError } = await supabase
        .from('exam_pages')
        .select('exam_code')
        .ilike('exam_code', payload.exam_code)
        .limit(1);
      
      if (checkError) {
        throw new Error(`Error checking exam code uniqueness: ${checkError.message}`);
      }
      
      if (existingExam && existingExam.length > 0) {
        throw new Error(`Exam code "${payload.exam_code}" already exists`);
      }
      
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

  async upsertQuestionEmbedding(id: string | number, embedding: number[]) {
    try {
      const { error } = await supabase
        .from('questions')
        .update({ embedding })
        .eq('id', id);
      if (error) throw new Error(`Error updating embedding: ${error.message}`);
      return true;
    } catch (e) {
      console.error('upsertQuestionEmbedding error:', e);
      throw e;
    }
  },

  async semanticSearch(queryEmbedding: number[], matchCount = 10, similarityThreshold = 0.6) {
    try {
      const { data, error } = await supabase.rpc('match_questions', {
        query_embedding: queryEmbedding,
        match_count: matchCount,
        similarity_threshold: similarityThreshold
      });
      if (error) throw new Error(`semanticSearch RPC error: ${error.message}`);
      return data || [];
    } catch (e) {
      console.error('semanticSearch error:', e);
      throw e;
    }
  },

  // Knowledge Management Functions
  async getKnowledge(options: { 
    page?: number; 
    limit?: number; 
    category?: string; 
    search?: string;
    includeChunks?: boolean;
  } = {}) {
    try {
      const { page = 1, limit = 20, category, search, includeChunks = false } = options;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('knowledge')
        .select('*')
        .order('updated_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%, description.ilike.%${search}%, content.ilike.%${search}%`);
      }

      const { data, error, count } = await query
        .range(offset, offset + limit - 1)
        .limit(limit);

      if (error) throw new Error(error.message);

      const { count: totalCount } = await supabase
        .from('knowledge')
        .select('*', { count: 'exact', head: true });

      return {
        data: data || [],
        total: totalCount || 0,
        page,
        limit,
        totalPages: Math.ceil((totalCount || 0) / limit)
      };
    } catch (e) {
      console.error('getKnowledge error:', e);
      throw e;
    }
  },

  async getKnowledgeById(id: number) {
    try {
      const { data, error } = await supabase
        .from('knowledge')
        .select(`
          *,
          chunks:knowledge_chunks(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw new Error(error.message);
      return data;
    } catch (e) {
      console.error('getKnowledgeById error:', e);
      throw e;
    }
  },

  async createKnowledge(payload: Partial<Knowledge> & { title: string; content: string }) {
    try {
      const { data, error } = await supabase
        .from('knowledge')
        .insert({
          title: payload.title,
          description: payload.description || null,
          content: payload.content,
          category: payload.category || null,
          tags: payload.tags || null,
          is_active: payload.is_active ?? true,
          created_by: payload.created_by || 'admin',
          document_type: payload.document_type || 'text',
          file_path: payload.file_path || null
        })
        .select('*')
        .single();

      if (error) throw new Error(error.message);
      return data;
    } catch (e) {
      console.error('createKnowledge error:', e);
      throw e;
    }
  },

  async updateKnowledge(id: number, payload: Partial<Knowledge>) {
    try {
      const { data, error } = await supabase
        .from('knowledge')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw new Error(error.message);
      return data;
    } catch (e) {
      console.error('updateKnowledge error:', e);
      throw e;
    }
  },

  async deleteKnowledge(id: number) {
    try {
      const { error } = await supabase
        .from('knowledge')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
      return true;
    } catch (e) {
      console.error('deleteKnowledge error:', e);
      throw e;
    }
  },

  async getKnowledgeChunks(knowledgeId: number) {
    try {
      const { data, error } = await supabase
        .from('knowledge_chunks')
        .select('*')
        .eq('knowledge_id', knowledgeId)
        .order('chunk_order');

      if (error) throw new Error(error.message);
      return data || [];
    } catch (e) {
      console.error('getKnowledgeChunks error:', e);
      throw e;
    }
  },

  async createKnowledgeChunk(payload: Partial<KnowledgeChunk> & { knowledge_id: number; content: string }) {
    try {
      const { data, error } = await supabase
        .from('knowledge_chunks')
        .insert({
          knowledge_id: payload.knowledge_id,
          chunk_order: payload.chunk_order || 1,
          title: payload.title || null,
          content: payload.content,
          chunk_type: payload.chunk_type || 'text'
        })
        .select('*')
        .single();

      if (error) throw new Error(error.message);
      return data;
    } catch (e) {
      console.error('createKnowledgeChunk error:', e);
      throw e;
    }
  },

  async updateKnowledgeChunk(id: number, payload: Partial<KnowledgeChunk>) {
    try {
      const { data, error } = await supabase
        .from('knowledge_chunks')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw new Error(error.message);
      return data;
    } catch (e) {
      console.error('updateKnowledgeChunk error:', e);
      throw e;
    }
  },

  async deleteKnowledgeChunk(id: number) {
    try {
      const { error } = await supabase
        .from('knowledge_chunks')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
      return true;
    } catch (e) {
      console.error('deleteKnowledgeChunk error:', e);
      throw e;
    }
  },

  async getKnowledgeCategories() {
    try {
      const { data, error } = await supabase
        .from('knowledge')
        .select('category')
        .not('category', 'is', null);

      if (error) throw new Error(error.message);
      
      const categories = [...new Set(data?.map(item => item.category).filter(Boolean))];
      return categories.sort();
    } catch (e) {
      console.error('getKnowledgeCategories error:', e);
      throw e;
    }
  },

  // User Management Functions
  async getUsers() {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    } catch (e) {
      console.error('getUsers error:', e);
      return [];
    }
  },

  async getUserById(id: string) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw new Error(error.message);
      return data;
    } catch (e) {
      console.error('getUserById error:', e);
      throw e;
    }
  },

  async updateUser(id: string, payload: Partial<UserProfile>) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw new Error(error.message);
      return data;
    } catch (e) {
      console.error('updateUser error:', e);
      throw e;
    }
  },

  async deleteUser(id: string) {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
      return true;
    } catch (e) {
      console.error('deleteUser error:', e);
      throw e;
    }
  },

  async approveUser(userId: string, approverId: string) {
    try {
      const { error } = await supabase.rpc('approve_user', {
        user_id: userId,
        approver_id: approverId
      });

      if (error) throw new Error(error.message);
      return true;
    } catch (e) {
      console.error('approveUser error:', e);
      throw e;
    }
  },

  async rejectUser(userId: string, approverId: string, reason: string) {
    try {
      const { error } = await supabase.rpc('reject_user', {
        user_id: userId,
        approver_id: approverId,
        reason: reason
      });

      if (error) throw new Error(error.message);
      return true;
    } catch (e) {
      console.error('rejectUser error:', e);
      throw e;
    }
  },

  async getPendingUsers() {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw new Error(error.message);
      return data || [];
    } catch (e) {
      console.error('getPendingUsers error:', e);
      return [];
    }
  },

  // Storage functions for image uploads
  async uploadImage(file: File, path: string = 'knowledge-images') {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${path}/${fileName}`;

      console.log('Uploading image:', { fileName, filePath, fileSize: file.size });

      const { data, error } = await supabase.storage
        .from('images') // You'll need to create this bucket in Supabase
        .upload(filePath, file);

      if (error) throw new Error(`Upload error: ${error.message}`);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      console.log('Image uploaded successfully:', { filePath, publicUrl });
      
      return {
        path: filePath,
        url: publicUrl,
        fileName: fileName
      };
    } catch (e) {
      console.error('uploadImage error:', e);
      throw e;
    }
  },

  async deleteImage(filePath: string) {
    try {
      const { error } = await supabase.storage
        .from('images')
        .remove([filePath]);

      if (error) throw new Error(`Delete error: ${error.message}`);
      return true;
    } catch (e) {
      console.error('deleteImage error:', e);
      throw e;
    }
  },

  // Auth functions
  async signUp(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw new Error(error.message);
      return data;
    } catch (e) {
      console.error('signUp error:', e);
      throw e;
    }
  },

  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw new Error(error.message);
      return data;
    } catch (e) {
      console.error('signIn error:', e);
      throw e;
    }
  },

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message);
      return true;
    } catch (e) {
      console.error('signOut error:', e);
      throw e;
    }
  },

  async getCurrentUser() {
    try {
      // Extended timeout for online stability
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Auth timeout')), 15000)
      );
      
      const sessionPromise = supabase.auth.getSession();
      
      const { data: { session }, error } = await Promise.race([
        sessionPromise,
        timeoutPromise
      ]) as any;
      
      if (error) {
        console.error('Session error:', error);
        // Try to refresh session on error
        try {
          const { data: refreshedSession, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && refreshedSession?.user) {
            console.log('Session refreshed successfully');
            return refreshedSession.user;
          }
        } catch (refreshErr) {
          console.error('Session refresh failed:', refreshErr);
        }
        return null;
      }
      
      if (!session?.user) {
        console.log('No active session found');
        return null;
      }
      
      console.log('Auth user found:', session.user.email);
      return session.user;
    } catch (e) {
      console.error('getCurrentUser error:', e);
      return null;
    }
  },

  async getCurrentUserProfile() {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        console.log('No authenticated user, cannot fetch profile');
        return null;
      }

      console.log('Fetching profile for user:', user.email);
      
      // Extended timeout for database queries
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database timeout')), 15000)
      );
      
      const profilePromise = supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const { data, error } = await Promise.race([
        profilePromise,
        timeoutPromise
      ]) as any;

      if (error) {
        console.error('Error fetching user profile:', error);
        
        // If profile doesn't exist, create a default one for testing
        if (error.code === 'PGRST116' || error.message.includes('No rows returned')) {
          console.log('No profile found, creating default admin profile for:', user.email);
          return {
            id: user.id,
            email: user.email || '',
            status: 'approved' as const,
            role: 'admin' as const,
            full_name: user.email || 'Admin User',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }
        
        return null;
      }

      console.log('Profile found:', data);
      return data;
    } catch (e) {
      console.error('getCurrentUserProfile error:', e);
      
      // Fallback: if there's an error, return a default admin profile
      const user = await this.getCurrentUser();
      if (user) {
        console.log('Using fallback admin profile for:', user.email);
        return {
          id: user.id,
          email: user.email || '',
          status: 'approved' as const,
          role: 'admin' as const,
          full_name: user.email || 'Admin User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
      
      return null;
    }
  },

  // Task Management Functions
  async getTasks() {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          author:author_id(id, email, full_name),
          assignee:assignee_id(id, email, full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    } catch (e) {
      console.error('getTasks error:', e);
      throw e;
    }
  },

  async createTask(task: {
    title: string;
    description?: string;
    assignee_id?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    exam_code?: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'mixed';
    due_date?: string;
    tags?: string[];
  }) {
    try {
      // Get the authenticated user (for the ID)
      const user = await this.getCurrentUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get the user profile (for role/status checks)
      const userProfile = await this.getCurrentUserProfile();
      
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // Check if user has permission to create tasks
      const canCreateTasks = (userProfile.role === 'admin' || userProfile.role === 'superadmin') && 
                            userProfile.status === 'approved';

      if (!canCreateTasks) {
        throw new Error('Insufficient permissions to create tasks');
      }

      const taskToInsert = {
        ...task,
        author_id: user.id,
        status: 'idea'
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(taskToInsert)
        .select(`
          *,
          author:author_id(id, email, full_name),
          assignee:assignee_id(id, email, full_name)
        `)
        .single();

      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    } catch (e) {
      console.error('createTask error:', e);
      throw e;
    }
  },

  async updateTaskStatus(taskId: string, status: 'idea' | 'demand' | 'in-progress' | 'done') {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId)
        .select(`
          *,
          author:author_id(id, email, full_name),
          assignee:assignee_id(id, email, full_name)
        `)
        .single();

      if (error) throw new Error(error.message);
      return data;
    } catch (e) {
      console.error('updateTaskStatus error:', e);
      throw e;
    }
  },

  async updateTask(taskId: string, updates: {
    title?: string;
    description?: string;
    assignee_id?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    exam_code?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'mixed';
    due_date?: string;
    tags?: string[];
  }) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select(`
          *,
          author:author_id(id, email, full_name),
          assignee:assignee_id(id, email, full_name)
        `)
        .single();

      if (error) throw new Error(error.message);
      return data;
    } catch (e) {
      console.error('updateTask error:', e);
      throw e;
    }
  },

  async deleteTask(taskId: string) {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw new Error(error.message);
      return true;
    } catch (e) {
      console.error('deleteTask error:', e);
      throw e;
    }
  },

  // Freelancer Project Management Functions
  async getFreelancerProjects() {
    try {
      const { data, error } = await supabase
        .from('freelancer_projects')
        .select(`
          *,
          client:client_id(id, email, full_name),
          freelancer:freelancer_id(id, email, full_name),
          proposal_count:freelancer_proposals(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    } catch (e) {
      console.error('getFreelancerProjects error:', e);
      throw e;
    }
  },

  async createFreelancerProject(project: {
    title: string;
    description: string;
    category: ProjectCategory;
    budget_min?: number;
    budget_max?: number;
    currency?: 'EUR' | 'USD' | 'CHF';
    deadline?: string;
    skills_required?: string[];
    project_type: ProjectType;
    remote_allowed?: boolean;
    location?: string;
  }) {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('freelancer_projects')
        .insert({
          ...project,
          client_id: user.id,
          currency: project.currency || 'EUR',
          remote_allowed: project.remote_allowed ?? true
        })
        .select(`
          *,
          client:client_id(id, email, full_name),
          freelancer:freelancer_id(id, email, full_name)
        `)
        .single();

      if (error) throw new Error(error.message);
      return data;
    } catch (e) {
      console.error('createFreelancerProject error:', e);
      throw e;
    }
  },

  async updateFreelancerProject(projectId: string, updates: {
    title?: string;
    description?: string;
    category?: ProjectCategory;
    budget_min?: number;
    budget_max?: number;
    deadline?: string;
    skills_required?: string[];
    project_type?: ProjectType;
    remote_allowed?: boolean;
    location?: string;
    status?: ProjectStatus;
    freelancer_id?: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('freelancer_projects')
        .update(updates)
        .eq('id', projectId)
        .select(`
          *,
          client:client_id(id, email, full_name),
          freelancer:freelancer_id(id, email, full_name)
        `)
        .single();

      if (error) throw new Error(error.message);
      return data;
    } catch (e) {
      console.error('updateFreelancerProject error:', e);
      throw e;
    }
  },

  async deleteFreelancerProject(projectId: string) {
    try {
      const { error } = await supabase
        .from('freelancer_projects')
        .delete()
        .eq('id', projectId);

      if (error) throw new Error(error.message);
      return true;
    } catch (e) {
      console.error('deleteFreelancerProject error:', e);
      throw e;
    }
  },

  async getFreelancerProposals(projectId?: string) {
    try {
      let query = supabase
        .from('freelancer_proposals')
        .select(`
          *,
          project:project_id(id, title, category, budget_min, budget_max, currency),
          freelancer:freelancer_id(id, email, full_name)
        `)
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw new Error(error.message);
      return data || [];
    } catch (e) {
      console.error('getFreelancerProposals error:', e);
      throw e;
    }
  },

  async createFreelancerProposal(proposal: {
    project_id: string;
    proposal_text: string;
    proposed_budget?: number;
    proposed_timeline?: number;
  }) {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('freelancer_proposals')
        .insert({
          ...proposal,
          freelancer_id: user.id
        })
        .select(`
          *,
          project:project_id(id, title, category, budget_min, budget_max, currency),
          freelancer:freelancer_id(id, email, full_name)
        `)
        .single();

      if (error) throw new Error(error.message);
      return data;
    } catch (e) {
      console.error('createFreelancerProposal error:', e);
      throw e;
    }
  },

  async updateProposalStatus(proposalId: string, status: ProposalStatus) {
    try {
      const { data, error } = await supabase
        .from('freelancer_proposals')
        .update({ status })
        .eq('id', proposalId)
        .select(`
          *,
          project:project_id(id, title, category, budget_min, budget_max, currency),
          freelancer:freelancer_id(id, email, full_name)
        `)
        .single();

      if (error) throw new Error(error.message);
      return data;
    } catch (e) {
      console.error('updateProposalStatus error:', e);
      throw e;
    }
  },
};
