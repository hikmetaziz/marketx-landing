-- MarktX: single Ecosoft sample listing update.
-- Uses the existing MO1500PECO listing created from the Ecosoft import.
-- Does not create a new listing.

select set_config('request.jwt.claim.sub', 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

with target as (
  select
    'dc81abb0-e0a8-4f35-a821-a8e0f6e1dd59'::uuid as listing_id,
    'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/dc81abb0-e0a8-4f35-a821-a8e0f6e1dd59.png'::text as image_url,
    $$Ecosoft CROSS Solo tərs osmos su filtri$$::text as title,
    $$Ecosoft CROSS Solo kompakt və müasir tərs osmos su təmizləmə sistemidir. Birbaşa axın texnologiyası sayəsində ayrıca su çəninə ehtiyac olmadan təmizlənmiş içməli su təqdim edir.

Sistem mətbəxdə az yer tutması üçün hazırlanıb və mətbəx mebelinin altında və ya kiçik rəfdə quraşdırıla bilər. CROSS Solo gündəlik içməli su, yemək hazırlığı və isti içkilər üçün rahat seçimdir.

Əsas xüsusiyyətlər:
• Birbaşa axınlı tərs osmos sistemi
• Məhsuldarlıq: 1.3 litr/dəqiqə (78 litr/saat)
• 500 GPD RO membran
• 2-in-1 dəyişdirilən filtr: membran və karbon filtrasiya
• Suyun dadını və qoxusunu yaxşılaşdıran karbon mərhələsi
• Recovery göstəricisi: 50%
• Avtomatik membran yuma funksiyası
• Sızma sensoru
• Kompakt ölçü: 300 × 140 × 200 mm
• Su çəni tələb etmir

Model: CROSS Solo
Məhsul kodu: MO1500PECO$$::text as description
)
update public.listings l
set
  title = target.title,
  price = 790,
  category = 'Ev və bağ',
  category_id = 'e79900eb-47c5-4eaf-96e2-bfe6076d8409',
  subcategory_id = 'e3435fcd-46d8-4fd7-9199-5c8cd96d5771',
  city = 'Bakı',
  condition = 'Yeni',
  condition_code = 'new',
  description = target.description,
  image_url = target.image_url,
  image_urls = array[target.image_url],
  status = 'pending',
  reviewed_at = null,
  reviewed_by = null,
  rejected_reason = null,
  attributes = coalesce(l.attributes, '{}'::jsonb) || jsonb_build_object(
    'sku', 'MO1500PECO',
    'source_row', 4,
    'ecosoft_category', 'Mətbəx altı mebellər üçün su filtrləri',
    'stock_status', 'in_stock',
    'currency', 'AZN',
    'research_source', 'Ecosoft CROSS Solo technical data sheet'
  ),
  updated_at = now()
from target
where l.id = target.listing_id
  and l.source = 'ecosoft_price_list'
  and l.attributes ->> 'sku' = 'MO1500PECO'
returning
  l.id,
  l.title,
  l.price,
  l.category,
  l.status,
  l.image_url,
  l.attributes ->> 'sku' as sku;
