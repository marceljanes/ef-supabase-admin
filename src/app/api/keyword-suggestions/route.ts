import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

interface ExamLite { vendor?: string | null; exam_code: string; exam_name?: string | null; is_active?: boolean | null }

// Generate keyword ideas for a single exam
function buildKeywords(exam: ExamLite, opts: { month: string; year: number; includeDumps: boolean }) {
  const vendor = (exam.vendor || '').trim();
  const code = (exam.exam_code || '').trim();
  const name = (exam.exam_name || '').trim();
  const baseId = code || name || `${vendor}`;
  const monthYear = `${opts.month} ${opts.year}`;

  const parts = new Set<string>();

  const add = (s: string) => { if (s && s.indexOf('  ') === -1) parts.add(s.trim()); };

  const primaryVariants = [code, name].filter(Boolean);

  const datedTag = `updated ${monthYear}`;

  const cores = [
    '{X} practice exam',
    'free {X} questions',
    '{X} practice test',
    '{X} practice questions',
    '{X} sample questions',
    '{X} practice exam 2025',
    '{X} study guide',
    '{X} cheat sheet',
    '{X} exam tips',
    '{X} question bank',
    'realistic {X} simulator',
    '{X} mock test',
    '{X} scenario questions',
    '{X} flashcards',
    '{X} domains explained',
    '{X} difficulty',
    'how to pass {X}',
    'free {X} practice questions with explanations',
    `${datedTag} {X} questions`,
  ];

  if (opts.includeDumps) {
    cores.push('{X} exam dumps');
  }

  // Build combinations for code & name
  primaryVariants.forEach(v => {
    cores.forEach(t => add(t.replace('{X}', v)));
  });

  // Vendor + code combos
  if (vendor && code) {
    [
      `${vendor} ${code} practice exam`,
      `${vendor} ${code} questions`,
      `free ${vendor} ${code} questions`,
      `${vendor} ${code} mock test`,
      `${vendor} ${code} exam tips`,
      `${vendor} ${code} study guide`,
      `${vendor} ${code} practice questions with explanations`,
    ].forEach(add);
  }

  // Vendor + name combos
  if (vendor && name) {
    [
      `${vendor} ${name} practice exam`,
      `${vendor} ${name} questions`,
      `free ${vendor} ${name} questions`,
      `${vendor} ${name} mock test`,
      `${vendor} ${name} study guide`,
    ].forEach(add);
  }

  // Generic high intent
  [
    'best', 'top', 'latest', 'updated', 'realistic'
  ].forEach(prefix => {
    primaryVariants.forEach(v => add(`${prefix} ${v} practice questions`));
  });

  return Array.from(parts).map(k => k.toLowerCase());
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const vendorFilter = searchParams.get('vendor')?.trim() || null;
    const codeFilter = searchParams.get('exam_code')?.trim() || null;
    const limit = parseInt(searchParams.get('limit') || '0', 10);
    const includeDumps = searchParams.get('includeDumps') === '1';
    const format = (searchParams.get('format') || '').toLowerCase();
    const activeOnly = searchParams.get('activeOnly') === '1';

    const { data, error } = await supabase
      .from('exam_pages')
      .select('vendor, exam_code, exam_name, is_active')
      .order('display_order', { ascending: true })
      .order('exam_code', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let exams: ExamLite[] = (data || []).filter(e => !!e.exam_code);
    if (activeOnly) exams = exams.filter(e => e.is_active);
    if (vendorFilter) exams = exams.filter(e => (e.vendor || '').toLowerCase() === vendorFilter.toLowerCase());
    if (codeFilter) exams = exams.filter(e => e.exam_code.toLowerCase() === codeFilter.toLowerCase());
    if (limit && exams.length > limit) exams = exams.slice(0, limit);

    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'long' });
    const year = now.getFullYear();

    const examsWithKeywords = exams.map(exam => {
      const keywords = buildKeywords(exam, { month, year, includeDumps });
      return { ...exam, keyword_count: keywords.length, keywords };
    });

    const totalKeywords = examsWithKeywords.reduce((acc, e) => acc + e.keyword_count, 0);

    if (format === 'csv') {
      // Flatten combinations
      const header = ['vendor','exam_code','exam_name','is_active','keyword'];
      const lines: string[] = [header.join(',')];
      const escape = (v: any) => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        if (/[",\n]/.test(s)) return '"' + s.replace(/"/g,'""') + '"';
        return s;
      };
      for (const ex of examsWithKeywords) {
        for (const kw of ex.keywords) {
          lines.push([
            escape(ex.vendor || ''),
            escape(ex.exam_code),
            escape(ex.exam_name || ''),
            escape(ex.is_active),
            escape(kw)
          ].join(','));
        }
      }
      const csv = lines.join('\n');
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="exam_keywords_${now.toISOString().slice(0,10)}.csv"`
        }
      });
    }

    return NextResponse.json({
      generated_at: now.toISOString(),
      filters: { vendor: vendorFilter, exam_code: codeFilter, includeDumps, activeOnly },
      exams: examsWithKeywords,
      exam_count: examsWithKeywords.length,
      total_keywords: totalKeywords,
    });
  } catch (e: any) {
    console.error('keyword-suggestions error', e?.message || e);
    return NextResponse.json({ error: e?.message || 'internal error' }, { status: 500 });
  }
}
