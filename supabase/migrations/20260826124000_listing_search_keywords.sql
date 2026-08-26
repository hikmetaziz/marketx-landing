-- MarktX: seller-provided internal search terms for listings.

alter table public.listings
  add column if not exists search_keywords text not null default '';

alter table public.listings
  drop constraint if exists listings_search_keywords_length_check;

alter table public.listings
  add constraint listings_search_keywords_length_check
  check (char_length(search_keywords) <= 500);

create index if not exists listings_search_keywords_trgm_idx
  on public.listings
  using gin (search_keywords extensions.gin_trgm_ops)
  where search_keywords <> '';
