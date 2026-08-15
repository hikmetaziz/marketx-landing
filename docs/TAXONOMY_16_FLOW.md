# MarktX — 16 Kateqoriya Taxonomy & Flow

**Status:** Plan təsdiqləndi (2026-06-29)  
**Kanonical mənbə:** Supabase `categories` + `subcategories` + `category_aliases`  
**Veb catalogue PNG:** `https://marketx.az/images/catalogue/{slug}.png`  
**App ikon:** MaterialIcons (`icon_key` sütunu)

---

## 16 top-level kateqoriya

| # | slug | name | sort | PNG | MaterialIcons |
|---|------|------|------|-----|---------------|
| 1 | `dasinmaz-emlak` | Daşınmaz əmlak | 10 | ✅ | `apartment` |
| 2 | `avtomobil-ve-neqliyyat` | Avtomobil və nəqliyyat | 20 | ✅ | `directions-car` |
| 3 | `telefon` | Telefon | 30 | ✅ | `smartphone` |
| 4 | `elektronika` | Elektronika | 40 | ✅ | `devices` |
| 5 | `meiset-texnikasi` | Məişət texnikası | 50 | ✅ | `kitchen` |
| 6 | `ev-ve-bag` | Ev və bağ | 60 | ✅ | `yard` |
| 7 | `mebel-ve-interyer` | Mebel və interyer | 70 | ✅ | `weekend` |
| 8 | `geyim-ve-aksesuar` | Geyim və aksesuar | 80 | ✅ | `checkroom` |
| 9 | `xidmetler` | Xidmətlər | 90 | ✅ | `handyman` |
| 10 | `is-elanlari` | İş elanları | 100 | ✅ | `work` |
| 11 | `usaq-mehsullari` | Uşaq məhsulları | 110 | ✅ | `child-care` |
| 12 | `heyvanlar` | Heyvanlar | 120 | ✅ | `pets` |
| 13 | `biznes-ve-avadanliq` | Biznes və avadanlıq | 130 | ✅ | `store` |
| 14 | `temir-ve-ustalar` | Təmir və ustalar | 140 | ✅ | `build` |
| 15 | `tehsil-ve-kurslar` | Təhsil və kurslar | 150 | ✅ | `school` |
| 16 | `diger` | Digər | 160 | ✅ | `category` |

**Deaktiv (legacy):** `avto`, `neqliyyat`, `geyim`, `idman-ve-hobbi` — silinmir, alias ilə map olunur.

---

## Browse flow (veb + app eyni)

```
Ana səhifə catalogue (16 tile)
    ↓ klik
/categories/{slug}  |  /category/{slug}
    ↓
Subcategory chip grid (6 alt kateqoriya)
    ↓ seçim (optional)
Elan siyahısı (category_id [+ subcategory_id])
    ↓
/listings/{slug}  |  /listing/{id}
```

**Filter qaydası:**
1. Əvvəl `category_id` (və ya alias → category_id)
2. Subcategory seçilibsə `subcategory_id`
3. Köhnə elanlar: `listings.category` text → `category_aliases`
4. Attribute filterlər: `attributes` jsonb (mərhələ 2)

**Mobil filter sheet (vacib — 2026-06-30 bug):**
- Filter sheet = yerində filter; **Tətbiq et**ə qədər naviqasiya yoxdur.
- Kateqoriya chip / kataloq = `/category/{slug}` browse.
- `normalizeListingFilters` `category` daxil bütün sahələri saxlamalıdır.
- `filterListings` `filters.category` tətbiq etməlidir.
- Düzəliş: minimal diff; chip/browse flow-u dəyişmə.

---

## Create listing flow (mobil hazır, veb mərhələ 2)

```
1. Kateqoriya (DB taxonomy)
2. Subcategory
3. Dynamic attributes (category_attribute_definitions)
4. Başlıq, qiymət, şəhər, vəziyyət
5. Şəkil upload (Storage)
6. Kontakt telefon
7. Submit → status: pending (moderasiya)
```

**DB yazılır:**
- `category_id`, `subcategory_id`, `attributes`
- `category` text (legacy, trigger sync)
- `listing_type`, `price_type`, `delivery_type`, `condition_code`

---

## App catalogue vizual

- **Tile şəkil:** `{SITE_URL}/images/catalogue/{slug}.png` (veb CDN)
- **Fallback:** MaterialIcons `icon_key`
- **Rəng:** `color_hex` (optional, DB)

PNG-lər app `assets/images/catalogue/` qovluğuna da kopyalanacaq (offline fallback).

---

## Legacy alias (listings.category text)

| Köhnə DB/app text | Yeni slug |
|-------------------|-----------|
| Avto, Avtomobil, Nəqliyyat | avtomobil-ve-neqliyyat |
| Telefon | telefon |
| Geyim | geyim-ve-aksesuar |
| Uşaq aləmi | usaq-mehsullari |
| Ev əşyaları, Mebel | ev-ve-bag / mebel-ve-interyer |
| İdman və hobbi | diger (sub: idman-ve-hobbi) |

---

## Implementasiya mərhələləri

| Mərhələ | İş | Repo |
|---------|-----|------|
| **1** | SQL migration (`TAXONOMY_16_CATALOGUE.sql`) | marktx-app + marketx-landing |
| **2** | App: `CategoryItems` → DB fetch + PNG URL | marktx-app |
| **3** | App: browse `category_id` filter | marktx-app |
| **4** | Veb: taxonomy fetch + `/categories/[slug]` subcats | marketx-landing |
| **5** | Veb: create-listing taxonomy | marketx-landing |
| **6** | Smoke: eyni slug → eyni elan sayı | hər ikisi |

---

## SQL tətbiq

Supabase Dashboard → SQL Editor → `supabase/TAXONOMY_16_CATALOGUE.sql`  
Əvvəl backup, sonra yoxlama:

```sql
select slug, name, is_active, sort_order, icon_key
from public.categories
where is_active = true
order by sort_order;
-- 16 sətir gözlənilir
```
