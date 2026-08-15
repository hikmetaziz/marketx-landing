-- Verify listings_before_update store_membership alignment migration.
-- Part A: static function/trigger inventory. Part B: rollback-safe runtime checks.

with fn as (
  select
    p.oid,
    p.prosecdef,
    pg_get_functiondef(p.oid) as definition
  from pg_proc as p
  join pg_namespace as n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'listings_before_update'
    and pg_get_function_identity_arguments(p.oid) = ''
),
checks as (
  select 'function_exists' as check_name, exists (select 1 from fn) as passed
  union all
  select 'function_is_security_definer', exists (select 1 from fn where prosecdef)
  union all
  select 'function_search_path_empty', exists (
    select 1 from fn where definition ilike '%SET search_path TO ''''%'
  )
  union all
  select 'admin_bypass_preserved', exists (
    select 1 from fn where definition ilike '%public.is_admin()%'
  )
  union all
  select 'uses_exact_store_membership', exists (
    select 1 from fn
    where definition ilike '%public.store_members%'
      and definition ilike '%sm.store_id = old.store_id%'
      and definition ilike '%sm.user_id = v_actor%'
  )
  union all
  select 'personal_owner_path_preserved', exists (
    select 1 from fn
    where definition ilike '%old.store_id is null%'
      and definition ilike '%v_is_personal_owner%'
  )
  union all
  select 'staff_edit_role_recognized', exists (
    select 1 from fn
    where definition ilike '%v_can_edit%'
      and definition ilike '%owner%'
      and definition ilike '%manager%'
      and definition ilike '%staff%'
  )
  union all
  select 'staff_archive_not_allowed', exists (
    select 1 from fn
    where definition ilike '%v_can_archive%'
      and definition ilike '%owner%'
      and definition ilike '%manager%'
      and definition not ilike '%v_can_archive := v_is_personal_owner or v_store_role in (''owner'', ''manager'', ''staff'')%'
  )
  union all
  select 'store_id_preserved_for_store_listing', exists (
    select 1 from fn where definition ilike '%new.store_id := old.store_id%'
  )
  union all
  select 'deleted_status_transition_supported', exists (
    select 1 from fn
    where definition ilike '%new.status::text = ''deleted''%'
      and definition ilike '%v_can_archive%'
  )
  union all
  select 'review_fields_preserved', exists (
    select 1 from fn
    where definition ilike '%new.reviewed_at := old.reviewed_at%'
      and definition ilike '%new.reviewed_by := old.reviewed_by%'
      and definition ilike '%new.rejected_reason := old.rejected_reason%'
  )
  union all
  select 'trigger_is_attached', exists (
    select 1
    from pg_trigger as t
    join pg_class as c on c.oid = t.tgrelid
    join pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'listings'
      and t.tgname = 'listings_before_update'
      and not t.tgisinternal
  )
)
select check_name, passed
from checks
order by check_name;

do $$
declare
  failures text;
begin
  with fn as (
    select
      p.oid,
      p.prosecdef,
      pg_get_functiondef(p.oid) as definition
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'listings_before_update'
      and pg_get_function_identity_arguments(p.oid) = ''
  ),
  checks as (
    select 'function_exists' as check_name, exists (select 1 from fn) as passed
    union all
    select 'function_is_security_definer', exists (select 1 from fn where prosecdef)
    union all
    select 'function_search_path_empty', exists (
      select 1 from fn where definition ilike '%SET search_path TO ''''%'
    )
    union all
    select 'admin_bypass_preserved', exists (
      select 1 from fn where definition ilike '%public.is_admin()%'
    )
    union all
    select 'uses_exact_store_membership', exists (
      select 1 from fn
      where definition ilike '%public.store_members%'
        and definition ilike '%sm.store_id = old.store_id%'
        and definition ilike '%sm.user_id = v_actor%'
    )
    union all
    select 'personal_owner_path_preserved', exists (
      select 1 from fn
      where definition ilike '%old.store_id is null%'
        and definition ilike '%v_is_personal_owner%'
    )
    union all
    select 'staff_edit_role_recognized', exists (
      select 1 from fn
      where definition ilike '%v_can_edit%'
        and definition ilike '%owner%'
        and definition ilike '%manager%'
        and definition ilike '%staff%'
    )
    union all
    select 'staff_archive_not_allowed', exists (
      select 1 from fn
      where definition ilike '%v_can_archive%'
        and definition ilike '%owner%'
        and definition ilike '%manager%'
        and definition not ilike '%v_can_archive := v_is_personal_owner or v_store_role in (''owner'', ''manager'', ''staff'')%'
    )
    union all
    select 'store_id_preserved_for_store_listing', exists (
      select 1 from fn where definition ilike '%new.store_id := old.store_id%'
    )
    union all
    select 'deleted_status_transition_supported', exists (
      select 1 from fn
      where definition ilike '%new.status::text = ''deleted''%'
        and definition ilike '%v_can_archive%'
    )
    union all
    select 'review_fields_preserved', exists (
      select 1 from fn
      where definition ilike '%new.reviewed_at := old.reviewed_at%'
        and definition ilike '%new.reviewed_by := old.reviewed_by%'
        and definition ilike '%new.rejected_reason := old.rejected_reason%'
    )
    union all
    select 'trigger_is_attached', exists (
      select 1
      from pg_trigger as t
      join pg_class as c on c.oid = t.tgrelid
      join pg_namespace as n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'listings'
        and t.tgname = 'listings_before_update'
        and not t.tgisinternal
    )
  )
  select string_agg(check_name, ', ' order by check_name)
  into failures
  from checks
  where not passed;

  if failures is not null then
    raise exception 'listing_before_update_store_membership_fix_verification_failed: %', failures;
  end if;
end $$;

begin;

create temporary table marktx_listing_before_update_runtime (
  check_name text primary key,
  ok boolean not null,
  detail text
) on commit drop;

do $$
declare
  v_owner uuid;
  v_manager uuid;
  v_staff uuid;
  v_creator uuid;
  v_wrong_member uuid;
  v_store uuid;
  v_wrong_store uuid;
  v_owner_delete uuid;
  v_manager_delete uuid;
  v_staff_edit uuid;
  v_staff_delete uuid;
  v_staff_archive uuid;
  v_staff_sold uuid;
  v_wrong_listing uuid;
  v_revoked_listing uuid;
  v_creator_wrong_listing uuid;
  v_personal uuid;
  v_rows integer;
  v_sqlstate text;
begin
  select p.id into v_owner
  from public.profiles as p
  where coalesce(p.role, 'user') = 'user'
  order by p.created_at nulls last, p.id
  limit 1;

  select p.id into v_manager
  from public.profiles as p
  where coalesce(p.role, 'user') = 'user'
    and p.id <> all(array_remove(array[v_owner], null::uuid))
  order by p.created_at nulls last, p.id
  limit 1;

  select p.id into v_staff
  from public.profiles as p
  where coalesce(p.role, 'user') = 'user'
    and p.id <> all(array_remove(array[v_owner, v_manager], null::uuid))
  order by p.created_at nulls last, p.id
  limit 1;

  select p.id into v_creator
  from public.profiles as p
  where coalesce(p.role, 'user') = 'user'
    and p.id <> all(array_remove(array[v_owner, v_manager, v_staff], null::uuid))
  order by p.created_at nulls last, p.id
  limit 1;

  select p.id into v_wrong_member
  from public.profiles as p
  where coalesce(p.role, 'user') = 'user'
    and p.id <> all(array_remove(array[v_owner, v_manager, v_staff, v_creator], null::uuid))
  order by p.created_at nulls last, p.id
  limit 1;

  if v_owner is null or v_manager is null or v_staff is null or v_creator is null or v_wrong_member is null then
    insert into marktx_listing_before_update_runtime
    values ('fixture_availability', false, 'missing owner/manager/staff/creator/wrong_member profile fixtures');
    return;
  end if;

  perform set_config('marktx.store_rpc', 'on', true);
  insert into public.stores (name, slug, status)
  values (
    'Listing Runtime Verify Store',
    'listing-runtime-' || left(replace(gen_random_uuid()::text, '-', ''), 10),
    'claimed'
  )
  returning id into v_store;

  insert into public.stores (name, slug, status)
  values (
    'Listing Runtime Wrong Store',
    'listing-runtime-wrong-' || left(replace(gen_random_uuid()::text, '-', ''), 10),
    'claimed'
  )
  returning id into v_wrong_store;

  insert into public.store_members (store_id, user_id, role)
  values
    (v_store, v_owner, 'owner'),
    (v_store, v_manager, 'manager'),
    (v_store, v_staff, 'staff'),
    (v_wrong_store, v_wrong_member, 'owner')
  on conflict (store_id, user_id) do update set role = excluded.role;

  perform set_config('request.jwt.claim.sub', v_creator::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  insert into public.listings (user_id, store_id, title, price, category, city, condition, status)
  values
    (v_creator, v_store, 'Owner Delete Listing', 100, 'Test', 'Baki', 'Yeni', 'active'),
    (v_creator, v_store, 'Manager Delete Listing', 100, 'Test', 'Baki', 'Yeni', 'active'),
    (v_creator, v_store, 'Staff Edit Listing', 100, 'Test', 'Baki', 'Yeni', 'active'),
    (v_creator, v_store, 'Staff Delete Listing', 100, 'Test', 'Baki', 'Yeni', 'active'),
    (v_creator, v_store, 'Staff Archive Listing', 100, 'Test', 'Baki', 'Yeni', 'active'),
    (v_creator, v_store, 'Staff Sold Listing', 100, 'Test', 'Baki', 'Yeni', 'active'),
    (v_creator, v_store, 'Wrong Store Listing', 100, 'Test', 'Baki', 'Yeni', 'active'),
    (v_creator, v_store, 'Revoked Listing', 100, 'Test', 'Baki', 'Yeni', 'active'),
    (v_creator, v_store, 'Creator Wrong Store Listing', 100, 'Test', 'Baki', 'Yeni', 'active'),
    (v_creator, null, 'Personal Listing', 100, 'Test', 'Baki', 'Yeni', 'active');

  select id into v_owner_delete from public.listings where store_id = v_store and title = 'Owner Delete Listing';
  select id into v_manager_delete from public.listings where store_id = v_store and title = 'Manager Delete Listing';
  select id into v_staff_edit from public.listings where store_id = v_store and title = 'Staff Edit Listing';
  select id into v_staff_delete from public.listings where store_id = v_store and title = 'Staff Delete Listing';
  select id into v_staff_archive from public.listings where store_id = v_store and title = 'Staff Archive Listing';
  select id into v_staff_sold from public.listings where store_id = v_store and title = 'Staff Sold Listing';
  select id into v_wrong_listing from public.listings where store_id = v_store and title = 'Wrong Store Listing';
  select id into v_revoked_listing from public.listings where store_id = v_store and title = 'Revoked Listing';
  select id into v_creator_wrong_listing from public.listings where store_id = v_store and title = 'Creator Wrong Store Listing';
  select id into v_personal from public.listings where store_id is null and title = 'Personal Listing';

  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  update public.listings set status = 'deleted' where id = v_owner_delete;
  get diagnostics v_rows = row_count;
  reset role;
  insert into marktx_listing_before_update_runtime
  values ('owner_can_soft_archive_store_listing', v_rows = 1, 'rows=' || v_rows);

  perform set_config('request.jwt.claim.sub', v_manager::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  update public.listings set status = 'deleted' where id = v_manager_delete;
  get diagnostics v_rows = row_count;
  reset role;
  insert into marktx_listing_before_update_runtime
  values ('manager_can_soft_archive_store_listing', v_rows = 1, 'rows=' || v_rows);

  perform set_config('request.jwt.claim.sub', v_staff::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  update public.listings set title = 'Staff Edit OK' where id = v_staff_edit;
  get diagnostics v_rows = row_count;
  reset role;
  insert into marktx_listing_before_update_runtime
  values ('staff_can_edit_store_listing', v_rows = 1, 'rows=' || v_rows);

  begin
    perform set_config('request.jwt.claim.sub', v_staff::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    set local role authenticated;
    update public.listings set status = 'deleted' where id = v_staff_delete;
    get diagnostics v_rows = row_count;
    reset role;
    insert into marktx_listing_before_update_runtime
    values ('staff_cannot_delete_store_listing', v_rows = 0, 'rows=' || v_rows);
  exception
    when others then
      get stacked diagnostics v_sqlstate = returned_sqlstate;
      reset role;
      insert into marktx_listing_before_update_runtime
      values ('staff_cannot_delete_store_listing', v_sqlstate is not null, 'denied sqlstate=' || coalesce(v_sqlstate, 'unknown'));
  end;

  begin
    perform set_config('request.jwt.claim.sub', v_staff::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    set local role authenticated;
    update public.listings set status = 'archived' where id = v_staff_archive;
    get diagnostics v_rows = row_count;
    reset role;
    insert into marktx_listing_before_update_runtime
    values ('staff_cannot_archive_store_listing', v_rows = 0, 'rows=' || v_rows);
  exception
    when others then
      get stacked diagnostics v_sqlstate = returned_sqlstate;
      reset role;
      insert into marktx_listing_before_update_runtime
      values ('staff_cannot_archive_store_listing', v_sqlstate is not null, 'denied sqlstate=' || coalesce(v_sqlstate, 'unknown'));
  end;

  begin
    perform set_config('request.jwt.claim.sub', v_staff::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    set local role authenticated;
    update public.listings set status = 'sold' where id = v_staff_sold;
    get diagnostics v_rows = row_count;
    reset role;
    insert into marktx_listing_before_update_runtime
    values ('staff_cannot_mark_sold_store_listing', v_rows = 0, 'rows=' || v_rows);
  exception
    when others then
      get stacked diagnostics v_sqlstate = returned_sqlstate;
      reset role;
      insert into marktx_listing_before_update_runtime
      values ('staff_cannot_mark_sold_store_listing', v_sqlstate is not null, 'denied sqlstate=' || coalesce(v_sqlstate, 'unknown'));
  end;

  perform set_config('request.jwt.claim.sub', v_wrong_member::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  update public.listings set title = 'Wrong Store Blocked' where id = v_wrong_listing;
  get diagnostics v_rows = row_count;
  reset role;
  insert into marktx_listing_before_update_runtime
  values ('wrong_store_member_denied_store_listing', v_rows = 0, 'rows=' || v_rows);

  delete from public.store_members
  where store_id = v_store
    and user_id = v_staff;

  perform set_config('request.jwt.claim.sub', v_staff::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  update public.listings set title = 'Revoked Blocked' where id = v_revoked_listing;
  get diagnostics v_rows = row_count;
  reset role;
  insert into marktx_listing_before_update_runtime
  values ('revoked_member_denied_store_listing', v_rows = 0, 'rows=' || v_rows);

  perform set_config('request.jwt.claim.sub', v_creator::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  update public.listings set title = 'Creator Store Blocked' where id = v_creator_wrong_listing;
  get diagnostics v_rows = row_count;
  reset role;
  insert into marktx_listing_before_update_runtime
  values ('store_listing_creator_without_membership_denied', v_rows = 0, 'rows=' || v_rows);

  perform set_config('request.jwt.claim.sub', v_creator::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  update public.listings set status = 'deleted' where id = v_personal;
  get diagnostics v_rows = row_count;
  reset role;
  insert into marktx_listing_before_update_runtime
  values ('personal_creator_can_soft_archive_personal_listing', v_rows = 1, 'rows=' || v_rows);

  perform set_config('request.jwt.claim.sub', v_manager::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  select count(*) into v_rows
  from public.listings
  where id = v_staff_edit;
  reset role;
  insert into marktx_listing_before_update_runtime
  values ('store_member_can_select_exact_store_listing', v_rows = 1, 'visible_rows=' || v_rows);
end $$;

do $$
declare
  failures text;
begin
  select string_agg(check_name, ', ' order by check_name)
  into failures
  from marktx_listing_before_update_runtime
  where not ok;

  if failures is not null then
    raise exception 'listing_before_update_store_membership_fix_runtime_failed: %', failures;
  end if;
end $$;

rollback;
