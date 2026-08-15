# Format / backup — qısa not (sonra oxu)

**Tarix:** 2026-06-30  
**Kontekst:** IT iş kompüterini format etmək istəyir. `F:\` disk = **Box Drive** (fayllar buludda).

---

## İki repo nədir?

| Repo | Yol | Nə |
|------|-----|-----|
| **Veb** | `F:\projects\websites\marketx-landing` | marketx.az — Next.js |
| **Mobil** | `F:\projects\mobile_apps\marktx-app` | MarktX app — Expo |

Eyni Supabase DB. Ayrı Git — **hər ikisində** `git push`.

---

## F:\ = Box — nə bilirsən?

- Format **local diski** silir (`C:\` proqramlar, bəlkə `F:\` cache).
- Box **buludundakı** fayllar adətən **qalır**.
- Formatdan sonra: Box client quraşdır → giriş → `F:\` sync gözlə.

**Formatdan əvvəl:** Box tray → hamısı sync olunub (pending yox).

**Formatdan sonra:** `npm install` hər repoda (`node_modules` sync gözləmə).

---

## Formatdan əvvəl — 5 addım

1. Box sync tamam
2. `git push` — veb + mobil
3. `.env.local` / `.env` — Box-da və ya password manager-də olduğunu yoxla
4. `C:\Users\...\.ssh\` — backup **və ya** formatdan sonra yeni SSH key
5. GitHub, Supabase, Vercel, Expo, Cursor — 2FA recovery kodları

---

## Formatdan sonra — quraşdır

1. Box Drive  
2. Git  
3. Node.js LTS  
4. Cursor  
5. `F:\` sync bitəndən sonra hər repoda `npm install`  
6. Veb: `npm run dev`  
7. Mobil: `npm run start`  
8. (Lazımsa) `eas-cli`, `gh`, Playwright: `npx playwright install chromium`

---

## Secrets haradadır?

| Fayl | Repo | Git-ə düşür? |
|------|------|----------------|
| `.env.local` | marketx-landing | Xeyr |
| `.env` | marktx-app | Xeyr |
| Supabase / Vercel keys | Dashboard (bulud) | — |

`.env` Box-a sync olursa buludda da olur — iş Box hesabıdırsa IT görə bilər.

---

## Mağaza / admin (ayrı mövzu)

- Hazırda **mağaza handover** yoxdur.
- Elan `user_id` = kim yaradıbsa, onun hesabı.
- Admin özü app-dən yaradırsa → öz admin hesabında görünür.
- **İndi:** satıcı öz telefonunda elan yaratsın, admin `/admin/listings`-dən təsdiqləsin.
- **Və ya:** SQL ilə `update listings set user_id = 'SATICI_UUID'`.

---

## Taxonomy işi (bu sessiya)

- Mərhələ 1: kataloq DB-dən (veb + mobil) — edilib.
- Browse: alt-kateqoriya chip-ləri — edilib.
- Create-listing: DB taxonomy — vebdə edilib.
- DB-də `subcategories` boş ola bilər → `TAXONOMY_16_CATALOGUE.sql` §4 işlət.
- Smoke: 8 keçdi, 1 skip (subcategories).

---

## IT-yə deyə bilərsən

> Layihə fayllarım Box Drive-dadır (`F:\projects\`). Kod GitHub-dadır. Formatdan sonra Box + Git + Node.js quraşdırıb sync gözləyəcəyəm.

---

## Ətraflı checklist

Tam siyahı: [`FORMAT_EVVƏL_CHECKLIST.md`](./FORMAT_EVVƏL_CHECKLIST.md)

---

## Tez əmrlər

```bash
# Veb
cd F:\projects\websites\marketx-landing
git status && git push
npm install
npm run dev

# Mobil
cd F:\projects\mobile_apps\marktx-app
git status && git push
npm install
npm run start
```
