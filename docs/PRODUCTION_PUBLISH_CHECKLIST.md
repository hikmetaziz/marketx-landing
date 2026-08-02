# MarktX Production Publish Checklist (Deep Audit)

**Tarix:** 21 iyul 2026  
**Audit tipi:** Dərin static + repo scan (web + mobile)  
**Web repo:** `F:\projects\websites\marketx-landing`  
**Mobile repo:** `F:\projects\mobile_apps\marktx-app`  
**Production Supabase ref:** `vrtnxdexofpiapbodxkx`  
**Production web:** https://www.marketx.az  
**Git HEAD (web):** `2ab3eea` — Add first-response analytics view  

> Hər sətir üçün `PASS` / `FAIL` / `UNVERIFIED` / `N/A` qeyd edin.  
> Əvvəlki audit: [`docs/audit/MARKTX-AUDIT-2026-07-13.md`](./audit/MARKTX-AUDIT-2026-07-13.md)

---

## Ümumi qərar

| Launch tipi | Hazırdır? | Bloklayıcı say |
|---|---|---|
| **Web-only soft launch** | **FAIL** | 6+ |
| **Web + DB hardened** | **FAIL** | 8+ |
| **Full launch (web + mobile stores)** | **FAIL** | 12+ |

**Cari status:** `NOT READY FOR FULL PRODUCTION PUBLISH`

### Top 10 bloklayıcı (prioritet)

| # | Bloklayıcı | Repo | Severity |
|---|---|---|---|
| 1 | Prod deploy lag (`/elanlar`, `/elan-yarat`, soft-404) | Web | **HIGH** |
| 2 | DB migration apply status naməlum (13 web migration) | Shared DB | **HIGH** |
| 3 | Listing RLS `20260720120000` apply + verify | Shared DB | **HIGH** |
| 4 | `FIX_STORES_ANON_SELECT_EXPOSURE.sql` (audit M1) | Shared DB | **HIGH** |
| 5 | Git: böyük uncommitted tree (~90 mod + ~120 untracked web) | Web | **HIGH** |
| 6 | `assetlinks.json` prod 404 → Android App Links fail | Web + Mobile | **HIGH** |
| 7 | Mobile smoke test köhnəlib (store_id/membership yox) | Mobile | **MEDIUM** |
| 8 | `tests/listing-creation-access.test.mjs` FAIL (stale assert) | Web | **MEDIUM** |
| 9 | Mobile CI yox | Mobile | **MEDIUM** |
| 10 | Device QA UNVERIFIED (native messaging, claim round-trip) | Both | **MEDIUM** |

---

## 0. Git & release hygiene

| # | Yoxlama | Web | Mobile |
|---|---|---|---|
| G1 | Atomic release commit/tag | **FAIL** — ~90 modified, ~120+ untracked | **FAIL** — ~40+ modified, assets deleted |
| G2 | Migrations repo-da tracked | **FAIL** — bütün 13 migration untracked | **PARTIAL** — 50 migration var, web batch yox |
| G3 | `docs/`, `tests/`, `scripts/` tracked | **FAIL** — untracked | **PARTIAL** |
| G4 | Secret fayllar gitignore | **PASS** — `.env.local` gitignored | **FAIL** — `app/google-services.json` untracked amma `.gitignore`-da yox |

**Web untracked kritik path-lər:**
- `src/app/elan-yarat/`, `src/app/elanlar/`, `src/app/account/store/`
- `supabase/migrations/` (hamısı)
- `supabase/verification/` (hamısı)
- `tests/listing-creation-access.test.mjs`
- `src/lib/stores/membership.ts`

---

## 1. Web (`marketx-landing`) — dərin

### 1.1 Deploy & routing

| # | Yoxlama | Status | Sübut |
|---|---|---|---|
| W1 | Son kod Vercel production-da | **FAIL** | Prod `/elanlar` 404; lokal build-də route var |
| W2 | `/listings` | **PASS** | Audit + live 200 |
| W3 | `/elanlar` və ya redirect | **FAIL** | Prod 404 |
| W4 | Olmayan slug → 404 | **FAIL** | Audit H1: soft-404 200 |
| W5 | apex → www 301 | **FAIL** | Audit M2 |
| W6 | `robots.txt`, `sitemap.xml` | **PASS** | |
| W7 | Vercel env Supabase | **UNVERIFIED** | Dashboard |
| W8 | Turnstile env | **UNVERIFIED** | Boşdursa captcha skip — OK |
| W9 | `next.config.ts` security headers | **PASS** | X-Frame-Options, nosniff; CSP/HSTS yox |

**Route inventory (lokal kod):**

| Route | Fayl | Qeyd |
|---|---|---|
| `/elan-yarat` | `src/app/elan-yarat/page.tsx` | Store-member gate |
| `/create-listing` | redirect → `/elan-yarat` | |
| `/elanlar`, `/elanlar/[id]` | `src/app/elanlar/` | Prod-da yox |
| `/listings` | redirect → `/elanlar` | Prod işləyir |
| `/account/store/claim` | `src/app/account/store/claim/page.tsx` | |
| `/admin/listings`, `/admin/stores`, `/admin/support` | `src/app/admin/` | |

### 1.2 Listing creation access (kod sübutu)

**App layer — PASS (lokal kod):**

| Layer | Fayl | Məntiq |
|---|---|---|
| Page gate | `src/app/elan-yarat/page.tsx` | `getListingCreationStoreAccess()` → blocked UI |
| Server action | `src/app/create-listing/actions.ts` | `canCreateListingForStore()` before insert |
| Duplicate action | `src/app/account/listings/actions.ts` | Eyni guard |
| Membership lib | `src/lib/stores/membership.ts` | owner/manager/staff + `store.status = claimed` |
| DB RLS (prepared) | `supabase/migrations/20260720120000_*.sql` | `listings_insert_store_member`; admin bypass **yoxdur** |

**Nav exposure — FAIL (strict policy):**

| Location | Fayl | Problem |
|---|---|---|
| Header “Elan yerləşdir” | `src/components/auth/HeaderAuthActions.tsx` | Bütün login user-lərə görünür |
| My listings CTA | `src/components/account/MyListingsPanel.tsx` | `/elan-yarat` |
| Account listings | `src/app/account/listings/page.tsx` | `/elan-yarat` |

**Gate UX — FAIL:** İki düymə (“Mağaza girişi al” + “Mağaza paneli”) eyni blocked state-də.

**Static test — FAIL:**

```bash
node tests/listing-creation-access.test.mjs
# AssertionError: expects admin/moderator RLS bypass — artıq migration-da yoxdur
```

Test CI-də və `package.json`-da yoxdur.

### 1.3 Store claim

| # | Yoxlama | Status | Fayl |
|---|---|---|---|
| W20 | Claim form UI | **PASS** (lokal) | `src/app/account/store/claim/page.tsx` |
| W21 | RPC `submit_store_claim_request` | **UNVERIFIED** | `src/app/account/store/actions.ts` |
| W22 | Migration `20260720124000` apply | **UNVERIFIED** | `supabase/migrations/` |
| W23 | Admin approve → `store_members` | **UNVERIFIED** | `src/app/admin/stores/actions.ts` |

### 1.4 Messaging

| # | Yoxlama | Status |
|---|---|---|
| W24 | Client payment-safety 2B | **UNVERIFIED** |
| W25 | Server credential block 2C | **UNVERIFIED** (targeted apply edilibsə verify lazım) |
| W26 | Final enforcement `20260713121000` | **N/A — APPLY ETMƏ** |
| W27 | Messaging contract hash mobile ilə | **PASS** (static) |
| W28 | Phase 5 native device evidence | **FAIL** — adb/device yox |

**Runtime scripts:** `scripts/messaging-runtime/` — `.env.local` + service role lazım; prod ref hardcoded.

### 1.5 CI & tests

| # | Yoxlama | Status |
|---|---|---|
| W29 | GitHub CI lint+build+E2E | **PASS** (structure) |
| W30 | `tests/*.test.mjs` (10 fayl) CI-də | **FAIL** |
| W31 | `schemas:validate`, `messaging-contract:validate` CI-də | **FAIL** |
| W32 | Playwright port 3001 | **UNVERIFIED** (audit L2 fix?) |

---

## 2. Mobile (`marktx-app`) — dərin

### 2.1 Listing creation (kod sübutu)

| Layer | Fayl | Məntiq |
|---|---|---|
| Screen | `app/(tabs)/create-listing.tsx` | Full gate stack |
| Tab alias | `app/(tabs)/elanlar.tsx` | Re-export create screen |
| Membership | `lib/stores/membership.ts` | `isActiveStoreMember()` |
| Store check | `lib/stores/listing-store.ts` | `canUseStoreForListing()` — claimed |
| Submit | `create-listing.tsx` ~L680 | `store_id: myStore.id` + re-check membership |

**CTA entry points (hamısı `/(tabs)/elanlar`):**

| Entry | Fayl |
|---|---|
| Home FAB | `app/(tabs)/index.tsx` |
| Profile menu | `app/profile.tsx` |
| My listings empty | `app/(tabs)/my-listings.tsx` |
| Store dashboard | `app/account/store/index.tsx` |

| # | Yoxlama | Status |
|---|---|---|
| M1 | Adi user blocked UI | **UNVERIFIED** (device) |
| M2 | Store member create | **UNVERIFIED** |
| M3 | Admin bypass listing | **N/A** — mobile admin listing create yox |
| M4 | `security:mobile-env` | **PASS** (run edilib) |

### 2.2 Store claim

| Screen | Path | Fayl |
|---|---|---|
| Claim | `/account/store/claim` | `app/account/store/claim.tsx` |
| Status | `/account/store/claim-status` | `app/account/store/claim-status.tsx` |
| Lib | | `lib/stores/claims.ts` |

**FAIL:** Mobile repo-da `stores`/`store_members`/claim RPC migration yox — web DB-dən asılı.

### 2.3 EAS & store publish

| # | Yoxlama | Status |
|---|---|---|
| M5 | `eas.json` production profile | **PASS** (minimal) |
| M6 | `app.json` identity | **PASS** — `com.hikmetaziz.marktx` v1.0.0 |
| M7 | EAS production build | **UNVERIFIED** |
| M8 | Play/App Store metadata | **UNVERIFIED** |
| M9 | `google-services.json` | **FAIL** — untracked, gitignore yox, EAS secret doc yox |
| M10 | Scheme `ikincielapp` vs slug `marktx` | **LOW** — inconsistency |

### 2.4 Deep links

| # | Yoxlama | Status |
|---|---|---|
| M11 | Android App Links verify | **FAIL** | Web `assetlinks.json` 404 |
| M12 | iOS Universal Links | **UNVERIFIED** | `associatedDomains` var |
| M13 | Chat deep link intent filter | **FAIL** | `/chat/*` intent filter yox |

**Web deep link route:** `src/app/.well-known/assetlinks.json/route.ts` — env SHA256 lazım.

### 2.5 Smoke test — FAIL (stale)

**Fayl:** `scripts/smoke-test.js`

| Problem | Təsir |
|---|---|
| Insert without `store_id` | Listing RLS migration-dan sonra fail |
| `status: 'active'` birbaşa | Workflow trigger ilə conflict |
| Store membership yox | Real biznes qaydasına uyğun deyil |

**Lazım:** Store-member test user + claimed store fixture.

### 2.6 CI & admin

| # | Yoxlama | Status |
|---|---|---|
| M14 | GitHub CI | **FAIL** — `.github/` yox |
| M15 | Admin mobile | **PARTIAL** — yalnız `/admin/pending` (listing approve) |
| M16 | Admin store/claim/support | **N/A** — web-only |

---

## 3. Supabase — paylaşılan DB (kritik)

### 3.1 Migration track divergence

| Repo | Fayl sayı | Son migration | Fokus |
|---|---|---|---|
| **Web** | 13 | `20260720124000` | Messaging, listing RLS, claim, analytics |
| **Mobile** | 50 | `20260708123000` | Listings, taxonomy, base messaging, AI |

**FAIL:** İki repo **divergent track** — shared prod DB üçün single source of truth yoxdur.

**Web-only (mobile kod asılıdır):**

| Migration | Mobile asılılığı |
|---|---|
| `20260713120000` messaging foundation | `lib/messaging/index.ts` RPC-lər |
| `20260720120000` listing RLS | `create-listing.tsx` `store_id` insert |
| `20260720124000` claim RPC auth | `lib/stores/claims.ts` |
| `20260718101000` edit/delete RPC | `app/chat/[id].tsx` |

### 3.2 Web migration apply matrix

> **`supabase db push` İSTİFADƏ ETMƏ.** Yalnız targeted apply + verification.

| Migration | Məqsəd | Apply? | Verify |
|---|---|---|---|
| `20260713120000` | Messaging foundation | **UNVERIFIED** | `STORE_CENTERED_MESSAGING_RLS_TESTS.sql` |
| `20260713121000` | Final RPC-only enforcement | **DO NOT APPLY** | — |
| `20260714110000` | Admin customer-store queue | **UNVERIFIED** | `PHASE_B1_*.sql` |
| `20260714113000` | Support admin queue | **UNVERIFIED** | `STORE_SUPPORT_ADMIN_QUEUE_*.sql` |
| `20260714114500` | Support agent access | **UNVERIFIED** | `SUPPORT_AGENT_ACCESS_*.sql` |
| `20260718100000` | Block RPC | **UNVERIFIED** | `BLOCK_CUSTOMER_STORE_*.sql` |
| `20260718101000` | Edit/delete RPC | **UNVERIFIED** | `MESSAGE_EDIT_DELETE_*.sql` |
| `20260718102000` | Legacy direct insert hotfix | **UNVERIFIED** | Phase 5 evidence |
| `20260719130000` | Credential block trigger | **UNVERIFIED** | `phase-2c-apply-verify.mjs` |
| `20260719143000` | Error privacy | **UNVERIFIED** | |
| `20260719160000` | Analytics view | **UNVERIFIED** | `FIRST_RESPONSE_ANALYTICS_VIEW_VERIFY.sql` |
| **`20260720120000`** | **Listing insert RLS** | **UNVERIFIED** | **`LISTING_CREATION_ACCESS_RLS_VERIFY.sql`** |
| **`20260720124000`** | **Claim RPC auth** | **UNVERIFIED** | **`STORE_CLAIM_RPC_AUTHORIZATION_ALIGNMENT_VERIFY.sql`** |

### 3.3 Manual SQL (web `supabase/` root)

| Fayl | Publish-dən əvvəl | Status |
|---|---|---|
| **`FIX_STORES_ANON_SELECT_EXPOSURE.sql`** | **Vacib** (audit M1) | **UNVERIFIED** |
| `STORES_AND_CLAIM_FLOW.sql` | Baseline (legacy track) | **UNVERIFIED** |
| `ENABLE_LISTINGS_AND_RLS.sql` | Core baseline | Assumed in prod |
| `ECOSOFT_*` (18 fayl) | Ops only | N/A |
| `supabase/seeds/SEED_*.sql` | **Prod-da run etmə** | N/A |

### 3.4 Security checklist

| # | Yoxlama | Status |
|---|---|---|
| S1 | Adi user listing INSERT RLS | **UNVERIFIED** |
| S2 | Store member INSERT (target store) | **UNVERIFIED** |
| S3 | Admin listing create (web admin path) | **UNVERIFIED** |
| S4 | `stores` anon SELECT leak | **FAIL** | Audit M1 |
| S5 | Messaging credential server block | **UNVERIFIED** |
| S6 | Final messaging enforcement | **N/A** |

**Prod yoxlama sorğuları:**

```sql
-- Analytics view apply olunubmu?
select to_regclass('public.marktx_first_response_analytics_v1');

-- Listing RLS policy adı
select policyname from pg_policies
where tablename = 'listings' and cmd = 'INSERT';

-- Gözlənilən: listings_insert_store_member (listings_insert_own olmamalı)
```

---

## 4. Biznes qaydaları — kod vs DB

| Qayda | Web kod | Mobile kod | DB RLS |
|---|---|---|---|
| Admin elan yarada bilər | **PASS** — admin path ayrı | N/A | **UNVERIFIED** |
| Adi user elan yarada bilməz | **PASS** — gate + action | **PASS** — gate + submit | **UNVERIFIED** |
| Claim kod → store_members | **PASS** — UI + RPC client | **PASS** — UI + RPC client | **UNVERIFIED** |
| Kod submit-də yoxlanmır | **PASS** — membership check | **PASS** | **UNVERIFIED** |
| Revoke → elan dayanır | **UNVERIFIED** | **UNVERIFIED** | **UNVERIFIED** |

---

## 5. Manual QA matrisi

| # | Ssenari | Web | Mobile | Bloklayıcı? |
|---|---|---|---|---|
| Q1 | OTP login | UNVERIFIED | UNVERIFIED | Bəli |
| Q2 | Elan browse/detail | UNVERIFIED | UNVERIFIED | Xeyr |
| Q3 | Adi user elan yarada bilmir | UNVERIFIED | UNVERIFIED | **Bəli** |
| Q4 | Store member elan yarada bilir | UNVERIFIED | UNVERIFIED | **Bəli** |
| Q5 | Claim → approve → member | UNVERIFIED | UNVERIFIED | **Bəli** |
| Q6 | Mesaj customer_store | UNVERIFIED | UNVERIFIED | Bəli |
| Q7 | CVV mesaj BLOCK | UNVERIFIED | UNVERIFIED | Orta |
| Q8 | Deep link listing | UNVERIFIED | FAIL | Store launch |
| Q9 | `/elan-yarat` gate 1 CTA | FAIL (kod) | N/A | UX |
| Q10 | Header create link policy | FAIL (nav) | FAIL (FAB) | UX |

---

## 6. Publish ardıcıllığı

### Fase 0 — Release hygiene (bloklayıcı)

- [ ] Web: commit + tag atomic release (migrations, routes, tests, docs)
- [ ] Mobile: commit + tag
- [ ] `app/google-services.json` → `.gitignore` + EAS secret doc
- [ ] Fix `tests/listing-creation-access.test.mjs` line 68 (stale admin bypass assert)
- [ ] Update `scripts/smoke-test.js` (mobile) for store-member flow

### Fase 1 — Web deploy

- [ ] Vercel deploy son kod
- [ ] `/elanlar`, `/elan-yarat` prod yoxla
- [ ] Soft-404 → real 404
- [ ] apex → www 301
- [ ] Vercel env: Supabase, Turnstile, `MARKETX_ANDROID_SHA256_CERT_FINGERPRINTS`
- [ ] `/.well-known/assetlinks.json` 200 + non-empty

### Fase 2 — DB hardening (targeted, `db push` yox)

- [ ] `20260720120000` listing RLS + `LISTING_CREATION_ACCESS_RLS_VERIFY.sql`
- [ ] `20260720124000` claim RPC + verify
- [ ] `FIX_STORES_ANON_SELECT_EXPOSURE.sql`
- [ ] Messaging batch apply status təsdiq (2C, 5.1-B hotfix, edit/delete)
- [ ] **Apply etmə:** `20260713121000` final enforcement

### Fase 3 — QA

- [ ] Manual QA §5 doldur
- [ ] `node tests/listing-creation-access.test.mjs` PASS
- [ ] `/elan-yarat` gate: yalnız 1 CTA
- [ ] Nav policy qərar (hide create link vs discovery UX)

### Fase 4 — Mobile store publish

- [ ] EAS production build
- [ ] Updated smoke test PASS
- [ ] Device QA (login, create gate, claim, message)
- [ ] Play / App Store submit + metadata

### Fase 5 — Post-launch

- [ ] Analytics view apply (opsional)
- [ ] Mobile CI (typecheck, lint, security:mobile-env)
- [ ] Contract tests CI-yə
- [ ] Final messaging enforcement (RPC cutover sonrası)

---

## 7. PASS gate (launch)

### Web-only minimum

1. G1, W1, W3, W4, W5 → **PASS**
2. S1, S4 → **PASS**
3. W13, W17 (listing access kod + RLS) → **PASS**
4. §5 Q1, Q3, Q4, Q5 → **PASS**

### Full launch (web + mobile)

5. M7, M14, M11 → **PASS**
6. §5 Q8 → **PASS**
7. Fase 2 DB matrix kritik 3 migration → **PASS**

---

## 8. Fayl indeksi (audit sübutu)

### Web — listing access
- `src/lib/stores/membership.ts`
- `src/app/elan-yarat/page.tsx`
- `src/app/create-listing/actions.ts`
- `supabase/migrations/20260720120000_restrict_listing_insert_to_store_members.sql`
- `supabase/verification/LISTING_CREATION_ACCESS_RLS_VERIFY.sql`
- `tests/listing-creation-access.test.mjs`

### Web — deploy / SEO
- `src/app/elanlar/`, `src/app/.well-known/assetlinks.json/route.ts`
- `next.config.ts`
- `docs/audit/MARKTX-AUDIT-2026-07-13.md`

### Mobile — listing access
- `app/(tabs)/create-listing.tsx`
- `lib/stores/membership.ts`
- `lib/stores/listing-store.ts`
- `scripts/smoke-test.js` (stale)
- `scripts/assert-mobile-client-hygiene.mjs` (PASS)

### Shared
- `supabase/migrations/` (web 13 + mobile 50 — divergent)
- `lib/messaging-contract/contract.ts` (both — hash match PASS)

---

## 9. Sənəd yeniləmə

| Tarix | Versiya | Dəyişiklik |
|---|---|---|
| 2026-07-21 v1 | İlk versiya | Audit + repo scan |
| 2026-07-21 v2 | **Dərin audit** | Git status, kod sübutu, migration divergence, test drift, smoke stale |

**Növbəti addım:** Hər `UNVERIFIED`-i manual test / SQL verify ilə doldur; Fase 0-dan başla.
