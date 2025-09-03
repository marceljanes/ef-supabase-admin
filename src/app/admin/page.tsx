'use client';

import { useState, useEffect } from 'react';
import { dbService } from '@/lib/supabase';
import { Question } from '@/types/database';
import { DashboardStats, DeletingState, ExamPage } from '@/types/admin';
import { useAuth } from '@/components/AuthProvider';
import Header from '@/components/Header';
import StatCard from '@/components/StatCard';
import QuickActionCard from '@/components/QuickActionCard';
import QuestionsList from '@/components/QuestionsList';
import QuestionEditor from '@/components/QuestionEditor';
import Filters from '@/components/Filters';
import ExamsTable from '@/components/ExamsTable';
import ExamCategoriesManager from '@/components/ExamCategoriesManager';
import InsertQuestionModal from '@/components/InsertQuestionModal';
import QuestionPromptBuilder from '@/components/QuestionPromptBuilder';
import UpdateQuestions from '@/components/UpdateQuestions';
import ExamTrainer from '@/components/ExamTrainer';
import PMI from '@/components/PMI';
import KnowledgeManager from '@/components/KnowledgeManager/index';
import UserManager from '@/components/UserManager';
import { 
  BookOpen, 
  HelpCircle, 
  FolderOpen, 
  TrendingUp,
  Activity,
  Star,
  Eye,
  Plus,
  Filter,
  Sun,
  Moon,
  Users,
  Kanban,
  Brain,
  Briefcase
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedExamCode, setSelectedExamCode] = useState<string>('');
  const [availableExamCodes, setAvailableExamCodes] = useState<string[]>([]);
  const [searchText, setSearchText] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [showRecentlyUpdated, setShowRecentlyUpdated] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [saving, setSaving] = useState(false);
  const [examCategories, setExamCategories] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<DeletingState>({});
  const [examPages, setExamPages] = useState<ExamPage[]>([]);
  const [examPagesLoading, setExamPagesLoading] = useState(false);
  const [showInsertQuestion, setShowInsertQuestion] = useState(false);
  const [createMode, setCreateMode] = useState<'one'|'multiple'>('one');
  const [recentCreated, setRecentCreated] = useState<any[]>([]);
  const [recentUpdated, setRecentUpdated] = useState<any[]>([]);
  const [flash, setFlash] = useState<{ type: 'success' | 'error'; message: string; ts: number } | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [trainerTheme, setTrainerTheme] = useState<'dark'|'light'>('dark');
  
  // Client-side filtering and pagination
  const questionsPerPage = 20;
  let filteredQuestions = selectedExamCode === '' 
    ? [] 
    : allQuestions.filter(q => q.exam_code === selectedExamCode);
  
  // Apply category filter if a specific category is selected
  if (selectedCategory !== '') {
    filteredQuestions = filteredQuestions.filter(q => q.category === selectedCategory);
  }
  
  // Apply recently updated filter (last 6 months)
  if (showRecentlyUpdated) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const FIVE_MIN = 5 * 60 * 1000;
    
    filteredQuestions = filteredQuestions.filter(q => {
      if (!q.updated_at || !q.created_at) return false;
      if (isNaN(Date.parse(q.updated_at)) || isNaN(Date.parse(q.created_at))) return false;
      
      const updatedDate = new Date(q.updated_at);
      const createdDate = new Date(q.created_at);
      
      // Check if updated in last 6 months
      if (updatedDate < sixMonthsAgo) return false;
      
      // Exclude updates within first 5 minutes of creation (unless corrupted timestamps)
      const diff = updatedDate.getTime() - createdDate.getTime();
      if (diff >= 0 && diff < FIVE_MIN) return false;
      
      return true;
    });
  }
  
  // Apply text search filter if search text is provided
  if (searchText.trim() !== '') {
    filteredQuestions = filteredQuestions.filter(q => 
      q.question?.toLowerCase().includes(searchText.toLowerCase()) ||
      (q.answers && q.answers.some(answer => 
        answer.text?.toLowerCase().includes(searchText.toLowerCase())
      )) ||
      (q.explanation && q.explanation.toLowerCase().includes(searchText.toLowerCase()))
    );
  }

  useEffect(() => {
    loadDashboardStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'questions') {
      setCurrentPage(1);
      setSelectedExamCode('');
      setAllQuestions([]); // Clear questions
      loadExamCodes();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'exams') {
      loadExamPages();
    }
  }, [activeTab]);

  useEffect(()=>{ (async()=>{ try { const act = await dbService.getRecentQuestionsActivity();
    const createdWithTs = (act.created||[]).filter((q:any)=> q.created_at && !isNaN(Date.parse(q.created_at)));
    const FIVE_MIN = 5 * 60 * 1000;
    const updatedFiltered = (act.updated||[]).filter((q:any)=> {
      if(!q.updated_at || isNaN(Date.parse(q.updated_at))) return false; // must have valid updated_at
      if(!q.created_at || isNaN(Date.parse(q.created_at))) return false; // require valid created_at to count as an update (prevents new creations from appearing here)
      const diff = new Date(q.updated_at).getTime() - new Date(q.created_at).getTime();
      if(diff < 0) {
        console.warn('Corrupted timestamps found for question:', q.id, 'updated_at before created_at');
        return true; // Include corrupted entries but mark them
      }
      if(diff < FIVE_MIN) return false; // exclude updates within first 5 minutes of creation
      return true;
    });
    setRecentCreated(createdWithTs);
    setRecentUpdated(updatedFiltered);
  } catch(e){ console.warn('recent activity load failed', e);} })(); }, [activeTab]);

  const loadExamCodes = async () => {
    try {
      console.log('Loading exam codes separately...');
      const examCodes = await dbService.getExamCodes();
      console.log('Exam codes loaded separately:', examCodes);
      setAvailableExamCodes(examCodes);
    } catch (error) {
      console.error('Error loading exam codes:', error);
    }
  };

  const loadDashboardStats = async () => {
    try {
      setError(null);
      console.log('Loading dashboard stats...');
      const data = await dbService.getDashboardStats();
      console.log('Stats loaded successfully:', data);
      setStats(data);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      setError('Failed to load dashboard data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const loadQuestionsForExamCode = async (examCode: string) => {
    try {
      setQuestionsLoading(true);
      console.log('Loading questions for exam code:', examCode);
      
      // Load questions for specific exam code directly
      const questions = await dbService.getQuestionsByExamCode(examCode);
      console.log('Questions loaded for exam code:', examCode, questions.length);
      setAllQuestions(questions);
      
      // Extract unique categories from loaded questions
      const categories = [...new Set(questions
        .map((q: any) => q.category)
        .filter((category: any) => category && category.trim() !== '')
      )].sort() as string[];
      console.log('Available categories for', examCode, ':', categories);
      setAvailableCategories(categories);
      setSelectedCategory(''); // Reset category filter

      // Load valid categories from exam_categories table for validation
      await loadExamCategories(examCode);
    } catch (error) {
      console.error('Error loading questions:', error);
      setError('Failed to load questions data. Please check your connection.');
    } finally {
      setQuestionsLoading(false);
    }
  };

  const loadExamPages = async () => {
    try {
      setExamPagesLoading(true);
      const data = await dbService.getExamPages();
      setExamPages(data);
    } catch (e) {
      console.error('Error loading exam pages', e);
    } finally {
      setExamPagesLoading(false);
    }
  };

  const openQuestionEditor = (question: Question) => {
    setEditingQuestion({ ...question }); // Create a copy for editing
    // Load categories for the exam code
    loadExamCategories(question.exam_code || '');
  };

  const loadExamCategories = async (examCode: string) => {
    if (!examCode) return;
    
    try {
      console.log('Loading categories for exam code:', examCode);
      const categories = await dbService.getCategoriesByExamCode(examCode);
      console.log('Categories loaded:', categories);
      setExamCategories(categories);
    } catch (error) {
      console.error('Error loading exam categories:', error);
      setExamCategories([]);
    }
  };

  const closeQuestionEditor = () => {
    setEditingQuestion(null);
  };

  const saveQuestion = async (question: Question) => {
    try {
      setSaving(true);
      console.log('Saving question:', question);
      const updated = await dbService.updateQuestion(question);
      setAllQuestions(prev =>
        prev.map(q => q.id === question.id ? { ...q, ...question, updated_at: updated?.updated_at } : q)
      );
      console.log('Question saved successfully');
      // Dispatch flash confirmation
      window.dispatchEvent(new CustomEvent('question-flash', { detail: { type: 'success', message: 'Question got saved.' }}));
      closeQuestionEditor();
    } catch (error) {
      console.error('Error saving question:', error);
      setError('Failed to save question. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      return;
    }
    
    try {
      setDeleting(prev => ({ ...prev, [questionId]: true }));
      console.log('Deleting question:', questionId);
      
      // Call the backend to delete the question
      await dbService.deleteQuestion(questionId);
      
      // Update the local state
      setAllQuestions(prev => prev.filter(q => q.id !== questionId));
      
      console.log('Question deleted successfully');
      if (editingQuestion?.id === questionId) {
        closeQuestionEditor();
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      setError('Failed to delete question. Please try again.');
    } finally {
      setDeleting(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const updateExamPage = async (page: Partial<ExamPage> & { id: number }) => {
    try {
      const updated = await dbService.updateExamPage(page);
      setExamPages(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
    } catch (e) {
      console.error('Failed to update exam page', e);
      alert('Update failed');
    }
  };

  useEffect(()=>{
    const handler = (e: any) => {
      if(!e?.detail?.message) return;
      setFlash({ type: e.detail.type || 'success', message: e.detail.message, ts: Date.now() });
      setTimeout(()=> setFlash(f => (f && Date.now()-f.ts > 3900) ? null : f), 4000);
    };
    window.addEventListener('question-flash', handler as any);
    return ()=> window.removeEventListener('question-flash', handler as any);
  },[]);

  const openRecentQuestion = async (meta: any) => {
    try {
      // Switch to questions tab so editor context & lists align
      if(activeTab !== 'questions') {
        setActiveTab('questions');
      }
      const qs = await dbService.getQuestionsByExamCode(meta.exam_code);
      const full = qs.find((x: any) => x.id === meta.id);
      if (full) {
        openQuestionEditor(full as Question);
      } else {
        window.dispatchEvent(new CustomEvent('question-flash', { detail: { type: 'error', message: 'Question not found.' }}));
      }
    } catch (e) {
      console.error('Failed to load recent question', e);
      window.dispatchEvent(new CustomEvent('question-flash', { detail: { type: 'error', message: 'Load failed.' }}));
    }
  };

  useEffect(()=>{
    const listener = async (e:any) => {
      if(!e?.detail) return;
      try {
        const created = await dbService.createExamPage(e.detail);
        setExamPages(prev => [...prev, created]);
        window.dispatchEvent(new CustomEvent('question-flash', { detail: { type:'success', message: `Exam ${created.exam_code} created.` }}));
      } catch(err:any){
        window.dispatchEvent(new CustomEvent('question-flash', { detail: { type:'error', message: err.message || 'Create failed' }}));
      }
    };
    window.addEventListener('create-exam', listener as any);
    return ()=> window.removeEventListener('create-exam', listener as any);
  },[]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border border-zinc-600 border-t-white mx-auto mb-4"></div>
          <p className="text-sm text-zinc-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-800 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-zinc-900 border border-red-700 rounded-lg p-6 max-w-md">
            <h2 className="text-lg font-medium text-red-400 mb-2">Connection Error</h2>
            <p className="text-sm text-red-300 mb-4">{error}</p>
            <button 
              onClick={loadDashboardStats}
              className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-md transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900">
      <Header />
      <div className={`min-h-screen transition-colors duration-500 ${
        activeTab==='trainer'
            ? (trainerTheme==='light'
                ? 'bg-gradient-to-br from-zinc-100 via-white to-zinc-200'
                : 'bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800')
            : 'bg-zinc-800'
        }`}>
      {/* Navigation Tabs */}
      <div className="bg-zinc-900 border-b border-zinc-700">
        {/* Flash Message */}
        {flash && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-md border text-sm shadow-lg backdrop-blur bg-zinc-900/80 border-green-500/40 text-green-300 animate-fade-in">
            {flash.message}
          </div>
        )}
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex space-x-2">
            {[
              { id: 'overview', label: 'Dashboard', icon: <TrendingUp className="h-2.5 w-2.5" /> },
              { id: 'questions', label: 'Questions', icon: <HelpCircle className="h-2.5 w-2.5" /> },
              { id: 'exams', label: 'Exams', icon: <BookOpen className="h-2.5 w-2.5" /> },
              { id: 'knowledge', label: 'Knowledge', icon: <Brain className="h-2.5 w-2.5" /> },
              { id: 'users', label: 'Users', icon: <Users className="h-2.5 w-2.5" /> },
              { id: 'categories', label: 'Categories', icon: <FolderOpen className="h-2.5 w-2.5" /> },
              { id: 'pmi', label: 'PMI', icon: <Kanban className="h-2.5 w-2.5" /> },
              { id: 'create', label: 'Create', icon: <Plus className="h-2.5 w-2.5" /> },
              { id: 'update', label: 'Update', icon: <Filter className="h-2.5 w-2.5" /> },
              { id: 'trainer', label: 'Trainer', icon: <Activity className="h-2.5 w-2.5" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-2 border-b-2 transition-colors text-sm ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-500'
                    : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-400'
                }`}
              >
                {tab.icon && tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {showInsertQuestion && (
          <InsertQuestionModal onClose={()=>{ setShowInsertQuestion(false); }} />
        )}

        {/* Dashboard Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard
                title="Total Exams"
                value={stats.totalExams}
                icon={BookOpen}
                change={"+2 this week"}
                trend="up"
              />
              <StatCard
                title="Total Questions"
                value={stats.totalQuestions}
                icon={HelpCircle}
                change={"+15 this week"}
                trend="up"
              />
              <StatCard
                title="Active Exams"
                value={stats.activeExams}
                icon={Activity}
                change={"1 activated today"}
                trend="up"
              />
              <StatCard
                title="Categories"
                value={stats.totalCategories}
                icon={FolderOpen}
                change={"No change"}
                trend="neutral"
              />
              <StatCard
                title="Questions ohne Category"
                value={stats.questionsWithoutCategory}
                icon={Star}
                change={stats.questionsWithoutCategory === 0 ? "Alle haben Category" : "Need attention"}
                trend={stats.questionsWithoutCategory === 0 ? "up" : "down"}
              />
              <StatCard
                title="Recently Updated Questions"
                value={stats.recentlyUpdatedQuestions}
                icon={Eye}
                change={stats.recentlyUpdatedQuestions > 0 ? `${stats.recentlyUpdatedQuestions} in last 6 months` : "No recent updates"}
                trend={stats.recentlyUpdatedQuestions > 0 ? "up" : "neutral"}
              />
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-lg font-medium text-white mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Removed Add Exam card */}
                <QuickActionCard
                  icon={Plus}
                  title="Add Question"
                  description="Create a new exam question"
                  onClick={() => { setActiveTab('create'); setCreateMode('one'); setShowInsertQuestion(true); }}
                  color="bg-blue-700"
                />
                {/* Removed 'Search Content' Quick Action */}
                <QuickActionCard
                  icon={Filter}
                  title="Bulk Operations"
                  description="Perform bulk updates and maintenance"
                  onClick={() => { setShowBulkModal(true); }}
                  color="bg-zinc-700"
                />
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h2 className="text-lg font-medium text-white mb-4">Recent Activity</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-zinc-900 border border-zinc-700 rounded-lg">
                  <div className="p-4 border-b border-zinc-700 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Newly Created (latest 10)</h3>
                    <span className="text-[10px] text-zinc-500">created_at</span>
                  </div>
                  <ul className="divide-y divide-zinc-800 max-h-80 overflow-auto text-sm">
                    {recentCreated.length===0 && <li className="p-3 text-zinc-500 text-xs">No recent creations.</li>}
                    {recentCreated.map(q=> {
                      const hasCreated = !!q.created_at && !isNaN(Date.parse(q.created_at));
                      const dateLabel = hasCreated ? new Date(q.created_at).toLocaleString() : '—';
                      return (
                      <li key={q.id} onClick={()=>openRecentQuestion(q)} className="p-3 flex flex-col gap-1 hover:bg-zinc-800/50 cursor-pointer group">
                        <div className="flex items-center gap-2">
                          {/* Changed dot color from blue to green per request */}
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                          <span className="text-xs text-zinc-400">{q.exam_code}</span>
                          <span className="text-[10px] text-zinc-500 ml-auto" title={hasCreated ? q.created_at : 'created_at not available'}>{dateLabel}</span>
                        </div>
                        <div className="text-xs text-zinc-200 line-clamp-2 group-hover:underline">{q.question}</div>
                      </li>
                    );})}
                  </ul>
                </div>
                <div className="bg-zinc-900 border border-zinc-700 rounded-lg">
                  <div className="p-4 border-b border-zinc-700 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Recently Updated (latest 10)</h3>
                    <span className="text-[10px] text-zinc-500">any timespan</span>
                  </div>
                  <ul className="divide-y divide-zinc-800 max-h-80 overflow-auto text-sm">
                    {recentUpdated.length===0 && <li className="p-3 text-zinc-500 text-xs">No updates found (excludes first 5min after creation).</li>}
                    {recentUpdated.map(q=> {
                      const hasCorruptedTimestamps = q.updated_at && q.created_at && 
                        new Date(q.updated_at).getTime() < new Date(q.created_at).getTime();
                      return (
                      <li key={q.id} onClick={()=>openRecentQuestion(q)} className="p-3 flex flex-col gap-1 hover:bg-zinc-800/50 cursor-pointer group">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${hasCorruptedTimestamps ? 'bg-red-400' : 'bg-green-400'}`} />
                          <span className="text-xs text-zinc-400">{q.exam_code}</span>
                          {hasCorruptedTimestamps && <span className="text-[9px] text-red-400 font-mono">⚠</span>}
                          <span className="text-[10px] text-zinc-500 ml-auto">{new Date(q.updated_at).toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-zinc-200 line-clamp-2 group-hover:underline">{q.question}</div>
                      </li>
                    );})}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Questions Tab */}
        {activeTab === 'questions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-medium text-white">Questions Management</h2>
                <p className="text-sm text-zinc-400">Filter by active exam codes and view questions</p>
              </div>
              <button 
                className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-md transition-colors flex items-center space-x-2"
                onClick={() => openQuestionEditor({ 
                  id: '', 
                  question: '',
                  exam_code: '',
                  answers: [],
                  explanation: '',
                  level: '',
                  category: '',
                  inactive: false
                } as Question)}
              >
                <Plus className="h-4 w-4" />
                <span>Add Question</span>
              </button>
            </div>

            {/* Filter Buttons for exam codes */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-zinc-400" />
                <span className="text-sm text-zinc-400">Filter by Exam Code:</span>
                {/* Removed manual refresh button */}
              </div>
              <div className="flex flex-wrap gap-2">
                {availableExamCodes.map((examCode) => {
                  const examCodeCount = allQuestions.filter(q => q.exam_code === examCode).length;
                  return (
                    <button
                      key={examCode}
                      onClick={() => {
                        setSelectedExamCode(examCode);
                        setCurrentPage(1);
                        setSearchText('');
                        setSelectedCategory('');
                        setShowRecentlyUpdated(false);
                        loadQuestionsForExamCode(examCode);
                      }}
                      className={`px-3 py-2 text-sm rounded-md transition-colors ${
                        selectedExamCode === examCode
                          ? 'bg-green-600 text-white'
                          : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                      }`}
                    >
                      {examCode} {selectedExamCode === examCode ? `(${examCodeCount})` : ''}
                    </button>
                  );
                })}
                {availableExamCodes.length === 0 && (
                  <span className="text-xs text-zinc-500 px-3 py-2">Loading active exam codes...</span>
                )}
              </div>
            </div>

            {/* Additional Filters */}
            {selectedExamCode && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Eye className="h-4 w-4 text-zinc-400" />
                  <span className="text-sm text-zinc-400">Additional Filters:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setShowRecentlyUpdated(!showRecentlyUpdated);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-2 text-sm rounded-md transition-colors flex items-center space-x-2 ${
                      showRecentlyUpdated
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                    }`}
                  >
                    <Eye className="h-3 w-3" />
                    <span>Updated Last 6 Months</span>
                    {showRecentlyUpdated && (
                      <span className="text-xs bg-blue-500/20 px-1.5 py-0.5 rounded">
                        {filteredQuestions.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}

            {!selectedExamCode && (
              <div className="py-16 border border-dashed border-zinc-700 rounded-lg text-center text-sm text-zinc-400 bg-zinc-900/40">
                Select an exam code above to load and filter questions.
              </div>
            )}
            
            {/* Filter Component */}
            {selectedExamCode && (
              <Filters 
                examCodes={availableExamCodes}
                categories={availableCategories}
                selectedExamCode={selectedExamCode}
                selectedCategory={selectedCategory}
                searchQuery={searchText}
                onExamCodeChange={(examCode) => {
                  setSelectedExamCode(examCode);
                  setCurrentPage(1);
                  loadQuestionsForExamCode(examCode);
                }}
                onCategoryChange={(category) => {
                  setSelectedCategory(category);
                  setCurrentPage(1);
                }}
                onSearchChange={(query) => {
                  setSearchText(query);
                  setCurrentPage(1);
                }}
              />
            )}
            
            {/* Questions List Component */}
            {selectedExamCode && (
              <QuestionsList
                questions={allQuestions}
                filteredQuestions={filteredQuestions}
                currentPage={currentPage}
                questionsPerPage={questionsPerPage}
                onEdit={openQuestionEditor}
                onDelete={deleteQuestion}
                onPageChange={setCurrentPage}
                loading={questionsLoading}
                deleting={deleting}
                categories={examCategories}
              />
            )}

            {/* Question Editor Modal (global) */}
            {editingQuestion && (
              <QuestionEditor
                question={editingQuestion}
                examCategories={examCategories}
                onSave={saveQuestion}
                onClose={closeQuestionEditor}
                onLoadCategories={loadExamCategories}
                saving={saving}
              />
            )}
          </div>
        )}

        {/* Exams Tab */}
        {activeTab === 'exams' && (
          <ExamsTable examPages={examPages} loading={examPagesLoading} onUpdate={updateExamPage} />
        )}

        {/* Knowledge Tab */}
        {activeTab === 'knowledge' && (
          <KnowledgeManager />
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <UserManager />
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <ExamCategoriesManager />
        )}

        {/* PMI Tab */}
        {activeTab === 'pmi' && (
          <PMI />
        )}

        {/* Create Questions Tab */}
        {activeTab === 'create' && (
          <div className="space-y-8 max-w-7xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-medium text-white">Create Questions</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => { setCreateMode('one'); setShowInsertQuestion(true); }}
                  className={`px-4 py-2 text-sm rounded-md border ${createMode==='one' ? 'bg-green-600 border-green-500 text-white':'bg-zinc-800 border-zinc-600 text-zinc-300 hover:bg-zinc-700'}`}
                >Insert One</button>
                <button
                  onClick={() => { setCreateMode('multiple'); setShowInsertQuestion(false); }}
                  className={`px-4 py-2 text-sm rounded-md border ${createMode==='multiple' ? 'bg-green-600 border-green-500 text-white':'bg-zinc-800 border-zinc-600 text-zinc-300 hover:bg-zinc-700'}`}
                >Insert Multiple</button>
              </div>
            </div>
            {!selectedExamCode && (
              <div className="py-14 border border-dashed border-zinc-700 rounded-lg text-center text-sm text-zinc-400 bg-zinc-900/40">
                Select an exam code in the Questions tab first to focus context for creation (optional but recommended).
              </div>
            )}
            {createMode === 'multiple' && (
              <div className="mt-2"><QuestionPromptBuilder /></div>
            )}
            {createMode === 'one' && (
              <p className="text-sm text-zinc-400">Use the popup to insert a single question. Close it to switch mode.</p>
            )}
          </div>
        )}

        {activeTab === 'update' && (
          <div className="space-y-8 max-w-7xl">
            <h2 className="text-xl font-medium text-white">Update Existing Questions</h2>
            <UpdateQuestions />
          </div>
        )}

        {activeTab === 'trainer' && (
          <div className={`relative grid grid-cols-1 lg:grid-cols-12 gap-6 transition-colors -mx-6 px-6 py-8 rounded-xl overflow-hidden ${trainerTheme==='light' ? 'bg-white/60 ring-1 ring-zinc-300/50 backdrop-blur-sm shadow-sm' : 'bg-zinc-900/60 ring-1 ring-zinc-700/60 backdrop-blur-sm'} before:absolute before:inset-0 before:pointer-events-none before:bg-[radial-gradient(ellipse_at_top,rgba(34,197,94,0.15),transparent_70%)]`}> 
            <div className="lg:col-span-12 flex justify-between items-center mb-4 relative z-10">
              <h2 className={`text-lg font-semibold tracking-tight ${trainerTheme==='light' ? 'text-zinc-800' : 'text-white'}`}>Exam Trainer</h2>
              <button
                onClick={()=>setTrainerTheme(t=>t==='dark'?'light':'dark')}
                aria-label="Toggle theme"
                className={`h-9 w-9 inline-flex items-center justify-center rounded-md border transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:ring-offset-0 ${trainerTheme==='light' ? 'bg-white/80 hover:bg-white text-emerald-600 border-zinc-300' : 'bg-zinc-800 hover:bg-zinc-700 text-emerald-300 border-zinc-600'}`}
              >
                {trainerTheme==='light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>
            </div>
            <div className={`lg:col-span-12 relative z-10 ${trainerTheme==='light' ? 'text-zinc-800' : ''}`}>
              <ExamTrainer theme={trainerTheme} />
            </div>
            {/* Decorative grid overlay */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:40px_40px]" />
          </div>
        )}

        {showBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70" onClick={()=>setShowBulkModal(false)} />
            <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-6 space-y-5">
              <div className="flex items-start justify-between">
                <h3 className="text-base font-semibold text-white">Bulk Operations</h3>
                <button onClick={()=>setShowBulkModal(false)} className="p-1 rounded hover:bg-zinc-700" aria-label="Close">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">Wähle was du in größerer Menge machen willst. Erstellen führt zum Prompt Builder, Updaten zur Review Oberfläche.</p>
              <div className="grid gap-3">
                <button
                  onClick={()=>{ setShowBulkModal(false); setActiveTab('create'); setCreateMode('multiple'); setShowInsertQuestion(false); window.dispatchEvent(new CustomEvent('question-flash', { detail: { type:'success', message: 'Switched to bulk creation.' }})); }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded border border-zinc-600 bg-zinc-800 hover:bg-zinc-700 text-sm"
                >
                  <span className="text-zinc-200">Create Questions (bulk)</span>
                  <span className="text-[10px] text-zinc-500">Prompt Builder</span>
                </button>
                <button
                  onClick={()=>{ setShowBulkModal(false); setActiveTab('update'); window.dispatchEvent(new CustomEvent('question-flash', { detail: { type:'success', message: 'Switched to bulk update.' }})); }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded border border-zinc-600 bg-zinc-800 hover:bg-zinc-700 text-sm"
                >
                  <span className="text-zinc-200">Update Questions (bulk)</span>
                  <span className="text-[10px] text-zinc-500">Review Tool</span>
                </button>
              </div>
              <div className="flex justify-end pt-2">
                <button onClick={()=>setShowBulkModal(false)} className="px-3 py-1.5 text-xs rounded bg-zinc-700 hover:bg-zinc-600">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
        </div>
      </div>
  );
}
