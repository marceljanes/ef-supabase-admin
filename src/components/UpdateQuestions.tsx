"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { dbService } from '@/lib/supabase';
import { Answer } from '@/types/database';
import { Loader2, ChevronRight, Info } from 'lucide-react';

interface ExamOption { exam_code: string; exam_name: string; vendor?: string | null; is_active: boolean; }
interface QuestionRow { id:number; question:string; answers:Answer[]; explanation:string; category:string; level:string; exam_code:string; inactive?:boolean; updated_at?:string; created_at?:string; score?: number; }

interface ParsedUpdateResult {
  index: number;
  id: number;
  valid: boolean;
  errors: string[];
  updated: QuestionRow | null;
  original: QuestionRow | null;
  questionChanged?: boolean;
  explanationChanged?: boolean;
  answerTextChanged?: boolean[];
  saved?: boolean;
  saveError?: string;
  discarded?: boolean;
}

export default function UpdateQuestions() {
  // Data loading
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<QuestionRow[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.0);
  const [aiModeType, setAiModeType] = useState<'hybrid' | 'vector'>('vector');
  const [aiSearchEnabled, setAiSearchEnabled] = useState(true);
  const [levelFilter, setLevelFilter] = useState('');
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [context, setContext] = useState('');
  const [error, setError] = useState<string|null>(null);

  // Prompt / JSON interaction
  const [copied, setCopied] = useState(false);
  const [questionsJson, setQuestionsJson] = useState('');
  const [parseResults, setParseResults] = useState<ParsedUpdateResult[]>([]);
  const [parsing, setParsing] = useState(false);
  const [savingOne, setSavingOne] = useState<{[k:number]:boolean}>({});
  const [savingBulk, setSavingBulk] = useState(false);
  const [sanitized, setSanitized] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedQuestionForJson, setSelectedQuestionForJson] = useState<QuestionRow | null>(null);
  const [examCategories, setExamCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<{[questionId: number]: string}>({});

  // Load exams
  useEffect(()=>{ (async ()=>{ try { setLoadingExams(true); const list = await dbService.getExamsWithCategories(); setExams(list as ExamOption[]); } catch(e:any){ setError(e.message||'Load exams failed'); } finally { setLoadingExams(false);} })(); },[]);

  // Load categories & questions when exam changes
  useEffect(()=>{ (async ()=>{
    setCategories([]); setQuestions([]); setSelectedIds([]); setParseResults([]); setQuestionsJson(''); setAiResults([]); setSearch(''); setSelectedCategories({});
    
    try { 
      setLoadingQuestions(true); 
      if(selectedExam) {
        // Load questions for specific exam
        const cats = await dbService.getCategoriesByExamCode(selectedExam); 
        setCategories(cats); 
        setExamCategories(cats);
        const qs = await dbService.getQuestionsByExamCode(selectedExam); 
        setQuestions(qs);
      } else {
        // Load all questions from all exams when no exam is selected
        const allQuestions = await dbService.getAllQuestions();
        setQuestions(allQuestions);
        
        // Get all unique categories from all questions
        const allCategories = [...new Set(allQuestions.map(q => q.category).filter(Boolean))].sort();
        setCategories(allCategories);
        setExamCategories(allCategories);
      }
    } catch(e:any){ 
      setError(e.message||'Load questions failed'); 
      setCategories([]); 
      setExamCategories([]);
    } finally { 
      setLoadingQuestions(false);
    }  
  })(); }, [selectedExam]);

  // Clear AI results if search is cleared or AI is disabled
  useEffect(() => {
    if (!search.trim() || !aiSearchEnabled) {
      setAiResults([]);
      setAiError(null);
    }
  }, [search, aiSearchEnabled]);

  const filteredQuestions = useMemo(()=>{
    let base = questions;
    
    // If AI search is on and has results, use them.
    if (aiSearchEnabled && aiResults.length > 0) {
      base = aiResults;
    } 
    // If AI search is on but there's a search term with no results yet, the list should be empty.
    else if (aiSearchEnabled && search.trim()) {
      base = aiResults; // which is an empty array
    }
    // If AI search is off, perform local text filtering.
    else if (!aiSearchEnabled && search.trim()) {
      const searchTerm = search.trim().toLowerCase();
      base = questions.filter(q => 
        (q.question && q.question.toLowerCase().includes(searchTerm)) || 
        (q.explanation && q.explanation.toLowerCase().includes(searchTerm))
      );
    }

    return base.filter(q=> {
      if(categoryFilter && q.category !== categoryFilter) return false;
      if(levelFilter && q.level !== levelFilter) return false;
      return true;
    });
  },[questions, aiResults, categoryFilter, levelFilter, search, aiSearchEnabled]);

  const toggleSelect = (id:number) => { setSelectedIds(ids => ids.includes(id) ? ids.filter(x=>x!==id) : [...ids, id]); };
  const selectAllFiltered = () => setSelectedIds(filteredQuestions.map(q=>q.id));
  const clearSelection = () => setSelectedIds([]);
  const toggleExpand = (id: number) => { setExpandedIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]); };

  const selectedQuestions = useMemo(()=> questions.filter(q=> selectedIds.includes(q.id)), [questions, selectedIds]);

  const prompt = useMemo(()=>{
    if(selectedQuestions.length===0) return 'Select questions to generate a review prompt.';
    const questionsPayload = selectedQuestions.map(q=>({ question:q.question, answers:q.answers, explanation:q.explanation, level:q.level })).slice(0, 100);
    const examContext = selectedExam ? `${selectedExam} certification exam` : 'certification exam';
    return `You are an expert reviewer for the ${examContext}.
Goal: Review the following existing multiple-choice questions and optionally improve them ONLY when there is a clear benefit.

IMPORTANT FIELD CONTROL (DO NOT OUTPUT or INVENT): id, category, exam_code are intentionally omitted and will be auto re-attached by the system. Do NOT include them in your JSON.

Decision rules per question:
- Leave UNCHANGED if it is already accurate, clear, well-structured, high quality.
- MODIFY only if you detect: factual error, ambiguity, grammar issues, weak / incomplete explanation, poor distractor clarity, or the provided context suggests a materially better phrasing.

Allowed modifications (per question):
- question (wording / clarity – keep intent & difficulty)
- explanation (expand, clarify, correct, structure using HTML tags)
- answers[].text (refine wording WITHOUT changing meaning or correctness)
Forbidden changes:
- Do NOT change answers[].isCorrect values.
- Do NOT add, remove, reorder answers.
- Do NOT output id, category, exam_code, or any new fields.
- Do NOT change level (keep exactly as given).
- Do NOT insert icons/emojis/ticks (✔, ✅, *, ->, ✓) or prefixes into answers.

For EACH input question return an object with only: question, answers (same length, same isCorrect booleans), explanation (HTML), level (unchanged).
Return EXACTLY the same number of questions, same order.

Additional Context (may inform improvements; do not copy verbatim):\n<CONTEXT>\n${context || '(none)'}\n</CONTEXT>\n
Return ONLY valid JSON: { "questions": [ { question, answers:[{text,isCorrect}], explanation, level } ... ] }.
` + JSON.stringify({ questions: questionsPayload }, null, 2);
  }, [selectedExam, selectedQuestions, context]);

  const copyPrompt = async () => { try { await navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(()=>setCopied(false), 2200);} catch{} };

  const parseJson = () => {
    if(!questionsJson.trim()) return; setParsing(true); setParseResults([]); setSanitized(false);
    try {
      let raw = questionsJson.trim();
      const cleaned = raw.replace(/\\(?=\[)/g,'').replace(/\\(?=\])/g,'').replace(/\\_/g,'_');
      if(cleaned!==raw) setSanitized(true);
      let data = JSON.parse(cleaned);
      if(Array.isArray(data)) data = { questions: data };
      if(!data.questions || !Array.isArray(data.questions)) throw new Error('Root must have questions array');
      const originalMap: Record<number, QuestionRow> = Object.fromEntries(selectedQuestions.map(q=>[q.id,q]));
      const results: ParsedUpdateResult[] = data.questions.map((q:any,i:number)=>{
        const errors:string[]=[];
        // Fallback id by positional index
        if(typeof q.id !== 'number') {
          const fallback = selectedQuestions[i];
            if(fallback) q.id = fallback.id;
        }
        const orig = originalMap[q.id];
        if(!orig) errors.push('id not in selection');
        // Auto re-attach category & exam_code if omitted
        if(orig){
          if(!('category' in q)) q.category = orig.category; else if(q.category !== orig.category) errors.push('category changed');
          if(!('exam_code' in q)) q.exam_code = orig.exam_code; else if(q.exam_code !== orig.exam_code) errors.push('exam_code changed');
          if(!('level' in q)) q.level = orig.level; else if(q.level !== orig.level) errors.push('level changed');
        }
        // Required minimal keys now (excluding id/category/exam_code because we auto-add)
        const requiredKeys = ['question','answers','explanation','level'];
        requiredKeys.forEach(k=>{ if(!(k in q)) errors.push('missing key '+k); });
        if(!Array.isArray(q.answers)) errors.push('answers not array');
        if(orig && Array.isArray(q.answers)){
          if(q.answers.length !== orig.answers.length) errors.push('answer count changed');
          q.answers.forEach((a:any,idx:number)=>{
            const oa = orig.answers[idx];
            if(!oa) return;
            if(a.isCorrect !== oa.isCorrect) errors.push(`answers[${idx}].isCorrect changed`);
            if(typeof a.text !== 'string' || !a.text.trim()) errors.push(`answers[${idx}].text empty`);
            if(/^\s*(✔|✅|\*|->|✓)/.test(a.text)) errors.push(`answers[${idx}].text has forbidden icon`);
          });
        }
        if(typeof q.question !== 'string' || !q.question.trim()) errors.push('question empty');
        if(typeof q.explanation !== 'string' || !q.explanation.trim()) errors.push('explanation empty');
        if(typeof q.explanation === 'string' && !/[<][a-zA-Z]+/.test(q.explanation)) errors.push('explanation needs HTML tags');
        const questionChanged = orig ? q.question !== orig.question : false;
        const explanationChanged = orig ? q.explanation !== orig.explanation : false;
        const answerTextChanged = orig && Array.isArray(q.answers) ? q.answers.map((a:any,idx:number)=> a.text !== orig.answers[idx].text) : [];
        return { index:i, id:q.id, valid: errors.length===0, errors, updated: q as QuestionRow, original: orig||null, questionChanged, explanationChanged, answerTextChanged };
      });
      if(results.length !== selectedQuestions.length) {
        results.push({ index: results.length, id: -1, valid:false, errors:[`Returned ${results.length} questions but expected ${selectedQuestions.length}`], updated:null, original:null });
      }
      setParseResults(results);
    } catch(e:any){ setParseResults([{ index:0, id:-1, valid:false, errors:[e.message], updated:null, original:null }]); }
    finally { setParsing(false);}  
  };

  const saveOne = async (id:number) => {
    const item = parseResults.find(r=>r.id===id);
    const selectedCategory = selectedCategories[id];
    if(!item || !item.valid || item.saved || item.discarded || !item.updated || !item.original || !selectedCategory) return;
    try {
      setSavingOne(s=>({...s,[id]:true}));
      const payload = { 
        ...item.original, 
        question: item.updated.question, 
        explanation: item.updated.explanation, 
        answers: item.updated.answers,
        category: selectedCategory 
      };
      const updatedRow = await dbService.updateQuestion(payload);
      setParseResults(rs => rs.map(r=> {
        if(r.id!==id) return r;
        const orig = r.original ? { ...r.original, updated_at: updatedRow?.updated_at as string, category: selectedCategory } : r.original;
        return { ...r, saved:true, saveError:undefined, original: orig } as ParsedUpdateResult;
      }));
      // Also update the main questions list to reflect the change immediately
      setQuestions(qs => qs.map(q => q.id === id ? { ...q, ...updatedRow, category: selectedCategory } : q));
      window.dispatchEvent(new CustomEvent('question-flash', { detail: { type: 'success', message: 'Question updated.' }}));
    } catch(e:any){ setParseResults(rs => rs.map(r=> r.id===id ? { ...r, saveError: e.message || 'Save failed'} : r)); }
    finally { setSavingOne(s=>({...s,[id]:false})); }
  };

  const discardOne = (id:number) => { setParseResults(rs => rs.map(r=> r.id===id ? { ...r, discarded:true } : r)); };

  const saveAllValid = async () => {
    const toSave = parseResults.filter(r=>r.valid && !r.saved && !r.discarded && selectedCategories[r.id]);
    if(!toSave.length) return; setSavingBulk(true);
    for(const r of toSave){ await saveOne(r.id); }
    if(toSave.length) window.dispatchEvent(new CustomEvent('question-flash', { detail: { type: 'success', message: `${toSave.length} question${toSave.length===1?'':'s'} updated.` }}));
    setSavingBulk(false);
  };

  const RECENT_MS = 6 * 30 * 24 * 60 * 60 * 1000; // 6 months window
  const isRecent = (updated_at?: string, created_at?: string) => {
    if (!updated_at || !created_at) return false;
    
    const updatedTime = new Date(updated_at).getTime();
    const createdTime = new Date(created_at).getTime();
    const now = Date.now();
    
    // Must be updated within last 6 months AND updated_at must be newer than created_at
    return (now - updatedTime) < RECENT_MS && updatedTime > createdTime;
  };

  const runAiSearch = async () => {
    console.log('=== FRONTEND AI SEARCH DEBUG START ===');
    console.log('Search term:', search);
    console.log('Selected exam:', selectedExam);
    console.log('Category filter:', categoryFilter);
    console.log('Level filter:', levelFilter);
    console.log('AI mode type:', aiModeType);
    console.log('Similarity threshold:', similarityThreshold);
    
    if(!search.trim()) {
      console.log('Empty search, clearing results');
      setAiResults([]);
      setAiError(null);
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAiResults([]);
    
    const requestPayload = {
      query: search.trim(),
      exam_code: selectedExam || undefined,
      category: categoryFilter || undefined,
      level: levelFilter || undefined,
      limit: 50,
      threshold: similarityThreshold,
      mode: aiModeType
    };
    console.log('Request payload:', requestPayload);
    
    try {
      console.log('Sending request to /api/semantic-search...');
      const res = await fetch('/api/semantic-search', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(requestPayload)
      });
      console.log('Response status:', res.status);
      console.log('Response ok:', res.ok);
      
      const json = await res.json();
      console.log('Response JSON:', json);
      
      if(!res.ok) {
        console.log('Request failed with error:', json.error);
        throw new Error(json.error || 'AI search failed');
      }
      
      console.log('Raw results from API:', json.results?.length);
      const rows: QuestionRow[] = (json.results||[]).map((r:any) => {
        const existing = questions.find(q=> q.id === r.id) as any;
        return existing ? { ...existing, score: r.score } : { ...r, score: r.score };
      });
      console.log('Processed rows:', rows.length);
      setAiResults(rows);
    } catch(e:any){ 
      console.log('AI search error:', e.message);
      setAiError(e.message); 
    }
    finally { 
      setAiLoading(false); 
      console.log('=== FRONTEND AI SEARCH DEBUG END ===');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden">
        <div className="border-b border-zinc-700 p-4 flex justify-between items-center">
          <h2 className="text-lg font-medium text-white flex items-center gap-3">Update Questions
            <button type="button" onClick={()=>setShowHelp(true)} className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-zinc-600/60 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-500/40" aria-label="Show help">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-zinc-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                <circle cx="12" cy="12" r="9" className="stroke-zinc-400" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 17h.01M12 11.75c0-.9.563-1.294 1.213-1.74.63-.433 1.287-.885 1.287-1.885A2.25 2.25 0 0012 5.875a2.25 2.25 0 00-2.25 2.25" />
              </svg>
            </button>
          </h2>
          {copied && <span className="text-xs text-green-400">Prompt copied</span>}
        </div>
        {error && <div className="bg-red-900/30 border border-red-700 text-red-300 text-xs px-3 py-2 mx-4 mb-4 rounded">{error}</div>}
      </div>
      
      {/* Box 1: Filters and Questions */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden">
        <div className="border-b border-zinc-700 p-4">
          <h3 className="text-sm font-medium text-white">1. Exam & Filter</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="space-y-3 text-sm">
            <div className="space-y-1">
              <label className="block text-xs uppercase text-zinc-400">Exam</label>
              {loadingExams ? <div className="text-xs text-zinc-500">Loading...</div> : (
                <select value={selectedExam} onChange={e=>setSelectedExam(e.target.value)} className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-2">
                  <option value="">-- select exam --</option>
                  {exams.map(ex => <option key={ex.exam_code} value={ex.exam_code}>{ex.exam_code} – {ex.exam_name}</option>)}
                </select>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs uppercase text-zinc-400">Category</label>
                <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)} disabled={!categories.length} className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-2 disabled:opacity-40 text-sm">
                  <option value="">All</option>
                  {categories.map(c=> <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-xs uppercase text-zinc-400">Level</label>
                <input value={levelFilter} onChange={e=>setLevelFilter(e.target.value)} placeholder="e.g. easy" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-2 text-sm" />
              </div>
            </div>
            
            {/* Search Section - Own Row */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs uppercase text-zinc-400">Search</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">AI</span>
                  <button
                    type="button"
                    onClick={() => setAiSearchEnabled(!aiSearchEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                      aiSearchEnabled ? 'bg-emerald-600' : 'bg-zinc-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        aiSearchEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <input value={search} onChange={e=>setSearch(e.target.value)} className="flex-1 bg-zinc-800 border border-zinc-600 rounded px-2 py-2 text-sm" placeholder={aiSearchEnabled ? "Semantic query..." : "Filter by text..."} />
                {aiSearchEnabled && (
                  <button type="button" onClick={runAiSearch} disabled={aiLoading || !search.trim()} className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold disabled:opacity-40 flex items-center gap-1.5">
                    {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Go'}
                  </button>
                )}
              </div>
              {aiSearchEnabled && (
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span>Mode:</span>
                      <select value={aiModeType} onChange={e=>setAiModeType(e.target.value as any)} className="bg-zinc-800 border border-zinc-600 rounded px-1 py-0.5 text-xs">
                        <option value="hybrid">hybrid</option>
                        <option value="vector">vector</option>
                      </select>
                    </div>
                    <div className="flex-1 flex items-center gap-2 text-xs text-zinc-400">
                      <span>Threshold ≥ {similarityThreshold.toFixed(2)}</span>
                      <input type="range" min={0} max={0.95} step={0.01} value={similarityThreshold} onChange={e=>setSimilarityThreshold(parseFloat(e.target.value))} className="flex-1 accent-emerald-500" />
                    </div>
                </div>
              )}
               {aiError && <div className="text-xs text-red-400">{aiError}</div>}
               {!aiLoading && aiResults.length > 0 && <div className="text-xs text-emerald-400">{aiResults.length} {aiModeType} result(s) found.</div>}
               {aiLoading && <div className="text-xs text-zinc-400 animate-pulse">AI searching...</div>}
             </div>

            <div className="flex gap-2 flex-wrap text-[11px]">
              <button onClick={selectAllFiltered} disabled={!filteredQuestions.length} className="px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-30">Select All</button>
              <button onClick={clearSelection} disabled={!selectedIds.length} className="px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-30">Clear</button>
              <span className="text-zinc-400 self-center">Selected: {selectedIds.length}</span>
            </div>
            
            {/* Questions List */}
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden">
              <div className="border-b border-zinc-700 p-4 flex justify-between items-center">
                <h4 className="text-sm font-medium text-white">Questions</h4>
                <div className="text-xs text-zinc-400">
                  {filteredQuestions.length} question{filteredQuestions.length !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-700">
                  <thead className="bg-zinc-800 sticky top-0">
                    <tr>
                      <th className="px-2 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider w-2"></th>
                      <th className="px-2 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider w-8">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === filteredQuestions.length && filteredQuestions.length > 0}
                          onChange={() => selectedIds.length === filteredQuestions.length ? clearSelection() : selectAllFiltered()}
                          className="rounded"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Question</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Level</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Score</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-700">
                    {loadingQuestions ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-12 text-center text-zinc-400">
                          Loading questions...
                        </td>
                      </tr>
                    ) : filteredQuestions.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-12 text-center text-zinc-400">
                          No questions found.
                        </td>
                      </tr>
                    ) : (
                      filteredQuestions.map(q => {
                        const isExpanded = expandedIds.includes(q.id);
                        const hasScore = q.score !== undefined;
                        const isUpdated = isRecent(q.updated_at, q.created_at);
                        
                        return (
                          <React.Fragment key={q.id}>
                            <tr className={`group hover:bg-zinc-800 cursor-pointer transition-colors`}>
                              <td className={`px-2 py-4 relative align-middle ${isUpdated ? 'border-l-2 border-l-green-500' : ''}`}>
                                {isUpdated && <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-green-400" />}
                              </td>
                              <td className="px-2 py-4 whitespace-nowrap align-middle">
                                <input 
                                  type="checkbox" 
                                  checked={selectedIds.includes(q.id)} 
                                  onChange={() => toggleSelect(q.id)} 
                                  className="rounded"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-zinc-300 align-middle">
                                {q.id.toString().substring(0, 8)}&hellip;
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm align-middle">
                                {!categories.includes(q.category) ? (
                                  <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 inline-flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                      <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                                    </svg>
                                    {q.category}
                                  </span>
                                ) : (
                                  <span className="text-zinc-300">{q.category}</span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-sm text-zinc-300 max-w-sm align-middle" title={q.question}>
                                <div className="flex items-center gap-2">
                                  <span className="truncate">{q.question}</span>
                                  {isUpdated && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/30 whitespace-nowrap">Updated</span>}
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm align-middle">
                                <span className={`inline-block rounded-full px-2 py-1 text-xs ${
                                  q.level === 'easy' ? 'bg-green-900 text-green-300' :
                                  q.level === 'medium' ? 'bg-yellow-900 text-yellow-300' :
                                  q.level === 'hard' ? 'bg-red-900 text-red-300' :
                                  'bg-zinc-700 text-zinc-300'
                                }`}>
                                  {q.level || 'unknown'}
                                </span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm align-middle">
                                {hasScore ? (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 font-mono text-xs">
                                    {q.score!.toFixed(3)}
                                  </span>
                                ) : (
                                  <span className="text-zinc-500">-</span>
                                )}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm align-middle">
                                <span className="inline-block rounded-full px-2 py-1 text-xs bg-green-900 text-green-300">
                                  Active
                                </span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-right align-middle" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1">
                                  <button 
                                    type="button"
                                    onClick={() => setSelectedQuestionForJson(q)}
                                    className="text-zinc-400 hover:text-zinc-200 p-1 transition-colors"
                                    title="View JSON"
                                  >
                                    <Info className="h-4 w-4" />
                                  </button>
                                  <button 
                                    type="button" 
                                    onClick={() => toggleExpand(q.id)} 
                                    className="text-zinc-400 hover:text-zinc-200 p-1 transition-colors"
                                    title="Toggle explanation"
                                  >
                                    <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={9} className="px-6 py-4 bg-zinc-800/30">
                                  <div className="border-l-2 border-zinc-600 pl-4">
                                    <h5 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Explanation</h5>
                                    <div className="prose prose-sm prose-invert max-w-none text-zinc-300" dangerouslySetInnerHTML={{ __html: q.explanation }} />
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Box 2: Context and Prompt */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden">
        <div className="border-b border-zinc-700 p-4">
          <h3 className="text-sm font-medium text-white">2. Optional Context & Generated Prompt</h3>
        </div>
        <div className="p-4 space-y-6">
          {/* Context Section */}
          <div>
            <label className="block text-xs uppercase text-zinc-400 mb-2">Optional Context</label>
            <textarea rows={6} value={context} onChange={e=>setContext(e.target.value)} className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm" placeholder="Extra domain knowledge, updated product details, clarifications ..." />
          </div>
          
          {/* Prompt Section */}
          <div>
            <label className="block text-xs uppercase text-zinc-400 mb-2">Generated Review Prompt</label>
            <textarea readOnly rows={24} value={prompt} className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-[12px] font-mono leading-relaxed" />
            <div className="flex items-center gap-3 mt-3">
              <button onClick={copyPrompt} disabled={!selectedQuestions.length} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded bg-green-600 hover:bg-green-500 disabled:opacity-40">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16h8a2 2 0 002-2V6a2 2 0 00-2-2H8a2 2 0 00-2 2v8a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16 8h2a2 2 0 012 2v8a2 2 0 01-2 2H10a2 2 0 01-2-2v-2" /></svg>
                Copy Prompt
              </button>
              {copied && <span className="text-xs text-green-400">Copied</span>}
            </div>
            <p className="text-[10px] text-zinc-500 mt-2">Prompt contains the selected questions. The reviewer may only modify permitted fields.</p>
          </div>
        </div>
      </div>

      {/* JSON Input & Validation Section */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden">
        <div className="border-b border-zinc-700 p-4">
          <h3 className="text-sm font-medium text-white">Revised Questions JSON (Paste Model Output)</h3>
        </div>
        <div className="p-4 space-y-3">
          <textarea rows={14} value={questionsJson} onChange={e=>setQuestionsJson(e.target.value)} placeholder='{"questions": [ ... ] }' className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-[12px] font-mono" />
          <div className="flex gap-2 flex-wrap">
            <button onClick={parseJson} disabled={!questionsJson.trim() || !selectedQuestions.length || parsing} className="px-3 py-1.5 text-xs rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40">{parsing ? 'Parsing...' : 'Validate JSON'}</button>
            <button onClick={saveAllValid} disabled={!parseResults.some(r=>r.valid && !r.saved && !r.discarded) || savingBulk} className="px-3 py-1.5 text-xs rounded bg-green-600 hover:bg-green-500 disabled:opacity-40">{savingBulk ? 'Saving...' : 'Save All Valid'}</button>
          </div>
        </div>
        
        {/* Validation Results */}
        {parseResults.length>0 && (
          <div className="border-t border-zinc-700 p-4 space-y-4 text-[11px]">
            {sanitized && <div className="text-amber-400">Sanitization applied.</div>}
            <div className="text-zinc-400">Valid: {parseResults.filter(r=>r.valid).length} / {parseResults.length} | Saved: {parseResults.filter(r=>r.saved).length}</div>
            <div className="max-h-52 overflow-y-auto border border-zinc-800 rounded">
              <table className="min-w-full text-[11px]">
                <thead className="bg-zinc-800 text-zinc-400">
                  <tr><th className="px-2 py-1 text-left">#</th><th className="px-2 py-1 text-left">Updated</th><th className="px-2 py-1 text-left">Status</th><th className="px-2 py-1 text-left">Errors</th></tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {parseResults.map(r=> {
                    const recently = isRecent(r.original?.updated_at, r.original?.created_at);
                    return (
                    <tr key={r.index} className={`${r.valid ? 'bg-zinc-900' : 'bg-zinc-900/40'} border-l-2 ${recently ? 'border-l-green-500' : 'border-l-transparent'} transition-colors`}>
                      <td className="px-2 py-1">{r.index+1}</td>
                      <td className="px-2 py-1">{recently ? <span className="text-green-400 font-semibold">Yes</span> : <span className="text-zinc-500">No</span>}</td>
                      <td className="px-2 py-1">{r.valid? (r.saved? <span className="text-green-400">saved</span> : r.discarded? <span className="text-zinc-400">discarded</span> : <span className="text-green-600">valid</span>) : <span className="text-red-500">invalid</span>}{r.saveError && <span className="text-red-400 ml-1">({r.saveError})</span>}</td>
                      <td className="px-2 py-1 text-red-400 whitespace-pre-wrap">{r.errors.join('\n')}</td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Diff Preview Section */}
      {parseResults.length > 0 && parseResults.some(r=>r.original && r.updated) && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden">
          <div className="border-b border-zinc-700 p-4">
            <h3 className="text-sm font-medium text-white">Changes Preview</h3>
          </div>
          <div className="p-4 space-y-5">
            {parseResults.filter(r=>r.original && r.updated).map(r=> {
              const q = r.updated!; const orig = r.original!; const recently = isRecent(orig.updated_at, orig.created_at);
              return (
                <div key={r.id} className={`border rounded p-4 bg-zinc-800/30 relative border-zinc-700`}>
                  {recently && <span className="absolute -left-px top-0 h-full w-1 bg-green-500/70 rounded-l" />}
                  {recently && <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/30">Updated</span>}
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-medium text-white">ID {q.id}</div>
                    <div className="flex items-center gap-2">
                      <button 
                        type="button"
                        onClick={() => setSelectedQuestionForJson(q)}
                        className="text-zinc-400 hover:text-zinc-200 p-1 transition-colors"
                        title="View JSON that will be saved"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                      <div className="flex gap-2 text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">{q.category}</span>
                        <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">{q.level}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className={r.questionChanged ? 'text-amber-300' : 'text-zinc-200'}>{q.question}</div>
                    {r.questionChanged && <div className="text-[11px] text-zinc-500 line-clamp-4">Original: {orig.question}</div>}
                  </div>
                  <div className="my-4 border-t border-zinc-800" />
                  <div className="space-y-2 text-sm">
                    {q.answers.map((ans, idx) => {
                      const origAns = orig.answers[idx];
                      const changed = r.answerTextChanged?.[idx];
                      return (
                        <div key={idx} className={`flex items-start gap-2 ${ans.isCorrect ? 'font-semibold' : ''} ${changed ? 'text-amber-300' : 'text-zinc-300'}`}>
                          <span className={`w-4 h-4 mt-0.5 flex-shrink-0 rounded-sm flex items-center justify-center text-[10px] ${ans.isCorrect ? 'bg-green-500 text-white' : 'bg-zinc-700'}`}>{ans.isCorrect ? '✓' : ''}</span>
                          <span>{ans.text}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="my-4 border-t border-zinc-800" />
                  <div className="space-y-1 text-sm">
                    <div className={r.explanationChanged ? 'text-amber-300' : 'text-zinc-200'} dangerouslySetInnerHTML={{ __html: q.explanation }} />
                    {r.explanationChanged && <div className="text-[11px] text-zinc-500 mt-2 pt-2 border-t border-zinc-800">Original: {orig.explanation}</div>}
                  </div>
                  <div className="my-4 border-t border-zinc-800" />
                  <div className="space-y-2 text-sm">
                    <label className="block text-xs uppercase text-zinc-400">Select Category*</label>
                    <select 
                      value={selectedCategories[q.id] || ''} 
                      onChange={e => setSelectedCategories(prev => ({ ...prev, [q.id]: e.target.value }))}
                      className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-sm"
                    >
                      <option value="">-- Select Category --</option>
                      {examCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    {!selectedCategories[q.id] && (
                      <div className="text-xs text-red-400">Category selection is required to save this question</div>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-zinc-800 flex gap-2">
                    <button 
                      onClick={()=>saveOne(r.id)} 
                      disabled={savingOne[r.id] || r.saved || r.discarded || !selectedCategories[q.id]} 
                      className="px-2 py-1 text-[10px] rounded bg-green-600 hover:bg-green-500 disabled:opacity-40"
                    >
                      {savingOne[r.id] ? 'Saving...' : (r.saved ? 'Saved' : 'Save')}
                    </button>
                    <button onClick={()=>discardOne(r.id)} disabled={r.saved || r.discarded} className="px-2 py-1 text-[10px] rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40">Discard</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedQuestionForJson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={()=>setSelectedQuestionForJson(null)} />
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
            <div className="border-b border-zinc-700 p-4 flex justify-between items-center">
              <h3 className="text-base font-semibold text-white">Question JSON (ID: {selectedQuestionForJson.id})</h3>
              <button onClick={()=>setSelectedQuestionForJson(null)} className="p-1 rounded hover:bg-zinc-700" aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              <textarea 
                readOnly 
                value={JSON.stringify({
                  id: selectedQuestionForJson.id,
                  question: selectedQuestionForJson.question,
                  answers: selectedQuestionForJson.answers,
                  explanation: selectedQuestionForJson.explanation,
                  category: selectedCategories[selectedQuestionForJson.id] || selectedQuestionForJson.category,
                  level: selectedQuestionForJson.level,
                  exam_code: selectedQuestionForJson.exam_code,
                  updated_at: selectedQuestionForJson.updated_at,
                  created_at: selectedQuestionForJson.created_at
                }, null, 2)}
                className="w-full h-96 bg-zinc-800 border border-zinc-600 rounded px-3 py-3 text-xs font-mono text-zinc-300 resize-none"
                rows={20}
              />
            </div>
          </div>
        </div>
      )}

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={()=>setShowHelp(false)} />
          <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-6 space-y-5 text-sm">
            <div className="flex items-start justify-between">
              <h3 className="text-base font-semibold text-white">How to UPDATE existing questions</h3>
              <button onClick={()=>setShowHelp(false)} className="p-1 rounded hover:bg-zinc-700" aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <ol className="list-decimal list-inside space-y-2 text-zinc-300">
              <li><span className="font-medium text-white">Select:</span> Choose exam, optionally filter by category / search, then select the questions to review.</li>
              <li><span className="font-medium text-white">Copy Prompt:</span> Copy the generated review prompt and send it to the LLM.</li>
              <li><span className="font-medium text-white">Paste & Validate JSON:</span> Paste the JSON response and validate – review diffs & fix any errors (IDs, forbidden changes, HTML requirement).</li>
              <li><span className="font-medium text-white">Save / Discard:</span> Save valid modified questions individually or all at once; unchanged ones can stay identical.</li>
            </ol>
            <div className="text-[11px] text-zinc-500">Allowed: question / explanation / answers[].text. Forbidden: changing correctness flags, ids, category, level, exam_code, answer count/order.</div>
            <div className="flex justify-end">
              <button onClick={()=>setShowHelp(false)} className="px-3 py-1.5 text-xs rounded bg-green-600 hover:bg-green-500">Got it</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
