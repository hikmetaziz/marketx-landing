-- Staging-only post-step for mobile migration 20260629120000_taxonomy_16_catalogue.sql.

update public.subcategories s
set
  slug = 'pese-kurslari',
  updated_at = now()
from public.categories c
where s.category_id = c.id
  and c.slug = 'tehsil-ve-kurslar'
  and s.slug like 'pe%e-kurslari';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.categories'::regclass
      and conname = 'categories_slug_format'
  ) then
    alter table public.categories
      add constraint categories_slug_format
      check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$') not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.subcategories'::regclass
      and conname = 'subcategories_slug_format'
  ) then
    alter table public.subcategories
      add constraint subcategories_slug_format
      check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$') not valid;
  end if;
end $$;

alter table public.categories validate constraint categories_slug_format;
alter table public.subcategories validate constraint subcategories_slug_format;
