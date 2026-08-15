-- MarktX Create/Edit Listing V2 - Phase 1 RLS verification
-- Uses temporary rows inside a transaction and rolls back at the end.

begin;

create temp table phase1_rls_results (
  check_order integer,
  check_name text,
  result text
) on commit drop;

grant insert, select on phase1_rls_results to anon, authenticated;

-- Admin can create temporary active/inactive schema rows.
set local role authenticated;
select set_config('request.jwt.claim.sub', '7d3d9325-9d07-4b35-97dc-c33cfa8605c1', true);

do $$
begin
  begin
    insert into public.category_form_schemas (category_slug, schema, is_active)
    values
      ('phase1-rls-form-test', '{}'::jsonb, true),
      ('phase1-rls-form-test', '{}'::jsonb, false);

    insert into public.category_photo_schemas (category_slug, schema, is_active)
    values
      ('phase1-rls-photo-test', '{}'::jsonb, true),
      ('phase1-rls-photo-test', '{}'::jsonb, false);

    insert into phase1_rls_results
    values (10, 'admin_schema_insert', 'ALLOWED');
  exception when others then
    insert into phase1_rls_results
    values (10, 'admin_schema_insert', 'DENIED:' || SQLSTATE);
  end;
end $$;

reset role;

-- Anon should read only active schema rows.
set local role anon;

insert into phase1_rls_results
select
  20,
  'anon_form_schema_read',
  format(
    'visible=%s active=%s inactive=%s',
    count(*),
    count(*) filter (where is_active),
    count(*) filter (where not is_active)
  )
from public.category_form_schemas
where category_slug = 'phase1-rls-form-test';

insert into phase1_rls_results
select
  21,
  'anon_photo_schema_read',
  format(
    'visible=%s active=%s inactive=%s',
    count(*),
    count(*) filter (where is_active),
    count(*) filter (where not is_active)
  )
from public.category_photo_schemas
where category_slug = 'phase1-rls-photo-test';

reset role;

-- Non-admin authenticated users should read active rows only and fail writes.
set local role authenticated;
select set_config('request.jwt.claim.sub', '03978afe-3379-4706-bec1-4504f9d163e2', true);

insert into phase1_rls_results
select
  30,
  'non_admin_form_schema_read',
  format(
    'visible=%s active=%s inactive=%s',
    count(*),
    count(*) filter (where is_active),
    count(*) filter (where not is_active)
  )
from public.category_form_schemas
where category_slug = 'phase1-rls-form-test';

insert into phase1_rls_results
select
  31,
  'non_admin_photo_schema_read',
  format(
    'visible=%s active=%s inactive=%s',
    count(*),
    count(*) filter (where is_active),
    count(*) filter (where not is_active)
  )
from public.category_photo_schemas
where category_slug = 'phase1-rls-photo-test';

do $$
begin
  begin
    insert into public.category_form_schemas (category_slug, schema, is_active)
    values ('phase1-rls-non-admin-form-write', '{}'::jsonb, true);

    insert into phase1_rls_results
    values (32, 'non_admin_form_schema_insert', 'UNEXPECTED_ALLOWED');
  exception when others then
    insert into phase1_rls_results
    values (32, 'non_admin_form_schema_insert', 'DENIED:' || SQLSTATE);
  end;

  begin
    insert into public.category_photo_schemas (category_slug, schema, is_active)
    values ('phase1-rls-non-admin-photo-write', '{}'::jsonb, true);

    insert into phase1_rls_results
    values (33, 'non_admin_photo_schema_insert', 'UNEXPECTED_ALLOWED');
  exception when others then
    insert into phase1_rls_results
    values (33, 'non_admin_photo_schema_insert', 'DENIED:' || SQLSTATE);
  end;
end $$;

reset role;

-- Admin should read both active and inactive rows.
set local role authenticated;
select set_config('request.jwt.claim.sub', '7d3d9325-9d07-4b35-97dc-c33cfa8605c1', true);

insert into phase1_rls_results
select
  40,
  'admin_form_schema_read',
  format(
    'visible=%s active=%s inactive=%s',
    count(*),
    count(*) filter (where is_active),
    count(*) filter (where not is_active)
  )
from public.category_form_schemas
where category_slug = 'phase1-rls-form-test';

insert into phase1_rls_results
select
  41,
  'admin_photo_schema_read',
  format(
    'visible=%s active=%s inactive=%s',
    count(*),
    count(*) filter (where is_active),
    count(*) filter (where not is_active)
  )
from public.category_photo_schemas
where category_slug = 'phase1-rls-photo-test';

reset role;

select check_name, result
from phase1_rls_results
order by check_order;

rollback;
