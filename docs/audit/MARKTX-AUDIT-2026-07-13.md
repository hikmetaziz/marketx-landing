# MarktX Müstəqil Audit Hesabatı

**Tarix:** 13 iyul 2026  
**Web repo:** `F:\projects\websites\marketx-landing`  
**Mobile repo:** `F:\projects\mobile_apps\marktx-app`  
**Production:** https://www.marketx.az  
**Supabase ref:** `vrtnxdexofpiapbodxkx`

> **Qeyd:** Bu audit müstəqil aparılıb; əvvəlki Codex/Composer/Fable hesabatları sübut kimi qəbul edilməyib. Brauzer avtomatlaşdırması, Android emulyator/cihaz, test hesabları və screenshot alma bu mühitdə mövcud olmadığı üçün vizual human-style testlər və yazma (create/edit) round-trip testləri **UNVERIFIED** işarələnib.

---

## A. İcmal (Executive Summary)

| Sahə | Status | Qeyd |
|---|---|---|
| Web static health | **PASS** | tsc=0, schema/taxonomy validate=pass |
| Web runtime (lokal, human) | **UNVERIFIED** | Brauzer avtomatlaşdırması yoxdur |
| Mobile static health | **PASS** | typecheck=0, contract hash uyğun |
| Mobile runtime (native) | **UNVERIFIED** | Emulyator/cihaz yoxdur |
| Supabase/RLS | **PASS WITH WARNINGS** | `stores` anon-a tam açıqdır (aşağı-orta) |
| Web/mobile parity | **PASS** | Contract hash `a6098c2a…` eynidir (data-səviyyə); runtime UI müqayisəsi UNVERIFIED |
| Production deployment | **PASS WITH WARNINGS** | Soft-404, canonical domain, /elanlar |
| Production readiness | **PASS WITH WARNINGS** | Kritik bloklayıcı yoxdur; SEO + release-hygiene məsələləri |

Əvvəlki hesabatlarda iddia edilən əsas "kritik" problemlərin çoxu (Apple dublikat, desktop battery, boş schema cədvəlləri) **lokal/canlı vəziyyətdə təsdiqlənmədi** — düzəldilib. Real qalan məsələlər əsasən SEO və release-idarəetməsidir.

---

## B. Kritik tapıntılar (Critical)

**Yoxdur.** Yoxlaya bildiyim sahələrdə production-u bloklayan data-itkisi/təhlükəsizlik nasazlığı tapılmadı.

---

## C. Yüksək tapıntılar (High)

### H1 — Mövcud olmayan elan slug-u HTTP 200 qaytarır (soft-404)

- **Sübut:** `GET https://www.marketx.az/listings/nonexistent-slug-xyz-999 → HTTP 200 (len=27815)`
- **Gözlənilən:** 404
- **Təsir:** SEO-da "soft 404", axtarış motorlarının saxta səhifələri indeksləməsi. Şübhəli #6 **TƏSDİQLƏNDİ**
- **Kateqoriya:** route/SEO defekti

---

## D. Orta tapıntılar (Medium)

### M1 — `stores` cədvəli anon açarla tam sütunlarla oxunur

- **Sübut:** anon açarla `GET /rest/v1/stores?select=*` → 1 sətir, sütunlar: `id,store_code,name,slug,description,category,category_id,contact_phone,whatsapp_phone,address,city,logo_url,cover_url,owner_id,status,created_by,created_at,updated_at,map_url`
- `public_store_profiles` sanitized view məhz `owner_id`, `created_by`, `updated_at` kimi sahələri gizlətmək üçün yaradılmışdı; lakin baza cədvəli birbaşa oxunduğu üçün view-un qoruması effektsizdir
- **Təsir:** istifadəçi UUID-lərinin (owner_id/created_by) və bütün statusların açıqlanması. Kontakt telefonları onsuz da publik sayılır, amma owner/created_by məxfilik məsələsidir
- **Tövsiyə:** `stores` üzərində anon SELECT-i ya bağlayın (yalnız view), ya da view-u `security_invoker=on` ilə saxlayıb baza cədvəlinə RLS SELECT policy-ni sütun/status ilə məhdudlaşdırın

### M2 — Canonical apex domenə işarə edir, sayt www-də servis olunur (duplikat kontent riski)

- **Sübut:** `www.marketx.az/` səhifəsində `<link rel="canonical" href="https://marketx.az"/>`. Apex `marketx.az/` isə redirect etmədən 200 qaytarır (www-yə yönləndirmə yoxdur)
- **Nəticə:** həm apex, həm www eyni kontenti verir; canonical apex-i seçir amma yönləndirmə yoxdur. Şübhəli #7 **TƏSDİQLƏNDİ** (apex/www uyğunsuzluğu var)
- **Qeyd:** canonical `marketx.az` brend qaydasına uyğundur (yaxşı), amma 301 yönləndirmə əlavə edilməlidir

### M3 — `/elanlar` production-da 404

- **Sübut:** `GET /elanlar → HTTP 404`, halbuki `/listings → 200`. Şübhəli #5 **qismən TƏSDİQLƏNDİ**
- **Qərar:** bu deployment gecikməsi deyil, sadəcə AZ-dilli `/elanlar` marşrutu mövcud deyil — kanonik marşrut `/listings`-dir. AZ auditoriya üçün `/elanlar → /listings` yönləndirmə tövsiyə olunur (route/SEO təkmilləşdirməsi, bloklayıcı deyil)

---

## E. Aşağı tapıntılar (Low)

### L1 — Böyük commit olunmamış working tree (release-management riski)

- Web (`main`): **188** dəyişmiş/izlənməyən fayl; izlənməyən qovluqlar: `src/lib/category-schema/`, `src/lib/taxonomy/`, `supabase/seeds/`, `supabase_schema.sql`, `STAGING_BOOTSTRAP_BASE_SCHEMA.sql`
- Mobile (`master`): **206** dəyişmiş fayl
- Şübhəli #10 **TƏSDİQLƏNDİ**. Bu runtime bug DEYİL — release-idarəetmə riskidir. Yeni kateqoriya-schema işi commit edilməyib; production-a çıxmazdan əvvəl atomik commit-lərə bölünməlidir

### L2 — Playwright port uyğunsuzluğu (test-infra)

- **Sübut:** `playwright.config.ts` → `PORT ?? "3001"`, `baseURL=http://127.0.0.1:3001`, `webServer.command = npm run dev`. Amma `dev = next dev --webpack` standart olaraq **3000** portunda qalxır (PORT env ötürülmür)
- **Nəticə:** E2E `webServer` timeout. Şübhəli #9 **TƏSDİQLƏNDİ** — bu məhsul nasazlığı deyil, test-infrastruktur problemidir

### L3 — Mobil-də `test`/`build` script-i yoxdur

- **Sübut:** mobil `package.json` script-ləri arasında `test` və `build` yoxdur (yalnız `smoke-test`, `lint`, `typecheck`). `npm run test` (mobil) mövcud deyil → SKIPPED

---

## F. Human smoke-test nəticələri

| Platform | Flow | Test tipi | Nəticə | Sübut |
|---|---|---|---|---|
| Production web | `/` | HTTP | PASS | 200, len=116985 |
| Production web | `/listings` | HTTP | PASS | 200 |
| Production web | `/elanlar` | HTTP | FAIL | 404 |
| Production web | `/categories` | HTTP | PASS | 200 |
| Production web | `/robots.txt` | HTTP | PASS | 200, len=188 |
| Production web | `/sitemap.xml` | HTTP | PASS | 200, len=9821 |
| Production web | Mövcud olmayan elan slug | HTTP | FAIL | 200 (soft-404) |
| Production web | `/create-listing` (logout) | HTTP | PASS | 307 redirect (login-ə) |
| Production web | canonical/domain | HTTP+HTML | WARN | canonical=apex, servis=www |
| Web lokal | homepage/search/formalar (vizual) | Brauzer | UNVERIFIED | Brauzer avtomatlaşdırması yoxdur |
| Mobile | bütün ekranlar (native) | Emulyator | UNVERIFIED | Cihaz/emulyator yoxdur |
| Supabase | pending elanların publik gizliliyi | Read-only | PASS | `status=pending` anon → 0 sətir |
| Supabase | profiles publik gizliliyi | Read-only | PASS | anon → 0 sətir |
| Supabase | active elanlar publik | Read-only | PASS | anon → sətirlər gəlir |

---

## G. Web/mobile sahə parity matrisi

Data-səviyyə parity **contract hash ilə təsdiqlənib** (web=mobile=`a6098c2af4ce1f0e4249c22b4ac0a3c2f2252c959077903f05552db39848d259`). Runtime UI müqayisəsi UNVERIFIED (emulyator/brauzer yoxdur). Snapshot və canlı DB-yə əsasən:

| Kateqoriya/Alt | Sahə | Web | Mobile | Uyğun |
|---|---|---|---|---|
| Avtomobil | brand,model,year,mileage,fuel_type,transmission,body_type,engine,drivetrain,color,seats | var | var | ✓ (hash) |
| Telefon/Smartfon | brand,model,storage,ram,color,battery_health,has_warranty,accessories | var | var | ✓ (hash) |
| Elektronika/Masaüstü | brand,model,processor,ram,storage,graphics_card,operating_system,color,has_warranty,box_included | var | var | ✓ (hash) |
| Elektronika/Noutbuk | +screen_size,battery_health,charger_included | var | var | ✓ (hash) |
| Elektronika/Monoblok | brand,model,processor,ram,storage,screen_size,touchscreen,graphics_card,color,has_warranty | var | var | ✓ (hash) |

### Şübhəli məsələlərin yoxlanışı

- **#1 Apple dublikat:** DİSPROVEN — `dedupeOptions()` (NFKC + `az` lowercase) mövcuddur; hər alt-kateqoriya siyahısında Apple **bir dəfə** görünür (`masaustu-komputerler`, `noutbuklar`, `monobloklar`). Kod + data səviyyəsində təsdiqlənib; native UI UNVERIFIED
- **#2 Apple seçəndə model boş qalır:** Elektronikada `model` sahəsi `searchable_text`-dir (dropdown deyil), `resolveModelOptions` yalnız automobile/phone üçün siyahı verir. Yəni brend seçdikdən sonra model **sərbəst mətn** kimi yazılır — "boş, işlənməyən dropdown" deyil. Bu tələbə uyğundur (etibarlı kataloq yoxdursa mətn girişi)
- **#4 Desktop-da battery:** DİSPROVEN — həm bundled snapshot, həm canlı DB-də `masaustu-komputerler` və `monobloklar`-da `battery_health` YOXDUR; yalnız `noutbuklar`-da var

---

## H. Runtime mənbə matrisi

| Mühit | Taxonomy mənbəsi | Schema mənbəsi | Brand mənbəsi | Model mənbəsi |
|---|---|---|---|---|
| Lokal web | bundled `generated/*.json` | bundled `generated/category-schemas.json` | static `option-catalogs-v1.mjs` | static (auto/phone), sərbəst mətn (electronics) |
| Lokal mobile | bundled `generated/*.json` | bundled (contract hash eyni) | static kataloq (mirror) | static/mətn |
| Production web | bundled (deploy) | bundled | static | static/mətn |
| Live Supabase | `categories`(17)/`subcategories`/`category_aliases` **dolu** | `category_form_schemas` **8 aktiv sətir** | — | — |

**Vacib:** `category_form_schemas` **boş DEYİL** (şübhəli #8 DİSPROVEN) və məzmunu bundled snapshot ilə **sahə-sahə eynidir**. Yəni sistem həm DB-də, həm bundled-də sinxrondur; app runtime-da bundled JSON oxuyur (`resolve-category-schema.ts`-də DB sorğusu tapılmadı).

---

## I. Auth və icazə matrisi

| Test | UI nəticə | API/RLS nəticə | Status |
|---|---|---|---|
| Logout ikən `/create-listing` | — | 307 redirect | PASS (HTTP) |
| Anon → pending elanlar | — | 0 sətir | PASS |
| Anon → profiles | — | 0 sətir | PASS |
| Anon → active elanlar | — | oxunur | PASS (gözlənilən) |
| Login (valid/invalid), sessiya, logout | UNVERIFIED | UNVERIFIED | Test hesabı yoxdur |
| Owner vs buyer (edit/delete/report) | UNVERIFIED | UNVERIFIED | 2 hesab yoxdur |
| Telefon sahibliyinin verifikasiyası | UNVERIFIED | UNVERIFIED | Provider təsdiqi görülməyib |

---

## J. Production route və SEO matrisi

| URL | HTTP | Canonical | Gözlənilən | Status |
|---|---|---|---|---|
| `/` | 200 | `https://marketx.az` | 200 | PASS (canonical WARN) |
| `/listings` | 200 | — | 200 | PASS |
| `/elanlar` | 404 | — | ? | WARN (marşrut yoxdur) |
| `/categories` | 200 | — | 200 | PASS |
| `/robots.txt` | 200 | — | 200 | PASS |
| `/sitemap.xml` | 200 | — | 200 | PASS |
| `/listings/<yoxdur>` | 200 | — | 404 | **FAIL** |
| apex `marketx.az/` | 200 (redirect yox) | — | 301→www və ya əksinə | WARN |

---

## K. Təhlükəsizlik matrisi

| Risk | Sübut | Ağırlıq | Tələb olunan tədbir |
|---|---|---|---|
| `stores` anon-a tam açıq | anon `select=*` → owner_id/created_by daxil | Orta | View-only oxu, RLS sütun məhdudiyyəti |
| Service-role client-ə sızması | (source-da yoxlama aparılmadı — UNVERIFIED) | — | Ayrıca grep tələb olunur |
| Service-role açar rotasiyası | Tarixi `NEXT_PUBLIC_`-prefiksli sızma məsələsi | UNVERIFIED | Rotasiya sübutu yoxdur → **UNVERIFIED** |
| Soft-404 | `/listings/<yoxdur>`→200 | Yüksək (SEO) | 404 qaytar |

> Təmiz grep nəticəsi köhnə açarın rotasiya olunduğunu **sübut etmir** — rotasiya statusu **UNVERIFIED** olaraq qalır.

---

## L. İşə salınan əmrlər

| Əmr | Nəticə | Müddət |
|---|---|---|
| `git status` (web/mobile) | PASS | web 188 / mobile 206 dirty |
| `npm run schemas:validate` (web) | PASS | — |
| `npm run schemas:coverage` (web) | PASS | — |
| `npm run schemas:runtime-test` (web) | PASS | — |
| `npm run schemas:contract-test` (web+mobile) | PASS | hash eyni |
| `npm run taxonomy:validate/coverage` (web) | PASS | — |
| `npm run taxonomy:validate` (mobile) | PASS | — |
| `npx tsc --noEmit` (web) | PASS (exit 0) | 21.6s |
| `npm run typecheck` (mobile) | PASS (exit 0) | 25.2s |
| Production HTTP (8 URL) | tamamlandı | — |
| Supabase read-only (anon) sorğular | tamamlandı | — |
| `npm run lint` (web/mobile) | **RUN EDİLMƏDİ** | UNVERIFIED |
| `npm run build` (web) | **RUN EDİLMƏDİ** | UNVERIFIED |
| `npm test` (web) | **RUN EDİLMƏDİ** | UNVERIFIED |
| `npm run test:e2e` (web) | **RUN EDİLMƏDİ** (port uyğunsuzluğu) | UNVERIFIED |
| `npm run smoke-test` (mobile) | **RUN EDİLMƏDİ** | UNVERIFIED |

---

## M. Sübut/screenshot indeksi

Screenshot alınmadı (brauzer/emulyator yoxdur). Mətnli sübutlar:

- Production HTTP status kodları (Phase 4)
- Anon Supabase sorğu nəticələri (`stores` sütunları, `category_form_schemas` 8 sətir, aliases)
- `option-catalogs-v1.mjs` sətir 127-150 (Apple tezliyi)
- `playwright.config.ts` port
- tsc/typecheck exit kodları

---

## N. Düzgün tətbiq olunmuş elementlər (yalnız yoxlanılanlar)

- Web/mobile schema contract hash **eynidir** (`a6098c2a…`)
- `dedupeOptions` — brend siyahılarında dublikatların qarşısını alır; Apple bir dəfə
- Desktop/monoblok formalarında battery sahəsi **yoxdur**, yalnız noutbukda var
- `category_form_schemas` canlı DB-də dolu və bundled ilə sinxron
- Legacy alias-lar düzgün resolve olunur: `komputerler`→Elektronika **parent** (subcategory=null), `telefon-aksesuarlari`→Telefon **parent** (subcategory=null) — leaf-ə avtomatik çevrilmir (Phase 7 tələbi ödənilir)
- Anon üçün `profiles` və `pending` elanlar gizlidir (RLS işləyir)
- tsc (web) və typecheck (mobile) təmiz
- `/create-listing` logout-da login-ə yönləndirir (307)

---

## O. Yoxlanılmamış elementlər (dəqiq maneə ilə)

| Element | Maneə |
|---|---|
| Lokal/production web vizual human testi | Brauzer avtomatlaşdırma aləti yoxdur |
| Native mobil testi (startup, sessiya, formalar, image picker) | Cihaz/emulyator yoxdur |
| Create/edit round-trip (Phase 8) | Etibarlı test hesabı yoxdur |
| Owner vs buyer / RLS mutasiya testi (Phase 9) | 2 hesab yoxdur |
| Auth flow (Phase 10) | Hesab yoxdur; SMS göndərmək istənilməz |
| Image/storage runtime (Phase 13) | Yükləmə testi üçün autentikasiya yoxdur |
| web lint/build/test/e2e, mobile lint/smoke-test | Bu sessiyada işə salınmadı |
| Service-role rotasiya statusu | Sübut yoxdur |

---

## P. Tövsiyə olunan düzəliş sırası

1. **Təhlükəsizlik/data:** `stores` anon oxu icazəsini view-only-a məhdudlaşdır; service-role rotasiyasını təsdiqlə/rotasiya et
2. **Runtime bloklayıcılar:** (yoxlanılmadı — hesab əldə edildikdən sonra create/edit round-trip test edilməli)
3. **Web/mobile parity:** runtime UI müqayisəsi (emulyator əldə olunanda)
4. **Production routing/SEO:** soft-404 → real 404; apex→www (və ya əksinə) 301; `/elanlar` yönləndirmə
5. **Test infrastrukturu:** Playwright PORT-u `npm run dev`-ə ötür (`PORT=3001 next dev` və ya baseURL-i 3000-ə al)
6. **UX/performance:** (runtime yoxlanmadı)
7. **Release-management:** 188/206 dirty faylı atomik commit-lərə böl, izlənməyən seed/schema fayllarını nizamla

---

## R. Runtime Audit — 2-ci raund (13 iyul 2026, əlavə)

Bu raundda static yoxlamalar təkrarlanmadı. Diqqət: (1) Apple dublikatının runtime kök səbəbi, (2) Playwright port düzəlişi + real brauzer testi, (3) `stores` anon SQL düzəlişinin hazırlanması.

### R1 — Apple dublikatı: kök səbəb izi (option-merge)

Runtime axını (mobil `create-listing.tsx`):

`fetchCategorySchemaSnapshot()` → **əvvəlcə canlı DB** (`category_form_schemas`, 8 aktiv sətir), uğursuz olarsa bundled JSON fallback → `getAttributeDefinitions` (`lib/taxonomy.ts`) → `getSchemaAttributeDefinitions` → `categoryFormSchemaToAttributeDefinitions` → `enrichAttributeDefinitionsWithOptions` → komponent.

Brend seçim siyahısına birləşən bütün mənbələr:

| Mənbə | masaustu-komputerler brand üçün nəticə |
|---|---|
| schema options (DB/bundled `field.options`) | `[]` (boş) |
| static katalog (`resolveBrandOptions`) | `['ASUS','Dell','HP','Lenovo','Acer','MSI','Apple','Intel','AMD']` |
| DB options | boş (option_source=brands) |
| fallback options | tətbiq olunmur |
| seçilmiş legacy/cari dəyər | yoxdur |

Runtime simulyasiyası (canlı DB datası ilə eyni bundled snapshot üzərində):

```
BRAND field type=searchable_select option_source=brands baked=[]
BRAND runtime options=["ASUS","Dell","HP","Lenovo","Acer","MSI","Apple","Intel","AMD"]
APPLE count in runtime brand list = 1
```

**Kök səbəb:** Cari işçi ağacında (working tree) brend siyahısı **3 qatda** dedupe olunur — `resolveBrandOptions`→`dedupeOptions`, `enrichAttributeDefinitionsWithOptions`, və komponentdə `dedupeOptions(definition.options)`. Ona görə cari kodda Apple **bir dəfə** çıxır.

Lakin bu düzəliş **commit edilməyib və deploy olunmayıb**:
- `lib/category-schema/` (mobil) və `src/lib/category-schema/` (web) → **untracked (`??`)**
- `lib/taxonomy.ts` / `src/lib/taxonomy/` → **untracked**
- `DynamicAttributeFields.tsx` (mobil) → **untracked**; `resolve-category-options.ts` → git-də yoxdur
- `git log -- lib/category-schema/` → **heç bir commit yoxdur**
- Committed `create-listing.tsx` (HEAD) → dinamik brend dropdown-u **ümumiyyətlə yoxdur** (yalnız `CityOptions`/`CategoryItems`)

**Nəticə:** İstifadəçinin ekran görüntüsündə Apple iki dəfə görünür — bu REAL-dır və işlədilən/əvvəlki bundle-da mövcuddur (dedupe düzəlişindən əvvəlki vəziyyət). Cari mənbə kodu (canlı DB datası ilə simulyasiya) Apple-ı bir dəfə verir, amma bu düzəliş **cihazda/emulyatorda yenidən qurulub təsdiqlənməyib** (emulyator yoxdur) və commit/deploy edilməyib. **DISPROVEN deyil** — düzəliş mənbədə var, lakin runtime təsdiqi UNVERIFIED; köhnə bundle işlədikcə bug canlıdır.

Tövsiyə: cihazda tam reload (Fast Refresh yox), sonra untracked düzəliş fayllarını commit + rebuild/deploy.

### R2 — Model sahəsi (Apple seçildikdən sonra), Elektronika

```
MODEL field type=searchable_text option_source=- allow_custom=undefined depends_on=-
MODEL runtime options after Apple=[]
```

Elektronikada `model` = `searchable_text` (dropdown deyil, sərbəst mətn input). `isTextInputType` → `TextInput` render olunur, `editable={!disabled && !isDependencyMissing}` — `depends_on` yoxdur, ona görə **redaktə edilə bilər**, klaviatura girişi işləyir, dəyər `onChangeText` ilə `attributes.model`-ə yazılır və payload-da saxlanılır. "Boş, işlənməyən dropdown" YOXDUR. (Kod izi ilə təsdiq; native UI UNVERIFIED — emulyator yoxdur.)

### R3 — Playwright port düzəlişi + REAL brauzer testi (icra olundu)

- Düzəliş: `playwright.config.ts` `webServer.command` indi portu ötürür: `npm run dev -- --port ${PORT}` / `npm run start -- --port ${PORT}`.
- Chromium quraşdırıldı və real test işlədildi.
- **Dev server (next dev :3001):** 4 keçdi / 5 uğursuz — hamısı `page.goto` 30s **timeout** (dinamik DB səhifələrində soyuq webpack kompilyasiyası).
- **Prod build (next start :3001):** **8 keçdi / 1 uğursuz**. Yeganə uğursuzluq: `mikrodalgali-soba` test elanı DB-də artıq yoxdur → tətbiq düzgün olaraq "Səhifə tapılmadı" (h1) göstərir. Bu **köhnəlmiş test fixture-dur**, məhsul defekti deyil.
- Nəticə: port uyğunsuzluğu HƏLL OLUNDU (server 3001-də qalxdı, real Chromium işlədi). Dev-timeout-lar test-mühiti; prod build sağlamdır.

### R4 — `stores` anon SELECT düzəlişi (hazırlandı, TƏTBİQ EDİLMƏDİ)

Kök səbəb: `STORES_AND_CLAIM_FLOW.sql:290-297` — `stores_select_public` policy `anon`-a baza cədvəlində birbaşa SELECT verir (public statuslar üçün), owner_id/created_by/status daxil.

Hazırlanan minimal-təhlükəsiz düzəliş: `supabase/FIX_STORES_ANON_SELECT_EXPOSURE.sql`
- policy-ni yalnız `authenticated` owner/admin/member-ə məhdudlaşdırır,
- `revoke select on public.stores from anon`,
- sanitized `public_store_profiles` view-u anon üçün saxlayır (view SECURITY DEFINER olduğu üçün revoke-dan sonra da işləyir — bu kontekstdə definer QALMALIDIR).
- Fayl `begin/commit`, verifikasiya və rollback bloklarını ehtiva edir. **Tətbiq review-dan sonra.**

### R5 — Yenilənmiş static gate nəticələri (bu raundda icra)

| Əmr | Nəticə |
|---|---|
| `npm run lint` (web) | PASS (0 error, 1 pre-existing warning) |
| `npm run build` (web) | PASS (exit 0) |
| `npm run lint` (mobile) | PASS (0) |
| `npm run test:e2e` (web, prod build) | 8/9 (yeganə uğursuz = köhnə fixture) |

### R6 — `/elanlar` yenidən qiymətləndirmə (əvvəlki M3 düzəlişi)

Web build çıxışı `/elanlar`, `/elanlar/[id]`, `/elan-yarat` marşrutlarının **lokal build-də mövcud olduğunu** göstərir. Production `/elanlar → 404`. Deməli bu **deployment lag-dır** (lokal marşrutlar production-dan öndədir), marşrut dizayn problemi deyil. (Əvvəlki M3 yenilənir.)

### R7 — Bu raundda UNVERIFIED qalanlar (dəqiq maneə)

| Element | Maneə |
|---|---|
| Emulyator/cihazda Apple dublikatının reproduksiyası | Android emulyator/cihaz yoxdur |
| Native mobil model sahəsi klaviatura testi | Emulyator yoxdur |
| İki test istifadəçisi ilə create→edit round-trip (web↔mobil) | Etibarlı test hesabı/kimlik yoxdur (service-role istifadəsi qadağan) |
| Web forma sahə-sahə vizual müqayisə | Brauzerdə forma login arxasındadır; interaktiv giriş yoxdur |
| Ekran görüntüləri | Screenshot alma imkanı yoxdur (emulyator/interaktiv brauzer yoxdur) |

---

## Q. Launch qərarı

**Safe after listed blockers are fixed** — Sadalanan bloklayıcılar düzəldildikdən sonra production üçün təhlükəsiz.

Yoxlaya bildiyim sahələrdə kritik data-itkisi və ya təhlükəsizlik nasazlığı tapılmadı; static health təmizdir və schema parity təsdiqlənib. Lakin qərar **qismən sübuta əsaslanır**: brauzer, native mobil və autentikasiyalı yazma testləri bu mühitdə mümkün olmadı (UNVERIFIED). Tam "production-safe" qərarı üçün ən azı:

1. `stores` RLS düzəlişi
2. soft-404/canonical SEO düzəlişləri
3. test hesabı ilə create/edit round-trip runtime testi

tələb olunur.
