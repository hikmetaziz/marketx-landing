-- MarktX: Ecosoft first 30 listings import.
-- Idempotent by source + attributes.sku.

select set_config('request.jwt.claim.sub', 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

with import_rows (
  id,
  user_id,
  title,
  price,
  category,
  category_id,
  subcategory_id,
  city,
  condition,
  condition_code,
  description,
  image_url,
  image_urls,
  source,
  store_id,
  attributes
) as (
  values
  ('dc81abb0-e0a8-4f35-a821-a8e0f6e1dd59'::uuid, 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0'::uuid, 'Фільтр RO Cross Solo', 790, 'Ev və bağ', 'e79900eb-47c5-4eaf-96e2-bfe6076d8409'::uuid, 'e3435fcd-46d8-4fd7-9199-5c8cd96d5771'::uuid, 'Bakı', 'Yeni', 'new', 'Ecosoft price list importu.
SKU: MO1500PECO
Kateqoriya: Mətbəx altı mebellər üçün su filtrləri
Stok: var', '/images/imports/ecosoft-first30/dc81abb0-e0a8-4f35-a821-a8e0f6e1dd59.png', array['/images/imports/ecosoft-first30/dc81abb0-e0a8-4f35-a821-a8e0f6e1dd59.png']::text[], 'ecosoft_price_list', '42683efe-0872-4d2a-9849-a4dc0def59e4'::uuid, '{"sku":"MO1500PECO","source_row":4,"ecosoft_category":"Mətbəx altı mebellər üçün su filtrləri","stock_status":"in_stock","currency":"AZN"}'::jsonb),
  ('53fdf0b8-8fcd-4429-9ee1-e3320b46b67f'::uuid, 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0'::uuid, 'Фільтр RO CROSS 90 Balance', 1500, 'Ev və bağ', 'e79900eb-47c5-4eaf-96e2-bfe6076d8409'::uuid, 'e3435fcd-46d8-4fd7-9199-5c8cd96d5771'::uuid, 'Bakı', 'Yeni', 'new', 'Ecosoft price list importu.
SKU: MO3600MPECO
Kateqoriya: Mətbəx altı mebellər üçün su filtrləri
Stok: var', '/images/imports/ecosoft-first30/53fdf0b8-8fcd-4429-9ee1-e3320b46b67f.svg', array['/images/imports/ecosoft-first30/53fdf0b8-8fcd-4429-9ee1-e3320b46b67f.svg']::text[], 'ecosoft_price_list', '42683efe-0872-4d2a-9849-a4dc0def59e4'::uuid, '{"sku":"MO3600MPECO","source_row":5,"ecosoft_category":"Mətbəx altı mebellər üçün su filtrləri","stock_status":"in_stock","currency":"AZN"}'::jsonb),
  ('7dc3d262-aa91-4aa0-8d96-6388988589be'::uuid, 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0'::uuid, 'Фільтр RO CROSS 90', 1400, 'Ev və bağ', 'e79900eb-47c5-4eaf-96e2-bfe6076d8409'::uuid, 'e3435fcd-46d8-4fd7-9199-5c8cd96d5771'::uuid, 'Bakı', 'Yeni', 'new', 'Ecosoft price list importu.
SKU: MO3600PECO
Kateqoriya: Mətbəx altı mebellər üçün su filtrləri
Stok: var', '/images/imports/ecosoft-first30/7dc3d262-aa91-4aa0-8d96-6388988589be.svg', array['/images/imports/ecosoft-first30/7dc3d262-aa91-4aa0-8d96-6388988589be.svg']::text[], 'ecosoft_price_list', '42683efe-0872-4d2a-9849-a4dc0def59e4'::uuid, '{"sku":"MO3600PECO","source_row":6,"ecosoft_category":"Mətbəx altı mebellər üçün su filtrləri","stock_status":"in_stock","currency":"AZN"}'::jsonb),
  ('8ccf0bf4-3188-4ce2-b732-087de9837d2a'::uuid, 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0'::uuid, 'Фильтр RO Ecosoft P''URE Alkafuse (Ecosoft P''URE Alkafuse tərs osmos əsaslı su təmizləmə sistemi)', 460, 'Ev və bağ', 'e79900eb-47c5-4eaf-96e2-bfe6076d8409'::uuid, 'e3435fcd-46d8-4fd7-9199-5c8cd96d5771'::uuid, 'Bakı', 'Yeni', 'new', 'Ecosoft price list importu.
SKU: MO675ALCPUREECO
Kateqoriya: Mətbəx altı mebellər üçün su filtrləri
Stok: var', '/images/imports/ecosoft-first30/8ccf0bf4-3188-4ce2-b732-087de9837d2a.jpeg', array['/images/imports/ecosoft-first30/8ccf0bf4-3188-4ce2-b732-087de9837d2a.jpeg']::text[], 'ecosoft_price_list', '42683efe-0872-4d2a-9849-a4dc0def59e4'::uuid, '{"sku":"MO675ALCPUREECO","source_row":7,"ecosoft_category":"Mətbəx altı mebellər üçün su filtrləri","stock_status":"in_stock","currency":"AZN"}'::jsonb),
  ('0666b021-0674-4dd6-a8eb-f8d3b5581286'::uuid, 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0'::uuid, 'Фильтр RO Ecosoft P''URE AquaCalcium Фильтр обратного. осм. Ecosoft P''URE AquaCalcium', 499, 'Ev və bağ', 'e79900eb-47c5-4eaf-96e2-bfe6076d8409'::uuid, 'e3435fcd-46d8-4fd7-9199-5c8cd96d5771'::uuid, 'Bakı', 'Yeni', 'new', 'Ecosoft price list importu.
SKU: MO675PUREMACECO
Kateqoriya: Mətbəx altı mebellər üçün su filtrləri
Stok: var', '/images/imports/ecosoft-first30/0666b021-0674-4dd6-a8eb-f8d3b5581286.jpeg', array['/images/imports/ecosoft-first30/0666b021-0674-4dd6-a8eb-f8d3b5581286.jpeg']::text[], 'ecosoft_price_list', '42683efe-0872-4d2a-9849-a4dc0def59e4'::uuid, '{"sku":"MO675PUREMACECO","source_row":8,"ecosoft_category":"Mətbəx altı mebellər üçün su filtrləri","stock_status":"in_stock","currency":"AZN"}'::jsonb),
  ('1105368d-5343-473a-9e82-b68d2123cab4'::uuid, 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0'::uuid, 'Фильтр RO Ecosoft P''URE Balance (Ecosoft P''URE Balance tərs osmos filtri)', 545, 'Ev və bağ', 'e79900eb-47c5-4eaf-96e2-bfe6076d8409'::uuid, 'e3435fcd-46d8-4fd7-9199-5c8cd96d5771'::uuid, 'Bakı', 'Yeni', 'new', 'Ecosoft price list importu.
SKU: MO675MPUREBALECO
Kateqoriya: Mətbəx altı mebellər üçün su filtrləri
Stok: var', '/images/imports/ecosoft-first30/1105368d-5343-473a-9e82-b68d2123cab4.jpeg', array['/images/imports/ecosoft-first30/1105368d-5343-473a-9e82-b68d2123cab4.jpeg']::text[], 'ecosoft_price_list', '42683efe-0872-4d2a-9849-a4dc0def59e4'::uuid, '{"sku":"MO675MPUREBALECO","source_row":9,"ecosoft_category":"Mətbəx altı mebellər üçün su filtrləri","stock_status":"in_stock","currency":"AZN"}'::jsonb),
  ('023099b3-4573-4586-b74f-0a8114df10c9'::uuid, 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0'::uuid, 'Фильтр RO Ecosoft P''URE Alkafuse с помпою на станине (Ecosoft P''URE Alkafuse əks osmos filtri nasoslu)', 650, 'Ev və bağ', 'e79900eb-47c5-4eaf-96e2-bfe6076d8409'::uuid, 'e3435fcd-46d8-4fd7-9199-5c8cd96d5771'::uuid, 'Bakı', 'Yeni', 'new', 'Ecosoft price list importu.
SKU: MO675MALCPSECO
Kateqoriya: Mətbəx altı mebellər üçün su filtrləri
Stok: var', '/images/imports/ecosoft-first30/023099b3-4573-4586-b74f-0a8114df10c9.jpeg', array['/images/imports/ecosoft-first30/023099b3-4573-4586-b74f-0a8114df10c9.jpeg']::text[], 'ecosoft_price_list', '42683efe-0872-4d2a-9849-a4dc0def59e4'::uuid, '{"sku":"MO675MALCPSECO","source_row":10,"ecosoft_category":"Mətbəx altı mebellər üçün su filtrləri","stock_status":"in_stock","currency":"AZN"}'::jsonb),
  ('36eeb433-b733-4947-89b1-30f268471244'::uuid, 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0'::uuid, 'Фильтр P''URE AquaCalcium с помпою на станине (Ecosoft P''URE AquaCalcium tərs osmos filtri) Филтр обратного.осм. P''URE AquaCalcium с помп....', 650, 'Ev və bağ', 'e79900eb-47c5-4eaf-96e2-bfe6076d8409'::uuid, 'e3435fcd-46d8-4fd7-9199-5c8cd96d5771'::uuid, 'Bakı', 'Yeni', 'new', 'Ecosoft price list importu.
SKU: MO675PSMACECO
Kateqoriya: Mətbəx altı mebellər üçün su filtrləri
Stok: var', '/images/imports/ecosoft-first30/36eeb433-b733-4947-89b1-30f268471244.jpeg', array['/images/imports/ecosoft-first30/36eeb433-b733-4947-89b1-30f268471244.jpeg']::text[], 'ecosoft_price_list', '42683efe-0872-4d2a-9849-a4dc0def59e4'::uuid, '{"sku":"MO675PSMACECO","source_row":11,"ecosoft_category":"Mətbəx altı mebellər üçün su filtrləri","stock_status":"in_stock","currency":"AZN"}'::jsonb),
  ('cf008e35-9be1-48b2-b27e-798635f02ba8'::uuid, 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0'::uuid, 'Фильтр обратного осмоса PURE Balance с помпой на станине (Ecosoft P''URE Balance tərs osmos filtri pompalı) Фильтр RO 6-75 Ecosoft P''URE B...', 650, 'Ev və bağ', 'e79900eb-47c5-4eaf-96e2-bfe6076d8409'::uuid, 'e3435fcd-46d8-4fd7-9199-5c8cd96d5771'::uuid, 'Bakı', 'Yeni', 'new', 'Ecosoft price list importu.
SKU: MO675MBALPSECO
Kateqoriya: Mətbəx altı mebellər üçün su filtrləri
Stok: var', '/images/imports/ecosoft-first30/cf008e35-9be1-48b2-b27e-798635f02ba8.jpeg', array['/images/imports/ecosoft-first30/cf008e35-9be1-48b2-b27e-798635f02ba8.jpeg']::text[], 'ecosoft_price_list', '42683efe-0872-4d2a-9849-a4dc0def59e4'::uuid, '{"sku":"MO675MBALPSECO","source_row":12,"ecosoft_category":"Mətbəx altı mebellər üçün su filtrləri","stock_status":"in_stock","currency":"AZN"}'::jsonb),
  ('9684c175-d42e-4724-b92a-105e6d462d5c'::uuid, 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0'::uuid, 'Фильтр RO Ecosoft Standard PRO 5-50MPS Фильтр RO Ecosoft Standard 5-50MPS /мин/помп/стан', 550, 'Ev və bağ', 'e79900eb-47c5-4eaf-96e2-bfe6076d8409'::uuid, 'e3435fcd-46d8-4fd7-9199-5c8cd96d5771'::uuid, 'Bakı', 'Yeni', 'new', 'Ecosoft price list importu.
SKU: MO550MPSECOSTD
Kateqoriya: Mətbəx altı mebellər üçün su filtrləri
Stok: var', '/images/imports/ecosoft-first30/9684c175-d42e-4724-b92a-105e6d462d5c.jpeg', array['/images/imports/ecosoft-first30/9684c175-d42e-4724-b92a-105e6d462d5c.jpeg']::text[], 'ecosoft_price_list', '42683efe-0872-4d2a-9849-a4dc0def59e4'::uuid, '{"sku":"MO550MPSECOSTD","source_row":14,"ecosoft_category":"Mətbəx altı mebellər üçün su filtrləri","stock_status":"in_stock","currency":"AZN"}'::jsonb),
  ('ffc9eb2f-4e8d-44f3-b59a-3a3095d73b27'::uuid, 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0'::uuid, 'Фильтр обратного осмоса 5-50P Ecosoft Standard (Ecosoft Standard 5-50P tərs osmos filtri)', 445, 'Ev və bağ', 'e79900eb-47c5-4eaf-96e2-bfe6076d8409'::uuid, 'e3435fcd-46d8-4fd7-9199-5c8cd96d5771'::uuid, 'Bakı', 'Yeni', 'new', 'Ecosoft price list importu.
SKU: MO550PECOSTD
Kateqoriya: Mətbəx altı mebellər üçün su filtrləri
Stok: var', '/images/imports/ecosoft-first30/ffc9eb2f-4e8d-44f3-b59a-3a3095d73b27.jpeg', array['/images/imports/ecosoft-first30/ffc9eb2f-4e8d-44f3-b59a-3a3095d73b27.jpeg']::text[], 'ecosoft_price_list', '42683efe-0872-4d2a-9849-a4dc0def59e4'::uuid, '{"sku":"MO550PECOSTD","source_row":15,"ecosoft_category":"Mətbəx altı mebellər üçün su filtrləri","stock_status":"in_stock","currency":"AZN"}'::jsonb),
  ('4534b8d4-6cc0-4d66-91c9-d2fb411b895b'::uuid, 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0'::uuid, 'Фильтр обратного осмоса 5-50P Ecosoft Standard Pro (Ecosoft Standard Pro 5-50P əks osmos filtri)', 503, 'Ev və bağ', 'e79900eb-47c5-4eaf-96e2-bfe6076d8409'::uuid, 'e3435fcd-46d8-4fd7-9199-5c8cd96d5771'::uuid, 'Bakı', 'Yeni', 'new', 'Ecosoft price list importu.
SKU: MO550MPECOSTD
Kateqoriya: Mətbəx altı mebellər üçün su filtrləri
Stok: var', '/images/imports/ecosoft-first30/4534b8d4-6cc0-4d66-91c9-d2fb411b895b.jpeg', array['/images/imports/ecosoft-first30/4534b8d4-6cc0-4d66-91c9-d2fb411b895b.jpeg']::text[], 'ecosoft_price_list', '42683efe-0872-4d2a-9849-a4dc0def59e4'::uuid, '{"sku":"MO550MPECOSTD","source_row":16,"ecosoft_category":"Mətbəx altı mebellər üçün su filtrləri","stock_status":"in_stock","currency":"AZN"}'::jsonb),
  ('7ba3a83a-e020-4d6f-a31c-9639685d2aa4'::uuid, 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0'::uuid, 'Установка водоподготовки FU1018CABCE', 1820, 'Ev və bağ', 'e79900eb-47c5-4eaf-96e2-bfe6076d8409'::uuid, 'e3435fcd-46d8-4fd7-9199-5c8cd96d5771'::uuid, 'Bakı', 'Yeni', 'new', 'Ecosoft price list importu.
SKU: FU1018CABCE
Kateqoriya: Su yumşaltma sistemi (Kabin)
Stok: var', '/images/imports/ecosoft-first30/7ba3a83a-e020-4d6f-a31c-9639685d2aa4.svg', array['/images/imports/ecosoft-first30/7ba3a83a-e020-4d6f-a31c-9639685d2aa4.svg']::text[], 'ecosoft_price_list', '42683efe-0872-4d2a-9849-a4dc0def59e4'::uuid, '{"sku":"FU1018CABCE","source_row":19,"ecosoft_category":"Su yumşaltma sistemi (Kabin)","stock_status":"in_stock","currency":"AZN"}'::jsonb),
  ('3874cc69-fdac-4561-ad46-c62edbc26665'::uuid, 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0'::uuid, 'Установка водоподготовки FU0835CABCE (Yumşaltma filtr sistemi)', 1865, 'Ev və bağ', 'e79900eb-47c5-4eaf-96e2-bfe6076d8409'::uuid, 'e3435fcd-46d8-4fd7-9199-5c8cd96d5771'::uuid, 'Bakı', 'Yeni', 'new', 'Ecosoft price list importu.
SKU: FU0835CABCE
Kateqoriya: Su yumşaltma sistemi (Kabin)
Stok: var', '/images/imports/ecosoft-first30/3874cc69-fdac-4561-ad46-c62edbc26665.jpeg', array['/images/imports/ecosoft-first30/3874cc69-fdac-4561-ad46-c62edbc26665.jpeg']::text[], 'ecosoft_price_list', '42683efe-0872-4d2a-9849-a4dc0def59e4'::uuid, '{"sku":"FU0835CABCE","source_row":20,"ecosoft_category":"Su yumşaltma sistemi (Kabin)","stock_status":"in_stock","currency":"AZN"}'::jsonb),
  ('b29d401d-3dff-4114-aa88-c5bd792cffb9'::uuid, 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0'::uuid, 'Установка водоподготовки FU1035CABCE', 2045, 'Ev və bağ', 'e79900eb-47c5-4eaf-96e2-bfe6076d8409'::uuid, 'e3435fcd-46d8-4fd7-9199-5c8cd96d5771'::uuid, 'Bakı', 'Yeni', 'new', 'Ecosoft price list importu.
SKU: FU1035CABCE
Kateqoriya: Su yumşaltma sistemi (Kabin)
Stok: var', '/images/imports/ecosoft-first30/b29d401d-3dff-4114-aa88-c5bd792cffb9.jpeg', array['/images/imports/ecosoft-first30/b29d401d-3dff-4114-aa88-c5bd792cffb9.jpeg']::text[], 'ecosoft_price_list', '42683efe-0872-4d2a-9849-a4dc0def59e4'::uuid, '{"sku":"FU1035CABCE","source_row":21,"ecosoft_category":"Su yumşaltma sistemi (Kabin)","stock_status":"in_stock","currency":"AZN"}'::jsonb),
  ('e0d4b6b0-b6ae-4235-9fa6-29560f2f0e78'::uuid, 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0'::uuid, 'Установка водоподготовки FU1235CABCE (FU1235CABCE modeli təmizlənmə sistemi)', 2200, 'Ev və bağ', 'e79900eb-47c5-4eaf-96e2-bfe6076d8409'::uuid, 'e3435fcd-46d8-4fd7-9199-5c8cd96d5771'::uuid, 'Bakı', 'Yeni', 'new', 'Ecosoft price list importu.
SKU: FU1235CABCE
Kateqoriya: Su yumşaltma sistemi (Kabin)
Stok: var', '/images/imports/ecosoft-first30/e0d4b6b0-b6ae-4235-9fa6-29560f2f0e78.jpeg', array['/images/imports/ecosoft-first30/e0d4b6b0-b6ae-4235-9fa6-29560f2f0e78.jpeg']::text[], 'ecosoft_price_list', '42683efe-0872-4d2a-9849-a4dc0def59e4'::uuid, '{"sku":"FU1235CABCE","source_row":22,"ecosoft_category":"Su yumşaltma sistemi (Kabin)","stock_status":"in_stock","currency":"AZN"}'::jsonb),
  ('a0597383-50d5-44de-bf46-de5941703f2d'::uuid, 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0'::uuid, 'Кабинетный умягчитель NatureWater Premium SF-P2', 1700, 'Ev və bağ', 'e79900eb-47c5-4eaf-96e2-bfe6076d8409'::uuid, 'e3435fcd-46d8-4fd7-9199-5c8cd96d5771'::uuid, 'Bakı', 'Yeni', 'new', 'Ecosoft price list importu.
SKU: NatureWater Premium SF-P2
Kateqoriya: Su yumşaltma sistemi (Kabin)
Stok: var', '/images/imports/ecosoft-first30/a0597383-50d5-44de-bf46-de5941703f2d.svg', array['/images/imports/ecosoft-first30/a0597383-50d5-44de-bf46-de5941703f2d.svg']::text[], 'ecosoft_price_list', '42683efe-0872-4d2a-9849-a4dc0def59e4'::uuid, '{"sku":"NatureWater Premium SF-P2","source_row":25,"ecosoft_category":"Su yumşaltma sistemi (Kabin)","stock_status":"in_stock","currency":"AZN"}'::jsonb),
  ('6b1bfccb-1a87-4231-864b-5f2f8dacb6ca'::uuid, 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0'::uuid, 'Кабинетный умягчитель NatureWater Soft-XB2', 1220, 'Ev və bağ', 'e79900eb-47c5-4eaf-96e2-bfe6076d8409'::uuid, 'e3435fcd-46d8-4fd7-9199-5c8cd96d5771'::uuid, 'Bakı', 'Yeni', 'new', 'Ecosoft price list importu.
SKU: NatureWater Soft-XB2
Kateqoriya: Su yumşaltma sistemi (Kabin)
Stok: var', '/images/imports/ecosoft-first30/6b1bfccb-1a87-4231-864b-5f2f8dacb6ca.svg', array['/images/imports/ecosoft-first30/6b1bfccb-1a87-4231-864b-5f2f8dacb6ca.svg']::text[], 'ecosoft_price_list', '42683efe-0872-4d2a-9849-a4dc0def59e4'::uuid, '{"sku":"NatureWater Soft-XB2","source_row":26,"ecosoft_category":"Su yumşaltma sistemi (Kabin)","stock_status":"in_stock","currency":"AZN"}'::jsonb),
  ('35a5e941-ff66-4b3a-a963-b46a5ce3d70c'::uuid, 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0'::uuid, 'Фильтр обратного осмоса Ecosoft Robust Standard (Ecosoft Robust Standard tərs osmos filtri)', 855, 'Ev və bağ', 'e79900eb-47c5-4eaf-96e2-bfe6076d8409'::uuid, 'e3435fcd-46d8-4fd7-9199-5c8cd96d5771'::uuid, 'Bakı', 'Yeni', 'new', 'Ecosoft price list importu.
SKU: ROBUST1000STD
Kateqoriya: HORECA tipli su filtr sistemi
Stok: var', '/images/imports/ecosoft-first30/35a5e941-ff66-4b3a-a963-b46a5ce3d70c.jpeg', array['/images/imports/ecosoft-first30/35a5e941-ff66-4b3a-a963-b46a5ce3d70c.jpeg']::text[], 'ecosoft_price_list', '42683efe-0872-4d2a-9849-a4dc0def59e4'::uuid, '{"sku":"ROBUST1000STD","source_row":28,"ecosoft_category":"HORECA tipli su filtr sistemi","stock_status":"in_stock","currency":"AZN"}'::jsonb),
  ('2ece23c6-d5b7-4c4c-906c-4cbf69e5b4e1'::uuid, 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0'::uuid, 'Система обратного осмоса Ecosoft Robust 1500 (Ecosoft Robust 1500 əks osmos sistemi) Фильтр обратного. осм. Ecosoft RObust 1500 2.0', 1635, 'Ev və bağ', 'e79900eb-47c5-4eaf-96e2-bfe6076d8409'::uuid, 'e3435fcd-46d8-4fd7-9199-5c8cd96d5771'::uuid, 'Bakı', 'Yeni', 'new', 'Ecosoft price list importu.
SKU: ROBUST1500ECO
Kateqoriya: HORECA tipli su filtr sistemi
Stok: var', '/images/imports/ecosoft-first30/2ece23c6-d5b7-4c4c-906c-4cbf69e5b4e1.jpeg', array['/images/imports/ecosoft-first30/2ece23c6-d5b7-4c4c-906c-4cbf69e5b4e1.jpeg']::text[], 'ecosoft_price_list', '42683efe-0872-4d2a-9849-a4dc0def59e4'::uuid, '{"sku":"ROBUST1500ECO","source_row":29,"ecosoft_category":"HORECA tipli su filtr sistemi","stock_status":"in_stock","currency":"AZN"}'::jsonb),
  ('92eba9d2-9a54-404a-a360-8d7f94ee94d4'::uuid, 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0'::uuid, 'Ecosoft Robust 3000', 2090, 'Ev və bağ', 'e79900eb-47c5-4eaf-96e2-bfe6076d8409'::uuid, 'e3435fcd-46d8-4fd7-9199-5c8cd96d5771'::uuid, 'Bakı', 'Yeni', 'new', 'Ecosoft price list importu.
SKU: ROBUST3000MAX
Kateqoriya: HORECA tipli su filtr sistemi
Stok: var', '/images/imports/ecosoft-first30/92eba9d2-9a54-404a-a360-8d7f94ee94d4.jpeg', array['/images/imports/ecosoft-first30/92eba9d2-9a54-404a-a360-8d7f94ee94d4.jpeg']::text[], 'ecosoft_price_list', '42683efe-0872-4d2a-9849-a4dc0def59e4'::uuid, '{"sku":"ROBUST3000MAX","source_row":30,"ecosoft_category":"HORECA tipli su filtr sistemi","stock_status":"in_stock","currency":"AZN"}'::jsonb),
  ('24786a9e-3dc8-45ec-8cce-f26283968440'::uuid, 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0'::uuid, 'Фильтр обратного осмоса Ecosoft Robust 4000 ( Ecosoft Robust 4000 əks osmos filtri)', 2520, 'Ev və bağ', 'e79900eb-47c5-4eaf-96e2-bfe6076d8409'::uuid, 'e3435fcd-46d8-4fd7-9199-5c8cd96d5771'::uuid, 'Bakı', 'Yeni', 'new', 'Ecosoft price list importu.
SKU: ROBUST4000
Kateqoriya: HORECA tipli su filtr sistemi
Stok: var', '/images/imports/ecosoft-first30/24786a9e-3dc8-45ec-8cce-f26283968440.jpeg', array['/images/imports/ecosoft-first30/24786a9e-3dc8-45ec-8cce-f26283968440.jpeg']::text[], 'ecosoft_price_list', '42683efe-0872-4d2a-9849-a4dc0def59e4'::uuid, '{"sku":"ROBUST4000","source_row":31,"ecosoft_category":"HORECA tipli su filtr sistemi","stock_status":"in_stock","currency":"AZN"}'::jsonb),
  ('47bbc349-2314-4f70-ba6d-400f90df1b1d'::uuid, 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0'::uuid, 'Установка водоподготовки FK1054CEMIXCA с ECOMIXA (FK1054CEMIXCA modeli ECOMIXA texnologiyası ilə suyun emalı qurğusu)', 2128, 'Ev və bağ', 'e79900eb-47c5-4eaf-96e2-bfe6076d8409'::uuid, 'e3435fcd-46d8-4fd7-9199-5c8cd96d5771'::uuid, 'Bakı', 'Yeni', 'new', 'Ecosoft price list importu.
SKU: FK1054CEMIXA
Kateqoriya: Sənaye tipli su yumşaltma sistemi
Stok: var', '/images/imports/ecosoft-first30/47bbc349-2314-4f70-ba6d-400f90df1b1d.jpeg', array['/images/imports/ecosoft-first30/47bbc349-2314-4f70-ba6d-400f90df1b1d.jpeg']::text[], 'ecosoft_price_list', '42683efe-0872-4d2a-9849-a4dc0def59e4'::uuid, '{"sku":"FK1054CEMIXA","source_row":33,"ecosoft_category":"Sənaye tipli su yumşaltma sistemi","stock_status":"in_stock","currency":"AZN"}'::jsonb),
  ('24b07433-d2ed-45bd-9397-8e57d35d6543'::uuid, 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0'::uuid, 'Установка водоподготовки FK1354CEMIXA', 2480, 'Ev və bağ', 'e79900eb-47c5-4eaf-96e2-bfe6076d8409'::uuid, 'e3435fcd-46d8-4fd7-9199-5c8cd96d5771'::uuid, 'Bakı', 'Yeni', 'new', 'Ecosoft price list importu.
SKU: FK1354CEMIXA
Kateqoriya: Sənaye tipli su yumşaltma sistemi
Stok: var', '/images/imports/ecosoft-first30/24b07433-d2ed-45bd-9397-8e57d35d6543.jpeg', array['/images/imports/ecosoft-first30/24b07433-d2ed-45bd-9397-8e57d35d6543.jpeg']::text[], 'ecosoft_price_list', '42683efe-0872-4d2a-9849-a4dc0def59e4'::uuid, '{"sku":"FK1354CEMIXA","source_row":34,"ecosoft_category":"Sənaye tipli su yumşaltma sistemi","stock_status":"in_stock","currency":"AZN"}'::jsonb),
  ('685b0260-21f6-4abb-81a8-5cb9c621b929'::uuid, 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0'::uuid, 'Установка водоподготовки FK1252CEMIXA с EcomixA (EcomixA FK1252CEMIXA su yumşaltma)', 2719, 'Ev və bağ', 'e79900eb-47c5-4eaf-96e2-bfe6076d8409'::uuid, 'e3435fcd-46d8-4fd7-9199-5c8cd96d5771'::uuid, 'Bakı', 'Yeni', 'new', 'Ecosoft price list importu.
SKU: FK1252CEMIXA
Kateqoriya: Sənaye tipli su yumşaltma sistemi
Stok: var', '/images/imports/ecosoft-first30/685b0260-21f6-4abb-81a8-5cb9c621b929.jpeg', array['/images/imports/ecosoft-first30/685b0260-21f6-4abb-81a8-5cb9c621b929.jpeg']::text[], 'ecosoft_price_list', '42683efe-0872-4d2a-9849-a4dc0def59e4'::uuid, '{"sku":"FK1252CEMIXA","source_row":35,"ecosoft_category":"Sənaye tipli su yumşaltma sistemi","stock_status":"in_stock","currency":"AZN"}'::jsonb),
  ('9ad3e1f4-ee4b-4394-9615-86f41c307186'::uuid, 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0'::uuid, 'Фильтр механической очистки воды BB10 Ecosoft', 75, 'Ev və bağ', 'e79900eb-47c5-4eaf-96e2-bfe6076d8409'::uuid, 'e3435fcd-46d8-4fd7-9199-5c8cd96d5771'::uuid, 'Bakı', 'Yeni', 'new', 'Ecosoft price list importu.
SKU: FPV4510ECOGR
Kateqoriya: Mexaniki filtrlər
Stok: var', '/images/imports/ecosoft-first30/9ad3e1f4-ee4b-4394-9615-86f41c307186.jpeg', array['/images/imports/ecosoft-first30/9ad3e1f4-ee4b-4394-9615-86f41c307186.jpeg']::text[], 'ecosoft_price_list', '42683efe-0872-4d2a-9849-a4dc0def59e4'::uuid, '{"sku":"FPV4510ECOGR","source_row":37,"ecosoft_category":"Mexaniki filtrlər","stock_status":"in_stock","currency":"AZN"}'::jsonb),
  ('31306e28-d9cf-4264-a56d-c2ddbcc9a6a9'::uuid, 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0'::uuid, 'Фильтр механической очистки воды BB20 Ecosoft', 103, 'Ev və bağ', 'e79900eb-47c5-4eaf-96e2-bfe6076d8409'::uuid, 'e3435fcd-46d8-4fd7-9199-5c8cd96d5771'::uuid, 'Bakı', 'Yeni', 'new', 'Ecosoft price list importu.
SKU: FPV4520ECOGR
Kateqoriya: Mexaniki filtrlər
Stok: var', '/images/imports/ecosoft-first30/31306e28-d9cf-4264-a56d-c2ddbcc9a6a9.jpeg', array['/images/imports/ecosoft-first30/31306e28-d9cf-4264-a56d-c2ddbcc9a6a9.jpeg']::text[], 'ecosoft_price_list', '42683efe-0872-4d2a-9849-a4dc0def59e4'::uuid, '{"sku":"FPV4520ECOGR","source_row":38,"ecosoft_category":"Mexaniki filtrlər","stock_status":"in_stock","currency":"AZN"}'::jsonb),
  ('9714d461-585f-4dd7-9fd6-97fe4a24063b'::uuid, 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0'::uuid, '10" High Pressure Sediment Filter, 1/2″', 45, 'Ev və bağ', 'e79900eb-47c5-4eaf-96e2-bfe6076d8409'::uuid, 'e3435fcd-46d8-4fd7-9199-5c8cd96d5771'::uuid, 'Bakı', 'Yeni', 'new', 'Ecosoft price list importu.
SKU: FPV12ECO
Kateqoriya: Mexaniki filtrlər
Stok: var', '/images/imports/ecosoft-first30/9714d461-585f-4dd7-9fd6-97fe4a24063b.svg', array['/images/imports/ecosoft-first30/9714d461-585f-4dd7-9fd6-97fe4a24063b.svg']::text[], 'ecosoft_price_list', '42683efe-0872-4d2a-9849-a4dc0def59e4'::uuid, '{"sku":"FPV12ECO","source_row":39,"ecosoft_category":"Mexaniki filtrlər","stock_status":"in_stock","currency":"AZN"}'::jsonb),
  ('19642097-3acb-42a2-afdc-170f7123359c'::uuid, 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0'::uuid, '10" High Pressure Sediment Filter, 3/4″', 45, 'Ev və bağ', 'e79900eb-47c5-4eaf-96e2-bfe6076d8409'::uuid, 'e3435fcd-46d8-4fd7-9199-5c8cd96d5771'::uuid, 'Bakı', 'Yeni', 'new', 'Ecosoft price list importu.
SKU: FPV34ECO
Kateqoriya: Mexaniki filtrlər
Stok: var', '/images/imports/ecosoft-first30/19642097-3acb-42a2-afdc-170f7123359c.svg', array['/images/imports/ecosoft-first30/19642097-3acb-42a2-afdc-170f7123359c.svg']::text[], 'ecosoft_price_list', '42683efe-0872-4d2a-9849-a4dc0def59e4'::uuid, '{"sku":"FPV34ECO","source_row":40,"ecosoft_category":"Mexaniki filtrlər","stock_status":"in_stock","currency":"AZN"}'::jsonb),
  ('ecdc0627-7171-4ebd-b6fb-801bb233bf31'::uuid, 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0'::uuid, 'Sediment Filters for hot water', 50, 'Ev və bağ', 'e79900eb-47c5-4eaf-96e2-bfe6076d8409'::uuid, 'e3435fcd-46d8-4fd7-9199-5c8cd96d5771'::uuid, 'Bakı', 'Yeni', 'new', 'Ecosoft price list importu.
SKU: FPV12HWECO
Kateqoriya: Mexaniki filtrlər
Stok: var', '/images/imports/ecosoft-first30/ecdc0627-7171-4ebd-b6fb-801bb233bf31.svg', array['/images/imports/ecosoft-first30/ecdc0627-7171-4ebd-b6fb-801bb233bf31.svg']::text[], 'ecosoft_price_list', '42683efe-0872-4d2a-9849-a4dc0def59e4'::uuid, '{"sku":"FPV12HWECO","source_row":41,"ecosoft_category":"Mexaniki filtrlər","stock_status":"in_stock","currency":"AZN"}'::jsonb)
),
inserted as (
  insert into public.listings (
    id,
    user_id,
    title,
    price,
    category,
    category_id,
    subcategory_id,
    city,
    condition,
    condition_code,
    description,
    image_url,
    image_urls,
    source,
    store_id,
    attributes,
    status,
    listing_type,
    price_type,
    delivery_type,
    delivery_available
  )
  select
    r.id,
    r.user_id,
    r.title,
    r.price,
    r.category,
    r.category_id,
    r.subcategory_id,
    r.city,
    r.condition,
    r.condition_code,
    r.description,
    r.image_url,
    r.image_urls,
    r.source,
    r.store_id,
    r.attributes,
    'pending',
    'sell',
    'fixed',
    'pickup',
    false
  from import_rows r
  where not exists (
    select 1
    from public.listings l
    where l.source = r.source
      and l.attributes ->> 'sku' = r.attributes ->> 'sku'
  )
  returning id, title, attributes ->> 'sku' as sku, status
)
select jsonb_pretty(
  jsonb_build_object(
    'requested', (select count(*) from import_rows),
    'inserted', (select count(*) from inserted),
    'skipped_existing', (select count(*) from import_rows) - (select count(*) from inserted),
    'rows', coalesce((select jsonb_agg(to_jsonb(inserted)) from inserted), '[]'::jsonb)
  )
) as result;
