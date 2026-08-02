-- MarktX: statik nümunə elanlar (veb kodunda) — DB yoxlaması
-- Bu 4 elan Supabase listings cədvəlində YOXDUR; src/constants/data.ts-də idi.
-- Kateqoriya səhifələrində boş fallback kimi göstərilirdi (Xidmətlər, Digər və s.).

-- === 1) DB-də varmı? (nəticə: 0 sətir) ===
select id, slug, title, category, status, is_sample, source
from public.listings
where slug in (
  'paltaryuyan-masin',
  'tozsoran',
  'robot-tozsoran',
  'blender'
);

-- === 2) Başlıq ilə axtar (təsadüfi uyğunluq) ===
select id, slug, title, category, status
from public.listings
where lower(title) in (
  lower('Paltaryuyan maşın'),
  lower('Tozsoran'),
  lower('Robot tozsoran'),
  lower('Blender')
);

-- === 3) Əgər gələcəkdə DB-yə düşsə — silmə (hazırda işlətməyin, 0 sətir) ===
-- delete from public.listings
-- where slug in (
--   'paltaryuyan-masin',
--   'tozsoran',
--   'robot-tozsoran',
--   'blender'
-- );
