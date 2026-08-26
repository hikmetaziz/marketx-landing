-- Search vocabulary lookup indexes

create index if not exists search_vocabulary_normalized_trgm_idx
  on public.search_vocabulary
  using gin (normalized_term extensions.gin_trgm_ops)
  where is_active = true;

analyze public.search_vocabulary;
