-- 1. Vector-only search function
-- Returns rows from questions table based on cosine similarity of embeddings
drop function if exists public.match_questions;
create function public.match_questions(
  p_query_embedding vector(1536),
  p_match_count int,
  p_similarity_threshold float,
  p_filter_exam text,
  p_filter_category text,
  p_filter_level text
)
returns table (
  id uuid,
  similarity float,
  exam_code text,
  category text,
  level text
)
language sql stable
as $$
  select
    q.id,
    1 - (q.embedding <=> p_query_embedding) as similarity,
    q.exam_code,
    q.category,
    q.level
  from
    public.questions q
  where 1 - (q.embedding <=> p_query_embedding) > p_similarity_threshold
    and (p_filter_exam is null or q.exam_code = p_filter_exam)
    and (p_filter_category is null or q.category = p_filter_category)
    and (p_filter_level is null or q.level = p_filter_level)
  order by
    similarity desc
  limit
    p_match_count;
$$;


-- 2. Hybrid search function (Vector + FTS + Trigram)
-- Uses Reciprocal Rank Fusion (RRF) to combine search results
drop function if exists public.hybrid_match_questions;
create function public.hybrid_match_questions(
  p_query text,
  p_embedding vector(1536),
  p_w_vec float,
  p_w_fts float,
  p_w_trgm float,
  p_match_count int,
  p_filter_exam text,
  p_filter_category text,
  p_filter_level text
)
returns table (
  id uuid,
  score float,
  exam_code text,
  category text,
  level text
)
language plpgsql
as $$
#variable_conflict use_column
declare
  query_ts tsquery;
begin
  query_ts := websearch_to_tsquery('simple', p_query);

  return query
  with
  vector_search as (
    select
      q.id,
      1 - (q.embedding <=> p_embedding) as score,
      row_number() over (order by (q.embedding <=> p_embedding) asc) as rank
    from
      public.questions q
    where (p_filter_exam is null or q.exam_code = p_filter_exam)
      and (p_filter_category is null or q.category = p_filter_category)
      and (p_filter_level is null or q.level = p_filter_level)
  ),
  fts_search as (
    select
      q.id,
      ts_rank(to_tsvector('simple', q.searchable_text), query_ts) as score,
      row_number() over (order by ts_rank(to_tsvector('simple', q.searchable_text), query_ts) desc) as rank
    from
      public.questions q
    where to_tsvector('simple', q.searchable_text) @@ query_ts
      and (p_filter_exam is null or q.exam_code = p_filter_exam)
      and (p_filter_category is null or q.category = p_filter_category)
      and (p_filter_level is null or q.level = p_filter_level)
  ),
  trgm_search as (
    select
      q.id,
      similarity(q.searchable_text, p_query) as score,
      row_number() over (order by similarity(q.searchable_text, p_query) desc) as rank
    from
      public.questions q
    where similarity(q.searchable_text, p_query) > 0.1 -- Pre-filter for performance
      and (p_filter_exam is null or q.exam_code = p_filter_exam)
      and (p_filter_category is null or q.category = p_filter_category)
      and (p_filter_level is null or q.level = p_filter_level)
  ),
  -- Reciprocal Rank Fusion (RRF)
  -- k is a constant, 60 is a common value
  rrf as (
    select
      coalesce(vs.id, fs.id, ts.id) as id,
      (p_w_vec * (1.0 / (60 + vs.rank))) +
      (p_w_fts * (1.0 / (60 + fs.rank))) +
      (p_w_trgm * (1.0 / (60 + ts.rank))) as score
    from
      vector_search vs
    full outer join
      fts_search fs on vs.id = fs.id
    full outer join
      trgm_search ts on coalesce(vs.id, fs.id) = ts.id
  )
  select
    r.id,
    r.score,
    q.exam_code,
    q.category,
    q.level
  from
    rrf r
  join
    public.questions q on r.id = q.id
  order by
    r.score desc
  limit
    p_match_count;
end;
$$;
