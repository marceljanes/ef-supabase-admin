import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'

// Allow both naming conventions
const openaiKey = process.env.OPENAI_API_KEY || process.env.OPEN_AI_KEY

interface HybridRow { id: string; score: number; exam_code?: string | null; category?: string | null; level?: string | null; similarity?: number; }

export async function POST(req: Request) {
  try {
    console.log('=== AI SEARCH DEBUG START ===')
    console.log('OpenAI key exists:', !!openaiKey)
    
    if (!openaiKey) {
      console.log('ERROR: OpenAI key missing')
      return NextResponse.json({ error: 'OpenAI key missing server-side' }, { status: 500 })
    }

    const body = await req.json().catch(() => ({}))
    console.log('Request body:', body)
    
    const {
      query,
      limit = 25,
      threshold = 0.6,
      exam_code = null,
      category = null,
      level = null,
      mode = 'hybrid', // 'hybrid' | 'vector'
      weight_vector = 0.7,
      weight_fts = 0.25,
      weight_trgm = 0.05,
    } = body || {}

    console.log('Parsed params:', { query, limit, threshold, exam_code, category, level, mode })

    if (!query || typeof query !== 'string' || !query.trim()) {
      console.log('ERROR: Invalid query:', query)
      return NextResponse.json({ error: 'query required' }, { status: 400 })
    }

    // Embedding
    console.log('Creating OpenAI client...')
    const openai = new OpenAI({ apiKey: openaiKey })
    let embedding: number[]
    try {
      console.log('Requesting embedding for:', query.trim())
      const embResp = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query.trim(),
      })
      embedding = embResp.data?.[0]?.embedding as number[]
      console.log('Embedding received, length:', embedding?.length)
      if (!embedding) throw new Error('no embedding returned')
    } catch (e: any) {
      console.log('Embedding failed:', e?.message || e)
      return NextResponse.json({ error: 'embedding failed: ' + (e?.message || e) }, { status: 500 })
    }

    let results: HybridRow[] = []

    const applySimpleFilters = (rows: HybridRow[]) => rows.filter(r => (
      (exam_code ? r.exam_code === exam_code : true) &&
      (category ? r.category === category : true) &&
      (level ? r.level === level : true)
    ))

    if (mode === 'vector') {
      console.log('Using vector search mode')
      const { data, error } = await supabase.rpc('match_questions', {
        p_query_embedding: embedding,
        p_match_count: limit,
        p_similarity_threshold: threshold,
        p_filter_exam: exam_code,
        p_filter_category: category,
        p_filter_level: level,
      })
      console.log('Vector search result:', { data: data?.length, error: error?.message })
      if (error) {
        console.error('vector RPC error', error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      results = (data || []).map((r: any) => ({ ...r, score: r.similarity }))
      console.log('Vector results before filtering:', results.length)
      results = applySimpleFilters(results)
      console.log('Vector results after filtering:', results.length)
    } else {
      // Hybrid attempt
      console.log('Using hybrid search mode')
      const { data, error } = await supabase.rpc('hybrid_match_questions', {
        p_query: query.trim(),
        p_embedding: embedding,
        p_w_vec: weight_vector,
        p_w_fts: weight_fts,
        p_w_trgm: weight_trgm,
        p_match_count: limit,
        p_filter_exam: exam_code,
        p_filter_category: category,
        p_filter_level: level,
      })
      console.log('Hybrid search result:', { data: data?.length, error: error?.message })
      if (error) {
        const msg = (error.message || '').toLowerCase()
        // Fallback to vector-only if hybrid function missing
        if (msg.includes('does not exist') || msg.includes('hybrid_match_questions')) {
          console.warn('hybrid_match_questions not found – falling back to vector search')
          const { data: vecData, error: vecErr } = await supabase.rpc('match_questions', {
            p_query_embedding: embedding,
            p_match_count: limit,
            p_similarity_threshold: threshold,
            p_filter_exam: exam_code,
            p_filter_category: category,
            p_filter_level: level,
          })
          console.log('Fallback vector search result:', { data: vecData?.length, error: vecErr?.message })
          if (vecErr) {
            console.error('fallback vector RPC error', vecErr.message)
            return NextResponse.json({ error: vecErr.message }, { status: 500 })
          }
          results = (vecData || []).map((r: any) => ({ ...r, score: r.similarity }))
          console.log('Fallback results before filtering:', results.length)
          results = applySimpleFilters(results)
          console.log('Fallback results after filtering:', results.length)
        } else {
          console.error('hybrid RPC error', error.message)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
      } else {
        console.log('Hybrid raw results with scores:', (data || []).slice(0, 5).map(r => ({ id: r.id, score: r.score, exam: r.exam_code })))
        results = (data || []).filter((r: any) => r.score >= threshold)
        console.log('Hybrid results after threshold filtering:', results.length)
        if (results.length === 0 && data && data.length > 0) {
          console.log('All results filtered out. Highest score:', Math.max(...(data as any[]).map((r: any) => r.score || 0)))
          console.log('Threshold:', threshold)
        }
      }
    }

    // Fetch full rows & merge
    const ids = results.map(r => r.id).filter(Boolean)
    console.log('IDs to fetch:', ids.length)
    let full: any[] = []
    if (ids.length) {
      const { data: rows, error: qErr } = await supabase
        .from('questions')
        .select('*')
        .in('id', ids)
      if (qErr) {
        console.warn('fetch rows error', qErr.message)
      } else {
        full = rows || []
        console.log('Fetched full rows:', full.length)
      }
    }

    const byId = Object.fromEntries(full.map(r => [r.id, r]))
    const enriched = results
      .map(r => ({ ...byId[r.id], ...r }))
      .filter(r => r && r.id)
    
    console.log('Final enriched results:', enriched.length)
    console.log('=== AI SEARCH DEBUG END ===')

    return NextResponse.json({
      query,
      mode: mode === 'hybrid' ? (results.length && 'hybrid') : 'vector',
      count: enriched.length,
      results: enriched,
    })
  } catch (e: any) {
    console.error('semantic-search route error', e?.message || e)
    return NextResponse.json({ error: e?.message || 'internal error' }, { status: 500 })
  }
}
