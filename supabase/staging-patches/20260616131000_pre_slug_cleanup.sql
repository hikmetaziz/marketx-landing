-- Staging-safe cleanup before mobile migration
-- 20260616131000_universal_taxonomy_best_practice.sql.
-- The older groundwork seed can create one non-url-safe legacy category slug
-- in an empty staging DB. Rename it to the legacy slug expected by later
-- alias/deactivation logic; keep the row id for FK safety.

update public.categories
set
  slug = 'avto',
  name = 'Avto',
  updated_at = now()
where slug = 'nəqliyyat vasitələri'
  and not exists (
    select 1
    from public.categories existing
    where existing.slug = 'avto'
  );
