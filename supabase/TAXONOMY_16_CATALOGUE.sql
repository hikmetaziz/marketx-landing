-- MarktX: 16 kateqoriya taxonomy + subcategories + aliases + catalogue meta
-- Supabase SQL Editor-də işlədin (mobil app + veb paylaşılan DB).
--
-- Təsdiqlənmiş qərarlar (2026-06-29):
-- - 16 top-level (veb catalogue PNG slug-ları ilə eyni)
-- - Telefon, Məişət texnikası, Mebel ayrı top-level
-- - İdman və hobbi → diger altında (top-level deaktiv)
-- - neqliyyat → avtomobil-ve-neqliyyat rename
-- - usaq-alemi → usaq-mehsullari rename
-- - icon_key (MaterialIcons) + catalogue_image_path (marketx.az PNG)

-- =============================================================================
-- 0) Catalogue meta sütunları
-- =============================================================================
alter table public.categories
  add column if not exists icon_key text,
  add column if not exists catalogue_image_path text,
  add column if not exists color_hex text,
  add column if not exists home_visible boolean not null default true;

-- =============================================================================
-- 1) Slug rename (FK-lər category id ilə qalır)
-- =============================================================================
update public.categories
set
  slug = 'avtomobil-ve-neqliyyat',
  name = 'Avtomobil və nəqliyyat',
  sort_order = 20,
  is_active = true,
  icon_key = 'directions-car',
  catalogue_image_path = '/images/catalogue/avtomobil-ve-neqliyyat.png',
  color_hex = '#D1FAE5',
  home_visible = true
where slug = 'neqliyyat';

update public.categories
set
  slug = 'usaq-mehsullari',
  name = 'Uşaq məhsulları',
  sort_order = 110,
  is_active = true,
  icon_key = 'child-care',
  catalogue_image_path = '/images/catalogue/usaq-mehsullari.png',
  color_hex = '#FFEDD5',
  home_visible = true
where slug = 'usaq-alemi';

-- =============================================================================
-- 2) Mövcud aktiv kateqoriyaları yenilə
-- =============================================================================
update public.categories set sort_order = 10, icon_key = 'apartment', catalogue_image_path = '/images/catalogue/dasinmaz-emlak.png', color_hex = '#FEE2E2', home_visible = true, is_active = true where slug = 'dasinmaz-emlak';
update public.categories set sort_order = 40, icon_key = 'devices', catalogue_image_path = '/images/catalogue/elektronika.png', color_hex = '#E0E7FF', home_visible = true, is_active = true where slug = 'elektronika';
update public.categories set sort_order = 60, icon_key = 'yard', catalogue_image_path = '/images/catalogue/ev-ve-bag.png', color_hex = '#FEF3C7', home_visible = true, is_active = true where slug = 'ev-ve-bag';
update public.categories set sort_order = 80, icon_key = 'checkroom', catalogue_image_path = '/images/catalogue/geyim-ve-aksesuar.png', color_hex = '#FCE7F3', home_visible = true, is_active = true where slug = 'geyim-ve-aksesuar';
update public.categories set sort_order = 90, icon_key = 'handyman', catalogue_image_path = '/images/catalogue/xidmetler.png', color_hex = '#ECFEFF', home_visible = true, is_active = true where slug = 'xidmetler';
update public.categories set sort_order = 130, icon_key = 'store', catalogue_image_path = '/images/catalogue/biznes-ve-avadanliq.png', color_hex = '#E2E8F0', home_visible = true, is_active = true where slug = 'biznes-ve-avadanliq';
update public.categories set sort_order = 160, icon_key = 'category', catalogue_image_path = '/images/catalogue/diger.png', color_hex = '#F1F5F9', home_visible = true, is_active = true where slug = 'diger';

-- Telefon: ayrı top-level (elektronika altından çıxır)
update public.categories
set
  name = 'Telefon',
  sort_order = 30,
  is_active = true,
  icon_key = 'smartphone',
  catalogue_image_path = '/images/catalogue/telefon.png',
  color_hex = '#DBEAFE',
  home_visible = true
where slug = 'telefon';

-- Legacy deaktiv
update public.categories set is_active = false, home_visible = false where slug in ('avto', 'geyim', 'idman-ve-hobbi');

-- =============================================================================
-- 3) Yeni top-level kateqoriyalar
-- =============================================================================
insert into public.categories (slug, name, sort_order, is_active, icon_key, catalogue_image_path, color_hex, home_visible)
values
  ('meiset-texnikasi', 'Məişət texnikası', 50, true, 'kitchen', '/images/catalogue/meiset-texnikasi.png', '#E0F2FE', true),
  ('mebel-ve-interyer', 'Mebel və interyer', 70, true, 'weekend', '/images/catalogue/mebel-ve-interyer.png', '#F3E8FF', true),
  ('is-elanlari', 'İş elanları', 100, true, 'work', '/images/catalogue/is-elanlari.png', '#FEF9C3', true),
  ('heyvanlar', 'Heyvanlar', 120, true, 'pets', '/images/catalogue/heyvanlar.png', '#DCFCE7', true),
  ('temir-ve-ustalar', 'Təmir və ustalar', 140, true, 'build', '/images/catalogue/temir-ve-ustalar.png', '#FFEDD5', true),
  ('tehsil-ve-kurslar', 'Təhsil və kurslar', 150, true, 'school', '/images/catalogue/tehsil-ve-kurslar.png', '#EDE9FE', true)
on conflict (slug) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  icon_key = excluded.icon_key,
  catalogue_image_path = excluded.catalogue_image_path,
  color_hex = excluded.color_hex,
  home_visible = excluded.home_visible;

-- Telefon yoxdursa insert (bəzi DB-lərdə yalnız deaktiv row var)
insert into public.categories (slug, name, sort_order, is_active, icon_key, catalogue_image_path, color_hex, home_visible)
values ('telefon', 'Telefon', 30, true, 'smartphone', '/images/catalogue/telefon.png', '#DBEAFE', true)
on conflict (slug) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = true,
  icon_key = excluded.icon_key,
  catalogue_image_path = excluded.catalogue_image_path,
  color_hex = excluded.color_hex,
  home_visible = true;

-- =============================================================================
-- 4) Subcategories — 16 × 6
-- =============================================================================
with seeded(category_slug, slug, name, sort_order) as (
  values
    -- 1 Daşınmaz əmlak
    ('dasinmaz-emlak', 'menziller', 'Mənzillər', 10),
    ('dasinmaz-emlak', 'heyet-evi-villa', 'Həyət evi / villa', 20),
    ('dasinmaz-emlak', 'torpaq', 'Torpaq', 30),
    ('dasinmaz-emlak', 'obyekt-ofis', 'Obyekt / ofis', 40),
    ('dasinmaz-emlak', 'qaraj', 'Qaraj', 50),
    ('dasinmaz-emlak', 'gunluk-kiraye', 'Günlük kirayə', 60),
    -- 2 Avtomobil
    ('avtomobil-ve-neqliyyat', 'minik-avtomobili', 'Minik avtomobilləri', 10),
    ('avtomobil-ve-neqliyyat', 'motosiklet', 'Motosiklet', 20),
    ('avtomobil-ve-neqliyyat', 'kommersiya-neqliyyati', 'Kommersiya nəqliyyatı', 30),
    ('avtomobil-ve-neqliyyat', 'ehtiyat-hisseleri', 'Ehtiyat hissələri', 40),
    ('avtomobil-ve-neqliyyat', 'avto-aksesuarlar', 'Avto aksesuarlar', 50),
    ('avtomobil-ve-neqliyyat', 'avto-xidmetler', 'Avto xidmətlər', 60),
    -- 3 Telefon
    ('telefon', 'smartfonlar', 'Smartfonlar', 10),
    ('telefon', 'dymeli-telefonlar', 'Düyməli telefonlar', 20),
    ('telefon', 'planshetler', 'Planşetlər', 30),
    ('telefon', 'smart-saatlar', 'Smart saatlar', 40),
    ('telefon', 'telefon-aksesuarlari', 'Telefon aksesuarları', 50),
    ('telefon', 'telefon-ehtiyat-hisseleri', 'Ehtiyat hissələri', 60),
    -- 4 Elektronika (telefonsuz)
    ('elektronika', 'komputerler', 'Kompüterlər', 10),
    ('elektronika', 'noutbuklar', 'Noutbuklar', 20),
    ('elektronika', 'televizor-audio', 'Televizor / audio', 30),
    ('elektronika', 'foto-video', 'Foto / video', 40),
    ('elektronika', 'oyun-konsollari', 'Oyun konsolları', 50),
    ('elektronika', 'elektronika-aksesuarlari', 'Elektronika aksesuarları', 60),
    -- 5 Məişət texnikası
    ('meiset-texnikasi', 'paltaryuyan', 'Paltaryuyan', 10),
    ('meiset-texnikasi', 'soyuducu', 'Soyuducu', 20),
    ('meiset-texnikasi', 'kondisioner', 'Kondisioner', 30),
    ('meiset-texnikasi', 'tozsoran', 'Tozsoran', 40),
    ('meiset-texnikasi', 'metbex-texnikasi', 'Kiçik mətbəx texnikası', 50),
    ('meiset-texnikasi', 'diger-meiset', 'Digər məişət texnikası', 60),
    -- 6 Ev və bağ
    ('ev-ve-bag', 'bag-heyet', 'Bağ / həyət', 10),
    ('ev-ve-bag', 'metbex-esyalari', 'Mətbəx əşyaları', 20),
    ('ev-ve-bag', 'ev-dekoru', 'Ev dekoru', 30),
    ('ev-ve-bag', 'temizlik-mehsullari', 'Təmizlik məhsulları', 40),
    ('ev-ve-bag', 'bitkiler', 'Bitkilər', 50),
    ('ev-ve-bag', 'diger-ev-esyalari', 'Digər ev əşyaları', 60),
    -- 7 Mebel
    ('mebel-ve-interyer', 'divan-kreslo', 'Divan / kreslo', 10),
    ('mebel-ve-interyer', 'masa-stul', 'Masa / stul', 20),
    ('mebel-ve-interyer', 'dolab', 'Dolab', 30),
    ('mebel-ve-interyer', 'yataq', 'Yataq', 40),
    ('mebel-ve-interyer', 'ofis-mebeli', 'Ofis mebeli', 50),
    ('mebel-ve-interyer', 'dekor-isiqlandirma', 'Dekor / işıqlandırma', 60),
    -- 8 Geyim
    ('geyim-ve-aksesuar', 'qadin-geyimi', 'Qadın geyimi', 10),
    ('geyim-ve-aksesuar', 'kisi-geyimi', 'Kişi geyimi', 20),
    ('geyim-ve-aksesuar', 'usaq-geyimi', 'Uşaq geyimi', 30),
    ('geyim-ve-aksesuar', 'ayaqqabi', 'Ayaqqabı', 40),
    ('geyim-ve-aksesuar', 'canta-aksesuar', 'Çanta / aksesuar', 50),
    ('geyim-ve-aksesuar', 'saat-bijuteriya', 'Saat / bijuteriya', 60),
    -- 9 Xidmətlər (təmir/təhsil ayrıldı)
    ('xidmetler', 'gozellik-saglamliq', 'Gözəllik / sağlamlıq', 10),
    ('xidmetler', 'foto-video-xidmetleri', 'Foto / video', 20),
    ('xidmetler', 'dasima', 'Kuryer / daşıma', 30),
    ('xidmetler', 'temizlik-xidmeti', 'Təmizlik', 40),
    ('xidmetler', 'huquq-muhasibat', 'Hüquq / mühasibat', 50),
    ('xidmetler', 'diger-xidmetler', 'Digər xidmətlər', 60),
    -- 10 İş elanları
    ('is-elanlari', 'vakansiyalar', 'Vakansiyalar', 10),
    ('is-elanlari', 'is-axtarir', 'İş axtaranlar', 20),
    ('is-elanlari', 'part-time', 'Part-time', 30),
    ('is-elanlari', 'uzaqdan-is', 'Uzaqdan iş', 40),
    ('is-elanlari', 'tecrube-programi', 'Təcrübə proqramı', 50),
    ('is-elanlari', 'diger-is', 'Digər', 60),
    -- 11 Uşaq
    ('usaq-mehsullari', 'usaq-arabasi', 'Uşaq arabası', 10),
    ('usaq-mehsullari', 'oyuncaqlar', 'Oyuncaqlar', 20),
    ('usaq-mehsullari', 'usaq-geyimi', 'Uşaq geyimi', 30),
    ('usaq-mehsullari', 'usaq-mebeli', 'Uşaq mebeli', 40),
    ('usaq-mehsullari', 'mekteb-levazimatlari', 'Məktəb ləvazimatları', 50),
    ('usaq-mehsullari', 'diger-usaq', 'Digər uşaq məhsulları', 60),
    -- 12 Heyvanlar
    ('heyvanlar', 'itler', 'İtlər', 10),
    ('heyvanlar', 'pisikler', 'Pişiklər', 20),
    ('heyvanlar', 'quslar', 'Quşlar', 30),
    ('heyvanlar', 'baliglar', 'Balıqlar', 40),
    ('heyvanlar', 'heyvan-aksesuarlari', 'Heyvan aksesuarları', 50),
    ('heyvanlar', 'baytar-xidmetleri', 'Baytarlıq / xidmətlər', 60),
    -- 13 Biznes
    ('biznes-ve-avadanliq', 'ofis-avadanligi', 'Ofis avadanlığı', 10),
    ('biznes-ve-avadanliq', 'magaza-avadanligi', 'Mağaza avadanlığı', 20),
    ('biznes-ve-avadanliq', 'restoran-avadanligi', 'Restoran avadanlığı', 30),
    ('biznes-ve-avadanliq', 'istehsalat-avadanligi', 'İstehsalat avadanlığı', 40),
    ('biznes-ve-avadanliq', 'anbar-logistika', 'Anbar / logistika', 50),
    ('biznes-ve-avadanliq', 'hazir-biznes', 'Hazır biznes', 60),
    -- 14 Təmir və ustalar
    ('temir-ve-ustalar', 'ev-temiri', 'Ev təmiri', 10),
    ('temir-ve-ustalar', 'elektrik', 'Elektrik', 20),
    ('temir-ve-ustalar', 'santexnik', 'Santexnik', 30),
    ('temir-ve-ustalar', 'mebel-yigimi', 'Mebel yığımı', 40),
    ('temir-ve-ustalar', 'kondisioner-ustasi', 'Kondisioner ustası', 50),
    ('temir-ve-ustalar', 'avto-temir', 'Avto təmir', 60),
    -- 15 Təhsil
    ('tehsil-ve-kurslar', 'dil-kurslari', 'Dil kursları', 10),
    ('tehsil-ve-kurslar', 'it-kurslari', 'IT kursları', 20),
    ('tehsil-ve-kurslar', 'repetitor', 'Repetitor', 30),
    ('tehsil-ve-kurslar', 'musiqi-resm', 'Musiqi / rəsm', 40),
    ('tehsil-ve-kurslar', 'peşe-kurslari', 'Peşə kursları', 50),
    ('tehsil-ve-kurslar', 'online-derler', 'Online dərslər', 60),
    -- 16 Digər (+ idman/hobbi burada)
    ('diger', 'idman-ve-hobbi', 'İdman və hobbi', 10),
    ('diger', 'hediyyeler', 'Hədiyyələr', 20),
    ('diger', 'kolleksiya', 'Kolleksiya', 30),
    ('diger', 'kitablar', 'Kitablar', 40),
    ('diger', 'itmis-tapilmis', 'Tapıntı / itmiş', 50),
    ('diger', 'diger-elanlar', 'Digər elanlar', 60)
)
insert into public.subcategories (category_id, slug, name, sort_order, is_active)
select c.id, s.slug, s.name, s.sort_order, true
from seeded s
join public.categories c on c.slug = s.category_slug
on conflict (category_id, slug) do update
set name = excluded.name, sort_order = excluded.sort_order, is_active = true;

-- Elektronika altındakı köhnə telefon sub-u deaktiv
update public.subcategories s
set is_active = false
from public.categories c
where s.category_id = c.id
  and c.slug = 'elektronika'
  and s.slug = 'telefonlar';

-- =============================================================================
-- 5) Aliases — legacy listings.category text
-- =============================================================================
with alias_seed(alias, category_slug, subcategory_slug) as (
  values
    ('avto', 'avtomobil-ve-neqliyyat', 'minik-avtomobili'),
    ('avtomobil', 'avtomobil-ve-neqliyyat', 'minik-avtomobili'),
    ('nəqliyyat', 'avtomobil-ve-neqliyyat', null),
    ('neqliyyat', 'avtomobil-ve-neqliyyat', null),
    ('avtomobil və nəqliyyat', 'avtomobil-ve-neqliyyat', null),
    ('telefon', 'telefon', 'smartfonlar'),
    ('telefonlar', 'telefon', 'smartfonlar'),
    ('daşınmaz əmlak', 'dasinmaz-emlak', null),
    ('dasinmaz emlak', 'dasinmaz-emlak', null),
    ('elektronika', 'elektronika', null),
    ('məişət texnikası', 'meiset-texnikasi', null),
    ('meiset texnikasi', 'meiset-texnikasi', null),
    ('ev və bağ', 'ev-ve-bag', null),
    ('ev ve bag', 'ev-ve-bag', null),
    ('ev əşyaları', 'ev-ve-bag', 'metbex-esyalari'),
    ('mebel', 'mebel-ve-interyer', null),
    ('mebel və interyer', 'mebel-ve-interyer', null),
    ('geyim', 'geyim-ve-aksesuar', null),
    ('geyim və aksesuar', 'geyim-ve-aksesuar', null),
    ('xidmətlər', 'xidmetler', null),
    ('xidmetler', 'xidmetler', null),
    ('iş elanları', 'is-elanlari', null),
    ('is elanlari', 'is-elanlari', null),
    ('uşaq aləmi', 'usaq-mehsullari', null),
    ('usaq alemi', 'usaq-mehsullari', null),
    ('uşaq məhsulları', 'usaq-mehsullari', null),
    ('heyvanlar', 'heyvanlar', null),
    ('biznes və avadanlıq', 'biznes-ve-avadanliq', null),
    ('təmir və ustalar', 'temir-ve-ustalar', null),
    ('təhsil və kurslar', 'tehsil-ve-kurslar', null),
    ('idman və hobbi', 'diger', 'idman-ve-hobbi'),
    ('idman ve hobbi', 'diger', 'idman-ve-hobbi'),
    ('digər', 'diger', 'diger-elanlar'),
    ('diger', 'diger', 'diger-elanlar')
)
insert into public.category_aliases (alias, category_id, subcategory_id, is_active)
select
  lower(trim(a.alias)),
  c.id,
  s.id,
  true
from alias_seed a
join public.categories c on c.slug = a.category_slug
left join public.subcategories s on s.category_id = c.id and s.slug = a.subcategory_slug
on conflict (alias) do update
set category_id = excluded.category_id, subcategory_id = excluded.subcategory_id, is_active = true;

-- =============================================================================
-- 6) Telefon elanlarını elektronika → telefon category-yə köçür
-- =============================================================================
update public.listings l
set category_id = ct.id
from public.categories ct
where l.category_id in (select id from public.categories where slug = 'elektronika')
  and l.subcategory_id in (
    select s.id from public.subcategories s
    join public.categories c on c.id = s.category_id
    where c.slug = 'elektronika' and s.slug = 'telefonlar'
  )
  and ct.slug = 'telefon';

update public.listings l
set
  subcategory_id = st.id,
  category_id = ct.id
from public.categories ct
join public.subcategories st on st.category_id = ct.id and st.slug = 'smartfonlar'
where ct.slug = 'telefon'
  and l.category_id = ct.id
  and l.subcategory_id is null
  and lower(coalesce(l.category, '')) in ('telefon', 'telefonlar');

-- =============================================================================
-- 7) category_id backfill (alias + ad uyğunluğu)
-- =============================================================================
update public.listings l
set category_id = a.category_id,
    subcategory_id = coalesce(l.subcategory_id, a.subcategory_id)
from public.category_aliases a
where l.category_id is null
  and lower(trim(l.category)) = a.alias
  and a.is_active = true;

update public.listings l
set category_id = c.id
from public.categories c
where l.category_id is null
  and l.category = c.name
  and c.is_active = true;

-- =============================================================================
-- 8) Nümunə atributlar — Telefon + Avto (filter/create üçün)
-- =============================================================================
with attr_seed(category_slug, subcategory_slug, key, label_az, type, options, is_required, is_filterable, sort_order) as (
  values
    ('telefon', 'smartfonlar', 'brand', 'Marka', 'text', '[]'::jsonb, true, true, 10),
    ('telefon', 'smartfonlar', 'model', 'Model', 'text', '[]'::jsonb, true, true, 20),
    ('telefon', 'smartfonlar', 'storage', 'Yaddaş', 'select', '["32GB","64GB","128GB","256GB","512GB","1TB"]'::jsonb, false, true, 30),
    ('telefon', 'smartfonlar', 'ram', 'RAM', 'select', '["2GB","3GB","4GB","6GB","8GB","12GB","16GB"]'::jsonb, false, true, 40),
    ('telefon', 'smartfonlar', 'color', 'Rəng', 'text', '[]'::jsonb, false, true, 50),
    ('avtomobil-ve-neqliyyat', 'minik-avtomobili', 'brand', 'Marka', 'text', '[]'::jsonb, true, true, 10),
    ('avtomobil-ve-neqliyyat', 'minik-avtomobili', 'model', 'Model', 'text', '[]'::jsonb, true, true, 20),
    ('avtomobil-ve-neqliyyat', 'minik-avtomobili', 'year', 'Buraxılış ili', 'number', '[]'::jsonb, true, true, 30),
    ('avtomobil-ve-neqliyyat', 'minik-avtomobili', 'mileage', 'Yürüş', 'number', '[]'::jsonb, false, true, 40),
    ('dasinmaz-emlak', 'menziller', 'rooms', 'Otaq sayı', 'select', '["1","2","3","4","5+"]'::jsonb, false, true, 10),
    ('dasinmaz-emlak', 'menziller', 'area', 'Sahə (m²)', 'number', '[]'::jsonb, false, true, 20)
)
insert into public.category_attribute_definitions (
  category_id, subcategory_id, key, label, label_az, value_type, type, options, is_required, is_filterable, sort_order, is_active
)
select
  c.id,
  s.id,
  a.key,
  a.label_az,
  a.label_az,
  a.type,
  a.type,
  a.options,
  a.is_required,
  a.is_filterable,
  a.sort_order,
  true
from attr_seed a
join public.categories c on c.slug = a.category_slug
join public.subcategories s on s.category_id = c.id and s.slug = a.subcategory_slug
on conflict do nothing;

-- =============================================================================
-- 9) Yoxlama
-- =============================================================================
select slug, name, is_active, sort_order, icon_key, catalogue_image_path
from public.categories
where is_active = true
order by sort_order;
-- Gözlənilən: 16 sətir

select c.slug as category, count(s.id) as sub_count
from public.categories c
left join public.subcategories s on s.category_id = c.id and s.is_active = true
where c.is_active = true
group by c.slug, c.sort_order
order by c.sort_order;
