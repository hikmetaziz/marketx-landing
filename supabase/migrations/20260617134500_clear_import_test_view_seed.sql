-- Keep preflight/test rows out of displayed view seeding.

alter table public.listings disable trigger listings_before_update;

update public.listings
set view_seed = 0
where source = 'turbo_nbk_motors'
  and (
    source_url like 'import-test://%'
    or title = 'NBK Motors import test'
  );

alter table public.listings enable trigger listings_before_update;
