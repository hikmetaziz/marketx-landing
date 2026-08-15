-- MarktX Phase B1 admin customer-store queue verification.
-- Run only after applying:
--   20260714110000_store_centered_messaging_admin_customer_store_queue.sql
-- Rollback-safe: all fixture changes are inside one transaction.

begin;

create temporary table marktx_phase_b1_queue_tests (
  check_name text primary key,
  ok boolean not null,
  detail text
) on commit drop;

do $$
declare
  v_customer uuid;
  v_member uuid;
  v_admin uuid;
  v_store uuid;
  v_escalated_store uuid;
  v_private_store uuid;
  v_reported uuid;
  v_escalated uuid;
  v_private uuid;
  v_ids uuid[];
  v_summary_json jsonb;
  v_audit_before integer;
  v_audit_after integer;
  v_sqlstate text;
begin
  select p.id into v_customer
  from public.profiles p
  where coalesce(p.role, 'user') = 'user'
  order by p.created_at nulls last, p.id
  limit 1;

  select p.id into v_member
  from public.profiles p
  where p.id is distinct from v_customer
    and coalesce(p.role, 'user') = 'user'
  order by p.created_at nulls last, p.id
  limit 1;

  select p.id into v_admin
  from public.profiles p
  where p.role in ('admin', 'moderator')
  order by p.created_at nulls last, p.id
  limit 1;

  select s.id into v_store from public.stores s order by s.created_at nulls last, s.id limit 1;

  if v_customer is null or v_member is null or v_admin is null or v_store is null then
    insert into marktx_phase_b1_queue_tests
    values ('fixture_availability', false, 'missing user/member/admin/store fixture');
    return;
  end if;

  perform set_config('marktx.store_rpc', 'on', true);
  update public.stores set status = 'claimed' where id = v_store;

  insert into public.store_members (store_id, user_id, role)
  values (v_store, v_member, 'manager')
  on conflict (store_id, user_id) do update set role = excluded.role;

  insert into public.stores (name, slug, status)
  values (
    'Phase B1 Escalated Store',
    'phase-b1-escalated-' || left(replace(gen_random_uuid()::text, '-', ''), 8),
    'claimed'
  )
  returning id into v_escalated_store;

  insert into public.stores (name, slug, status)
  values (
    'Phase B1 Private Store',
    'phase-b1-private-' || left(replace(gen_random_uuid()::text, '-', ''), 8),
    'claimed'
  )
  returning id into v_private_store;

  insert into public.conversations (
    conversation_type,
    customer_user_id,
    store_id,
    status,
    subject,
    reported_at
  )
  values (
    'customer_store',
    v_customer,
    v_store,
    'waiting_support',
    'Phase B1 reported fixture',
    now()
  )
  returning id into v_reported;

  insert into public.conversations (
    conversation_type,
    customer_user_id,
    store_id,
    status,
    subject
  )
  values (
    'customer_store',
    v_customer,
    v_escalated_store,
    'open',
    'Phase B1 escalated fixture'
  )
  returning id into v_escalated;

  insert into public.conversations (
    conversation_type,
    customer_user_id,
    store_id,
    status,
    subject
  )
  values (
    'customer_store',
    v_customer,
    v_private_store,
    'open',
    'Phase B1 private fixture'
  )
  returning id into v_private;

  insert into public.messages (conversation_id, sender_id, body, sender_context)
  values (v_reported, v_customer, 'phase-b1-secret-body-must-not-return', 'customer');

  insert into public.conversation_access_audit (conversation_id, actor_id, access_reason, metadata)
  values (v_escalated, v_admin, 'escalated', '{"phase_b1":"fixture"}'::jsonb);

  begin
    perform set_config('request.jwt.claim.sub', v_customer::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    set local role authenticated;
    perform public.list_reported_customer_store_conversations(50, 0);
    reset role;
    insert into marktx_phase_b1_queue_tests values ('ordinary_user_cannot_call_rpc', false, 'unexpected success');
  exception when others then
    v_sqlstate := SQLSTATE;
    reset role;
    insert into marktx_phase_b1_queue_tests
    values ('ordinary_user_cannot_call_rpc', v_sqlstate = '42501', v_sqlstate || ':' || SQLERRM);
  end;

  begin
    perform set_config('request.jwt.claim.sub', v_member::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    set local role authenticated;
    perform public.list_reported_customer_store_conversations(50, 0);
    reset role;
    insert into marktx_phase_b1_queue_tests values ('store_member_cannot_call_rpc', false, 'unexpected success');
  exception when others then
    v_sqlstate := SQLSTATE;
    reset role;
    insert into marktx_phase_b1_queue_tests
    values ('store_member_cannot_call_rpc', v_sqlstate = '42501', v_sqlstate || ':' || SQLERRM);
  end;

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  select array_agg(q.id) into v_ids
  from public.list_reported_customer_store_conversations(50, 0) q;
  reset role;

  insert into marktx_phase_b1_queue_tests
  values (
    'admin_sees_reported_and_escalated_summaries',
    v_reported = any(coalesce(v_ids, array[]::uuid[]))
      and v_escalated = any(coalesce(v_ids, array[]::uuid[])),
    'ids=' || coalesce(v_ids::text, '{}')
  );

  insert into marktx_phase_b1_queue_tests
  values (
    'admin_cannot_see_unrelated_private_conversation',
    not (v_private = any(coalesce(v_ids, array[]::uuid[]))),
    'private_id=' || v_private::text
  );

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  select to_jsonb(q) into v_summary_json
  from public.list_reported_customer_store_conversations(50, 0) q
  where q.id = v_reported;
  reset role;

  insert into marktx_phase_b1_queue_tests
  values (
    'summary_never_returns_message_bodies',
    v_summary_json is not null
      and not (v_summary_json ? 'body')
      and position('phase-b1-secret-body-must-not-return' in v_summary_json::text) = 0,
    coalesce(v_summary_json::text, 'null')
  );

  select count(*) into v_audit_before
  from public.conversation_access_audit
  where conversation_id = v_reported
    and actor_id = v_admin
    and metadata @> '{"phase_b1_detail":true}'::jsonb;

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  perform public.get_audited_customer_store_conversation(
    v_reported,
    'reported',
    '{"phase_b1_detail":true}'::jsonb
  );
  reset role;

  select count(*) into v_audit_after
  from public.conversation_access_audit
  where conversation_id = v_reported
    and actor_id = v_admin
    and metadata @> '{"phase_b1_detail":true}'::jsonb;

  insert into marktx_phase_b1_queue_tests
  values (
    'opening_detail_still_writes_audit_record',
    v_audit_after = v_audit_before + 1,
    'before=' || v_audit_before || ', after=' || v_audit_after
  );
exception when others then
  reset role;
  insert into marktx_phase_b1_queue_tests
  values ('phase_b1_queue_test_error', false, SQLSTATE || ':' || SQLERRM)
  on conflict (check_name) do update
    set ok = excluded.ok,
        detail = excluded.detail;
end $$;

select * from marktx_phase_b1_queue_tests order by check_name;

rollback;
