-- Verify the targeted listing creation access RLS migration.
-- Read-only: inspects policy metadata only.

with insert_policies as (
  select
    p.polname,
    lower(pg_get_expr(p.polwithcheck, p.polrelid)) as with_check
  from pg_policy as p
  where p.polrelid = 'public.listings'::regclass
    and p.polcmd = 'a'
),
checks as (
  select
    'old_broad_insert_policy_absent' as check_name,
    not exists (
      select 1
      from insert_policies
      where polname = 'listings_insert_own'
    ) as passed
  union all
  select
    'store_member_insert_policy_present',
    exists (
      select 1
      from insert_policies
      where polname = 'listings_insert_store_member'
    )
  union all
  select
    'insert_requires_authenticated_row_owner',
    exists (
      select 1
      from insert_policies
      where polname = 'listings_insert_store_member'
        and with_check like '%auth.uid() = user_id%'
    )
  union all
  select
    'insert_requires_target_store_id',
    exists (
      select 1
      from insert_policies
      where polname = 'listings_insert_store_member'
        and with_check like '%store_id is not null%'
    )
  union all
  select
    'insert_requires_claimed_store',
    exists (
      select 1
      from insert_policies
      where polname = 'listings_insert_store_member'
        and (
          with_check like '%from public.stores%'
          or with_check like '%from stores%'
        )
        and with_check like '%s.status = ''claimed''%'
    )
  union all
  select
    'insert_requires_store_membership_role',
    exists (
      select 1
      from insert_policies
      where polname = 'listings_insert_store_member'
        and (
          with_check like '%from public.store_members%'
          or with_check like '%from store_members%'
        )
        and with_check like '%m.store_id = listings.store_id%'
        and with_check like '%m.user_id = auth.uid()%'
        and with_check like '%m.role = any%'
        and with_check like '%owner%'
        and with_check like '%manager%'
        and with_check like '%staff%'
    )
  union all
  select
    'no_admin_moderator_insert_bypass',
    not exists (
      select 1
      from insert_policies
      where polname = 'listings_insert_store_member'
        and (
          with_check like '%public.profiles%'
          or with_check like '%admin%'
          or with_check like '%moderator%'
        )
    )
)
select check_name, passed
from checks
order by check_name;

do $$
declare
  failures text;
begin
  with insert_policies as (
    select
      p.polname,
      lower(pg_get_expr(p.polwithcheck, p.polrelid)) as with_check
    from pg_policy as p
    where p.polrelid = 'public.listings'::regclass
      and p.polcmd = 'a'
  ),
  checks as (
    select 'old_broad_insert_policy_absent' as check_name, not exists (
      select 1 from insert_policies where polname = 'listings_insert_own'
    ) as passed
    union all
    select 'store_member_insert_policy_present', exists (
      select 1 from insert_policies where polname = 'listings_insert_store_member'
    )
    union all
    select 'insert_requires_authenticated_row_owner', exists (
      select 1 from insert_policies
      where polname = 'listings_insert_store_member'
        and with_check like '%auth.uid() = user_id%'
    )
    union all
    select 'insert_requires_target_store_id', exists (
      select 1 from insert_policies
      where polname = 'listings_insert_store_member'
        and with_check like '%store_id is not null%'
    )
    union all
    select 'insert_requires_claimed_store', exists (
      select 1 from insert_policies
      where polname = 'listings_insert_store_member'
        and (
          with_check like '%from public.stores%'
          or with_check like '%from stores%'
        )
        and with_check like '%s.status = ''claimed''%'
    )
    union all
    select 'insert_requires_store_membership_role', exists (
      select 1 from insert_policies
      where polname = 'listings_insert_store_member'
        and (
          with_check like '%from public.store_members%'
          or with_check like '%from store_members%'
        )
        and with_check like '%m.store_id = listings.store_id%'
        and with_check like '%m.user_id = auth.uid()%'
        and with_check like '%m.role = any%'
        and with_check like '%owner%'
        and with_check like '%manager%'
        and with_check like '%staff%'
    )
    union all
    select 'no_admin_moderator_insert_bypass', not exists (
      select 1 from insert_policies
      where polname = 'listings_insert_store_member'
        and (
          with_check like '%public.profiles%'
          or with_check like '%admin%'
          or with_check like '%moderator%'
        )
    )
  )
  select string_agg(check_name, ', ' order by check_name)
  into failures
  from checks
  where not passed;

  if failures is not null then
    raise exception 'listing_creation_access_rls_verification_failed: %', failures;
  end if;
end $$;
