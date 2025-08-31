#!/usr/bin/env node
/**
 * Embedding Backfill for `public.questions`
 * - Läuft idempotent (holt immer nur rows mit embedding IS NULL)
 * - Endet automatisch, wenn nichts mehr fehlt
 * - DRY-Run macht genau EINEN Batch und beendet (keine Endlosschleife)
 */

import 'dotenv/config'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

// ---------- CLI OPTIONS ----------
const args = process.argv.slice(2)
const opt = Object.fromEntries(
  args.map(a => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=')
    return [k, v]
  })
)
const BATCH = parseInt(opt.batch || '64', 10)       // DB-Fetch pro Runde
const EMB_GROUP = parseInt(opt.group || '32', 10)   // Inputs pro Embedding-Call
const SLEEP = parseInt(opt.sleep || '200', 10)      // ms Pause zwischen Calls
const DRY = opt.dry === 'true'                      // --dry=true macht nur 1 Batch
const MODEL = opt.model || 'text-embedding-3-small' // 1536D

// ---------- ENV ----------
const {
  OPENAI_API_KEY,
  OPEN_AI_KEY, // fallback
  SUPABASE_SERVICE_ROLE_KEY,
  SERVER_ROLE, // fallback name in your .env
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
} = process.env

// unify keys
const EFFECTIVE_OPENAI_KEY = OPENAI_API_KEY || OPEN_AI_KEY
const EFFECTIVE_SERVICE_ROLE = SUPABASE_SERVICE_ROLE_KEY || SERVER_ROLE

if (!EFFECTIVE_OPENAI_KEY) {
  console.error('❌ Missing OPENAI_API_KEY / OPEN_AI_KEY')
  process.exit(1)
}
if (!SUPABASE_URL) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL')
  process.exit(1)
}
if (!EFFECTIVE_SERVICE_ROLE) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY / SERVER_ROLE (Service Role). Updates werden sonst von RLS geblockt.')
  process.exit(1)
}

// ---------- CLIENTS ----------
const openai = new OpenAI({ apiKey: EFFECTIVE_OPENAI_KEY })
const supabase = createClient(SUPABASE_URL, EFFECTIVE_SERVICE_ROLE)

// ---------- HELPERS ----------
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const stripHtml = (s = '') => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

function build(row) {
  let answersText = ''
  try {
    const arr = typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers
    answersText = (arr || [])
      .map((a) => `- ${a.text}${a.isCorrect ? ' (correct)' : ''}`)
      .join('\n')
  } catch {
    answersText = String(row.answers || '')
  }
  return [
    row.category ? `[Category: ${row.category}]` : '',
    row.exam_code ? `[Exam: ${row.exam_code}]` : '',
    row.level ? `[Level: ${row.level}]` : '',
    `Q: ${row.question}`,
    answersText ? `Answers:\n${answersText}` : '',
    row.explanation ? `Explanation: ${stripHtml(String(row.explanation))}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

async function getMissingCount() {
  const { count, error } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .is('embedding', null)
  if (error) throw error
  return count || 0
}

async function fetchBatch(limit = BATCH) {
  const { data, error } = await supabase
    .from('questions')
    .select('id, question, answers, explanation, category, exam_code, level')
    .is('embedding', null)
    .order('id', { ascending: true })
    .limit(limit)
  if (error) throw error
  return data || []
}

async function embedMany(inputs, maxRetries = 5) {
  let attempt = 0
  // Exponential Backoff bei Rate Limits/Netz-Problemen
  // (429/5xx werden über try/catch erneut versucht)
  while (true) {
    try {
      const resp = await openai.embeddings.create({ model: MODEL, input: inputs })
      return resp.data.map(d => d.embedding)
    } catch (e) {
      attempt++
      if (attempt > maxRetries) throw e
      const wait = Math.min(2000 * attempt, 10000)
      console.warn(`⚠️  embedMany failed (attempt ${attempt}) -> retry in ${wait}ms`, e?.status || e?.message || e)
      await sleep(wait)
    }
  }
}

// ---------- MAIN ----------
async function processOneBatch() {
  const rows = await fetchBatch()
  if (rows.length === 0) return 0

  if (DRY) {
    console.log(`[DRY] Would embed ${rows.length} rows (batch=${BATCH}, group=${EMB_GROUP})`)
    return rows.length // nur EIN Batch in DRY
  }

  // in Gruppen an die API schicken
  for (let i = 0; i < rows.length; i += EMB_GROUP) {
    const slice = rows.slice(i, i + EMB_GROUP)
    const inputs = slice.map(build)

    let vectors
    try {
      vectors = await embedMany(inputs)
    } catch (e) {
      console.warn('❗ Gruppe fehlgeschlagen, überspringe diese Gruppe:', e?.message || e)
      continue
    }

    // Updates (einzeln = stabil; bei 1.4k Zeilen ok)
    for (let j = 0; j < slice.length; j++) {
      const id = slice[j].id
      const vector = vectors[j]
      const { error: upErr } = await supabase
        .from('questions')
        .update({ embedding: vector })
        .eq('id', id)
      if (upErr) {
        console.warn('Update failed for id=', id, upErr.message)
      } else {
        console.log('✅ Embedded', id)
      }
    }

    await sleep(SLEEP)
  }

  return rows.length
}

async function main() {
  console.log('▶️  Backfill start', { BATCH, EMB_GROUP, SLEEP, DRY, MODEL })
  if (MODEL === 'text-embedding-3-large') {
    console.warn('ℹ️  Achtung: 3-large liefert 3072D. Spalte muss dann vector(3072) sein.')
  }

  const missingStart = await getMissingCount()
  console.log(`📊 Missing embeddings (start): ${missingStart}`)

  let total = 0
  let batchNum = 0

  while (true) {
    batchNum++
    const processed = await processOneBatch()
    total += processed

    const missing = await getMissingCount()
    console.log(`Batch #${batchNum}: processed=${processed}, remaining=${missing}, total=${total}`)

    if (DRY) break
    if (processed === 0) break
  }

  const missingEnd = await getMissingCount()
  console.log(`🏁 Done. Total embedded this run: ${total}. Remaining NULL: ${missingEnd}`)
}

main().catch(e => {
  console.error('Fatal:', e)
  process.exit(1)
})
