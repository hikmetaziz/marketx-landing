-- MarktX: Ecosoft additional 29 listings cleanup.
-- Does not insert duplicates. Updates existing imported rows by SKU.

select set_config('request.jwt.claim.sub', 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

with updates(sku, title, description, image_url) as (
  values
    ('MO3600MPECO', 'Ecosoft CROSS 90 Balance tərs osmos su filtri',
$$Ecosoft CROSS 90 Balance mətbəx üçün tərs osmos əsaslı su təmizləmə sistemidir. Model içməli suyun gündəlik istifadəsi üçün nəzərdə tutulub və kompakt quruluşu sayəsində mətbəx mebelinin altında yerləşdirilə bilər.

Balance versiyası təmizlənmiş suyun dadını daha balanslı hiss etdirmək üçün seçilən Ecosoft xəttinə aiddir.

Model: CROSS 90 Balance
Məhsul kodu: MO3600MPECO$$,
'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/53fdf0b8-8fcd-4429-9ee1-e3320b46b67f.svg'),
    ('MO3600PECO', 'Ecosoft CROSS 90 tərs osmos su filtri',
$$Ecosoft CROSS 90 içməli suyun təmizlənməsi üçün tərs osmos sistemidir. Mətbəx istifadəsinə uyğun kompakt quruluşu var və gündəlik su ehtiyacını qarşılamaq üçün istifadə olunur.

Sistem suyun dadını, qoxusunu və şəffaflığını yaxşılaşdırmağa kömək edən filtrasiya həlli kimi seçilə bilər.

Model: CROSS 90
Məhsul kodu: MO3600PECO$$,
'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/7dc3d262-aa91-4aa0-8d96-6388988589be.svg'),
    ('MO675ALCPUREECO', 'Ecosoft P''URE Alkafuse tərs osmos su filtri',
$$Ecosoft P'URE Alkafuse tərs osmos əsaslı içməli su filtridir. Mətbəx altında quraşdırılan bu sistem evdə təmiz içməli su əldə etmək üçün nəzərdə tutulub.

Alkafuse xətti təmizlənmiş suyun dadını daha xoş etmək istəyən istifadəçilər üçün uyğundur.

Model: P'URE Alkafuse
Məhsul kodu: MO675ALCPUREECO$$,
'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/8ccf0bf4-3188-4ce2-b732-087de9837d2a.jpeg'),
    ('MO675PUREMACECO', 'Ecosoft P''URE AquaCalcium tərs osmos su filtri',
$$Ecosoft P'URE AquaCalcium içməli suyun təmizlənməsi üçün tərs osmos filtridir. Sistem mətbəx istifadəsi üçün hazırlanıb və suyun dadını, qoxusunu və görünüşünü yaxşılaşdırmağa kömək edir.

AquaCalcium xətti təmizlənmiş su üçün daha xoş dad profili istəyən istifadəçilər üçün seçilə bilər.

Model: P'URE AquaCalcium
Məhsul kodu: MO675PUREMACECO$$,
'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/0666b021-0674-4dd6-a8eb-f8d3b5581286.jpeg'),
    ('MO675MPUREBALECO', 'Ecosoft P''URE Balance tərs osmos su filtri',
$$Ecosoft P'URE Balance tərs osmos əsaslı su təmizləmə sistemidir. Mətbəx altında quraşdırılaraq gündəlik içməli su üçün praktik həll təqdim edir.

Balance seriyası təmizlənmiş suyun dadını daha yumşaq və balanslı hiss etdirmək üçün nəzərdə tutulan Ecosoft xəttidir.

Model: P'URE Balance
Məhsul kodu: MO675MPUREBALECO$$,
'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/1105368d-5343-473a-9e82-b68d2123cab4.jpeg'),
    ('MO675MALCPSECO', 'Ecosoft P''URE Alkafuse nasoslu tərs osmos filtri',
$$Ecosoft P'URE Alkafuse nasoslu tərs osmos filtridir. Nasoslu versiya su təzyiqi zəif olan məkanlarda sistemin daha stabil işləməsinə kömək etmək üçün seçilir.

Mətbəx altında quraşdırılır və gündəlik içməli su istifadəsi üçün nəzərdə tutulub.

Model: P'URE Alkafuse Pump
Məhsul kodu: MO675MALCPSECO$$,
'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/023099b3-4573-4586-b74f-0a8114df10c9.jpeg'),
    ('MO675PSMACECO', 'Ecosoft P''URE AquaCalcium nasoslu tərs osmos filtri',
$$Ecosoft P'URE AquaCalcium nasoslu tərs osmos su filtridir. Sistem içməli suyun təmizlənməsi üçün istifadə olunur və nasoslu quruluş aşağı təzyiq şəraitində daha rahat işləmə imkanı yaradır.

Mətbəx üçün kompakt su təmizləmə həlli kimi uyğundur.

Model: P'URE AquaCalcium Pump
Məhsul kodu: MO675PSMACECO$$,
'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/36eeb433-b733-4947-89b1-30f268471244.jpeg'),
    ('MO675MBALPSECO', 'Ecosoft P''URE Balance nasoslu tərs osmos filtri',
$$Ecosoft P'URE Balance nasoslu tərs osmos filtridir. Təmiz içməli su üçün hazırlanmış bu model mətbəx altında quraşdırılır və nasoslu quruluşu ilə daha stabil iş rejimi təqdim edir.

Gündəlik içməli su, yemək və isti içkilər üçün təmizlənmiş su əldə etməyə kömək edir.

Model: P'URE Balance Pump
Məhsul kodu: MO675MBALPSECO$$,
'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/cf008e35-9be1-48b2-b27e-798635f02ba8.jpeg'),
    ('MO550MPSECOSTD', 'Ecosoft Standard PRO 5-50MPS nasoslu su filtri',
$$Ecosoft Standard PRO 5-50MPS tərs osmos əsaslı içməli su filtridir. Nasoslu və stendli quruluş su təzyiqi zəif olan yerlərdə sistemin stabil işləməsinə kömək edir.

Ev və ofis mətbəxləri üçün təmiz içməli su həlli kimi istifadə oluna bilər.

Model: Standard PRO 5-50MPS
Məhsul kodu: MO550MPSECOSTD$$,
'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/9684c175-d42e-4724-b92a-105e6d462d5c.jpeg'),
    ('MO550PECOSTD', 'Ecosoft Standard 5-50P tərs osmos su filtri',
$$Ecosoft Standard 5-50P mətbəx üçün tərs osmos su filtridir. İçməli suyun dadını və qoxusunu yaxşılaşdırmaq üçün mərhələli filtrasiya prinsipi ilə işləyir.

Sadə və etibarlı su təmizləmə sistemi axtaran istifadəçilər üçün uyğundur.

Model: Standard 5-50P
Məhsul kodu: MO550PECOSTD$$,
'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/ffc9eb2f-4e8d-44f3-b59a-3a3095d73b27.jpeg'),
    ('MO550MPECOSTD', 'Ecosoft Standard Pro 5-50P tərs osmos su filtri',
$$Ecosoft Standard Pro 5-50P tərs osmos filtridir. Sistem mətbəxdə gündəlik içməli suyun təmizlənməsi üçün nəzərdə tutulub.

Ev, ofis və kiçik iş yerlərində suyun dadını və keyfiyyətini yaxşılaşdırmaq üçün praktik seçimdir.

Model: Standard Pro 5-50P
Məhsul kodu: MO550MPECOSTD$$,
'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/4534b8d4-6cc0-4d66-91c9-d2fb411b895b.jpeg'),
    ('FU1018CABCE', 'Ecosoft FU1018CABCE kabinet tipli su yumşaldıcı',
$$Ecosoft FU1018CABCE kabinet tipli su yumşaltma sistemidir. Sərt suyun yaratdığı ərp problemini azaltmaq və su ilə işləyən avadanlığı qorumaq üçün istifadə olunur.

Kompakt kabinet quruluşu ev və kiçik obyektlərdə səliqəli quraşdırma imkanı verir.

Model: FU1018CABCE
Məhsul kodu: FU1018CABCE$$,
'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/7ba3a83a-e020-4d6f-a31c-9639685d2aa4.svg'),
    ('FU0835CABCE', 'Ecosoft FU0835CABCE kabinet tipli su yumşaldıcı',
$$Ecosoft FU0835CABCE kabinet tipli yumşaltma filtr sistemidir. Sərt suyun təsirini azaltmaq, santexnika və məişət texnikasını ərpdən qorumaq üçün nəzərdə tutulub.

Ev, bağ evi və kiçik obyektlər üçün praktik su hazırlama həllidir.

Model: FU0835CABCE
Məhsul kodu: FU0835CABCE$$,
'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/3874cc69-fdac-4561-ad46-c62edbc26665.jpeg'),
    ('FU1035CABCE', 'Ecosoft FU1035CABCE kabinet tipli su yumşaldıcı',
$$Ecosoft FU1035CABCE su yumşaltma sistemidir. Sərt suyun məişət texnikasına və boru xətlərinə təsirini azaltmaq üçün istifadə olunur.

Kabinet tipli dizayn sistemin kompakt və səliqəli yerləşdirilməsinə imkan verir.

Model: FU1035CABCE
Məhsul kodu: FU1035CABCE$$,
'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/b29d401d-3dff-4114-aa88-c5bd792cffb9.jpeg'),
    ('FU1235CABCE', 'Ecosoft FU1235CABCE kabinet tipli su yumşaldıcı',
$$Ecosoft FU1235CABCE kabinet tipli su yumşaltma sistemidir. Sərt suyun yaratdığı ərp riskini azaltmaq və su ilə işləyən avadanlığın qorunmasına kömək etmək üçün nəzərdə tutulub.

Ev və kiçik obyekt istifadəsi üçün uyğun su hazırlama həllidir.

Model: FU1235CABCE
Məhsul kodu: FU1235CABCE$$,
'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/e0d4b6b0-b6ae-4235-9fa6-29560f2f0e78.jpeg'),
    ('NatureWater Premium SF-P2', 'NatureWater Premium SF-P2 kabinet tipli su yumşaldıcı',
$$NatureWater Premium SF-P2 kabinet tipli su yumşaldıcıdır. Sərt suyun yaratdığı ərp və ləkə problemini azaltmaq üçün istifadə olunur.

Kompakt quruluşu sayəsində ev və kiçik obyektlərdə rahat yerləşdirilə bilər.

Model: NatureWater Premium SF-P2
Məhsul kodu: NatureWater Premium SF-P2$$,
'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/a0597383-50d5-44de-bf46-de5941703f2d.svg'),
    ('NatureWater Soft-XB2', 'NatureWater Soft-XB2 kabinet tipli su yumşaldıcı',
$$NatureWater Soft-XB2 kabinet tipli su yumşaldıcıdır. Sərtlik problemini azaltmaq və gündəlik istifadə üçün daha yumşaq su əldə etmək məqsədi ilə seçilə bilər.

Ev, bağ evi və kiçik obyektlər üçün praktik həlldir.

Model: NatureWater Soft-XB2
Məhsul kodu: NatureWater Soft-XB2$$,
'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/6b1bfccb-1a87-4231-864b-5f2f8dacb6ca.svg'),
    ('ROBUST1000STD', 'Ecosoft Robust Standard tərs osmos sistemi',
$$Ecosoft Robust Standard daha çox su sərfiyyatı olan məkanlar üçün tərs osmos əsaslı filtr sistemidir. Kafe, ofis və kiçik HORECA istifadə ssenariləri üçün uyğun seçim ola bilər.

Sistem içməli və texnoloji suyun keyfiyyətini sabit saxlamağa kömək edir.

Model: Robust Standard
Məhsul kodu: ROBUST1000STD$$,
'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/35a5e941-ff66-4b3a-a963-b46a5ce3d70c.jpeg'),
    ('ROBUST1500ECO', 'Ecosoft Robust 1500 tərs osmos sistemi',
$$Ecosoft Robust 1500 kommersiya istifadəsinə uyğun tərs osmos sistemidir. Daha çox təmiz su ehtiyacı olan kafe, restoran və ofis kimi yerlərdə istifadə oluna bilər.

Sistem suyun dadını və keyfiyyətini yaxşılaşdırmaq üçün nəzərdə tutulan Ecosoft Robust xəttinə aiddir.

Model: Robust 1500
Məhsul kodu: ROBUST1500ECO$$,
'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/2ece23c6-d5b7-4c4c-906c-4cbf69e5b4e1.jpeg'),
    ('ROBUST3000MAX', 'Ecosoft Robust 3000 tərs osmos sistemi',
$$Ecosoft Robust 3000 yüksək su ehtiyacı olan obyektlər üçün tərs osmos sistemidir. HORECA və kommersiya istifadəsində təmiz suyun davamlı təmin olunmasına kömək edir.

Restoran, kafe və servis sahələrində içməli və texnoloji su hazırlığı üçün seçilə bilər.

Model: Robust 3000
Məhsul kodu: ROBUST3000MAX$$,
'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/92eba9d2-9a54-404a-a360-8d7f94ee94d4.jpeg'),
    ('ROBUST4000', 'Ecosoft Robust 4000 tərs osmos sistemi',
$$Ecosoft Robust 4000 yüksək məhsuldarlıqlı tərs osmos sistemidir. Böyük su sərfiyyatı olan obyektlərdə suyun təmizlənməsi üçün istifadə oluna bilər.

Kommersiya mətbəxləri və HORECA sahələri üçün Ecosoft Robust seriyasına aid güclü filtrasiya həllidir.

Model: Robust 4000
Məhsul kodu: ROBUST4000$$,
'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/24786a9e-3dc8-45ec-8cce-f26283968440.jpeg'),
    ('FK1054CEMIXA', 'Ecosoft FK1054CEMIXA Ecomix su təmizləmə sistemi',
$$Ecosoft FK1054CEMIXA Ecomix tipli su hazırlama sistemidir. Sərtlik və suda olan bəzi qarışıqların təsirini azaltmaq üçün kompleks su emalı həlli kimi istifadə olunur.

Ev və obyektlərdə suyun keyfiyyətini sabitləşdirmək və avadanlığı qorumaq məqsədi ilə seçilə bilər.

Model: FK1054CEMIXA
Məhsul kodu: FK1054CEMIXA$$,
'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/47bbc349-2314-4f70-ba6d-400f90df1b1d.jpeg'),
    ('FK1354CEMIXA', 'Ecosoft FK1354CEMIXA Ecomix su təmizləmə sistemi',
$$Ecosoft FK1354CEMIXA Ecomix tipli su hazırlama sistemidir. Daha böyük obyektlərdə suyun yumşaldılması və ümumi keyfiyyətinin yaxşılaşdırılması üçün istifadə oluna bilər.

Sistem su ilə işləyən avadanlığın qorunmasına və suyun daha stabil keyfiyyətdə hazırlanmasına kömək edir.

Model: FK1354CEMIXA
Məhsul kodu: FK1354CEMIXA$$,
'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/24b07433-d2ed-45bd-9397-8e57d35d6543.jpeg'),
    ('FK1252CEMIXA', 'Ecosoft FK1252CEMIXA Ecomix su təmizləmə sistemi',
$$Ecosoft FK1252CEMIXA Ecomix texnologiyalı su hazırlama sistemidir. Sərt su və suyun keyfiyyəti ilə bağlı problemləri azaltmaq üçün kompleks filtrasiya həlli kimi seçilə bilər.

Obyekt, servis və böyük ev təsərrüfatlarında suyun daha stabil hazırlanmasına kömək edir.

Model: FK1252CEMIXA
Məhsul kodu: FK1252CEMIXA$$,
'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/685b0260-21f6-4abb-81a8-5cb9c621b929.jpeg'),
    ('FPV4510ECOGR', 'Ecosoft BB10 mexaniki su filtri',
$$Ecosoft BB10 mexaniki su filtri giriş filtrasiya mərhələsi üçün istifadə olunur. Qum, pas və çöküntü kimi mexaniki hissəciklərin tutulmasına kömək edir.

Əsas filtr sistemini və məişət avadanlığını qorumaq üçün su xəttində ön filtr kimi quraşdırıla bilər.

Model: BB10
Məhsul kodu: FPV4510ECOGR$$,
'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/9ad3e1f4-ee4b-4394-9615-86f41c307186.jpeg'),
    ('FPV4520ECOGR', 'Ecosoft BB20 mexaniki su filtri',
$$Ecosoft BB20 mexaniki su filtri su xəttindəki iri mexaniki hissəcikləri azaltmaq üçün istifadə olunur. Daha böyük korpuslu ön filtrasiya həlli kimi ev və obyektlərdə tətbiq oluna bilər.

Qum, pas və çöküntülərin tutulması əsas filtr və avadanlığın qorunmasına kömək edir.

Model: BB20
Məhsul kodu: FPV4520ECOGR$$,
'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/31306e28-d9cf-4264-a56d-c2ddbcc9a6a9.jpeg'),
    ('FPV12ECO', 'High Pressure Sediment Filter 1/2 mexaniki filtr',
$$High Pressure Sediment Filter 1/2 bağlantılı mexaniki çöküntü filtridir. Su xəttində qum, pas və digər mexaniki hissəciklərin azaldılması üçün istifadə olunur.

Ön filtr kimi quraşdırılaraq əsas filtrasiya sisteminin və avadanlığın qorunmasına kömək edir.

Model: 10" High Pressure Sediment Filter 1/2
Məhsul kodu: FPV12ECO$$,
'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/9714d461-585f-4dd7-9fd6-97fe4a24063b.svg'),
    ('FPV34ECO', 'High Pressure Sediment Filter 3/4 mexaniki filtr',
$$High Pressure Sediment Filter 3/4 bağlantılı mexaniki çöküntü filtridir. Suda olan qum, pas və mexaniki hissəcikləri azaltmaq üçün istifadə olunur.

Ev və kiçik obyektlərdə giriş filtrasiya mərhələsi kimi quraşdırıla bilər.

Model: 10" High Pressure Sediment Filter 3/4
Məhsul kodu: FPV34ECO$$,
'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/19642097-3acb-42a2-afdc-170f7123359c.svg'),
    ('FPV12HWECO', 'İsti su üçün sediment mexaniki filtr',
$$İsti su xətləri üçün sediment mexaniki filtr suda olan çöküntü, pas və digər mexaniki hissəciklərin tutulmasına kömək edir.

İsti su ilə işləyən avadanlıq və santexnika sistemlərini qorumaq üçün ön filtr kimi istifadə oluna bilər.

Model: Sediment Filters for hot water
Məhsul kodu: FPV12HWECO$$,
'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/ecdc0627-7171-4ebd-b6fb-801bb233bf31.svg')
),
updated as (
  update public.listings l
  set
    title = u.title,
    description = u.description,
    image_url = u.image_url,
    image_urls = array[u.image_url],
    status = 'pending',
    rejected_reason = null,
    reviewed_at = null,
    reviewed_by = null,
    category = 'Ev və bağ',
    category_id = 'e79900eb-47c5-4eaf-96e2-bfe6076d8409',
    subcategory_id = 'e3435fcd-46d8-4fd7-9199-5c8cd96d5771',
    city = 'Bakı',
    condition = 'Yeni',
    condition_code = 'new',
    attributes = coalesce(l.attributes, '{}'::jsonb) || jsonb_build_object('currency', 'AZN'),
    updated_at = now()
  from updates u
  where l.source = 'ecosoft_price_list'
    and l.attributes ->> 'sku' = u.sku
    and u.sku <> 'MO1500PECO'
  returning l.id, l.attributes ->> 'sku' as sku, l.title, l.status
)
select jsonb_pretty(
  jsonb_build_object(
    'updated', (select count(*) from updated),
    'rows', coalesce((select jsonb_agg(to_jsonb(updated) order by sku) from updated), '[]'::jsonb)
  )
) as result;
