import React, { useEffect, useState } from 'react';
import { dbService } from '@/lib/supabase';
import { Answer } from '@/types/database';

interface Props { onClose: () => void; }

interface ExamOption { exam_code: string; exam_name: string; vendor?: string | null; is_active: boolean; }

export default function InsertQuestionModal({ onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [selectedExam, setSelectedExam] = useState<ExamOption | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [explanation, setExplanation] = useState('');
  const [level, setLevel] = useState('Intermediate');
  const [answers, setAnswers] = useState<Answer[]>([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false }
  ]);
  const addAnswer = () => { setAnswers(a => [...a, { text: '', isCorrect: false }]); };
  const removeAnswer = (idx:number) => { setAnswers(a => a.filter((_,i)=> i!==idx)); };

  // Load exams that have categories (active or inactive)
  const loadExamsWithCategories = async () => {
    try {
      setLoading(true);
      const list = await dbService.getExamsWithCategories();
      setExams(list as ExamOption[]);
    } catch (e:any) {
      setError(e.message || 'Load failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadExamsWithCategories(); }, []);

  useEffect(() => {
    const loadCats = async () => {
      if (selectedExam) {
        try {
          const cats = await dbService.getCategoriesByExamCode(selectedExam.exam_code);
          setCategories(cats);
        } catch {
          setCategories([]);
        }
      } else {
        setCategories([]);
      }
      setSelectedCategory('');
    };
    loadCats();
  }, [selectedExam]);


  const updateAnswerText = (idx:number, text:string) => {
    setAnswers(a => a.map((ans,i)=> i===idx ? { ...ans, text } : ans));
  };
  const toggleCorrect = (idx:number) => {
    setAnswers(a => a.map((ans,i)=> i===idx ? { ...ans, isCorrect: !ans.isCorrect } : ans));
  };

  const canSave = selectedExam && selectedCategory && questionText.trim() && explanation.trim() && answers.length>=2 && answers.every(a=>a.text.trim()) && answers.some(a=>a.isCorrect);

  const save = async () => {
    if (!canSave || !selectedExam) return;
    try {
      setSaving(true);
      setError(null);
      const payload = {
        question: questionText.trim(),
        answers,
        explanation: explanation.trim(),
        level,
        category: selectedCategory,
        exam_code: selectedExam.exam_code,
        inactive: !selectedExam.is_active,
        created_at: new Date().toISOString()
      };
      await dbService.insertQuestion(payload);
      window.dispatchEvent(new CustomEvent('question-flash', { detail: { type: 'success', message: 'Question created successfully.' }}));
      onClose();
    } catch (e:any) {
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-10">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-4xl shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700">
          <h2 className="text-lg font-medium text-white">Insert Question</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 text-sm">Close</button>
        </div>
        <div className="p-6 space-y-8">
          {error && <div className="bg-red-900/30 border border-red-700 text-red-300 text-xs px-3 py-2 rounded">{error}</div>}
          {loading ? (
            <div className="text-center text-sm text-zinc-400">Loading exams...</div>
          ) : (
            <div className="space-y-8">
              {/* Exam Selection */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-white">1. Choose Exam</h3>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <label className="block text-xs uppercase text-zinc-400">Active Exams</label>
                    <select 
                      value={selectedExam?.exam_code || ''} 
                      onChange={e => {
                        const exam = exams.find(ex => ex.exam_code === e.target.value);
                        setSelectedExam(exam || null);
                      }} 
                      className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-2 text-sm"
                    >
                      <option value="">-- Select Active Exam --</option>
                      {exams.filter(ex => ex.is_active).map(ex => (
                        <option key={ex.exam_code} value={ex.exam_code}>
                          {ex.exam_code} - {ex.exam_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Category Selection */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-white">2. Category</h3>
                <select disabled={!selectedExam} value={selectedCategory} onChange={e=>setSelectedCategory(e.target.value)} className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-2 text-sm disabled:opacity-40">
                  <option value="">-- choose category --</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Question Content */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-white">3. Question Content</h3>
                <div className="space-y-2">
                  <label className="block text-xs uppercase text-zinc-400">Question*</label>
                  <textarea rows={3} value={questionText} onChange={e=>setQuestionText(e.target.value)} className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs uppercase text-zinc-400">Explanation*</label>
                  <textarea rows={3} value={explanation} onChange={e=>setExplanation(e.target.value)} className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs uppercase text-zinc-400">Level*</label>
                  <select value={level} onChange={e=>setLevel(e.target.value)} className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-2 text-sm">
                    {['Beginner','Intermediate','Advanced'].map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="block text-xs uppercase text-zinc-400">Answers (toggle correct, multiple allowed)</label>
                  {answers.map((ans, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <button type="button" onClick={()=>toggleCorrect(i)} className={`mt-1 h-5 w-5 rounded border flex items-center justify-center text-[10px] ${ans.isCorrect ? 'bg-green-600 border-green-500' : 'border-zinc-600'}`}>{ans.isCorrect ? '✓' : ''}</button>
                      <input value={ans.text} onChange={e=>updateAnswerText(i, e.target.value)} className="flex-1 bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-sm" placeholder={`Answer ${i+1}`} />
                      {answers.length > 2 && (
                        <button type="button" onClick={()=>removeAnswer(i)} className="mt-1 px-2 py-1 text-xs rounded bg-red-700 hover:bg-red-600">X</button>
                      )}
                    </div>
                  ))}
                  <div>
                    <button type="button" onClick={addAnswer} className="px-2 py-1 text-xs rounded bg-zinc-700 hover:bg-zinc-600">Add Answer</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-700 bg-zinc-950/40">
          <div className="text-xs text-zinc-400">All fields required. Only exams with at least one category are listed.</div>
            <div className="space-x-2">
              <button onClick={onClose} className="px-3 py-1.5 text-sm rounded bg-zinc-700 hover:bg-zinc-600 text-white">Cancel</button>
              <button disabled={!canSave || saving} onClick={save} className="px-4 py-1.5 text-sm rounded bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white">{saving ? 'Saving...' : 'Save Question'}</button>
            </div>
        </div>
      </div>
    </div>
  );
}
