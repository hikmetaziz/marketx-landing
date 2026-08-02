-- Verify listing UPDATE/SELECT store_membership alignment migration.
-- Static policy inventory only. Runtime mutation behavior is verified after
-- listings_before_update is aligned by LISTING_BEFORE_UPDATE_STORE_MEMBERSHIP_FIX_VERIFY.sql.

with update_policies as (
  select
    p.polname,
    lower(pg_get_expr(p.polqual, p.polrelid)) as qual,
    lower(pg_get_expr(p.polwithcheck, p.polrelid)) as with_check
  from pg_policy as p
  where p.polrelid = 'public.listings'::regclass
    and p.polcmd = 'w'
),
select_policies as (
  select p.polname, lower(pg_get_expr(p.polqual, p.polrelid)) as qual
  from pg_policy as p
  where p.polrelid = 'public.listings'::regclass
    and p.polcmd = 'r'
),
insert_policies as (
  select p.polname
  from pg_policy as p
  where p.polrelid = 'public.listings'::regclass
    and p.polcmd = 'a'
),
checks as (
  select 'old_broad_owner_update_removed' as check_name, not exists (
    select 1 from update_policies where polname = 'listings_update_owner'
  ) as passed
  union all
  select 'personal_owner_update_requires_no_store', exists (
    select 1 from update_policies
    where polname = 'listings_update_personal_owner'
      and qual like '%store_id is null%'
      and qual like '%auth.uid() = user_id%'
      and with_check like '%store_id is null%'
      and with_check like '%auth.uid() = user_id%'
  )
  union all
  select 'store_member_select_exact_store_roles', exists (
    select 1 from select_policies
    where polname = 'listings_select_store_member'
      and qual like '%m.store_id = listings.store_id%'
      and qual like '%m.user_id = auth.uid()%'
      and qual like '%owner%'
      and qual like '%manager%'
      and qual like '%staff%'
  )
  union all
  select 'owner_manager_update_archive_allowed', exists (
    select 1 from update_policies
    where polname = 'listings_update_store_owner_manager'
      and qual like '%m.store_id = listings.store_id%'
      and qual like '%m.user_id = auth.uid()%'
      and qual like '%owner%'
      and qual like '%manager%'
      and with_check like '%m.store_id = listings.store_id%'
      and with_check like '%m.user_id = auth.uid()%'
      and with_check like '%owner%'
      and with_check like '%manager%'
  )
  union all
  select 'staff_update_blocks_archive_like_statuses', exists (
    select 1 from update_policies
    where polname = 'listings_update_store_staff_nonarchive'
      and qual like '%m.store_id = listings.store_id%'
      and qual like '%m.user_id = auth.uid()%'
      and qual like '%staff%'
      and qual like '%deleted%'
      and qual like '%archived%'
      and qual like '%sold%'
      and with_check like '%m.store_id = listings.store_id%'
      and with_check like '%m.user_id = auth.uid()%'
      and with_check like '%staff%'
      and with_check like '%deleted%'
      and with_check like '%archived%'
      and with_check like '%sold%'
  )
  union all
  select 'admin_update_policy_preserved', exists (
    select 1 from update_policies
    where polname = 'listings_update_admin'
      and qual like '%is_admin()%'
      and with_check like '%is_admin()%'
  )
  union all
  select 'insert_policy_preserved', exists (
    select 1 from insert_policies
    where polname = 'listings_insert_store_member'
  )
  union all
  select 'select_visible_policy_preserved', exists (
    select 1 from select_policies where polname = 'listings_select_visible'
  )
  union all
  select 'deleted_status_is_supported', exists (
    select 1
    from pg_attribute as a
    join pg_class as c on c.oid = a.attrelid
    join pg_namespace as n on n.oid = c.relnamespace
    join pg_type as t on t.oid = a.atttypid
    left join pg_enum as e on e.enumtypid = t.oid and e.enumlabel = 'deleted'
    where n.nspname = 'public'
      and c.relname = 'listings'
      and a.attname = 'status'
      and (t.typtype <> 'e' or e.oid is not null)
  )
)
select check_name, passed
from checks
order by check_name;

do $$
declare
  failures text;
begin
  with update_policies as (
    select
      p.polname,
      lower(pg_get_expr(p.polqual, p.polrelid)) as qual,
      lower(pg_get_expr(p.polwithcheck, p.polrelid)) as with_check
    from pg_policy as p
    where p.polrelid = 'public.listings'::regclass
      and p.polcmd = 'w'
  ),
  select_policies as (
    select p.polname, lower(pg_get_expr(p.polqual, p.polrelid)) as qual
    from pg_policy as p
    where p.polrelid = 'public.listings'::regclass
      and p.polcmd = 'r'
  ),
  insert_policies as (
    select p.polname
    from pg_policy as p
    where p.polrelid = 'public.listings'::regclass
      and p.polcmd = 'a'
  ),
  checks as (
    select 'old_broad_owner_update_removed' as check_name, not exists (
      select 1 from update_policies where polname = 'listings_update_owner'
    ) as passed
    union all
    select 'personal_owner_update_requires_no_store', exists (
      select 1 from update_policies
      where polname = 'listings_update_personal_owner'
        and qual like '%store_id is null%'
        and qual like '%auth.uid() = user_id%'
        and with_check like '%store_id is null%'
        and with_check like '%auth.uid() = user_id%'
    )
    union all
    select 'store_member_select_exact_store_roles', exists (
      select 1 from select_policies
      where polname = 'listings_select_store_member'
        and qual like '%m.store_id = listings.store_id%'
        and qual like '%m.user_id = auth.uid()%'
        and qual like '%owner%'
        and qual like '%manager%'
        and qual like '%staff%'
    )
    union all
    select 'owner_manager_update_archive_allowed', exists (
      select 1 from update_policies
      where polname = 'listings_update_store_owner_manager'
        and qual like '%m.store_id = listings.store_id%'
        and qual like '%m.user_id = auth.uid()%'
        and qual like '%owner%'
        and qual like '%manager%'
        and with_check like '%m.store_id = listings.store_id%'
        and with_check like '%m.user_id = auth.uid()%'
        and with_check like '%owner%'
        and with_check like '%manager%'
    )
    union all
    select 'staff_update_blocks_archive_like_statuses', exists (
      select 1 from update_policies
      where polname = 'listings_update_store_staff_nonarchive'
        and qual like '%m.store_id = listings.store_id%'
        and qual like '%m.user_id = auth.uid()%'
        and qual like '%staff%'
        and qual like '%deleted%'
        and qual like '%archived%'
        and qual like '%sold%'
        and with_check like '%m.store_id = listings.store_id%'
        and with_check like '%m.user_id = auth.uid()%'
        and with_check like '%staff%'
        and with_check like '%deleted%'
        and with_check like '%archived%'
        and with_check like '%sold%'
    )
    union all
    select 'admin_update_policy_preserved', exists (
      select 1 from update_policies
      where polname = 'listings_update_admin'
        and qual like '%is_admin()%'
        and with_check like '%is_admin()%'
    )
    union all
    select 'insert_policy_preserved', exists (
      select 1 from insert_policies
      where polname = 'listings_insert_store_member'
    )
    union all
    select 'select_visible_policy_preserved', exists (
      select 1 from select_policies where polname = 'listings_select_visible'
    )
    union all
    select 'deleted_status_is_supported', exists (
      select 1
      from pg_attribute as a
      join pg_class as c on c.oid = a.attrelid
      join pg_namespace as n on n.oid = c.relnamespace
      join pg_type as t on t.oid = a.atttypid
      left join pg_enum as e on e.enumtypid = t.oid and e.enumlabel = 'deleted'
      where n.nspname = 'public'
        and c.relname = 'listings'
        and a.attname = 'status'
        and (t.typtype <> 'e' or e.oid is not null)
    )
  )
  select string_agg(check_name, ', ' order by check_name)
  into failures
  from checks
  where not passed;

  if failures is not null then
    raise exception 'listing_store_membership_update_alignment_verification_failed: %', failures;
  end if;
end $$;
