-- MarktX: elan silinəndə əlaqəli qeydlərin avtomatik silinməsi
-- Supabase SQL Editor — bir dəfə işlədin (reports cədvəli varsa).
--
-- Storage şəkilləri veb tətbiqi silir (delete-listing-cleanup.ts).
-- Bu skript DB tərəfdə cascade/constraint düzəldir.

-- reports.listing_id: SET NULL + check constraint silməni bloklayır — CASCADE
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'reports'
  ) then
    alter table public.reports
      drop constraint if exists reports_listing_id_fkey;

    alter table public.reports
      add constraint reports_listing_id_fkey
      foreign key (listing_id)
      references public.listings (id)
      on delete cascade;
  end if;
end $$;

-- listing_contacts, favorites, conversations — artıq ON DELETE CASCADE olmalıdır
-- (ENABLE_PROFILES_AND_SOCIAL_RLS.sql, SPRINT1_SECURITY.sql)
