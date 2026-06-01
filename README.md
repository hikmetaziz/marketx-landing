# MarktX Landing (marketx.az)

Rəsmi MarktX veb-saytı — Phase 1: landing, qanuni səhifələr, SEO və etibar.

- **Brand:** MarktX
- **Domain:** [marketx.az](https://marketx.az)
- **Stack:** Next.js 16, TypeScript, Tailwind CSS v4

## Phase 1 scope

- Ana səhifə (landing)
- Statik səhifələr: about, categories, how-it-works, contact, pricing, privacy, terms
- SEO: metadata, sitemap, robots
- Gələcək marşrutlar (tezliklə): `/listings`, `/listings/[id]`, `/categories/[slug]`
- **Aktiv deyil (tezliklə):** veb login, elan yerləşdirmə, axtarış, ödəniş, AI

Mobil tətbiq ayrı repodadır — bu layihəyə toxunulmur.

## Lokal işə salma

```bash
cd marketx-landing
npm install
npm run dev
```

Brauzer: [http://localhost:3000](http://localhost:3000)

### Environment (optional — Phase 2 auth)

Phase 1-də veb auth aktiv deyil. Supabase inteqrasiyası üçün (gələcək):

```bash
cp .env.example .env.local
```

`.env.local` faylına əlavə edin (mobil app ilə eyni layihə):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

**Vacib:** `.env.local` heç vaxt git-ə commit edilməməlidir (`.gitignore`-da var).

## Build

```bash
npm run build
npm run start
```

## Vercel deploy

1. [Vercel](https://vercel.com) → New Project → `marketx-landing` qovluğu
2. Framework: Next.js (avtomatik)
3. Environment variables (Phase 2 üçün): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Domain: `marketx.az` DNS-i Vercel-ə yönəldin
5. Deploy

CLI ilə:

```bash
npx vercel --prod
```

## SQL (Supabase)

SQL faylları `supabase/` qovluğundadır — yalnız Supabase Dashboard → SQL Editor-də bir dəfə işlədilir:

- `ENABLE_LISTINGS_AND_RLS.sql` — listings RLS
- `MAKE_ADMIN.sql` — admin rol təyini

## Struktur

```
src/
  app/           # Səhifələr (App Router)
  components/    # UI komponentləri
  constants/     # Məzmun və konfiq
  lib/           # SEO, helpers
public/images/   # Statik şəkillər
```
