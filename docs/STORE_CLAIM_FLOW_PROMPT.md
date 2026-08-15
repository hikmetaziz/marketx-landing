# MarktX — Store Claim Flow (düzəldilmiş, layihəyə uyğunlaşdırılmış prompt)

> Bu sənəd AI agentə verilən **tam prompt**dur. Orijinal konsept saxlanılıb, amma
> MarktX-in **real sxeması, adlandırma konvensiyaları və mövcud funksiyaları** ilə
> uyğunlaşdırılıb. Aşağıdakı "Layihə həqiqətləri" bölməsi məcburi oxunmalıdır.

---

## 0) Layihə həqiqətləri (agent bunlara riayət ETMƏLİDİR)

Bu faktlar mövcud kodda yoxlanılıb — pozulmamalıdır:

1. **`listings` cədvəlində sahiblik sütunu `user_id`-dir** (`owner_id` DEYİL).
   Bütün RLS və trigger-lər `auth.uid() = user_id` istifadə edir
   (`ENABLE_LISTINGS_AND_RLS.sql`).
2. **Admin yoxlaması artıq var:** `public.is_admin()` (security definer, `profiles.role = 'admin'`).
   Yeni admin məntiqi YARADILMAMALIDIR — bu funksiya reuse edilməlidir.
3. **`profiles.role` check:** `('user', 'admin', 'moderator')`. Store rolları
   `profiles.role`-a ƏLAVƏ EDİLMİR — onlar `store_members.role`-da saxlanılır.
4. **Telefon PII ayrıdır:** şəxsi elan telefonları `listing_contacts`-da saxlanılır,
   public SELECT-də görünmür (`SPRINT1_SECURITY.sql`). **Qərar:** mağaza telefonu
   (contact_phone, whatsapp_phone) **public biznes məlumatı** sayılır və birbaşa
   `stores`-da saxlanıla bilər (bu, şəxsi elan telefonundan fərqli statusdur —
   sənəddə açıq qeyd olunmalıdır).
5. **Rate limit infrastrukturu var:** `public.check_rate_limit(action, client_key,
   resource_key, max_count, window)` + `rate_limit_events`. Claim cəhdləri bununla
   məhdudlaşdırılmalıdır.
6. **`updated_at` trigger patterni var:** `public.set_updated_at()`. Hər yeni cədvəldə
   reuse edilməlidir.
7. **Slug helper var:** `public.generate_listing_slug(title, id)` — AZ hərfləri
   transliterasiya edir. Store slug üçün oxşar məntiq (ad + qısa id suffiksi).
8. **Ardıcıl nömrə patterni var:** `listing_number` üçün `sequence + format` +
   `assign_...` + `protect_...` trigger (mobil repo migration). `store_code`
   generasiyası eyni patterni izləməlidir (sequence-based, race-safe).
9. **Enum vs text:** `listings.status` **enum**-dur (`listing_status`), text+check DEYİL.
   Yeni store cədvəllərində text + CHECK constraint istifadə oluna bilər (sadəlik üçün),
   amma bu, sənəddə qeyd olunmalıdır.
10. **Paylaşılan Supabase:** eyni DB-ni **veb (`marketx-landing`)** və
    **mobil (`marktx-app`)** bölüşür. `listings`-ə `store_id` əlavəsi mobil
    `LISTING_DETAIL_SELECT`, `LISTING_CARD_SELECT` və filter pipeline-a təsir edir —
    breaking olmamalıdır (nullable, default null).
11. **Brend qaydaları (`.cursorrules`):** ad həmişə **MarktX**; dil **AZ**; rəng
    White + Deep Blue (#2563eb); mobil tətbiq reklamı YOX. Bütün UI mətnləri AZ.
12. **SQL konvensiyası:** bütün migration-lar **idempotent** (`create ... if not exists`,
    `drop policy if exists`, `create or replace`). Fayl adı UPPER_CASE.sql.
13. **RPC konvensiyası:** bütün funksiyalar `security definer set search_path = public`.

---

## 1) Məqsəd

Təhlükəsiz və peşəkar **"Unclaimed Store → Claim Request → Admin Approval →
Claimed Store"** axını qurmaq.

**Əsas prinsip — iki fərqli identifikator:**

- **`store_code`** — daimi public/internal mağaza identifikatoru
  (məs. `MX-STORE-000123`). Sahiblik VERMİR.
- **`claim_code`** — opsional, müvəqqəti (7–14 gün), **plain saxlanılmır** (hash),
  bir dəfəlik. Tək başına sahiblik VERMİR — yalnız admin təsdiqi ilə.

**Qadağan:** saxta hesab, admin-yaradılan parol, plain claim code, uzunömürlü
koddan avtomatik sahiblik, saxta baxış/trafik, mağazaya login/parol verilməsi.

---

## 2) Store statusları və Claim request statusları

- **stores.status:** `unclaimed | claim_pending | claimed | suspended`
- **store_claim_requests.status:** `pending | approved | rejected | cancelled | expired`

Tək həqiqət mənbəyi qaydası: `stores.owner_id` və `store_members` (role='owner')
**həmişə sinxron** olmalıdır. Sinxronizasiya yalnız RPC-lər vasitəsilə baş verir;
birbaşa client update qadağandır (RLS).

---

## 3) Data modeli (dəqiq DDL tələbləri)

### 3.1 `stores`
```
id            uuid pk default gen_random_uuid()
store_code    text unique not null            -- MX-STORE-000001 (sequence-based)
name          text not null
slug          text unique not null            -- generate_store_slug(name, id)
description   text
category      text                            -- SEÇİM: sərbəst mətn (indi). Gələcəkdə category_id.
category_id   uuid references categories(id)  -- OPSIONAL: taxonomy bağlılığı (nullable)
contact_phone text                            -- PUBLIC biznes telefonu (şəxsi elan PII-dən fərqli)
whatsapp_phone text
address       text
city          text
logo_url      text
cover_url     text
owner_id      uuid references profiles(id)    -- default NULL
status        text not null default 'unclaimed'
              check (status in ('unclaimed','claim_pending','claimed','suspended'))
created_by    uuid references profiles(id)
created_at    timestamptz default now()
updated_at    timestamptz default now()       -- set_updated_at() trigger
```
- `store_code` üçün: `create sequence stores_store_code_seq` +
  `format('MX-STORE-%06s', nextval(...))`. Trigger ilə insert-də təyin edilir və
  update-də dəyişməz (protect trigger — `listing_number` patterni kimi).
- `slug` üçün: `generate_store_slug(name, id)` helper (AZ transliterasiya + qısa id suffiksi).
- Index: `stores(status)`, `stores(owner_id)`, `stores(slug)`, `stores(store_code)`.

### 3.2 `store_members`
```
id         uuid pk default gen_random_uuid()
store_id   uuid not null references stores(id) on delete cascade
user_id    uuid not null references profiles(id) on delete cascade
role       text not null default 'staff' check (role in ('owner','manager','staff'))
created_at timestamptz default now()
unique (store_id, user_id)
```
- Index: `store_members(user_id)`.
- Qayda: store başına yalnız bir `role='owner'` sətri (partial unique index:
  `unique (store_id) where role = 'owner'`).

### 3.3 `store_claim_codes`
```
id              uuid pk default gen_random_uuid()
store_id        uuid not null references stores(id) on delete cascade
claim_code_hash text not null                 -- pgcrypto crypt(code, gen_salt('bf'))
expires_at      timestamptz not null
used_at         timestamptz
created_by      uuid references profiles(id)
created_at      timestamptz default now()
```
- **Hash metodu:** `pgcrypto` → `crypt(plain, gen_salt('bf'))` (bcrypt).
  Yoxlama: `claim_code_hash = crypt(submitted, claim_code_hash)`.
- Kod yalnız admin-ə **bir dəfə** plain qaytarılır (RPC return).
- Index: `store_claim_codes(store_id, expires_at desc)`.

### 3.4 `store_claim_requests`
```
id                  uuid pk default gen_random_uuid()
store_id            uuid not null references stores(id) on delete cascade
requested_by        uuid not null references profiles(id) on delete cascade
status              text not null default 'pending'
                    check (status in ('pending','approved','rejected','cancelled','expired'))
submitted_store_code text not null
submitted_phone     text
submitted_note      text
evidence_url        text
admin_note          text
reviewed_by         uuid references profiles(id)
reviewed_at         timestamptz
created_at          timestamptz default now()
updated_at          timestamptz default now()  -- set_updated_at() trigger
```
- Dublikat qarşısı: `unique (store_id, requested_by) where status = 'pending'`
  (partial unique index).
- Index: `store_claim_requests(store_id, status)`, `store_claim_requests(requested_by)`.

### 3.5 `store_audit_logs`
```
id        uuid pk default gen_random_uuid()
store_id  uuid references stores(id) on delete cascade
actor_id  uuid references profiles(id)
action    text not null
metadata  jsonb
created_at timestamptz default now()
```
Loglanacaq action-lar: `store_created`, `store_updated`, `claim_code_generated`,
`claim_request_submitted`, `claim_request_approved`, `claim_request_rejected`,
`store_owner_revoked`, `store_suspended`.

### 3.6 `listings` inteqrasiyası
```
alter table public.listings add column if not exists store_id uuid references stores(id) on delete set null;
create index if not exists listings_store_id_idx on public.listings (store_id);
```
- **`store_id` nullable, default null** — mövcud şəxsi elanlar pozulmur.
- **`user_id` NOT NULL qalır.** Admin store listing yaradanda `user_id` = admin-in id-si
  olur (created_by kimi), `store_id` doldurulur. Owner claim etdikdən sonra listing-lər
  store vasitəsilə idarə olunur (aşağıda RLS).
- Mağaza silinsə/suspend olsa `listings.store_id = null` (set null) — elanlar qorunur.
- Moderation: store listing-lər də adi `pending → active` flow-dan keçir
  (admin yaradırsa `is_admin()` trigger-i onsuz da `active` verə bilər — mövcud davranış).
- Mobil `LISTING_CARD_SELECT` / `LISTING_DETAIL_SELECT`-ə `store_id` əlavəsi
  opsional yoxlanılmalı (breaking deyil, amma qeyd edilməli).

---

## 4) RLS siyasətləri

**Public (anon):**
- `stores` SELECT: yalnız `status in ('claimed','unclaimed','claim_pending')` olan
  mağazaların **public sahələri** (status texniki dəyəri UI-da göstərilmir, amma
  sətir oxuna bilər — `suspended` public-də görünmür).
- `listings` SELECT: mövcud `listings_select_visible` qalır (active/sold).

**Authenticated:**
- `store_claim_requests` SELECT: yalnız `requested_by = auth.uid()` (öz müraciətləri)
  və ya `is_admin()`.
- `store_claim_requests` INSERT: **birbaşa qadağan** — yalnız `submit_store_claim_request`
  RPC (security definer) vasitəsilə.
- `stores.owner_id` / `stores.status`-a **birbaşa client UPDATE qadağan** (RLS + trigger).

**Owner / Manager:**
- `stores` UPDATE: `store_members`-də (`role in ('owner','manager')`) olan user
  həmin store-un **qeyri-həssas** sahələrini (name, description, contact_phone,
  address, logo_url və s.) dəyişə bilər — AMMA `owner_id`, `status`, `store_code`
  DƏYİŞƏ BİLMƏZ (trigger qoruyur).
- `listings` UPDATE/DELETE: `store_id` həmin store olan elanlar üçün owner/manager icazəsi.

**Admin:**
- Bütün cədvəllərə tam giriş (`is_admin()`).

Bütün ownership dəyişiklikləri yalnız RPC-lər vasitəsilə (aşağıda).

---

## 5) RPC / funksiyalar (hamısı `security definer set search_path = public`)

### 5.1 `admin_create_store(p_name, p_category, p_city, p_contact_phone, p_whatsapp_phone, p_address, p_description)`
- Yalnız `is_admin()`.
- `store_code` sequence ilə generasiya, `slug` generasiya.
- `status = 'unclaimed'`, `owner_id = null`, `created_by = auth.uid()`.
- Audit: `store_created`.
- Return: yeni store sətri (store_code daxil).

### 5.2 `admin_generate_store_claim_code(p_store_id, p_valid_days default 14)`
- Yalnız `is_admin()`.
- Server-side random kod (məs. 8-10 simvol, oxunaqlı).
- `crypt(code, gen_salt('bf'))` ilə hash → `store_claim_codes`.
- `expires_at = now() + p_valid_days`.
- Köhnə istifadə olunmamış kodları opsional invalidasiya (used_at = now() və ya sil).
- Audit: `claim_code_generated`.
- Return: **plain kod (yalnız bir dəfə)** + expires_at.

### 5.3 `submit_store_claim_request(p_store_code, p_claim_code default null, p_phone default null, p_note default null, p_evidence_url default null)`
- `auth.uid()` tələb olunur.
- **Rate limit:** `check_rate_limit('store_claim', auth.uid()::text, p_store_code, 5, interval '1 hour')`.
- Store-u `store_code` ilə tap; yoxdursa xəta.
- `status in ('claimed','suspended')` → xəta (claim qəbul edilmir).
- `p_claim_code` verilibsə: son etibarlı (expired/used olmayan) hash ilə `crypt`
  müqayisəsi; uyğunsuzsa xəta. (Kod yalnız request **admin tərəfindən review-ə
  qəbul olunanda** used işarələnir — approve mərhələsində.)
- Dublikat: eyni user + store üçün `pending` varsa xəta.
- `store_claim_requests` sətri `status='pending'` yarat.
- `stores.status = 'claim_pending'`.
- `owner_id` TƏYİN EDİLMİR, `store_members`-ə YAZILMIR.
- Audit: `claim_request_submitted`.
- Return: "Müraciətiniz admin yoxlamasına göndərildi."

### 5.4 `admin_approve_store_claim_request(p_request_id)`
- Yalnız `is_admin()`.
- Request `pending` olmalı; store `claimed` OLMAMALI.
- `stores.owner_id = request.requested_by`, `stores.status = 'claimed'`.
- `store_members` upsert: `(store_id, requested_by, 'owner')`.
- Əgər claim_code istifadə olunubsa → `used_at = now()`.
- Request `status='approved'`, `reviewed_by=auth.uid()`, `reviewed_at=now()`.
- Eyni store üçün digər `pending` request-lər → `rejected` (admin_note: "başqa müraciət təsdiqləndi").
- Audit: `claim_request_approved`.

### 5.5 `admin_reject_store_claim_request(p_request_id, p_admin_note default null)`
- Yalnız `is_admin()`.
- Request `pending` olmalı.
- `status='rejected'`, `admin_note`, `reviewed_by`, `reviewed_at`.
- Əgər həmin store üçün başqa `pending` yoxdursa və store `claimed` deyilsə →
  `stores.status = 'unclaimed'`.
- Audit: `claim_request_rejected`.

### 5.6 `admin_revoke_store_owner(p_store_id, p_reason default null, p_new_status default 'unclaimed')`
- Yalnız `is_admin()`.
- `store_members`-dən owner sətrini sil (və ya `manager`-ə endir — parametr).
- `stores.owner_id = null`, `stores.status = p_new_status` ('unclaimed' | 'suspended').
- Listing-lər qorunur (silinmir).
- Audit: `store_owner_revoked` (+ `store_suspended` əgər suspend).

### 5.7 `cancel_my_store_claim_request(p_request_id)` (ƏLAVƏ — orijinalda yox idi)
- `auth.uid() = requested_by` olmalı, request `pending`.
- `status='cancelled'`.
- Digər pending yoxdursa store `unclaimed`-ə qayıt.

---

## 6) Admin panel UI (AZ)

`/admin/stores` — mövcud `/admin/listings` pattern və komponentləri ilə eyni üslub:
- Mağaza yarat (form)
- Redaktə et
- Status filtri: Sahibsiz | Gözləyən | Sahiblənmiş | Dayandırılmış
- Mağaza detalı
- Elan bağla (listing → store_id)
- Claim kodu generasiya et (plain kodu bir dəfə göstər + kopyala)
- `store_code` kopyala
- Sahib üçün mesajı kopyala (aşağıdakı copy)
- Claim müraciətlərinə bax
- Təsdiqlə / Rədd et
- Sahibliyi geri al

## 7) Store owner UI (AZ)

- **"Mağazanı sahiblən"** səhifəsi (`/account/store/claim`):
  - `store_code` input, opsional `claim_code`, telefon, qeyd, sübut (opsional)
  - Müraciət göndər (RPC)
  - Status: `pending` → "Müraciətiniz yoxlamadadır", `approved` →
    "Mağaza hesabınıza bağlandı", `rejected` → "Müraciət rədd edildi"
  - Müraciəti ləğv et (cancel RPC)
- Təsdiqdən sonra: mağaza dashboard (`/account/store`) — məlumatları redaktə,
  elanları idarə.

## 8) Public UI (AZ) — texniki status GÖSTƏRİLMİR

`/stores/[slug]`:
- Mağaza adı, şəhər/ünvan, təsvir
- WhatsApp düyməsi, Zəng düyməsi
- Aktiv elanlar
- Copy: "Mağaza səhifəsi", "Əlaqə", "Elanlar", "Satıcı ilə əlaqə"
- GÖSTƏRİLMİR: unclaimed/claim_pending/claimed/owner_id/claim_code/admin status.

## 9) Admin → sahib mesajı (dəyişməz AZ mətn)

> Salam. MarktX-də mağazanız üçün məhsul səhifəsi hazırlanıb. İstəsəniz, mağaza
> səhifəsini öz hesabınıza bağlayıb elanları özünüz idarə edə bilərsiniz. Bunun üçün
> MarktX-də qeydiyyatdan keçin və sizə verilən mağaza kodu ilə müraciət göndərin.
> Müraciət admin tərəfindən yoxlandıqdan sonra mağaza hesabınıza bağlanacaq.

---

## 10) Təhlükəsizlik tələbləri (yoxlama siyahısı)

- [ ] `store_code` tək başına sahiblik vermir.
- [ ] `claim_code` yalnız admin təsdiqi ilə işləyir; expire olur; **bcrypt hash**.
- [ ] `stores.owner_id` və `stores.status`-a birbaşa client UPDATE RLS+trigger ilə bloklanır.
- [ ] Non-admin özünü təsdiq edə bilmir; claim code generasiya edə bilmir.
- [ ] Claimed/suspended store yenidən claim edilə bilmir.
- [ ] Dublikat pending request qarşısı (partial unique index).
- [ ] Claim RPC-də rate limit (`check_rate_limit`).
- [ ] Bütün RPC `security definer set search_path = public`.
- [ ] Bütün həssas əməliyyatlar `store_audit_logs`-a yazılır.

---

## 11) Test planı (tam axın)

1. Admin emaili ilə login (`profiles.role='admin'`, bax `MAKE_ADMIN.sql`).
2. `/admin/stores` → mağaza yarat → `store_code` (MX-STORE-000001) yaranır, status=unclaimed.
3. Elan yarat/mövcud elana `store_id` bağla → public `/stores/[slug]`-də görünür.
4. Anonim brauzerdə store səhifəsi + WhatsApp/zəng düymələri işləyir; texniki status YOXDUR.
5. İkinci (adi) hesab yarat (Supabase Auth) → owner simulyasiyası.
6. Admin claim kodu generasiya et (plain kodu qeyd et).
7. Owner hesabı ilə `/account/store/claim` → store_code + claim_code göndər →
   status `pending`, store `claim_pending`.
8. Eyni owner ikinci pending yaratmağa çalış → xəta (dublikat).
9. Admin `/admin/stores` → müraciəti təsdiqlə → `owner_id` set, status=claimed,
   `store_members` owner sətri, request=approved.
10. Owner dashboard-da store-u redaktə edir, store elanlarını idarə edir.
11. Başqa user həmin claimed store-u claim etməyə çalış → xəta.
12. Expired/used/yanlış claim_code → xəta.
13. Reject ssenarisi: yeni store + pending → admin rədd → store unclaimed.
14. Revoke: claimed store → admin revoke → owner_id null, elanlar qorunur.
15. Mövcud şəxsi elanlar (store_id null) hələ də işləyir; favorites/reports/moderation pozulmayıb.
16. `store_audit_logs`-da bütün action-lar var.

---

## 12) Deliverables

- SQL migration faylı: `supabase/STORES_AND_CLAIM_FLOW.sql` (idempotent, tək run).
- Dəyişən frontend faylları (admin + owner + public UI).
- Test təlimatı (yuxarıdakı).
- Rollback qeydləri.
- Fərziyyələr siyahısı.
- Dəyişən/əlavə olunan RLS siyasətləri siyahısı.

## 13) Rollback qeydləri

- Yeni cədvəllər: `drop table if exists store_audit_logs, store_claim_requests,
  store_claim_codes, store_members, stores cascade;`
- `listings.store_id`: `alter table public.listings drop column if exists store_id;`
  (əvvəl `listings_store_id_idx` drop).
- Sequence: `drop sequence if exists stores_store_code_seq;`
- RPC-lər və trigger-lər: `drop function if exists ...`.
- `is_admin()`, `check_rate_limit()`, `set_updated_at()` — SİLİNMİR (paylaşılan).

## 14) Fərziyyələr

- Mağaza telefonu public biznes məlumatıdır (şəxsi elan PII-dən fərqli).
- `store.category` indi sərbəst mətn; taxonomy bağlılığı gələcək iş (category_id nullable).
- Manager rolu indi yalnız data modelində; dəvət UI-si sonrakı mərhələ.
- Store listing yaradanda `listings.user_id` = admin-in id-si (created_by məntiqi).
- `store.status` text+CHECK (enum deyil) — sadəlik üçün, mövcud `listing_status`
  enum-una toxunmadan.
