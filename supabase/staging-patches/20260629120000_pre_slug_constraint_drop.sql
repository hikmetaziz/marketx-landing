-- Staging-only pre-step for mobile migration 20260629120000_taxonomy_16_catalogue.sql.
-- The source migration contains one legacy non-ASCII slug. Temporarily drop the
-- slug checks, run the original migration, then repair and validate again.

alter table public.subcategories drop constraint if exists subcategories_slug_format;
alter table public.categories drop constraint if exists categories_slug_format;
