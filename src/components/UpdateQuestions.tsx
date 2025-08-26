"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { dbService } from '@/lib/supabase';
import { Answer } from '@/types/database';

interface ExamOption { exam_code: string; exam_name: string; vendor?: string | null; is_active: boolean; }
interface QuestionRow { id:number; question:string; answers:Answer[]; explanation:string; category:string; level:string; exam_code:string; inactive?:boolean; updated_at?:string; }

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
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
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

  // Load exams
  useEffect(()=>{ (async ()=>{ try { setLoadingExams(true); const list = await dbService.getExamsWithCategories(); setExams(list as ExamOption[]); } catch(e:any){ setError(e.message||'Load exams failed'); } finally { setLoadingExams(false);} })(); },[]);

  // Load categories & questions when exam changes
  useEffect(()=>{ (async ()=>{
    setCategories([]); setQuestions([]); setSelectedIds([]); setParseResults([]); setQuestionsJson('');
    if(!selectedExam) return;
    try { const cats = await dbService.getCategoriesByExamCode(selectedExam); setCategories(cats); } catch { setCategories([]); }
    try { setLoadingQuestions(true); const qs = await dbService.getQuestionsByExamCode(selectedExam); setQuestions(qs); } catch(e:any){ setError(e.message||'Load questions failed'); } finally { setLoadingQuestions(false);}  
  })(); }, [selectedExam]);

  const filteredQuestions = useMemo(()=>{
    return questions.filter(q=> {
      if(categoryFilter && q.category !== categoryFilter) return false;
      if(search && !(q.question.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    });
  },[questions, categoryFilter, search]);

  const toggleSelect = (id:number) => { setSelectedIds(ids => ids.includes(id) ? ids.filter(x=>x!==id) : [...ids, id]); };
  const selectAllFiltered = () => setSelectedIds(filteredQuestions.map(q=>q.id));
  const clearSelection = () => setSelectedIds([]);

  const selectedQuestions = useMemo(()=> questions.filter(q=> selectedIds.includes(q.id)), [questions, selectedIds]);

  const prompt = useMemo(()=>{
    if(!selectedExam || selectedQuestions.length===0) return 'Select an exam and questions.';
    // Provide payload WITHOUT id, category, exam_code to prevent model from altering them
    const questionsPayload = selectedQuestions.map(q=>({ question:q.question, answers:q.answers, explanation:q.explanation, level:q.level })).slice(0, 100);
    return `You are an expert reviewer for the ${selectedExam} certification exam.
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

  // Validation of returned JSON
  const parseJson = () => {
    if(!questionsJson.trim()) return; setParsing(true); setParseResults([]); setSanitized(false);
    try {
      const raw = questionsJson.trim();
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
    if(!item || !item.valid || item.saved || item.discarded || !item.updated || !item.original) return;
    try {
      setSavingOne(s=>({...s,[id]:true}));
      const payload = { ...item.original, question: item.updated.question, explanation: item.updated.explanation, answers: item.updated.answers };
      const updatedRow = await dbService.updateQuestion(payload);
      setParseResults(rs => rs.map(r=> {
        if(r.id!==id) return r;
        const orig = r.original ? { ...r.original, updated_at: updatedRow?.updated_at as string } : r.original;
        return { ...r, saved:true, saveError:undefined, original: orig } as ParsedUpdateResult;
      }));
      window.dispatchEvent(new CustomEvent('question-flash', { detail: { type: 'success', message: 'Question updated.' }}));
    } catch(e:any){ setParseResults(rs => rs.map(r=> r.id===id ? { ...r, saveError: e.message || 'Save failed'} : r)); }
    finally { setSavingOne(s=>({...s,[id]:false})); }
  };

  const discardOne = (id:number) => { setParseResults(rs => rs.map(r=> r.id===id ? { ...r, discarded:true } : r)); };

  const saveAllValid = async () => {
    const toSave = parseResults.filter(r=>r.valid && !r.saved && !r.discarded);
    if(!toSave.length) return; setSavingBulk(true);
    for(const r of toSave){ await saveOne(r.id); }
    if(toSave.length) window.dispatchEvent(new CustomEvent('question-flash', { detail: { type: 'success', message: `${toSave.length} question${toSave.length===1?'':'s'} updated.` }}));
    setSavingBulk(false);
  };

  const RECENT_MS = 10 * 60 * 1000; // 10 minutes window
  const isRecent = (ts?:string) => ts ? (Date.now() - new Date(ts).getTime()) < RECENT_MS : false;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
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
      {error && <div className="bg-red-900/30 border border-red-700 text-red-300 text-xs px-3 py-2 rounded">{error}</div>}
      {/* Selection Panel */}
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-4 border border-zinc-700 rounded p-4 bg-zinc-950/40">
            <h3 className="text-sm font-medium text-white">1. Exam & Filter</h3>
            <div className="space-y-3 text-sm">
              <div className="space-y-1">
                <label className="block text-xs uppercase text-zinc-400">Exam*</label>
                {loadingExams ? <div className="text-xs text-zinc-500">Loading...</div> : (
                  <select value={selectedExam} onChange={e=>setSelectedExam(e.target.value)} className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-2">
                    <option value="">-- select exam --</option>
                    {exams.map(ex => <option key={ex.exam_code} value={ex.exam_code}>{ex.exam_code} – {ex.exam_name}</option>)}
                  </select>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs uppercase text-zinc-400">Category</label>
                  <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)} disabled={!categories.length} className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-2 disabled:opacity-40">
                    <option value="">All</option>
                    {categories.map(c=> <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs uppercase text-zinc-400">Search</label>
                  <input value={search} onChange={e=>setSearch(e.target.value)} className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-2" placeholder="Question text" />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap text-[11px]">
                <button onClick={selectAllFiltered} disabled={!filteredQuestions.length} className="px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-30">Select All</button>
                <button onClick={clearSelection} disabled={!selectedIds.length} className="px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-30">Clear</button>
                <span className="text-zinc-400 self-center">Selected: {selectedIds.length}</span>
              </div>
              <div className="max-h-56 overflow-y-auto border border-zinc-700 rounded divide-y divide-zinc-700 text-xs">
                {loadingQuestions && <div className="px-3 py-2 text-zinc-500">Loading questions...</div>}
                {!loadingQuestions && filteredQuestions.map(q=> {
                  const recent = isRecent(q.updated_at);
                  return (
                  <label key={q.id} className={`relative flex gap-2 items-start px-3 py-2 hover:bg-zinc-800/50 cursor-pointer border-l-2 ${recent ? 'border-l-green-500' : 'border-l-transparent'}`}>
                    {recent && <span className="absolute left-1.5 top-2 w-1.5 h-1.5 rounded-full bg-green-400/80" />}
                    <input type="checkbox" checked={selectedIds.includes(q.id)} onChange={()=>toggleSelect(q.id)} className="mt-0.5" />
                    <span className="flex-1 leading-snug flex flex-col gap-1">
                      <span>{q.question.slice(0,140)}{q.question.length>140?'…':''}</span>
                      {recent && <span className="text-[9px] text-green-400/70 uppercase tracking-wide">Updated</span>}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700">{q.category}</span>
                  </label>
                );})}
                {!loadingQuestions && !filteredQuestions.length && <div className="px-3 py-3 text-zinc-500">No questions.</div>}
              </div>
            </div>
          </div>
          <div className="space-y-4 border border-zinc-700 rounded p-4 bg-zinc-950/40">
            <h3 className="text-sm font-medium text-white">2. Optional Context</h3>
            <textarea rows={6} value={context} onChange={e=>setContext(e.target.value)} className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm" placeholder="Extra domain knowledge, updated product details, clarifications ..." />
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-white">Generated Review Prompt</h3>
            <textarea readOnly rows={32} value={prompt} className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-[12px] font-mono leading-relaxed" />
            <div className="flex items-center gap-3">
              <button onClick={copyPrompt} disabled={!selectedExam || !selectedQuestions.length} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded bg-green-600 hover:bg-green-500 disabled:opacity-40">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16h8a2 2 0 002-2V6a2 2 0 00-2-2H8a2 2 0 00-2 2v8a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16 8h2a2 2 0 012 2v8a2 2 0 01-2 2H10a2 2 0 01-2-2v-2" /></svg>
                Copy Prompt
              </button>
              {copied && <span className="text-xs text-green-400">Copied</span>}
            </div>
            <p className="text-[10px] text-zinc-500">Prompt contains the selected questions. The reviewer may only modify permitted fields.</p>
        </div>
      </div>

      {/* JSON Paste & Validation */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-white">Revised Questions JSON (Paste Model Output)</h3>
        <textarea rows={14} value={questionsJson} onChange={e=>setQuestionsJson(e.target.value)} placeholder='{"questions": [ ... ] }' className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-[12px] font-mono" />
        <div className="flex gap-2 flex-wrap">
          <button onClick={parseJson} disabled={!questionsJson.trim() || !selectedQuestions.length || parsing} className="px-3 py-1.5 text-xs rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40">{parsing ? 'Parsing...' : 'Validate JSON'}</button>
          <button onClick={saveAllValid} disabled={!parseResults.some(r=>r.valid && !r.saved && !r.discarded) || savingBulk} className="px-3 py-1.5 text-xs rounded bg-green-600 hover:bg-green-500 disabled:opacity-40">{savingBulk ? 'Saving...' : 'Save All Valid'}</button>
        </div>
        {parseResults.length>0 && (
          <div className="space-y-4 text-[11px]">
            {sanitized && <div className="text-amber-400">Sanitization applied.</div>}
            <div className="text-zinc-400">Valid: {parseResults.filter(r=>r.valid).length} / {parseResults.length} | Saved: {parseResults.filter(r=>r.saved).length}</div>
            <div className="max-h-52 overflow-y-auto border border-zinc-800 rounded">
              <table className="min-w-full text-[11px]">
                <thead className="bg-zinc-800 text-zinc-400">
                  <tr><th className="px-2 py-1 text-left">#</th><th className="px-2 py-1 text-left">Updated</th><th className="px-2 py-1 text-left">Status</th><th className="px-2 py-1 text-left">Errors</th></tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {parseResults.map(r=> {
                    const recently = isRecent(r.original?.updated_at);
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
            {/* Diff Preview */}
            <div className="space-y-5">
              {parseResults.filter(r=>r.original && r.updated).map(r=> {
                const q = r.updated!; const orig = r.original!; const recently = isRecent(orig.updated_at);
                return (
                  <div key={r.id} className={`border rounded p-4 bg-zinc-900/60 relative border-zinc-700`}>
                    {recently && <span className="absolute -left-px top-0 h-full w-1 bg-green-500/70 rounded-l" />}
                    {recently && <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/30">Updated</span>}
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium text-white">ID {q.id}</div>
                      <div className="flex gap-2 text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">{q.category}</span>
                        <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">{q.level}</span>
                      </div>
                    </div>
                    {/* Question */}
                    <div className="space-y-1 text-sm">
                      <div className={r.questionChanged ? 'text-amber-300' : 'text-zinc-200'}>{q.question}</div>
                      {r.questionChanged && <div className="text-[11px] text-zinc-500 line-clamp-4">Original: {orig.question}</div>}
                    </div>
                    {/* Answers */}
                    <ul className="mt-3 space-y-1 text-xs">
                      {q.answers.map((a,idx)=> {
                        const changed = r.answerTextChanged && r.answerTextChanged[idx];
                        const origAns = orig.answers[idx];
                        return (
                          <li key={idx} className={`px-2 py-1 rounded border flex gap-2 ${a.isCorrect ? 'border-green-600/60 bg-green-900/10 text-green-300':'border-zinc-700 bg-zinc-800/40 text-zinc-300'}`}>
                            <span className="font-mono text-[10px] opacity-60">{String.fromCharCode(65+idx)}.</span>
                            <span className={changed? 'text-amber-300 flex-1':'flex-1'}>{a.text}</span>
                            {changed && <span className="text-[10px] text-zinc-500 italic">Orig: {origAns.text}</span>}
                          </li>
                        );
                      })}
                    </ul>
                    {/* Explanation */}
                    <div className="mt-3 text-[12px]">
                      <div className={r.explanationChanged? 'border border-amber-400/40 rounded p-3 bg-amber-400/5':'border border-zinc-700 rounded p-3 bg-zinc-800/40'} dangerouslySetInnerHTML={{ __html: q.explanation }} />
                      {r.explanationChanged && <details className="mt-1"><summary className="cursor-pointer text-[10px] text-zinc-400">Original Explanation</summary><div className="mt-2 border border-zinc-700 rounded p-2 text-[11px] text-zinc-400" dangerouslySetInnerHTML={{ __html: orig.explanation }} /></details>}
                    </div>
                    <div className="mt-3 flex gap-2 text-[11px]">
                      <button disabled={!r.valid || r.saved || r.discarded || savingOne[r.id]} onClick={()=>saveOne(r.id)} className="px-3 py-1 rounded bg-green-600 hover:bg-green-500 disabled:opacity-40">{r.saved? 'Saved' : savingOne[r.id]? 'Saving...' : 'Save'}{r.questionChanged||r.explanationChanged|| (r.answerTextChanged||[]).some(Boolean) ? '' : ' (unchanged)'}</button>
                      <button disabled={r.saved || r.discarded} onClick={()=>discardOne(r.id)} className="px-3 py-1 rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40">Discard</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <p className="text-[10px] text-zinc-500">Only the fields question / explanation / answers[].text may be changed. Unchanged questions can be returned exactly as-is.</p>
      </div>

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
