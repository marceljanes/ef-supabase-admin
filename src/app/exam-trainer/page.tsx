"use client";
import React from 'react';
import ExamTrainer from '@/components/ExamTrainer';

export const dynamic = 'force-static';

export default function ExamTrainerPage() {
  const [activeTab, setActiveTab] = React.useState<'trainer' | 'about'>('trainer');
  const [theme, setTheme] = React.useState<'dark'|'light'>(()=> (typeof window!=="undefined" && (localStorage.getItem('exam-theme') as 'dark'|'light')) || 'light');
  React.useEffect(()=>{
    if(typeof document!== 'undefined') {
      const container = document.getElementById('exam-trainer-root');
      if(container) {
        container.dataset.theme = theme;
      }
      localStorage.setItem('exam-theme', theme);
    }
  },[theme]);
  return (
    <div id="exam-trainer-root" data-theme={theme} className={`max-w-3xl mx-auto py-10 px-4 exam-theme-${theme}`}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 exam-dark:text-white">Exam Trainer</h1>
        <button onClick={()=>setTheme(t=>t==='dark'?'light':'dark')} className="px-2 py-1 rounded text-xs bg-zinc-200 hover:bg-zinc-300 text-zinc-900 border border-zinc-400 exam-dark:bg-zinc-800 exam-dark:hover:bg-zinc-700 exam-dark:text-white exam-dark:border-zinc-600 transition-colors">
          {theme==='dark' ? 'Light' : 'Dark'} Mode
        </button>
      </div>
      <div className="flex border-b border-zinc-300 exam-dark:border-zinc-700 mb-6 text-sm">
        <button onClick={()=>setActiveTab('trainer')} className={`px-4 py-2 -mb-px border-b-2 ${activeTab==='trainer' ? 'border-green-600 text-green-600' : 'border-transparent text-zinc-500 hover:text-zinc-800 exam-dark:hover:text-zinc-200'}`}>Trainer</button>
        <button onClick={()=>setActiveTab('about')} className={`px-4 py-2 -mb-px border-b-2 ${activeTab==='about' ? 'border-green-600 text-green-600' : 'border-transparent text-zinc-500 hover:text-zinc-800 exam-dark:hover:text-zinc-200'}`}>Info</button>
      </div>
      {activeTab==='trainer' ? (
        <ExamTrainer localTheme={theme} />
      ) : (
        <div className="prose prose-sm max-w-none text-zinc-700 exam-dark:text-zinc-300">
          <h2>About This Trainer</h2>
          <p>This lightweight trainer demonstrates a per-page dark/light mode isolated from the global app.</p>
          <ul>
            <li>Immediate feedback per question</li>
            <li>Local progress tracking</li>
            <li>Accessible buttons & focus outlines</li>
            <li>Per-page theme toggle (does not affect rest of app)</li>
          </ul>
        </div>
      )}
      <style jsx global>{`
        /* Scoped exam theme styles */
        #exam-trainer-root { --et-bg: #ffffff; --et-fg: #18181b; }
        #exam-trainer-root[data-theme='dark'] { --et-bg: #0b0b0d; --et-fg: #f4f4f5; }
        #exam-trainer-root { background: var(--et-bg); color: var(--et-fg); }
        #exam-trainer-root h1, #exam-trainer-root h2 { color: var(--et-fg); }
        #exam-trainer-root .exam-dark\:text-white { color: var(--et-fg); }
      `}</style>
    </div>
  );
}
