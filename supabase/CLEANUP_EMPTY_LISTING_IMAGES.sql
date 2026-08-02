-- MarktX: DB-də şəkil URL-i boş olan elanları silmək
-- Supabase SQL Editor-də əvvəl SELECT, sonra DELETE işlədin.
--
-- Qeyd: Storage-dan silinmiş, amma URL qalan elanlar (400) bu sorğu ilə silinmir.
-- Veb artıq həmin elanları avtomatik gizlədir (image-reachability).

-- === 1) Yoxlama ===
select id, slug, title, status, image_url, image_urls, created_at
from public.listings l
where
  coalesce(nullif(trim(l.image_url), ''), '') = ''
  and (
    l.image_urls is null
    or cardinality(l.image_urls) = 0
    or not exists (
      select 1
      from unnest(coalesce(l.image_urls, '{}'::text[])) as u(url)
      where coalesce(nullif(trim(url), ''), '') <> ''
    )
  )
order by created_at desc;

-- === 2) Silmə (yalnız yoxladıqdan sonra) ===
-- delete from public.listings l
-- where
--   coalesce(nullif(trim(l.image_url), ''), '') = ''
--   and (
--     l.image_urls is null
--     or cardinality(l.image_urls) = 0
--     or not exists (
--       select 1
--       from unnest(coalesce(l.image_urls, '{}'::text[])) as u(url)
--       where coalesce(nullif(trim(url), ''), '') <> ''
--     )
--   );
