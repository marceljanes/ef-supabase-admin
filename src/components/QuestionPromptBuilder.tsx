'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { dbService } from '@/lib/supabase';
import { Answer } from '@/types/database';

interface ExamOption { exam_code: string; exam_name: string; vendor?: string | null; is_active: boolean; }

export default function QuestionPromptBuilder() {
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [selectedExamObj, setSelectedExamObj] = useState<ExamOption | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [context, setContext] = useState('');
  const [questionCount, setQuestionCount] = useState(5); // between 2 and x
  const [difficulty, setDifficulty] = useState<'Beginner'|'Intermediate'|'Advanced'|'Mixed'>('Mixed');
  const [similarity, setSimilarity] = useState(55); // 0 - 100
  const [lengthPref, setLengthPref] = useState<'short'|'long'|'mixed'>('mixed');
  const [minAnswers, setMinAnswers] = useState(4);
  const [maxAnswers, setMaxAnswers] = useState(8);
  const [correctAnswers, setCorrectAnswers] = useState(1); // number of correct answers per question
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [questionsJson, setQuestionsJson] = useState('');
  const [parseResults, setParseResults] = useState<any[]>([]);
  const [parsing, setParsing] = useState(false);
  const [savingBulk, setSavingBulk] = useState(false);
  const [sanitized, setSanitized] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(()=>{ (async ()=>{
    try {
      setLoading(true);
      const list = await dbService.getExamsWithCategories();
      setExams(list as ExamOption[]);
    } catch(e:any){
      setError(e.message || 'Load failed');
    } finally { setLoading(false); }
  })(); },[]);

  // load categories for selected exam
  useEffect(()=>{ (async ()=>{
    if(!selectedExam){ setCategories([]); setSelectedCategory(''); setSelectedExamObj(null); return; }
    const exam = exams.find(e=>e.exam_code===selectedExam) || null; setSelectedExamObj(exam);
    try {
      const cats = await dbService.getCategoriesByExamCode(selectedExam);
      setCategories(cats);
    } catch { setCategories([]); }
    setSelectedCategory('');
  })(); },[selectedExam]);

  // ensure min/max answers consistency
  useEffect(()=>{ if(minAnswers < 2) setMinAnswers(2); if(maxAnswers < minAnswers) setMaxAnswers(minAnswers); if(maxAnswers > 12) setMaxAnswers(12); if(correctAnswers > (maxAnswers-1)) setCorrectAnswers(Math.max(1, maxAnswers-1)); }, [minAnswers, maxAnswers, correctAnswers]);

  const lengthPrefText = {
    short: 'prefer shorter concise questions (but still varied)',
    long: 'prefer longer scenario / case-based questions',
    mixed: 'mix short, medium and long questions'
  }[lengthPref];

  const similarityText = similarity < 30 ? 'low similarity (easier – distractors clearly wrong)'
    : similarity < 60 ? 'medium similarity (moderate difficulty)'
    : similarity < 80 ? 'high similarity (hard – subtle differences)'
    : 'very high similarity (expert level, nuanced differences)';

  const prompt = useMemo(()=>{
    if(!selectedExamObj || !selectedCategory) return 'Select exam & category to build the master prompt.';
    return `You are an expert in ${selectedExamObj.vendor || ''} ${selectedExamObj.exam_code} with many years of hands-on experience.
Goal: Generate ${questionCount} unique, high-quality multiple-choice questions for the ${selectedCategory} category of the ${selectedExamObj.exam_code} certification exam.

Requirements:
- Difficulty: ${difficulty === 'Mixed' ? 'Provide a balanced mix across Beginner, Intermediate, Advanced' : difficulty}.
- Each question MUST include between ${minAnswers} and ${maxAnswers} answer options (randomly vary counts). Vary order & correctness patterns.
- Exactly ${correctAnswers} correct answer${correctAnswers===1?'':'s'} per question (never 0, never all answers correct, at least one distractor must remain). Do NOT add any icon, tick, emoji, prefix (e.g. ✔, ✅, *, ->, Correct:, etc.) to answers. Provide ONLY plain answer text. Correctness is ONLY represented by the JSON boolean isCorrect.
- Allow multi-correct format when ${correctAnswers > 1 ? 'multiple' : 'single'} correct answer${correctAnswers===1?'':'s'} are required.
- Vary question styles: scenario / case study (e.g. "Imagine you are a consultant / analyst and the client asks..."), situational ("Imagine the situation that..."), comparative, pure knowledge recall, troubleshooting, design decision, table-based data interpretation.
- Vary length & structure; preference: ${lengthPrefText}.
- Answer option similarity level: ${similarity}/100 (${similarityText}). The higher, the closer the distractors should be to the correct concept while still being clearly distinguishable with expert knowledge.
- Use authentic domain-specific terminology for ${selectedExamObj.vendor || ''} ${selectedExamObj.exam_code}.
- DO NOT replace, paraphrase or invent synonyms for established industry / certification specific terms, official service or product names, command names, acronyms, protocol names. Preserve canonical terminology exactly (case sensitive where relevant).
- Avoid repeating identical phrasings or openings across questions.

For EACH question output a JSON object with keys:
  question: string
  answers: array of objects { text: string, isCorrect: boolean } (answer text MUST NOT contain any correctness markers / icons)
  explanation: rich HTML string using <div>, <p>, <ul>, <li>, <br>, <strong>, tables (<table><thead><tr><th>...</th></tr></thead><tbody>...</tbody></table>) or side-by-side comparisons if useful.
  level: one of Beginner | Intermediate | Advanced
  category: '${selectedCategory}'
  exam_code: '${selectedExamObj.exam_code}'

Randomize the distribution of levels (within the constraints) and the number & positions of the ${correctAnswers} correct answer${correctAnswers===1?'':'s'}.
All explanations must be thorough and justify why each correct answer is correct and why each incorrect answer is not, referencing specific exam-relevant concepts.

Context Material (use to ground and inspire; do NOT copy verbatim, synthesize & transform):\n<CONTEXT>\n${context || '(No additional context provided)'}\n</CONTEXT>\n
Return ONLY valid JSON: { "questions": [ ... ] } (an object with a questions array). Do not wrap in markdown.`;
  }, [selectedExamObj, selectedCategory, questionCount, difficulty, minAnswers, maxAnswers, lengthPrefText, similarity, similarityText, context, correctAnswers]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(()=>setCopied(false), 2500); } catch {}
  };

  const validateQuestion = (q:any, idx:number) => {
    const errors:string[] = [];
    const requiredKeys = ['question','answers','explanation','level','category','exam_code'];
    requiredKeys.forEach(k=> { if(!(k in q)) errors.push(`Missing key ${k}`); });
    if(typeof q.question !== 'string' || !q.question.trim()) errors.push('question must be non-empty string');
    if(!Array.isArray(q.answers) || q.answers.length < 2) errors.push('answers must be array length>=2');
    const iconPattern = /^\s*(✔|✅|\*|->|✓)/; // leading markers
    if(Array.isArray(q.answers)) {
      q.answers.forEach((a:any,i:number)=>{
        if(typeof a.text !== 'string' || !a.text.trim()) errors.push(`answer[${i}] text empty`);
        if(typeof a.isCorrect !== 'boolean') errors.push(`answer[${i}] isCorrect not boolean`);
        if(typeof a.text === 'string' && (iconPattern.test(a.text) || /^\s*correct[:\-\s]/i.test(a.text))) errors.push(`answer[${i}] contains forbidden icon/prefix`);
      });
      const correctCount = q.answers.filter((a:any)=>a.isCorrect).length;
      if(correctCount !== correctAnswers) errors.push(`needs exactly ${correctAnswers} correct answers (found ${correctCount})`);
      if(correctCount >= q.answers.length) errors.push('cannot have all answers correct');
    }
    if(typeof q.explanation !== 'string' || !q.explanation.trim()) errors.push('explanation empty');
    if(typeof q.explanation === 'string' && !/[<][a-zA-Z]+/.test(q.explanation)) errors.push('explanation must contain HTML tags');
    const allowedLevels = ['Beginner','Intermediate','Advanced'];
    if(!allowedLevels.includes(q.level)) errors.push('level invalid');
    if(q.category !== selectedCategory) errors.push('category mismatch');
    if(q.exam_code !== selectedExamObj?.exam_code) errors.push('exam_code mismatch');
    return { index: idx, valid: errors.length===0, errors, question: q };
  };

  const parseJson = () => {
    if(!questionsJson.trim()) return;
    setParsing(true); setParseResults([]); setSanitized(false);
    try {
      const raw = questionsJson.trim();
      // Auto-sanitize common escape artifacts (e.g. from markdown export) like \[ \] \_ "exam\_code"
      const cleaned = raw
        // remove backslash before square brackets
        .replace(/\\(?=\[)/g,'')
        .replace(/\\(?=\])/g,'')
        // remove backslash before underscore (non standard JSON escape)
        .replace(/\\_/g,'_')
        // collapse accidental double escapes of quotes (leave valid \" )
        .replace(/\\{2,}\"/g,'\\"');
      if(cleaned !== raw) setSanitized(true);
      let data = JSON.parse(cleaned);
      if(Array.isArray(data)) data = { questions: data }; // allow raw array
      if(!data.questions || !Array.isArray(data.questions)) throw new Error('Root must have questions array');
      const results = data.questions.map((q:any,i:number)=> validateQuestion(q,i));
      setParseResults(results);
    } catch(e:any){
      setParseResults([{ index:0, valid:false, errors:[e.message], question:null }]);
    } finally { setParsing(false); }
  };

  const saveValid = async () => {
    const validItems = parseResults.filter(r=>r.valid && !r.saved);
    if(validItems.length===0) return;
    setSavingBulk(true);
    const updated = [...parseResults];
    for(const item of validItems){
      try {
        const q = item.question;
        const payload = {
          question: q.question.trim(),
          answers: q.answers.map((a:Answer)=>({ text: a.text, isCorrect: a.isCorrect })),
          explanation: q.explanation.trim(),
          level: q.level,
          category: q.category,
          exam_code: q.exam_code,
          inactive: selectedExamObj ? !selectedExamObj.is_active : false,
          created_at: new Date().toISOString()
        };
        await dbService.insertQuestion(payload);
        item.saved = true;
      } catch(e:any){
        item.saveError = e.message || 'Save failed';
      }
    }
    setParseResults(updated);
    const savedCount = updated.filter(r=>r.saved).length;
    if(savedCount>0) window.dispatchEvent(new CustomEvent('question-flash', { detail: { type: 'success', message: `${savedCount} question${savedCount===1?'':'s'} created.` }}));
    setSavingBulk(false);
  };

  const [openExp, setOpenExp] = useState<{[k:number]:boolean}>({});
  const toggleExp = (i:number)=> setOpenExp(o=>({...o, [i]: !o[i]}));
  const [savingOne, setSavingOne] = useState<{[k:number]:boolean}>({});

  const saveOne = async (idx:number) => {
    const item = parseResults.find(r=>r.index===idx);
    if(!item || !item.valid || item.saved || savingOne[idx]) return;
    try {
      setSavingOne(s=>({...s, [idx]: true}));
      const q = item.question;
      const payload = {
        question: q.question.trim(),
        answers: q.answers.map((a:Answer)=>({ text: a.text, isCorrect: a.isCorrect })),
        explanation: q.explanation.trim(),
        level: q.level,
        category: q.category,
        exam_code: q.exam_code,
        inactive: selectedExamObj ? !selectedExamObj.is_active : false,
        created_at: new Date().toISOString()
      };
      await dbService.insertQuestion(payload);
      setParseResults(pr => pr.map(r => r.index===idx ? { ...r, saved: true, saveError: undefined } : r));
      window.dispatchEvent(new CustomEvent('question-flash', { detail: { type: 'success', message: 'Question created.' }}));
    } catch(e:any){
      setParseResults(pr => pr.map(r => r.index===idx ? { ...r, saveError: e.message || 'Save failed' } : r));
    } finally {
      setSavingOne(s=>({...s, [idx]: false}));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <h2 className="text-lg font-medium text-white flex items-center gap-3">Master Prompt Builder
          <button type="button" onClick={()=>setShowHelp(true)} className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-zinc-600/60 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-500/40" aria-label="Show help">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-zinc-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
              <circle cx="12" cy="12" r="9" className="stroke-zinc-400" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 17h.01M12 11.75c0-.9.563-1.294 1.213-1.74.63-.433 1.287-.885 1.287-1.885A2.25 2.25 0 0012 5.875a2.25 2.25 0 00-2.25 2.25" />
            </svg>
          </button>
        </h2>
        {/* removed old copied inline message (will show near button) */}
      </div>
      {error && <div className="bg-red-900/30 border border-red-700 text-red-300 text-xs px-3 py-2 rounded">{error}</div>}
      <div className="grid md:grid-cols-2 gap-8">
        {/* LEFT FORM - styled similar to InsertQuestionModal sections */}
        <div className="space-y-6">
          {/* Section 1: Exam & Category */}
          <div className="space-y-4 border border-zinc-700 rounded p-4 bg-zinc-950/40">
            <h3 className="text-sm font-medium text-white">1. Exam & Category</h3>
            <div className="space-y-3 text-sm">
              <div className="space-y-1">
                <label className="block text-xs uppercase text-zinc-400">Exam Code*</label>
                {loading ? <div className="text-xs text-zinc-500">Loading exams...</div> : (
                  <select value={selectedExam} onChange={e=>setSelectedExam(e.target.value)} className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-2 text-sm">
                    <option value="">-- select exam (with categories) --</option>
                    {exams.map(ex => <option key={ex.exam_code} value={ex.exam_code}>{ex.exam_code} – {ex.exam_name}</option>)}
                  </select>
                )}
              </div>
              <div className="space-y-1">
                <label className="block text-xs uppercase text-zinc-400">Category*</label>
                <select disabled={!selectedExam || categories.length===0} value={selectedCategory} onChange={e=>setSelectedCategory(e.target.value)} className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-2 text-sm disabled:opacity-40">
                  <option value="">-- select category --</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>
          {/* Section 2: Generation Parameters */}
          <div className="space-y-4 border border-zinc-700 rounded p-4 bg-zinc-950/40">
            <h3 className="text-sm font-medium text-white">2. Generation Parameters</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs uppercase text-zinc-400">Questions*</label>
                <input type="number" min={2} max={50} value={questionCount} onChange={e=>setQuestionCount(Math.max(2, Math.min(50, Number(e.target.value)||2)))} className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-2 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="block text-xs uppercase text-zinc-400">Difficulty</label>
                <select value={difficulty} onChange={e=>setDifficulty(e.target.value as any)} className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-2 text-sm">
                  {['Mixed','Beginner','Intermediate','Advanced'].map(d=> <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs uppercase text-zinc-400">Answer Similarity / Difficulty</label>
                <span className="text-[10px] text-zinc-400">{similarity}%</span>
              </div>
              <input type="range" min={0} max={100} value={similarity} onChange={e=>setSimilarity(Number(e.target.value))} className="w-full" />
              <p className="text-[11px] text-zinc-500">{similarityText}</p>
            </div>
            <div className="space-y-2">
              <label className="block text-xs uppercase text-zinc-400">Question Length Preference</label>
              <div className="flex gap-3 text-xs">
                {['mixed','short','long'].map(lp => (
                  <button key={lp} onClick={()=>setLengthPref(lp as any)} type="button" className={`px-3 py-1 rounded border ${lengthPref===lp ? 'bg-green-600 border-green-500 text-white':'bg-zinc-800 border-zinc-600 text-zinc-300'}`}>{lp}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs uppercase text-zinc-400">Min Answers</label>
                <input type="number" min={2} max={12} value={minAnswers} onChange={e=>setMinAnswers(Number(e.target.value)||2)} className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-2 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="block text-xs uppercase text-zinc-400">Max Answers</label>
                <input type="number" min={minAnswers} max={12} value={maxAnswers} onChange={e=>setMaxAnswers(Number(e.target.value)||minAnswers)} className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-2 text-sm" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-xs uppercase text-zinc-400">Correct Answers per Question</label>
              <input type="number" min={1} max={Math.max(1, maxAnswers-1)} value={correctAnswers} onChange={e=>setCorrectAnswers(Math.min(Math.max(1, Number(e.target.value)||1), maxAnswers-1))} className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-2 text-sm" />
              <p className="text-[10px] text-zinc-500">Must be &lt; max answers (at least one distractor).</p>
            </div>
          </div>
          {/* Section 3: Optional Context */}
          <div className="space-y-4 border border-zinc-700 rounded p-4 bg-zinc-950/40">
            <h3 className="text-sm font-medium text-white">3. Optional Context</h3>
            <div className="space-y-1">
              <label className="block text-xs uppercase text-zinc-400">Context (long text)</label>
              <textarea rows={5} value={context} onChange={e=>setContext(e.target.value)} className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm" placeholder="Background material, product descriptions, architecture notes, constraints ..." />
            </div>
          </div>
        </div>
        {/* RIGHT SIDE PROMPT */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-white">Generated Master Prompt</h3>
          <textarea readOnly rows={32} value={prompt} className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-[12px] font-mono leading-relaxed" />
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={copy} disabled={!selectedExam || !selectedCategory} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded bg-green-600 hover:bg-green-500 disabled:opacity-40">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16h8a2 2 0 002-2V6a2 2 0 00-2-2H8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 8h2a2 2 0 012 2v8a2 2 0 01-2 2H10a2 2 0 01-2-2v-2" />
              </svg>
              <span>Copy Prompt</span>
            </button>
            {copied && <span className="text-xs text-green-400">Prompt copied successfully</span>}
          </div>
          <p className="text-[10px] text-zinc-500">Adjust fields on the left to regenerate. Ensure JSON validity is preserved when sending to the LLM.</p>
        </div>
      </div>
      {/* JSON Paste / Validation Section unchanged */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-white">Questions JSON (Paste Model Output)</h3>
        <textarea rows={14} value={questionsJson} onChange={e=>setQuestionsJson(e.target.value)} placeholder='{"questions": [ ... ] }' className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-[12px] font-mono" />
        <div className="flex gap-2">
          <button onClick={parseJson} disabled={!questionsJson.trim() || !selectedExam || !selectedCategory || parsing} className="px-3 py-1.5 text-xs rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40">{parsing ? 'Parsing...' : 'Validate JSON'}</button>
          <button onClick={saveValid} disabled={!parseResults.some(r=>r.valid && !r.saved) || savingBulk} className="px-3 py-1.5 text-xs rounded bg-green-600 hover:bg-green-500 disabled:opacity-40">{savingBulk ? 'Saving...' : 'Save Valid'}</button>
        </div>
        {parseResults.length>0 && (
          <div className="space-y-2 text-[11px]">
            {sanitized && <div className="text-amber-400">Sanitization applied (removed extraneous backslashes).</div>}
            <div className="text-zinc-400">Results: {parseResults.filter(r=>r.valid).length} valid / {parseResults.length} total. Saved: {parseResults.filter(r=>r.saved).length}</div>
            <div className="max-h-60 overflow-y-auto border border-zinc-800 rounded">
              <table className="min-w-full text-[11px]">
                <thead className="bg-zinc-800 text-zinc-400">
                  <tr>
                    <th className="px-2 py-1 text-left">#</th>
                    <th className="px-2 py-1 text-left">Status</th>
                    <th className="px-2 py-1 text-left">Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {parseResults.map(r=> (
                    <tr key={r.index} className={r.valid? 'bg-zinc-900' : 'bg-zinc-900/40'}>
                      <td className="px-2 py-1">{r.index+1}</td>
                      <td className="px-2 py-1">
                        {r.valid ? (r.saved ? <span className="text-green-400">saved</span> : <span className="text-green-600">valid</span>) : <span className="text-red-500">invalid</span>}
                        {r.saveError && <span className="text-red-400 ml-1">({r.saveError})</span>}
                      </td>
                      <td className="px-2 py-1 text-red-400 whitespace-pre-wrap">{r.errors?.join('\n') || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Render question preview boxes */}
            <div className="space-y-4 pt-4">
              {parseResults.filter(r=>r.valid && r.question).map(r=> (
                <div key={r.index} className="border border-zinc-700 rounded p-4 bg-zinc-900/60 text-left">
                  <div className="flex items-start justify-between gap-4">
                    <div className="text-sm font-medium text-white">Q{r.index+1}. {r.question.question}</div>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">{r.question.level}</span>
                      <button onClick={()=>toggleExp(r.index)} className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs">{openExp[r.index] ? 'Hide Explanation' : 'Show Explanation'}</button>
                      <button disabled={r.saved || savingOne[r.index]} onClick={()=>saveOne(r.index)} className="px-2 py-0.5 rounded bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-xs">{r.saved ? 'Saved' : (savingOne[r.index] ? 'Saving...' : 'Save')}</button>
                    </div>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm">
                    {r.question.answers.map((a:any,i:number)=> (
                      <li key={i} className={`px-2 py-1 rounded border text-xs flex items-start gap-2 ${a.isCorrect ? 'border-green-600 bg-green-900/20 text-green-300':'border-zinc-700 bg-zinc-800/40 text-zinc-300'}`}> 
                        <span className="font-mono text-[10px] opacity-60">{String.fromCharCode(65+i)}.</span>
                        <span className="flex-1">{a.text}</span>
                        {a.isCorrect && <span className="text-[10px] uppercase tracking-wide">Correct</span>}
                      </li>
                    ))}
                  </ul>
                  {openExp[r.index] && (
                    <div className="mt-3 text-[12px] leading-relaxed prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: r.question.explanation }} />
                  )}
                  {r.saveError && <div className="mt-2 text-red-400 text-[10px]">{r.saveError}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="text-[10px] text-zinc-500">Only valid questions (correct keys, same category & exam_code, HTML explanation) will be saved.</p>
      </div>
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={()=>setShowHelp(false)} />
          <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-6 space-y-5 text-sm">
            <div className="flex items-start justify-between">
              <h3 className="text-base font-semibold text-white">How to CREATE new questions</h3>
              <button onClick={()=>setShowHelp(false)} className="p-1 rounded hover:bg-zinc-700" aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <ol className="list-decimal list-inside space-y-2 text-zinc-300">
              <li><span className="font-medium text-white">Select & Configure:</span> Choose Exam + Category and set generation parameters (quantity, difficulty, similarity, answer counts, correct answers, etc.).</li>
              <li><span className="font-medium text-white">Copy Prompt:</span> Click &quot;Copy Prompt&quot; and send it unchanged to the LLM (no markdown wrapping, keep JSON skeleton intact).</li>
              <li><span className="font-medium text-white">Paste & Validate JSON:</span> Paste the raw JSON response, click &quot;Validate JSON&quot; and resolve any errors (icons, wrong counts, missing HTML in explanation, etc.).</li>
              <li><span className="font-medium text-white">Save:</span> Save all valid questions in bulk or individually after previewing answers & explanation.</li>
            </ol>
            <div className="text-[11px] text-zinc-500">Notes: No icons / ticks / prefixes in answers. Exactly the configured number of correct answers. Explanations must use HTML tags. Category & exam_code must match.</div>
            <div className="flex justify-end">
              <button onClick={()=>setShowHelp(false)} className="px-3 py-1.5 text-xs rounded bg-green-600 hover:bg-green-500">Got it</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
