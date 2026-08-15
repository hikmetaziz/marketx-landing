-- MarktX Taxonomy V1 rollback.
-- Prepared only. This rollback intentionally avoids hard-deleting category or
-- subcategory rows so existing listing FK references are preserved.

begin;

update public.subcategories
set
  group_key = null,
  group_label = null,
  group_order = null,
  taxonomy_version = null
where taxonomy_version = 'marktx-taxonomy-auto-phone-electronics-v1';

update public.category_aliases
set is_active = false
where alias in (
    'avto',
    'avto-aksesuarlar',
    'avto-avadanliq',
    'avto-ehtiyat-hisseleri',
    'avto-xidmetler',
    'avtomobil',
    'duymeli-telefonlar',
    'ehtiyat-hisseleri',
    'elektronik',
    'elektronika-aksesuarlari',
    'foto-video',
    'komputer',
    'komputerler',
    'kompüter',
    'minik-avtomobili',
    'minik-avtomobilleri',
    'mobil-telefonlar',
    'motosiklet',
    'muherrik-hisseleri',
    'neqliyyat',
    'nəqliyyat',
    'smart-saatlar',
    'telefon-aksesuarlari',
    'telefonlar',
    'televizor-audio'
);

commit;
