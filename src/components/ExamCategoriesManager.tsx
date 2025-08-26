import React, { useEffect, useState } from 'react';
import { dbService } from '@/lib/supabase';

interface ExamCategoryRow {
  id: number;
  exam_code: string;
  category_name: string;
  category_slug?: string;
  display_order?: number;
  description?: string;
  icon_name?: string;
  question_count?: number;
  estimated_time?: number;
  difficulty_level?: string;
  is_active?: boolean;
  is_featured?: boolean;
  seo_title?: string;
  seo_description?: string;
  created_at?: string;
  updated_at?: string;
}

interface ExamSelectOption { exam_code: string; exam_name: string; vendor?: string | null; }

export default function ExamCategoriesManager() {
  const [selectedExamCode, setSelectedExamCode] = useState<string>('');
  const [categories, setCategories] = useState<ExamCategoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newCat, setNewCat] = useState<Partial<ExamCategoryRow>>({ category_name: '', display_order: 0 });
  const [deleting, setDeleting] = useState<{[k:number]:boolean}>({});
  const [activeExams, setActiveExams] = useState<ExamSelectOption[]>([]);
  const [inactiveExams, setInactiveExams] = useState<ExamSelectOption[]>([]);
  // New vendor filter/search state
  const [vendorFilter, setVendorFilter] = useState<string>('');
  const [vendorSearch, setVendorSearch] = useState<string>('');

  useEffect(() => {
    if (selectedExamCode) {
      loadCategories(selectedExamCode);
    } else {
      setCategories([]);
    }
  }, [selectedExamCode]);

  useEffect(() => {
    (async () => {
      try {
        const pages = await dbService.getExamPages();
        const active = pages.filter((p: any) => p.is_active).map((p: any) => ({ exam_code: p.exam_code, exam_name: p.exam_name, vendor: p.vendor }));
        const inactive = pages.filter((p: any) => !p.is_active).map((p: any) => ({ exam_code: p.exam_code, exam_name: p.exam_name, vendor: p.vendor }));
        setActiveExams(active.sort((a,b)=>a.exam_code.localeCompare(b.exam_code)));
        setInactiveExams(inactive.sort((a,b)=>a.exam_code.localeCompare(b.exam_code)));
      } catch (e) {
        console.error('Failed loading exam pages', e);
      }
    })();
  }, []);

  const loadCategories = async (code: string) => {
    try {
      setLoading(true);
      const data = await dbService.getExamCategories(code);
      setCategories(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async () => {
    if (!selectedExamCode || !newCat.category_name) return;
    try {
      setAdding(true);
      const payload = {
        exam_code: selectedExamCode,
        category_name: newCat.category_name?.trim(),
        category_slug: (newCat.category_slug || newCat.category_name || '').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),
        display_order: newCat.display_order ?? (categories.length + 1),
        description: newCat.description || '',
        icon_name: newCat.icon_name || null,
        question_count: 0,
        estimated_time: newCat.estimated_time || 0,
        difficulty_level: newCat.difficulty_level || 'Intermediate',
        is_active: true,
        is_featured: false,
        seo_title: newCat.seo_title || null,
        seo_description: newCat.seo_description || null
      };
      const created = await dbService.createExamCategory(payload);
      setCategories(prev => [...prev, created]);
      setNewCat({ category_name: '', display_order: (payload.display_order || 0) + 1 });
    } catch (e) {
      console.error(e);
      alert('Create failed');
    } finally {
      setAdding(false);
    }
  };

  const deleteCategory = async (id: number) => {
    if (!confirm('Delete this category?')) return;
    try {
      setDeleting(d => ({ ...d, [id]: true }));
      await dbService.deleteExamCategory(id);
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      console.error(e);
      alert('Delete failed');
    } finally {
      setDeleting(d => ({ ...d, [id]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Vendor filter / search */}
      <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
        <div className="flex gap-3 flex-1 flex-wrap items-end">
          <div>
            <label className="block text-xs uppercase text-zinc-400 mb-1">Search Vendor</label>
            <input value={vendorSearch} onChange={e=>{ setVendorSearch(e.target.value); setSelectedExamCode(''); }} placeholder="e.g. AWS" className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm min-w-[180px]" />
          </div>
          <div>
            <label className="block text-xs uppercase text-zinc-400 mb-1">Vendor Filter</label>
            <select value={vendorFilter} onChange={e=>{ setVendorFilter(e.target.value); setSelectedExamCode(''); }} className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm min-w-[180px]">
              <option value="">All Vendors</option>
              {[...new Set([...activeExams, ...inactiveExams].map(e=> (e.vendor||'').trim()).filter(Boolean))]
                .filter(v => !vendorSearch || v.toLowerCase().includes(vendorSearch.toLowerCase()))
                .sort((a,b)=>a.localeCompare(b))
                .map(v=> <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          {(vendorFilter || vendorSearch) && (
            <button type="button" onClick={()=>{ setVendorFilter(''); setVendorSearch(''); }} className="h-9 px-3 text-xs rounded bg-zinc-700 hover:bg-zinc-600">Clear</button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1">
          <label className="block text-xs uppercase text-zinc-400 mb-1">Active Exams</label>
          <select value={selectedExamCode} onChange={e=>setSelectedExamCode(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm">
            <option value="">-- choose active exam --</option>
            {activeExams
              .filter(ex => (!vendorFilter || ex.vendor === vendorFilter) && (!vendorSearch || (ex.vendor||'').toLowerCase().includes(vendorSearch.toLowerCase())))
              .map(ex => <option key={ex.exam_code} value={ex.exam_code}>{ex.exam_code} – {ex.exam_name}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs uppercase text-zinc-400 mb-1">Inactive Exams</label>
          <select onChange={e=>{ if(e.target.value){ setSelectedExamCode(e.target.value);} }} className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm">
            <option value="">-- choose inactive exam --</option>
            {inactiveExams
              .filter(ex => (!vendorFilter || ex.vendor === vendorFilter) && (!vendorSearch || (ex.vendor||'').toLowerCase().includes(vendorSearch.toLowerCase())))
              .map(ex => <option key={ex.exam_code} value={ex.exam_code}>{ex.exam_code} – {ex.exam_name}</option>)}
          </select>
        </div>
      </div>

      {!selectedExamCode && (
        <div className="py-16 border border-dashed border-zinc-700 rounded-lg text-center text-sm text-zinc-400 bg-zinc-900/40">
          Select an exam above to view and manage categories.
        </div>
      )}

      {selectedExamCode && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Categories for {selectedExamCode}</h3>
            <span className="text-xs text-zinc-400">{categories.length} items</span>
          </div>

          {/* Add new category */}
          <div className="border border-zinc-700 rounded p-4 space-y-3 bg-zinc-950/40">
            <div className="grid md:grid-cols-5 gap-3 text-sm">
              <div className="md:col-span-2">
                <label className="block text-xs text-zinc-400 mb-1">Name*</label>
                <input value={newCat.category_name || ''} onChange={e=>setNewCat(c=>({...c, category_name: e.target.value}))} className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Order</label>
                <input type="number" value={newCat.display_order ?? ''} onChange={e=>setNewCat(c=>({...c, display_order: e.target.value===''? undefined : Number(e.target.value)}))} className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Icon</label>
                <input value={newCat.icon_name || ''} onChange={e=>setNewCat(c=>({...c, icon_name: e.target.value}))} className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Difficulty</label>
                <select value={newCat.difficulty_level || 'Intermediate'} onChange={e=>setNewCat(c=>({...c, difficulty_level: e.target.value}))} className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1">
                  {['Beginner','Intermediate','Advanced'].map(l=> <option key={l}>{l}</option>)}
                </select>
              </div>
              <div className="md:col-span-5">
                <label className="block text-xs text-zinc-400 mb-1">Description</label>
                <textarea rows={2} value={newCat.description || ''} onChange={e=>setNewCat(c=>({...c, description: e.target.value}))} className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1" />
              </div>
            </div>
            <div className="flex justify-end">
              <button disabled={adding || !newCat.category_name?.trim()} onClick={addCategory} className="px-3 py-1 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-xs rounded">{adding ? 'Saving...' : 'Add Category'}</button>
            </div>
          </div>

          {/* Category list */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-zinc-700">
              <thead className="bg-zinc-800 text-xs uppercase text-zinc-400">
                <tr>
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Order</th>
                  <th className="px-3 py-2 text-left">Questions</th>
                  <th className="px-3 py-2 text-left">Difficulty</th>
                  <th className="px-3 py-2 text-left">Active</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700">
                {loading && <tr><td colSpan={7} className="px-3 py-6 text-center text-zinc-400">Loading...</td></tr>}
                {!loading && categories.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-zinc-500">No categories</td></tr>}
                {categories.map(c => (
                  <tr key={c.id} className="hover:bg-zinc-800/60">
                    <td className="px-3 py-2 text-xs text-zinc-500 font-mono">{c.id}</td>
                    <td className="px-3 py-2">{c.category_name}</td>
                    <td className="px-3 py-2">{c.display_order}</td>
                    <td className="px-3 py-2 text-zinc-400">{c.question_count ?? 0}</td>
                    <td className="px-3 py-2 text-zinc-400">{c.difficulty_level}</td>
                    <td className="px-3 py-2">{c.is_active ? <span className="px-2 py-0.5 text-xs rounded bg-green-900 text-green-300">Yes</span> : <span className="px-2 py-0.5 text-xs rounded bg-zinc-700 text-zinc-300">No</span>}</td>
                    <td className="px-3 py-2 text-right">
                      <button disabled={deleting[c.id]} onClick={()=>deleteCategory(c.id)} className="px-2 py-1 bg-red-600 hover:bg-red-500 text-xs rounded disabled:opacity-40">{deleting[c.id] ? '...' : 'Delete'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
