alter table public.listings
  add column if not exists source_url text;

create unique index if not exists listings_source_url_unique_idx
  on public.listings (source_url)
  where source_url is not null;

create index if not exists listings_source_idx
  on public.listings (source);
