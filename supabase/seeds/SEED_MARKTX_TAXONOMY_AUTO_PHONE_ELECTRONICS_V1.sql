-- MarktX Taxonomy V1: auto, auto parts, phone, electronics.
-- Prepared only. Do not run against production without an approved staging apply.
-- Idempotent seed: upserts the prepared parent categories and leaf subcategories,
-- records group metadata, and preserves existing listing references by renaming
-- a few known legacy leaf slugs before insert where no canonical row exists.

begin;

alter table public.subcategories
  add column if not exists group_key text,
  add column if not exists group_label text,
  add column if not exists group_order integer,
  add column if not exists taxonomy_version text,
  add column if not exists is_listing_enabled boolean not null default true,
  add column if not exists is_filter_enabled boolean not null default true;

comment on column public.subcategories.group_key is 'Visual group key for non-selectable taxonomy grouping.';
comment on column public.subcategories.group_label is 'Visual group label for category browsing; not a selectable subcategory.';
comment on column public.subcategories.group_order is 'Display order of the visual group inside the parent category.';
comment on column public.subcategories.taxonomy_version is 'Prepared taxonomy version that last wrote this subcategory metadata.';

with parent_seed(slug, name, sort_order, icon_key, catalogue_image_path, color_hex) as (
  values
    ('avtomobil-ve-neqliyyat', 'Avtomobil və nəqliyyat', '20', 'directions-car', '/images/catalogue/avtomobil-ve-neqliyyat.png', '#DBEAFE'),
    ('avto-ehtiyat-hisseleri-ve-avadanliq', 'Avto ehtiyat hissələri və avadanlıq', '25', 'car-repair', '/images/catalogue/avto-ehtiyat-hisseleri-ve-avadanliq.png', '#E0F2FE'),
    ('telefon', 'Telefon', '30', 'smartphone', '/images/catalogue/telefon.png', '#DCFCE7'),
    ('elektronika', 'Elektronika', '40', 'devices', '/images/catalogue/elektronika.png', '#EDE9FE')
)
insert into public.categories (
  slug,
  name,
  sort_order,
  is_active,
  icon_key,
  catalogue_image_path,
  color_hex,
  home_visible
)
select slug, name, sort_order::integer, true, icon_key, catalogue_image_path, color_hex, true
from parent_seed
on conflict (slug) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = true,
  icon_key = excluded.icon_key,
  catalogue_image_path = excluded.catalogue_image_path,
  color_hex = excluded.color_hex,
  home_visible = true;

-- Safe legacy slug renames keep existing subcategory ids and listing FK references.
update public.subcategories s
set slug = 'avtomobiller', name = 'Avtomobillər', sort_order = 1
from public.categories c
where s.category_id = c.id
  and c.slug = 'avtomobil-ve-neqliyyat'
  and s.slug = 'minik-avtomobili'
  and not exists (
    select 1
    from public.subcategories existing
    where existing.category_id = c.id
      and existing.slug = 'avtomobiller'
  );

with leaf_seed(category_slug, slug, name, sort_order, group_key, group_label, group_order) as (
  values
    ('avtomobil-ve-neqliyyat', 'avtomobiller', 'Avtomobillər', '1', 'auto-vehicles', 'Nəqliyyat vasitələri', '1'),
    ('avtomobil-ve-neqliyyat', 'yuk-avtomobilleri', 'Yük avtomobilləri', '2', 'auto-vehicles', 'Nəqliyyat vasitələri', '1'),
    ('avtomobil-ve-neqliyyat', 'mikroavtobuslar', 'Mikroavtobuslar', '3', 'auto-vehicles', 'Nəqliyyat vasitələri', '1'),
    ('avtomobil-ve-neqliyyat', 'avtobuslar', 'Avtobuslar', '4', 'auto-vehicles', 'Nəqliyyat vasitələri', '1'),
    ('avtomobil-ve-neqliyyat', 'motosikletler', 'Motosikletlər', '5', 'auto-vehicles', 'Nəqliyyat vasitələri', '1'),
    ('avtomobil-ve-neqliyyat', 'skuterler-ve-mopedler', 'Skuterlər və mopedlər', '6', 'auto-vehicles', 'Nəqliyyat vasitələri', '1'),
    ('avtomobil-ve-neqliyyat', 'atv-ve-utv', 'ATV və UTV', '7', 'auto-vehicles', 'Nəqliyyat vasitələri', '1'),
    ('avtomobil-ve-neqliyyat', 'elektrik-skuterler-ve-sexsi-neqliyyat', 'Elektrik skuterlər və şəxsi nəqliyyat', '8', 'auto-vehicles', 'Nəqliyyat vasitələri', '1'),
    ('avtomobil-ve-neqliyyat', 'velosipedler', 'Velosipedlər', '9', 'auto-vehicles', 'Nəqliyyat vasitələri', '1'),
    ('avtomobil-ve-neqliyyat', 'elektrik-velosipedler', 'Elektrik velosipedlər', '10', 'auto-vehicles', 'Nəqliyyat vasitələri', '1'),
    ('avtomobil-ve-neqliyyat', 'qosqular-ve-yarimqosqular', 'Qoşqular və yarımqoşqular', '11', 'auto-vehicles', 'Nəqliyyat vasitələri', '1'),
    ('avtomobil-ve-neqliyyat', 'xususi-texnika', 'Xüsusi texnika', '12', 'auto-vehicles', 'Nəqliyyat vasitələri', '1'),
    ('avtomobil-ve-neqliyyat', 'kend-teserrufati-texnikasi', 'Kənd təsərrüfatı texnikası', '13', 'auto-vehicles', 'Nəqliyyat vasitələri', '1'),
    ('avtomobil-ve-neqliyyat', 'su-neqliyyati', 'Su nəqliyyatı', '14', 'auto-vehicles', 'Nəqliyyat vasitələri', '1'),
    ('avto-ehtiyat-hisseleri-ve-avadanliq', 'muherrik-ve-hisseleri', 'Mühərrik və hissələri', '1', 'auto-parts-equipment', 'Ehtiyat hissələri və avadanlıq', '1'),
    ('avto-ehtiyat-hisseleri-ve-avadanliq', 'transmissiya-ve-suretler-qutusu', 'Transmissiya və sürətlər qutusu', '2', 'auto-parts-equipment', 'Ehtiyat hissələri və avadanlıq', '1'),
    ('avto-ehtiyat-hisseleri-ve-avadanliq', 'kuzov-hisseleri', 'Kuzov hissələri', '3', 'auto-parts-equipment', 'Ehtiyat hissələri və avadanlıq', '1'),
    ('avto-ehtiyat-hisseleri-ve-avadanliq', 'optika-ve-isiqlandirma', 'Optika və işıqlandırma', '4', 'auto-parts-equipment', 'Ehtiyat hissələri və avadanlıq', '1'),
    ('avto-ehtiyat-hisseleri-ve-avadanliq', 'asqi-ve-sukan-sistemi', 'Asqı və sükan sistemi', '5', 'auto-parts-equipment', 'Ehtiyat hissələri və avadanlıq', '1'),
    ('avto-ehtiyat-hisseleri-ve-avadanliq', 'eylec-sistemi', 'Əyləc sistemi', '6', 'auto-parts-equipment', 'Ehtiyat hissələri və avadanlıq', '1'),
    ('avto-ehtiyat-hisseleri-ve-avadanliq', 'elektrik-ve-alisdirma-hisseleri', 'Elektrik və alışdırma hissələri', '7', 'auto-parts-equipment', 'Ehtiyat hissələri və avadanlıq', '1'),
    ('avto-ehtiyat-hisseleri-ve-avadanliq', 'yanacaq-ve-egzoz-sistemi', 'Yanacaq və egzoz sistemi', '8', 'auto-parts-equipment', 'Ehtiyat hissələri və avadanlıq', '1'),
    ('avto-ehtiyat-hisseleri-ve-avadanliq', 'sinler', 'Şinlər', '9', 'auto-parts-equipment', 'Ehtiyat hissələri və avadanlıq', '1'),
    ('avto-ehtiyat-hisseleri-ve-avadanliq', 'diskler', 'Disklər', '10', 'auto-parts-equipment', 'Ehtiyat hissələri və avadanlıq', '1'),
    ('avto-ehtiyat-hisseleri-ve-avadanliq', 'akkumulyatorlar', 'Akkumulyatorlar', '11', 'auto-parts-equipment', 'Ehtiyat hissələri və avadanlıq', '1'),
    ('avto-ehtiyat-hisseleri-ve-avadanliq', 'yaglar-mayeler-ve-avtokimya', 'Yağlar, mayelər və avtokimya', '12', 'auto-parts-equipment', 'Ehtiyat hissələri və avadanlıq', '1'),
    ('avto-ehtiyat-hisseleri-ve-avadanliq', 'salon-aksesuarlari', 'Salon aksesuarları', '13', 'auto-parts-equipment', 'Ehtiyat hissələri və avadanlıq', '1'),
    ('avto-ehtiyat-hisseleri-ve-avadanliq', 'xarici-aksesuarlar', 'Xarici aksesuarlar', '14', 'auto-parts-equipment', 'Ehtiyat hissələri və avadanlıq', '1'),
    ('avto-ehtiyat-hisseleri-ve-avadanliq', 'avtoelektronika-ve-multimedia', 'Avtoelektronika və multimedia', '15', 'auto-parts-equipment', 'Ehtiyat hissələri və avadanlıq', '1'),
    ('avto-ehtiyat-hisseleri-ve-avadanliq', 'servis-ve-diaqnostika-avadanligi', 'Servis və diaqnostika avadanlığı', '16', 'auto-parts-equipment', 'Ehtiyat hissələri və avadanlıq', '1'),
    ('telefon', 'smartfonlar', 'Smartfonlar', '1', 'phone-devices', 'Telefon cihazları', '1'),
    ('telefon', 'dymeli-telefonlar', 'Düyməli telefonlar', '2', 'phone-devices', 'Telefon cihazları', '1'),
    ('telefon', 'ev-ve-ofis-telefonlari', 'Ev və ofis telefonları', '3', 'phone-devices', 'Telefon cihazları', '1'),
    ('telefon', 'radiotelefonlar', 'Radiotelefonlar', '4', 'phone-devices', 'Telefon cihazları', '1'),
    ('telefon', 'peyk-telefonlari', 'Peyk telefonları', '5', 'phone-devices', 'Telefon cihazları', '1'),
    ('telefon', 'telefon-qablari', 'Telefon qabları', '6', 'phone-protection', 'Qoruyucu məhsullar', '2'),
    ('telefon', 'ekran-qoruyuculari', 'Ekran qoruyucuları', '7', 'phone-protection', 'Qoruyucu məhsullar', '2'),
    ('telefon', 'kamera-qoruyuculari', 'Kamera qoruyucuları', '8', 'phone-protection', 'Qoruyucu məhsullar', '2'),
    ('telefon', 'sarj-adapterleri', 'Şarj adapterləri', '9', 'phone-charging-energy', 'Şarj və enerji', '3'),
    ('telefon', 'sarj-kabelleri', 'Şarj kabelləri', '10', 'phone-charging-energy', 'Şarj və enerji', '3'),
    ('telefon', 'simsiz-sarj-cihazlari', 'Simsiz şarj cihazları', '11', 'phone-charging-energy', 'Şarj və enerji', '3'),
    ('telefon', 'powerbanklar', 'Powerbanklar', '12', 'phone-charging-energy', 'Şarj və enerji', '3'),
    ('telefon', 'avtomobil-sarj-cihazlari', 'Avtomobil şarj cihazları', '13', 'phone-charging-energy', 'Şarj və enerji', '3'),
    ('telefon', 'otg-ve-telefon-adapterleri', 'OTG və telefon adapterləri', '14', 'phone-adapters-holders', 'Adapter və tutacaqlar', '4'),
    ('telefon', 'sim-adapterleri-ve-sim-tray-lar', 'SIM adapterləri və SIM tray-lar', '15', 'phone-adapters-holders', 'Adapter və tutacaqlar', '4'),
    ('telefon', 'avtomobil-telefon-tutacaqlari', 'Avtomobil telefon tutacaqları', '16', 'phone-adapters-holders', 'Adapter və tutacaqlar', '4'),
    ('telefon', 'masaustu-telefon-tutacaqlari', 'Masaüstü telefon tutacaqları', '17', 'phone-adapters-holders', 'Adapter və tutacaqlar', '4'),
    ('telefon', 'selfie-cubuqlari-ve-mini-stativler', 'Selfie çubuqları və mini ştativlər', '18', 'phone-adapters-holders', 'Adapter və tutacaqlar', '4'),
    ('telefon', 'telefon-gimbal-ve-stabilizatorlari', 'Telefon gimbal və stabilizatorları', '19', 'phone-adapters-holders', 'Adapter və tutacaqlar', '4'),
    ('telefon', 'ekran-ve-sensorlar', 'Ekran və sensorlar', '20', 'phone-spare-parts', 'Telefon ehtiyat hissələri', '5'),
    ('telefon', 'telefon-batareyalari', 'Telefon batareyaları', '21', 'phone-spare-parts', 'Telefon ehtiyat hissələri', '5'),
    ('telefon', 'korpus-ve-cerciveler', 'Korpus və çərçivələr', '22', 'phone-spare-parts', 'Telefon ehtiyat hissələri', '5'),
    ('telefon', 'telefon-kameralari', 'Telefon kameraları', '23', 'phone-spare-parts', 'Telefon ehtiyat hissələri', '5'),
    ('telefon', 'sarj-portlari-ve-flex-kabeller', 'Şarj portları və flex kabellər', '24', 'phone-spare-parts', 'Telefon ehtiyat hissələri', '5'),
    ('telefon', 'dinamik-ve-mikrofonlar', 'Dinamik və mikrofonlar', '25', 'phone-spare-parts', 'Telefon ehtiyat hissələri', '5'),
    ('telefon', 'telefon-ana-platalari', 'Telefon ana plataları', '26', 'phone-spare-parts', 'Telefon ehtiyat hissələri', '5'),
    ('telefon', 'duymeler-ve-kicik-hisseler', 'Düymələr və kiçik hissələr', '27', 'phone-spare-parts', 'Telefon ehtiyat hissələri', '5'),
    ('telefon', 'diger-telefon-ehtiyat-hisseleri', 'Digər telefon ehtiyat hissələri', '28', 'phone-spare-parts', 'Telefon ehtiyat hissələri', '5'),
    ('telefon', 'telefon-temir-aletleri', 'Telefon təmir alətləri', '29', 'phone-repair-kits', 'Təmir və komplektlər', '6'),
    ('telefon', 'telefon-aksesuar-destleri', 'Telefon aksesuar dəstləri', '30', 'phone-repair-kits', 'Təmir və komplektlər', '6'),
    ('elektronika', 'noutbuklar', 'Noutbuklar', '1', 'electronics-computing-mobile', 'Kompüter və mobil hesablama', '1'),
    ('elektronika', 'masaustu-komputerler', 'Masaüstü kompüterlər', '2', 'electronics-computing-mobile', 'Kompüter və mobil hesablama', '1'),
    ('elektronika', 'monobloklar', 'Monobloklar', '3', 'electronics-computing-mobile', 'Kompüter və mobil hesablama', '1'),
    ('elektronika', 'planshetler', 'Planşetlər', '4', 'electronics-computing-mobile', 'Kompüter və mobil hesablama', '1'),
    ('elektronika', 'elektron-kitablar', 'Elektron kitablar', '5', 'electronics-computing-mobile', 'Kompüter və mobil hesablama', '1'),
    ('elektronika', 'monitorlar', 'Monitorlar', '6', 'electronics-components-accessories', 'Kompüter komponentləri və aksesuarları', '2'),
    ('elektronika', 'prosessorlar', 'Prosessorlar', '7', 'electronics-components-accessories', 'Kompüter komponentləri və aksesuarları', '2'),
    ('elektronika', 'ana-platalar', 'Ana platalar', '8', 'electronics-components-accessories', 'Kompüter komponentləri və aksesuarları', '2'),
    ('elektronika', 'videokartlar', 'Videokartlar', '9', 'electronics-components-accessories', 'Kompüter komponentləri və aksesuarları', '2'),
    ('elektronika', 'operativ-yaddas-ram', 'Operativ yaddaş - RAM', '10', 'electronics-components-accessories', 'Kompüter komponentləri və aksesuarları', '2'),
    ('elektronika', 'ssd-hdd-ve-yaddas-qurgulari', 'SSD, HDD və yaddaş qurğuları', '11', 'electronics-components-accessories', 'Kompüter komponentləri və aksesuarları', '2'),
    ('elektronika', 'korpus-qida-bloku-ve-soyutma', 'Korpus, qida bloku və soyutma', '12', 'electronics-components-accessories', 'Kompüter komponentləri və aksesuarları', '2'),
    ('elektronika', 'komputer-periferiyasi', 'Kompüter periferiyası', '13', 'electronics-components-accessories', 'Kompüter komponentləri və aksesuarları', '2'),
    ('elektronika', 'printerler-ve-skanerler', 'Printerlər və skanerlər', '14', 'electronics-components-accessories', 'Kompüter komponentləri və aksesuarları', '2'),
    ('elektronika', 'sebeke-avadanligi', 'Şəbəkə avadanlığı', '15', 'electronics-components-accessories', 'Kompüter komponentləri və aksesuarları', '2'),
    ('elektronika', 'televizorlar', 'Televizorlar', '16', 'electronics-tv-video', 'TV və video', '3'),
    ('elektronika', 'proyektorlar', 'Proyektorlar', '17', 'electronics-tv-video', 'TV və video', '3'),
    ('elektronika', 'tv-box-ve-media-pleyerler', 'TV box və media pleyerlər', '18', 'electronics-tv-video', 'TV və video', '3'),
    ('elektronika', 'peyk-ve-tv-avadanligi', 'Peyk və TV avadanlığı', '19', 'electronics-tv-video', 'TV və video', '3'),
    ('elektronika', 'qulaqliqlar', 'Qulaqlıqlar', '20', 'electronics-audio', 'Audio', '4'),
    ('elektronika', 'portativ-dinamikler', 'Portativ dinamiklər', '21', 'electronics-audio', 'Audio', '4'),
    ('elektronika', 'ev-audio-sistemleri', 'Ev audio sistemləri', '22', 'electronics-audio', 'Audio', '4'),
    ('elektronika', 'mikrofon-ve-audio-interfeysler', 'Mikrofon və audio interfeyslər', '23', 'electronics-audio', 'Audio', '4'),
    ('elektronika', 'oyun-konsollari', 'Oyun konsolları', '24', 'electronics-gaming', 'Oyun', '5'),
    ('elektronika', 'oyun-aksesuarlari', 'Oyun aksesuarları', '25', 'electronics-gaming', 'Oyun', '5'),
    ('elektronika', 'foto-ve-videokameralar', 'Foto və videokameralar', '26', 'electronics-photo-wearable-smart', 'Foto, wearable və ağıllı cihazlar', '6'),
    ('elektronika', 'obyektiv-ve-foto-video-aksesuarlari', 'Obyektiv və foto/video aksesuarları', '27', 'electronics-photo-wearable-smart', 'Foto, wearable və ağıllı cihazlar', '6'),
    ('elektronika', 'smart-saat-ve-wearable-cihazlar', 'Smart saat və wearable cihazlar', '28', 'electronics-photo-wearable-smart', 'Foto, wearable və ağıllı cihazlar', '6'),
    ('elektronika', 'agilli-ve-tehlukesizlik-sistemleri', 'Ağıllı və təhlükəsizlik sistemləri', '29', 'electronics-photo-wearable-smart', 'Foto, wearable və ağıllı cihazlar', '6'),
    ('elektronika', 'dronlar-ve-aksesuarlar', 'Dronlar və aksesuarlar', '30', 'electronics-photo-wearable-smart', 'Foto, wearable və ağıllı cihazlar', '6')
)
insert into public.subcategories (
  category_id,
  slug,
  name,
  sort_order,
  is_active,
  group_key,
  group_label,
  group_order,
  taxonomy_version,
  is_listing_enabled,
  is_filter_enabled
)
select
  c.id,
  l.slug,
  l.name,
  l.sort_order::integer,
  true,
  l.group_key,
  l.group_label,
  l.group_order::integer,
  'marktx-taxonomy-auto-phone-electronics-v1',
  true,
  true
from leaf_seed l
join public.categories c on c.slug = l.category_slug
on conflict (category_id, slug) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = true,
  group_key = excluded.group_key,
  group_label = excluded.group_label,
  group_order = excluded.group_order,
  taxonomy_version = excluded.taxonomy_version,
  is_listing_enabled = true,
  is_filter_enabled = true;

with alias_seed(alias, category_slug, subcategory_slug) as (
  values
    ('avto', 'avtomobil-ve-neqliyyat', ''),
    ('avto-aksesuarlar', 'avto-ehtiyat-hisseleri-ve-avadanliq', ''),
    ('avto-avadanliq', 'avto-ehtiyat-hisseleri-ve-avadanliq', ''),
    ('avto-ehtiyat-hisseleri', 'avto-ehtiyat-hisseleri-ve-avadanliq', ''),
    ('avto-xidmetler', 'avto-ehtiyat-hisseleri-ve-avadanliq', 'servis-ve-diaqnostika-avadanligi'),
    ('avtomobil', 'avtomobil-ve-neqliyyat', ''),
    ('duymeli-telefonlar', 'telefon', 'dymeli-telefonlar'),
    ('ehtiyat-hisseleri', 'avto-ehtiyat-hisseleri-ve-avadanliq', ''),
    ('elektronik', 'elektronika', ''),
    ('elektronika-aksesuarlari', 'elektronika', 'oyun-aksesuarlari'),
    ('foto-video', 'elektronika', 'foto-ve-videokameralar'),
    ('komputer', 'elektronika', ''),
    ('komputerler', 'elektronika', ''),
    ('kompüter', 'elektronika', ''),
    ('minik-avtomobili', 'avtomobil-ve-neqliyyat', 'avtomobiller'),
    ('minik-avtomobilleri', 'avtomobil-ve-neqliyyat', 'avtomobiller'),
    ('mobil-telefonlar', 'telefon', ''),
    ('motosiklet', 'avtomobil-ve-neqliyyat', 'motosikletler'),
    ('muherrik-hisseleri', 'avto-ehtiyat-hisseleri-ve-avadanliq', 'muherrik-ve-hisseleri'),
    ('neqliyyat', 'avtomobil-ve-neqliyyat', ''),
    ('nəqliyyat', 'avtomobil-ve-neqliyyat', ''),
    ('smart-saatlar', 'elektronika', 'smart-saat-ve-wearable-cihazlar'),
    ('telefon-aksesuarlari', 'telefon', ''),
    ('telefonlar', 'telefon', ''),
    ('televizor-audio', 'elektronika', 'tv-box-ve-media-pleyerler')
)
insert into public.category_aliases (alias, category_id, subcategory_id, is_active)
select
  a.alias,
  c.id,
  s.id,
  true
from alias_seed a
join public.categories c on c.slug = a.category_slug
left join public.subcategories s
  on s.category_id = c.id
 and s.slug = nullif(a.subcategory_slug, '')
on conflict (alias) do update
set
  category_id = excluded.category_id,
  subcategory_id = excluded.subcategory_id,
  is_active = true;

commit;
