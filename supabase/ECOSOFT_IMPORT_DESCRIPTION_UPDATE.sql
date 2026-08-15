-- MarktX: richer Azerbaijani descriptions for the first Ecosoft import.
-- Safe update by source + SKU; does not touch prices, status, slug, owner, or images.

select set_config('request.jwt.claim.sub', 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

with descriptions(sku, description) as (
  values
    (
      'MO1500PECO',
      $$RO Cross Solo tərs osmos əsaslı içməli su filtridir. Mətbəx altında quraşdırılır və gündəlik istifadə üçün suyun dadını, qoxusunu və şəffaflığını yaxşılaşdırmağa kömək edir.

Ecosoft su təmizləmə sistemləri tərs osmos, filtrasiya və yumşaltma texnologiyaları üzrə tanınır. Bu model evdə keyfiyyətli içməli su istəyən istifadəçilər üçün praktik seçimdir.

SKU: MO1500PECO
Stok: var$$
    ),
    (
      'MO3600MPECO',
      $$RO CROSS 90 Balance tərs osmos sistemi içməli suyun təmizlənməsi və mineral balansının daha xoş saxlanması üçün nəzərdə tutulub. Sistem mətbəx istifadəsinə uyğundur və gündəlik içməli su ehtiyacını qarşılamağa kömək edir.

Balance tipli modellər filtrasiya ilə yanaşı suyun dadını daha yumşaq və balanslı hiss etdirmək üçün seçilir.

SKU: MO3600MPECO
Stok: var$$
    ),
    (
      'MO3600PECO',
      $$RO CROSS 90 mətbəx üçün tərs osmos əsaslı su təmizləmə sistemidir. Suya qarışan mexaniki hissəciklərin, qoxunun və dadı korlayan çirklərin azaldılması üçün istifadə olunur.

Ecosoft-un RO seriyası evdə içməli su keyfiyyətini artırmaq və qablaşdırılmış sudan asılılığı azaltmaq üçün praktik həll verir.

SKU: MO3600PECO
Stok: var$$
    ),
    (
      'MO675ALCPUREECO',
      $$Ecosoft P'URE Alkafuse tərs osmos əsaslı su təmizləmə sistemidir. Alkafuse xətti təmizlənmiş suyun daha xoş dad alması və mineral tərkibinin dəstəklənməsi üçün seçilir.

Bu model mətbəx altında quraşdırılan, ailə istifadəsinə uyğun kompakt içməli su filtridir.

SKU: MO675ALCPUREECO
Stok: var$$
    ),
    (
      'MO675PUREMACECO',
      $$Ecosoft P'URE AquaCalcium tərs osmos filtridir. AquaCalcium xətti təmizlənmiş suya kalsiumla zəngin, daha yumşaq dad profili vermək üçün nəzərdə tutulur.

Mətbəx üçün uyğundur və içməli suyun qoxusunu, dadını və bulanıqlığını azaltmağa kömək edir.

SKU: MO675PUREMACECO
Stok: var$$
    ),
    (
      'MO675MPUREBALECO',
      $$Ecosoft P'URE Balance tərs osmos filtridir. Sistem suyu mərhələli şəkildə təmizləyir və gündəlik içməli su üçün balanslı dad əldə etməyə kömək edir.

Ev və ofis mətbəxləri üçün rahat seçimdir; kompakt quruluşu sayəsində mətbəx altına yerləşdirilə bilir.

SKU: MO675MPUREBALECO
Stok: var$$
    ),
    (
      'MO675MALCPSECO',
      $$Ecosoft P'URE Alkafuse nasoslu tərs osmos filtridir. Nasoslu versiya su təzyiqi aşağı olan yerlərdə sistemin daha stabil işləməsinə kömək edir.

Təmizlənmiş suyun dadını yaxşılaşdırmaq və gündəlik içməli su ehtiyacını qarşılamaq üçün mətbəx altında quraşdırılır.

SKU: MO675MALCPSECO
Stok: var$$
    ),
    (
      'MO675PSMACECO',
      $$Ecosoft P'URE AquaCalcium nasoslu tərs osmos sistemidir. Təmizlənmiş suyun kalsiumla zəngin daha xoş dad alması, həmçinin aşağı təzyiq şəraitində stabil işləməsi üçün uyğundur.

Ev mətbəxləri və kiçik ofislər üçün içməli su həlli kimi istifadə olunur.

SKU: MO675PSMACECO
Stok: var$$
    ),
    (
      'MO675MBALPSECO',
      $$Ecosoft P'URE Balance nasoslu tərs osmos sistemidir. Pompalı konstruksiya aşağı su təzyiqində filtrin məhsuldarlığını qorumağa kömək edir.

Sistem içməli suyun dadını yaxşılaşdırmaq, qoxunu və görünən bulanıqlığı azaltmaq üçün mətbəx altında quraşdırılır.

SKU: MO675MBALPSECO
Stok: var$$
    ),
    (
      'MO550MPSECOSTD',
      $$Ecosoft Standard PRO 5-50MPS tərs osmos filtridir. Nasoslu və stendli quruluş su təzyiqi zəif olan yerlərdə də sistemin rahat işləməsinə kömək edir.

Bu model içməli suyun gündəlik təmizlənməsi üçün ev və ofis mətbəxlərində istifadə oluna bilər.

SKU: MO550MPSECOSTD
Stok: var$$
    ),
    (
      'MO550PECOSTD',
      $$Ecosoft Standard 5-50P tərs osmos filtridir. Mətbəx altında quraşdırılır və içməli suyun dadını, qoxusunu və keyfiyyətini yaxşılaşdırmaq üçün mərhələli filtrasiya təqdim edir.

Sadə və etibarlı RO sistemi axtaran istifadəçilər üçün uyğundur.

SKU: MO550PECOSTD
Stok: var$$
    ),
    (
      'MO550MPECOSTD',
      $$Ecosoft Standard Pro 5-50P tərs osmos filtridir. Pro xətti gündəlik içməli su ehtiyacında daha stabil filtrasiya və rahat istifadə üçün nəzərdə tutulub.

Ev mətbəxi, ofis və kiçik iş yerləri üçün təmiz içməli su həlli kimi istifadə edilə bilər.

SKU: MO550MPECOSTD
Stok: var$$
    ),
    (
      'FU1018CABCE',
      $$FU1018CABCE kabinet tipli su yumşaltma sistemidir. Sərt suyun təsirini azaltmağa, məişət texnikasını və santexnika xətlərini ərp yığılmasından qorumağa kömək edir.

Kompakt kabinet quruluşu ev və kiçik obyektlər üçün rahat quraşdırma imkanı yaradır.

SKU: FU1018CABCE
Stok: var$$
    ),
    (
      'FU0835CABCE',
      $$FU0835CABCE kabinet tipli yumşaltma filtr sistemidir. Suda sərtlik yaradan duzların təsirini azaltmaq və cihazların daha uzunömürlü işləməsinə dəstək vermək üçün istifadə olunur.

Ev, bağ evi və kiçik kommersiya obyektləri üçün praktik su hazırlama həllidir.

SKU: FU0835CABCE
Stok: var$$
    ),
    (
      'FU1035CABCE',
      $$FU1035CABCE su yumşaltma sistemidir. Sərt su problemi olan məkanlarda ərp riskini azaltmağa və su ilə işləyən avadanlıqları qorumağa kömək edir.

Kabinet tipli dizayn sistemi səliqəli və kompakt şəkildə quraşdırmağa imkan verir.

SKU: FU1035CABCE
Stok: var$$
    ),
    (
      'FU1235CABCE',
      $$FU1235CABCE modeli suyun yumşaldılması üçün kabinet tipli filtr sistemidir. Məişət texnikası, kombi və santexnika xətlərində ərp yığılmasını azaltmaq üçün istifadə olunur.

Sərt suyun çox olduğu ev və obyektlər üçün uyğun seçimdir.

SKU: FU1235CABCE
Stok: var$$
    ),
    (
      'NatureWater Premium SF-P2',
      $$NatureWater Premium SF-P2 kabinet tipli su yumşaldıcıdır. Sərt suyun yaratdığı ərp, ləkə və texniki yüklənməni azaltmaq üçün nəzərdə tutulub.

Kompakt quruluşu sayəsində evlərdə və kiçik obyektlərdə rahat quraşdırıla bilər.

SKU: NatureWater Premium SF-P2
Stok: var$$
    ),
    (
      'NatureWater Soft-XB2',
      $$NatureWater Soft-XB2 kabinet tipli su yumşaldıcıdır. Sərtlik problemini azaltmaqla su ilə işləyən avadanlığın qorunmasına və gündəlik istifadədə daha yumşaq su əldə etməyə kömək edir.

Ev və bağ evi üçün uyğun praktik su hazırlama sistemidir.

SKU: NatureWater Soft-XB2
Stok: var$$
    ),
    (
      'ROBUST1000STD',
      $$Ecosoft Robust Standard tərs osmos filtridir. Daha yüksək məhsuldarlıq tələb olunan mətbəx, ofis və kiçik HORECA sahələri üçün nəzərdə tutulub.

Robust xətti içməli və texnoloji suyun stabil təmizlənməsi üçün seçilən kommersiya yönümlü RO həllidir.

SKU: ROBUST1000STD
Stok: var$$
    ),
    (
      'ROBUST1500ECO',
      $$Ecosoft Robust 1500 tərs osmos sistemidir. Kafe, restoran, ofis və kiçik istehsal sahələrində daha çox təmiz su ehtiyacı üçün istifadə oluna bilər.

Sistem suyun dadını və keyfiyyətini yaxşılaşdırmaqla içkilər və qida hazırlığında stabil nəticə verməyə kömək edir.

SKU: ROBUST1500ECO
Stok: var$$
    ),
    (
      'ROBUST3000MAX',
      $$Ecosoft Robust 3000 yüksək məhsuldarlıqlı tərs osmos sistemidir. HORECA və kommersiya istifadəsində davamlı təmiz su axını tələb olunan yerlər üçün uyğundur.

Restoran, kafe və texnoloji su hazırlığı üçün daha güclü filtrasiya həlli kimi seçilə bilər.

SKU: ROBUST3000MAX
Stok: var$$
    ),
    (
      'ROBUST4000',
      $$Ecosoft Robust 4000 tərs osmos filtridir. Yüksək su sərfiyyatı olan obyektlərdə içməli və texnoloji suyun təmizlənməsi üçün nəzərdə tutulub.

Kommersiya mətbəxləri, HORECA və servis sahələri üçün güclü RO həllidir.

SKU: ROBUST4000
Stok: var$$
    ),
    (
      'FK1054CEMIXA',
      $$FK1054CEMIXA ECOMIXA texnologiyası ilə suyun emalı qurğusudur. Sərtlik, dəmir, manqan və üzvi qarışıqların təsirini azaltmaq üçün kompleks filtrasiya məqsədi ilə istifadə olunur.

Ecosoft-un ECOMIX yanaşması müxtəlif su problemlərini bir sistemdə həll etməyə yönəlmiş texnologiya kimi tanınır.

SKU: FK1054CEMIXA
Stok: var$$
    ),
    (
      'FK1354CEMIXA',
      $$FK1354CEMIXA ECOMIXA tipli su hazırlama sistemidir. Sərt su, dəmir və digər qarışıqların yaratdığı problemləri azaltmaq üçün sənaye və böyük obyekt tətbiqlərinə uyğundur.

Bu tip sistemlər suyun keyfiyyətini sabitləşdirmək və avadanlığı qorumaq üçün istifadə edilir.

SKU: FK1354CEMIXA
Stok: var$$
    ),
    (
      'FK1252CEMIXA',
      $$FK1252CEMIXA ECOMIXA texnologiyalı su yumşaltma və təmizləmə sistemidir. Sərtlik, dəmir və qarışıqların azaldılması tələb olunan obyektlər üçün nəzərdə tutulub.

Sənaye, servis və böyük ev təsərrüfatlarında suyun daha stabil keyfiyyətdə hazırlanmasına kömək edir.

SKU: FK1252CEMIXA
Stok: var$$
    ),
    (
      'FPV4510ECOGR',
      $$Ecosoft BB10 mexaniki su filtri iri korpuslu ön filtrasiya üçün istifadə olunur. Qum, pas, çöküntü və digər mexaniki hissəciklərin tutulmasına kömək edir.

Əsas filtr sistemlərini və məişət avadanlığını qorumaq üçün giriş xəttində quraşdırıla bilər.

SKU: FPV4510ECOGR
Stok: var$$
    ),
    (
      'FPV4520ECOGR',
      $$Ecosoft BB20 mexaniki su filtri daha böyük korpuslu ön filtrasiya həllidir. Su xəttindəki qum, pas və mexaniki çöküntüləri azaltmaq üçün istifadə olunur.

Ev, bağ evi və obyekt girişlərində əsas sistemdən əvvəl qoruyucu filtr kimi tətbiq oluna bilər.

SKU: FPV4520ECOGR
Stok: var$$
    ),
    (
      'FPV12ECO',
      $$10 düymlük High Pressure Sediment Filter 1/2 bağlantılı mexaniki filtrdir. Suda olan qum, pas və çöküntü kimi hissəciklərin tutulması üçün nəzərdə tutulub.

Ön filtr kimi istifadə edilərək əsas filtr və texniki avadanlığın daha təmiz su ilə işləməsinə kömək edir.

SKU: FPV12ECO
Stok: var$$
    ),
    (
      'FPV34ECO',
      $$10 düymlük High Pressure Sediment Filter 3/4 bağlantılı mexaniki filtrdir. Su xəttindəki mexaniki hissəcikləri azaltmaq və avadanlığı qorumaq üçün istifadə olunur.

Ev və kiçik obyektlərdə giriş filtrasiya mərhələsi kimi uyğundur.

SKU: FPV34ECO
Stok: var$$
    ),
    (
      'FPV12HWECO',
      $$Sediment Filters for hot water isti su xətləri üçün mexaniki çöküntü filtridir. Qum, pas və digər sərt hissəciklərin tutulmasına kömək edir.

İsti su ilə işləyən avadanlıq və santexnika sistemlərini qorumaq üçün ön filtr kimi istifadə oluna bilər.

SKU: FPV12HWECO
Stok: var$$
    )
),
updated as (
  update public.listings l
  set description = d.description,
      updated_at = now()
  from descriptions d
  where l.source = 'ecosoft_price_list'
    and l.attributes ->> 'sku' = d.sku
  returning l.id, l.attributes ->> 'sku' as sku
)
select jsonb_pretty(
  jsonb_build_object(
    'updated', (select count(*) from updated),
    'skus', coalesce((select jsonb_agg(sku order by sku) from updated), '[]'::jsonb)
  )
) as result;
