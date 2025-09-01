import React, { useState, useEffect } from 'react';
import { ExamPage } from '@/types/admin';

interface ExamsTableProps {
  examPages: ExamPage[];
  loading: boolean;
  onUpdate?: (page: Partial<ExamPage> & { id: number }) => Promise<void> | void;
}

export default function ExamsTable({ examPages, loading, onUpdate }: ExamsTableProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Partial<ExamPage>>({});
  const [creating, setCreating] = useState(false);
  const [newExam, setNewExam] = useState({
    exam_code: '',
    exam_name: '',
    vendor: '',
    is_active: true,
    is_featured: false,
    difficulty_level: '',
    display_order: '',
    header_label: '',
    url_path: '',
    icon_name: '',
    seo_title: '',
    seo_h1: '',
    seo_meta_description: '',
    seo_keywords: '',
    seo_canonical_url: '',
    seo_google_snippet: '',
    estimated_duration: ''
  });
  const [vendorSearch, setVendorSearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [templateExam, setTemplateExam] = useState<ExamPage | null>(null);
  const [codeValidationError, setCodeValidationError] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  // New local filter state (all vs active only)
  const [filterMode, setFilterMode] = useState<'all' | 'active'>('all');

  // Reset editing/expanded if filtered out
  useEffect(()=> {
    if(filterMode === 'active') {
      if(editingId) {
        const row = examPages.find(p=>p.id===editingId);
        if(row && !row.is_active) setEditingId(null);
      }
      if(expandedId) {
        const row = examPages.find(p=>p.id===expandedId);
        if(row && !row.is_active) setExpandedId(null);
      }
    }
  }, [filterMode, examPages, editingId, expandedId]);

  const visiblePages = (filterMode === 'active' ? examPages.filter(p=>p.is_active) : examPages)
    .filter(p => vendorSearch.trim() ? (p.vendor||'').toLowerCase().includes(vendorSearch.toLowerCase()) : true);

  const startEdit = (p: ExamPage) => {
    setEditingId(p.id);
    setDraft(p);
    setExpandedId(p.id); // auto open details when editing
  };
  const cancelEdit = () => { setEditingId(null); setDraft(prev => expandedId ? prev : {}); };
  const commit = async () => {
    if (!editingId) return;
    try {
      await onUpdate?.({ id: editingId, ...draft });
      setEditingId(null);
    } catch (e) {
      console.error('Save failed', e);
    }
  };
  const updateField = (field: keyof ExamPage, value: any) => {
    setDraft(d => ({ ...d, [field]: value }));
  };
  const toggleExpand = (p: ExamPage) => {
    setExpandedId(prev => {
      if (prev === p.id) {
        return null; // keep draft if editing
      }
      // opening new panel -> seed draft with row data if not currently editing this row
      setDraft(d => (editingId === p.id ? d : p));
      return p.id;
    });
  };
  const saveSeo = async (id: number) => {
    try {
      const seoPayload: Partial<ExamPage> & { id: number } = {
        id,
        header_label: draft.header_label,
        url_path: draft.url_path,
        icon_name: draft.icon_name,
        seo_title: draft.seo_title,
        seo_h1: draft.seo_h1,
        seo_meta_description: draft.seo_meta_description,
        seo_keywords: draft.seo_keywords,
        seo_canonical_url: draft.seo_canonical_url,
        seo_google_snippet: draft.seo_google_snippet,
        estimated_duration: draft.estimated_duration
      };
      await onUpdate?.(seoPayload);
    } catch (e) {
      console.error('SEO save failed', e);
    }
  };
  const resetNew = () => setNewExam({ 
    exam_code:'', 
    exam_name:'', 
    vendor:'', 
    is_active:true, 
    is_featured:false,
    difficulty_level: '',
    display_order: '',
    header_label: '',
    url_path: '',
    icon_name: '',
    seo_title: '',
    seo_h1: '',
    seo_meta_description: '',
    seo_keywords: '',
    seo_canonical_url: '',
    seo_google_snippet: '',
    estimated_duration: ''
  });

  // Template function to copy data from existing exam
  const createFromTemplate = (exam: ExamPage) => {
    setTemplateExam(exam);
    setSelectedTemplateId(exam.id.toString());
    loadTemplateData(exam);
    setShowCreateForm(true);
  };

  // Load template data into form
  const loadTemplateData = (exam: ExamPage) => {
    setNewExam({
      exam_code: '', // Keep empty to force user to enter new code
      exam_name: exam.exam_name + ' (Copy)',
      vendor: exam.vendor || '',
      is_active: exam.is_active,
      is_featured: exam.is_featured,
      difficulty_level: exam.difficulty_level || '',
      display_order: exam.display_order?.toString() || '',
      header_label: exam.header_label || '',
      url_path: '', // Keep empty for new exam
      icon_name: exam.icon_name || '',
      seo_title: exam.seo_title || '',
      seo_h1: exam.seo_h1 || '',
      seo_meta_description: exam.seo_meta_description || '',
      seo_keywords: exam.seo_keywords || '',
      seo_canonical_url: '', // Keep empty for new exam
      seo_google_snippet: exam.seo_google_snippet || '',
      estimated_duration: exam.estimated_duration?.toString() || ''
    });
  };

  // Handle template selection from dropdown
  const handleTemplateSelection = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId === '') {
      setTemplateExam(null);
      resetNew();
    } else {
      const exam = examPages.find(ep => ep.id.toString() === templateId);
      if (exam) {
        setTemplateExam(exam);
        loadTemplateData(exam);
      }
    }
  };

  // Validate exam code uniqueness
  const validateExamCode = (code: string) => {
    if (!code.trim()) {
      setCodeValidationError('');
      return true;
    }
    
    const exists = examPages.some((exam: ExamPage) => 
      exam.exam_code.toLowerCase() === code.toLowerCase()
    );
    
    if (exists) {
      setCodeValidationError('Exam code already exists');
      return false;
    }
    
    setCodeValidationError('');
    return true;
  };

  const createExam = async () => {
    if(!newExam.exam_code.trim() || !newExam.exam_name.trim()) return;
    
    // Validate exam code uniqueness
    if (!validateExamCode(newExam.exam_code)) {
      return;
    }
    
    try {
      setCreating(true);
      
      // Prepare payload with all fields
      const payload: any = { 
        exam_code: newExam.exam_code,
        exam_name: newExam.exam_name,
        vendor: newExam.vendor || null,
        is_active: newExam.is_active,
        is_featured: newExam.is_featured,
        difficulty_level: newExam.difficulty_level || null,
        display_order: newExam.display_order ? Number(newExam.display_order) : null,
        header_label: newExam.header_label || null,
        url_path: newExam.url_path || null,
        icon_name: newExam.icon_name || null,
        seo_title: newExam.seo_title || null,
        seo_h1: newExam.seo_h1 || null,
        seo_meta_description: newExam.seo_meta_description || null,
        seo_keywords: newExam.seo_keywords || null,
        seo_canonical_url: newExam.seo_canonical_url || null,
        seo_google_snippet: newExam.seo_google_snippet || null,
        estimated_duration: newExam.estimated_duration ? Number(newExam.estimated_duration) : null
      };
      
      // Use window event to request creation via dashboard
      const evt = new CustomEvent('create-exam', { detail: payload });
      window.dispatchEvent(evt);
      resetNew();
      setTemplateExam(null);
      setSelectedTemplateId('');
      setShowCreateForm(false);
    } catch(e){
      console.error('create exam failed', e);
    } finally { setCreating(false); }
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-medium text-white">Exams</h2>
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter toggle moved to the left */}
          <div className="flex gap-1 bg-zinc-800 rounded-md p-1 text-xs order-1">
            <button type="button" onClick={()=>setFilterMode('all')} className={`px-3 py-1 rounded ${filterMode==='all' ? 'bg-zinc-600 text-white':'text-zinc-300 hover:text-white'}`}>All</button>
            <button type="button" onClick={()=>setFilterMode('active')} className={`px-3 py-1 rounded ${filterMode==='active' ? 'bg-green-600 text-white':'text-zinc-300 hover:text-white'}`}>Active</button>
          </div>
          <input
            placeholder="Search vendor"
            value={vendorSearch}
            onChange={e=>setVendorSearch(e.target.value)}
            className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-xs order-2"
          />
          <button type="button" onClick={()=>setShowCreateForm(f=>!f)} className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-medium order-3 ${showCreateForm? 'bg-zinc-700 text-zinc-200':'bg-green-600 hover:bg-green-500 text-white'}`}>{showCreateForm ? 'Cancel' : (<><svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14"/></svg><span>Add Exam</span></>)}</button>
          <div className="text-xs text-zinc-400 ml-1 order-4">{visiblePages.length} {filterMode==='active' ? 'active ' : ''}entries</div>
        </div>
      </div>

      {showCreateForm && (
        <div className="border border-zinc-700 bg-zinc-900/70 rounded p-4 space-y-4 text-xs">
          {/* Template Selection */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-white">Template Selection</h4>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-zinc-400 tracking-wide">Use Existing Exam as Template</label>
                <select 
                  value={selectedTemplateId} 
                  onChange={e => handleTemplateSelection(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-sm"
                >
                  <option value="">Start from scratch</option>
                  {examPages
                    .sort((a, b) => a.exam_code.localeCompare(b.exam_code))
                    .map(ep => (
                    <option key={ep.id} value={ep.id.toString()}>
                      {ep.exam_code} - {ep.exam_name} {ep.vendor ? `(${ep.vendor})` : ''} {!ep.is_active ? ' [INACTIVE]' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-zinc-500">
                  Wähle ein beliebiges Exam als Vorlage (aktiv oder inaktiv) oder erstelle ein neues von Grund auf
                </p>
              </div>
              {templateExam && (
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase text-zinc-400 tracking-wide">Template Preview</label>
                  <div className="p-2 bg-blue-900/30 border border-blue-700 rounded text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2v0M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                      </svg>
                      <span className="text-blue-400 font-medium">{templateExam.exam_code}</span>
                      {!templateExam.is_active && (
                        <span className="px-1.5 py-0.5 bg-red-900/50 text-red-300 text-[10px] rounded">INACTIVE</span>
                      )}
                    </div>
                    <p className="text-zinc-300">{templateExam.exam_name}</p>
                    {templateExam.vendor && <p className="text-zinc-400 text-xs">Vendor: {templateExam.vendor}</p>}
                    <button 
                      onClick={() => handleTemplateSelection('')} 
                      className="mt-2 px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs"
                    >
                      Clear Template
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Template info */}
          {templateExam && (
            <div className="flex items-center gap-2 p-2 bg-blue-900/20 border border-blue-700/50 rounded">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-blue-400 text-xs">
                Daten von <strong>{templateExam.exam_code}</strong> werden als Vorlage verwendet. 
                Passe sie nach Bedarf an.
              </span>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-white">Basic Information</h4>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-zinc-400 tracking-wide">Exam Code *</label>
                <input 
                  placeholder="e.g. AZ-900" 
                  value={newExam.exam_code} 
                  onChange={e=>{
                    const code = e.target.value.toUpperCase();
                    setNewExam(n=>({...n, exam_code: code}));
                    validateExamCode(code);
                  }} 
                  className={`w-full bg-zinc-800 border rounded px-2 py-1 ${codeValidationError ? 'border-red-500' : 'border-zinc-600'}`} 
                />
                {codeValidationError && <p className="text-red-400 text-[10px]">{codeValidationError}</p>}
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-zinc-400 tracking-wide">Exam Name *</label>
                <input 
                  placeholder="e.g. Azure Fundamentals" 
                  value={newExam.exam_name} 
                  onChange={e=>setNewExam(n=>({...n, exam_name:e.target.value}))} 
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1" 
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-zinc-400 tracking-wide">Vendor</label>
                <input 
                  placeholder="e.g. Microsoft" 
                  value={newExam.vendor} 
                  onChange={e=>setNewExam(n=>({...n, vendor:e.target.value}))} 
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1" 
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-zinc-400 tracking-wide">Difficulty</label>
                <input 
                  placeholder="e.g. Beginner" 
                  value={newExam.difficulty_level} 
                  onChange={e=>setNewExam(n=>({...n, difficulty_level:e.target.value}))} 
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1" 
                />
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-white">Settings</h4>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase text-zinc-400 tracking-wide">Active</span>
                <div className="inline-flex rounded-md overflow-hidden border border-zinc-600">
                  <button type="button" onClick={()=>setNewExam(n=>({...n,is_active:true}))} className={`px-2 py-1 text-xs font-medium ${newExam.is_active ? 'bg-green-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>Yes</button>
                  <button type="button" onClick={()=>setNewExam(n=>({...n,is_active:false}))} className={`px-2 py-1 text-xs font-medium ${!newExam.is_active ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>No</button>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase text-zinc-400 tracking-wide">Featured</span>
                <div className="inline-flex rounded-md overflow-hidden border border-zinc-600">
                  <button type="button" onClick={()=>setNewExam(n=>({...n,is_featured:true}))} className={`px-2 py-1 text-xs font-medium transition-colors ${newExam.is_featured ? 'bg-yellow-500 text-black shadow-inner' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>Yes</button>
                  <button type="button" onClick={()=>setNewExam(n=>({...n,is_featured:false}))} className={`px-2 py-1 text-xs font-medium transition-colors ${!newExam.is_featured ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>No</button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-zinc-400 tracking-wide">Display Order</label>
                <input 
                  type="number" 
                  placeholder="e.g. 1" 
                  value={newExam.display_order} 
                  onChange={e=>setNewExam(n=>({...n, display_order:e.target.value}))} 
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1" 
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-zinc-400 tracking-wide">Duration (min)</label>
                <input 
                  type="number" 
                  placeholder="e.g. 60" 
                  value={newExam.estimated_duration} 
                  onChange={e=>setNewExam(n=>({...n, estimated_duration:e.target.value}))} 
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1" 
                />
              </div>
            </div>
          </div>

          {/* Page Details */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-white">Page Details</h4>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-zinc-400 tracking-wide">Header Label</label>
                <input 
                  placeholder="e.g. Azure Fundamentals Exam" 
                  value={newExam.header_label} 
                  onChange={e=>setNewExam(n=>({...n, header_label:e.target.value}))} 
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1" 
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-zinc-400 tracking-wide">URL Path</label>
                <input 
                  placeholder="e.g. /exams/az-900" 
                  value={newExam.url_path} 
                  onChange={e=>setNewExam(n=>({...n, url_path:e.target.value}))} 
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1" 
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-zinc-400 tracking-wide">Icon Name</label>
                <input 
                  placeholder="e.g. microsoft" 
                  value={newExam.icon_name} 
                  onChange={e=>setNewExam(n=>({...n, icon_name:e.target.value}))} 
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1" 
                />
              </div>
            </div>
          </div>

          {/* SEO Fields */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-white">SEO Settings</h4>
            <div className="grid gap-3">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-zinc-400 tracking-wide">SEO Title</label>
                <input 
                  placeholder="e.g. AZ-900 Azure Fundamentals Practice Questions" 
                  value={newExam.seo_title} 
                  onChange={e=>setNewExam(n=>({...n, seo_title:e.target.value}))} 
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1" 
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-zinc-400 tracking-wide">SEO H1</label>
                <input 
                  placeholder="e.g. Master the AZ-900 Azure Fundamentals Exam" 
                  value={newExam.seo_h1} 
                  onChange={e=>setNewExam(n=>({...n, seo_h1:e.target.value}))} 
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1" 
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-zinc-400 tracking-wide">Meta Description</label>
                <textarea 
                  placeholder="Practice AZ-900 Azure Fundamentals with our comprehensive exam questions..." 
                  value={newExam.seo_meta_description} 
                  onChange={e=>setNewExam(n=>({...n, seo_meta_description:e.target.value}))} 
                  rows={2}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1" 
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase text-zinc-400 tracking-wide">SEO Keywords</label>
                  <textarea 
                    placeholder="azure, fundamentals, az-900, cloud, microsoft" 
                    value={newExam.seo_keywords} 
                    onChange={e=>setNewExam(n=>({...n, seo_keywords:e.target.value}))} 
                    rows={2}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase text-zinc-400 tracking-wide">Google Snippet</label>
                  <textarea 
                    placeholder="Free AZ-900 practice questions. Prepare for Azure Fundamentals..." 
                    value={newExam.seo_google_snippet} 
                    onChange={e=>setNewExam(n=>({...n, seo_google_snippet:e.target.value}))} 
                    rows={2}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1" 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-zinc-400 tracking-wide">Canonical URL</label>
                <input 
                  placeholder="e.g. https://example.com/exams/az-900" 
                  value={newExam.seo_canonical_url} 
                  onChange={e=>setNewExam(n=>({...n, seo_canonical_url:e.target.value}))} 
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1" 
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-3 border-t border-zinc-700">
            <button 
              onClick={createExam} 
              disabled={!newExam.exam_code || !newExam.exam_name || creating || !!codeValidationError} 
              className="flex-1 px-3 py-2 rounded bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
            >
              {creating ? 'Creating...' : 'Create Exam'}
            </button>
            <button 
              onClick={()=>{ resetNew(); setTemplateExam(null); setSelectedTemplateId(''); setShowCreateForm(false); setCodeValidationError(''); }} 
              type="button" 
              className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-sm"
            >
              Cancel
            </button>
          </div>
          <p className="text-[10px] text-zinc-500 pt-1">
            Fields marked with * are required. Exam code must be unique.
            {templateExam && ` Template data from "${templateExam.exam_code}" has been pre-filled - modify as needed.`}
          </p>
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-700">
            <thead className="bg-zinc-800">
              <tr>
                {['ID','Code','Name','Vendor','Active','Featured','Difficulty','Order','Questions','Updated','Actions'].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700">
              {loading && (
                <tr><td colSpan={12} className="px-4 py-8 text-center text-zinc-400">Loading exams...</td></tr>
              )}
              {!loading && visiblePages.length === 0 && (
                <tr><td colSpan={12} className="px-4 py-8 text-center text-zinc-500 text-sm">No exams found.</td></tr>
              )}
              {!loading && visiblePages.map(ep => {
                const isEditing = editingId === ep.id;
                const isExpanded = expandedId === ep.id;
                return (
                <>
                <tr key={ep.id} className="hover:bg-zinc-800 text-sm">
                  <td className="px-4 py-2 font-mono text-xs text-zinc-500">{ep.id}</td>
                  <td className="px-4 py-2 font-medium">{ep.exam_code}</td>
                  <td className="px-4 py-2">{isEditing ? (
                    <input title="Exam Name (exam_name)" value={draft.exam_name || ''} onChange={e=>updateField('exam_name', e.target.value)} className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-sm w-40" />
                  ) : ep.exam_name}</td>
                  <td className="px-4 py-2 text-zinc-400">{isEditing ? (
                    <input title="Vendor (vendor)" value={draft.vendor || ''} onChange={e=>updateField('vendor', e.target.value)} className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-sm w-28" />
                  ) : (ep.vendor || '-')}</td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <select title="Active (is_active)" value={draft.is_active ? '1':'0'} onChange={e=>updateField('is_active', e.target.value==='1')} className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-xs">
                        <option value="1">Yes</option>
                        <option value="0">No</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs ${ep.is_active ? 'bg-green-900 text-green-300' : 'bg-zinc-700 text-zinc-300'}`}>{ep.is_active ? 'Yes' : 'No'}</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <select title="Featured (is_featured)" value={draft.is_featured ? '1':'0'} onChange={e=>updateField('is_featured', e.target.value==='1')} className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-xs">
                        <option value="1">Yes</option>
                        <option value="0">No</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs ${ep.is_featured ? 'bg-yellow-900 text-yellow-300' : 'bg-zinc-700 text-zinc-300'}`}>{ep.is_featured ? 'Yes' : 'No'}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-zinc-400">{isEditing ? (
                    <input title="Difficulty Level (difficulty_level)" value={draft.difficulty_level || ''} onChange={e=>updateField('difficulty_level', e.target.value)} className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-sm w-28" />
                  ) : (ep.difficulty_level || '-')}</td>
                  <td className="px-4 py-2 text-zinc-400">{isEditing ? (
                    <input title="Display Order (display_order)" type="number" value={draft.display_order ?? ''} onChange={e=>updateField('display_order', e.target.value===''? null : Number(e.target.value))} className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-sm w-20" />
                  ) : (ep.display_order ?? '-')}</td>
                  <td className="px-4 py-2 text-zinc-400">{ep.question_count ?? 0}</td>
                  <td className="px-4 py-2 text-zinc-400 whitespace-nowrap text-xs">{ep.updated_at ? new Date(ep.updated_at).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-2 text-right space-x-1 whitespace-nowrap">
                    <button onClick={()=>toggleExpand(ep)} className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-xs rounded">{isExpanded ? 'Close' : 'SEO'}</button>
                    {!isEditing && (
                      <button 
                        onClick={()=>createFromTemplate(ep)} 
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-xs rounded"
                        title="Use as template for new exam"
                      >
                        Copy
                      </button>
                    )}
                    {isEditing ? (
                      <>
                        <button onClick={commit} className="px-2 py-1 bg-green-600 hover:bg-green-500 text-xs rounded">Save</button>
                        <button onClick={cancelEdit} className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-xs rounded">Cancel</button>
                      </>
                    ) : (
                      <button onClick={()=>startEdit(ep)} className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-xs rounded">Edit</button>
                    )}
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="bg-zinc-950/40">
                    <td colSpan={12} className="px-6 py-4">
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs mb-4">
                        <div>
                          <label className="block text-zinc-400 mb-1">Header Label</label>
                          <input title="Header Label (header_label)" value={draft.header_label || ''} onChange={e=>updateField('header_label', e.target.value)} className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1" />
                        </div>
                        <div>
                          <label className="block text-zinc-400 mb-1">URL Path</label>
                          <input title="URL Path (url_path)" value={draft.url_path || ''} onChange={e=>updateField('url_path', e.target.value)} className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1" />
                        </div>
                        <div>
                          <label className="block text-zinc-400 mb-1">Icon Name</label>
                          <input title="Icon Name (icon_name)" value={draft.icon_name || ''} onChange={e=>updateField('icon_name', e.target.value)} className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1" />
                        </div>
                        <div className="lg:col-span-3">
                          <label className="block text-zinc-400 mb-1">SEO Title</label>
                          <input title="SEO Title (seo_title)" value={draft.seo_title || ''} onChange={e=>updateField('seo_title', e.target.value)} className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1" />
                        </div>
                        <div className="lg:col-span-3">
                          <label className="block text-zinc-400 mb-1">SEO H1</label>
                          <input title="SEO H1 (seo_h1)" value={draft.seo_h1 || ''} onChange={e=>updateField('seo_h1', e.target.value)} className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1" />
                        </div>
                        <div className="lg:col-span-3">
                          <label className="block text-zinc-400 mb-1">Meta Description</label>
                          <textarea title="Meta Description (seo_meta_description)" value={draft.seo_meta_description || ''} onChange={e=>updateField('seo_meta_description', e.target.value)} rows={2} className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1" />
                        </div>
                        <div className="lg:col-span-3">
                          <label className="block text-zinc-400 mb-1">SEO Keywords</label>
                          <textarea title="SEO Keywords (seo_keywords)" value={draft.seo_keywords || ''} onChange={e=>updateField('seo_keywords', e.target.value)} rows={2} className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1" />
                        </div>
                        <div>
                          <label className="block text-zinc-400 mb-1">Canonical URL</label>
                          <input title="Canonical URL (seo_canonical_url)" value={draft.seo_canonical_url || ''} onChange={e=>updateField('seo_canonical_url', e.target.value)} className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1" />
                        </div>
                        <div>
                          <label className="block text-zinc-400 mb-1">Google Snippet</label>
                          <textarea title="Google Snippet (seo_google_snippet)" value={draft.seo_google_snippet || ''} onChange={e=>updateField('seo_google_snippet', e.target.value)} rows={2} className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1" />
                        </div>
                        <div>
                          <label className="block text-zinc-400 mb-1">Estimated Duration (estimated_duration)&quot;</label>
                          <input title="Estimated Duration (estimated_duration)" type="number" value={draft.estimated_duration ?? ''} onChange={e=>updateField('estimated_duration', e.target.value===''? null : Number(e.target.value))} className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1" />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={()=>saveSeo(ep.id)} className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-xs rounded">Save SEO</button>
                        <button onClick={()=>setExpandedId(null)} className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-xs rounded">Close</button>
                      </div>
                    </td>
                  </tr>
                )}
                </>
              );})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
