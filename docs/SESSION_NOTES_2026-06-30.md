# MarktX — sessiya qeydləri (2026-06-30)

Sonra baxmaq üçün xülasə: taxonomy, UI, smoke test, mağaza, format/Box.

---

## 1. Mərhələ 1 — Taxonomy / kataloq (tamamlandı)

**Məqsəd:** Veb + mobil eyni Supabase `categories` (16 kateqoriya) oxusun; elan filtri `category_id` + köhnə `category` mətni.

### Veb (`marketx-landing`)

| Fayl | Rol |
|------|-----|
| `src/lib/taxonomy/fetch-catalogue.ts` | DB kataloq + statik fallback |
| `src/lib/taxonomy/category-filter.ts` | `resolveCategoryFilter`, `applyCategoryFilterToQuery` |
| `src/lib/taxonomy/catalogue-types.ts`, `icon-key.ts`, `static-catalogue.ts` | Tiplər, ikon map |
| `src/app/categories/[slug]/page.tsx` | DB kataloq |
| `src/components/home/CategoryCardsSection.tsx`, `SearchBarSection.tsx` | Async DB |
| `src/lib/listings/live-listings.ts` | `category_id` filtri |
| `src/app/sitemap.ts` | `getCatalogueSlugs()` |

Legacy slug alias: `neqliyyat` → `avtomobil-ve-neqliyyat`, `usaq-alemi` → `usaq-mehsullari`, `geyim` → `geyim-ve-aksesuar`.

### Mobil (`marktx-app`)

| Fayl | Rol |
|------|-----|
| `lib/catalogue.ts`, `catalogue-static.ts`, `hooks/use-catalogue.ts` | 16 kateqoriya + PNG URL |
| `lib/fetch-category-listings.ts` | `category_id` filtri |
| `app/(tabs)/categories.tsx`, `app/category/[slug].tsx`, `app/(tabs)/index.tsx` | DB kataloq |

**DB:** `supabase/TAXONOMY_16_CATALOGUE.sql` — 16 aktiv kateqoriya. İstifadəçi migration işlədib.

**Problem (açıq):** `subcategories` cədvəli boş ola bilər (telefon üçün 0 sətir yoxlanılıb). §4 SQL işlədilməlidir.

---

## 2. Mərhələ 2 — Browse UI (tamamlandı)

**Veb:** `/categories/[slug]?sub=...` — `SubcategoryChips.tsx`, `fetch-subcategories.ts`, `live-listings` `subcategoryId`.

**Mobil:** `category/[slug].tsx` — chip sırası + `subcategory_id` filtri.

---

## 3. Create-listing taxonomy (veb — tamamlandı)

| Fayl | Rol |
|------|-----|
| `src/lib/taxonomy/fetch-listing-taxonomy.ts` | Server: DB taxonomy |
| `src/lib/taxonomy/listing-taxonomy-utils.ts` | Client-safe: atribut validasiya |
| `src/components/listings/DynamicAttributeFields.tsx` | Dinamik sahələr |
| `src/components/listings/CreateListingForm.tsx` | Kateqoriya + alt kateqoriya dropdown |
| `src/app/create-listing/actions.ts` | `category_id`, `subcategory_id`, `attributes` yazır |

Mobil `create-listing` artıq `fetchListingTaxonomy()` istifadə edirdi — dəyişməyib.

---

## 4. Smoke test

- **Nəticə:** 8 keçdi, 1 skip (`subcategories` DB-də yox idi)
- **Fayl:** `e2e/smoke.spec.ts` — telefon slug, create-listing login redirect, subcategory skip
- **İşə salma:** `PORT=3000 npm run test:e2e` (dev işləyəndə)

---

## 5. Mağaza / admin — hazırda YOXDUR

**Fakt:** Kodda `shops` cədvəli / mağaza UI yoxdur. Hər şey `listings.user_id` + `conversations.seller_id`.

**Problem:** Admin öz hesabı ilə elan yaradanda hər şey admin `user_id`-sinə bağlanır. `created_by` dəyişmək kifayət etmir — app `user_id` oxuyur.

**İndi nə etmək (admin):**
1. Satıcı app-də qeydiyyat → özü elan yaradır → admin `/admin/listings` təsdiqləyir
2. Və ya SQL: `update listings set user_id = 'SELLER_UUID' where ...`

**Gələcək handover (plan, kod yox):**
- Admin mağaza yaradır (`owner_user_id = NULL`, `awaiting_handover`)
- Satıcıya magic link → claim → `owner_user_id` təyin
- Üzv/işçi modeli istənmir — tək satıcı hesabı

---

## 6. İki repo

| Repo | Yol |
|------|-----|
| Veb | `F:\projects\websites\marketx-landing` |
| Mobil | `F:\projects\mobile_apps\marktx-app` |

Format/backup üçün hər ikisində `git push`.

---

## 7. Format / Box

- **`F:\` = fiziki Box Drive** — layihə faylları buludda sync
- Format `C:\` proqramları silir; Box bulud faylları adətən qalır
- Checklist: `docs/FORMAT_EVVƏL_CHECKLIST.md` (Box bölməsi əlavə olunub)

**Formatdan əvvəl:** Box sync tamam + `git push` + `.env` yoxla + `C:\` SSH backup.

**Formatdan sonra:** Box client + Git + Node + Cursor + `npm install`.

---

## 8. Açıq işlər (növbəti sessiya)

- [ ] Supabase-də `TAXONOMY_16_CATALOGUE.sql` §4 — subcategories seed
- [ ] Smoke: subcategory chip testi keçsin
- [ ] (İstəyə bağlı) Mağaza + admin handover MVP
- [ ] (İstəyə bağlı) `git push` + format əvvəl checklist tamamla
- [ ] Mərhələ 2 qalan: attribute filterlər browse-də (planlaşdırılıb, kod yox)

---

## 9. Əsas SQL faylları (veb repo)

- `supabase/TAXONOMY_16_CATALOGUE.sql`
- `supabase/CLEANUP_BROKEN_STORAGE_LISTINGS.sql`
- `supabase/CLEANUP_EMPTY_LISTING_IMAGES.sql`
- `docs/TAXONOMY_16_FLOW.md`

---

## 10. Brend

- **MarktX** (MarketX yox)
- **marketx.az** — footer/SEO
