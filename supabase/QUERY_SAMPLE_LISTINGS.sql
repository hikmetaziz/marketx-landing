-- MarktX: DB-dəki nümunə elanlar
-- Supabase SQL Editor-də işlədin.
--
-- Nümunə elan = is_sample true VƏ YA source 'sample'
-- (Veb saytdakı POPULAR_LISTINGS statik nümunələr DB-də deyil — src/constants/data.ts)

-- === 1) Say ===
select count(*) as numune_say
from public.listings l
where l.is_sample = true
   or l.source = 'sample';

-- === 2) Siyahı ===
select
  l.id,
  l.slug,
  l.title,
  l.price,
  l.category,
  l.city,
  l.status,
  l.is_sample,
  l.source,
  l.image_url,
  l.created_at
from public.listings l
where l.is_sample = true
   or l.source = 'sample'
order by l.created_at desc;

-- === 3) Status üzrə ===
select l.status, count(*) as say
from public.listings l
where l.is_sample = true
   or l.source = 'sample'
group by l.status
order by l.status;

-- === 4) Real elanlardan ayır (canlı elanlar) ===
select count(*) as canli_say
from public.listings l
where coalesce(l.is_sample, false) = false
  and coalesce(l.source, 'user') not in ('sample', 'old_ai_draft', 'import_test', 'test');

-- === 5) Silmə (yalnız yoxladıqdan sonra!) ===
-- delete from public.listings l
-- where l.is_sample = true
--    or l.source = 'sample';

-- === 6) Rədd et (silinməsin, status rejected) ===
-- update public.listings l
-- set
--   status = 'rejected',
--   rejected_reason = 'Nümunə elan — launch cleanup',
--   reviewed_at = now()
-- where l.is_sample = true
--    or l.source = 'sample';
