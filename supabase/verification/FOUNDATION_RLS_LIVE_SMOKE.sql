-- Rollback-safe live RLS/RPC smoke tests for Phase A foundation.
-- Uses existing users/store rows as temporary fixtures inside one transaction.

begin;

create temporary table marktx_foundation_smoke (
  check_name text,
  ok boolean,
  detail text
) on commit drop;

grant select, insert on marktx_foundation_smoke to authenticated;

do $$
declare
  v_store uuid;
  v_customer uuid;
  v_member uuid;
  v_unrelated uuid;
  v_admin uuid;
  v_other_store uuid;
  v_conversation uuid;
  v_visible_count integer;
  v_audit_count integer;
begin
  select id into v_store from public.stores limit 1;
  select id into v_customer from public.profiles where role = 'user' limit 1;
  select id into v_member from public.profiles where id <> v_customer order by id limit 1;
  select id into v_unrelated from public.profiles where id not in (v_customer, v_member) order by id limit 1;
  select id into v_admin from public.profiles where role in ('admin', 'moderator') limit 1;

  if v_store is null or v_customer is null or v_member is null or v_unrelated is null or v_admin is null then
    insert into marktx_foundation_smoke values ('fixture_availability', false, 'missing store/customer/member/unrelated/admin fixture');
    return;
  end if;

  perform set_config('marktx.store_rpc', 'on', true);
  update public.stores set status = 'claimed' where id = v_store;
  insert into public.store_members (store_id, user_id, role)
  values (v_store, v_member, 'manager')
  on conflict (store_id, user_id) do update set role = excluded.role;
  insert into public.stores (name, slug, status)
  values ('Foundation Smoke Other Store', 'foundation-smoke-other-store-' || left(replace(gen_random_uuid()::text, '-', ''), 8), 'claimed')
  returning id into v_other_store;
  insert into public.store_members (store_id, user_id, role)
  values (v_other_store, v_unrelated, 'manager');

  perform set_config('request.jwt.claim.sub', v_customer::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  select public.get_or_create_customer_store_conversation(v_store, null, 'foundation smoke')
  into v_conversation;
  reset role;
  insert into marktx_foundation_smoke values ('customer_store_rpc_create', v_conversation is not null, 'rolled back');

  perform set_config('request.jwt.claim.sub', v_customer::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  perform public.send_conversation_message(v_conversation, 'customer smoke rollback', 'support');
  reset role;
  insert into marktx_foundation_smoke values ('customer_sender_context_server_controlled', true, 'client requested support; server accepted customer context only');

  perform set_config('request.jwt.claim.sub', v_member::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  perform public.send_conversation_message(v_conversation, 'store smoke rollback', 'customer');
  reset role;
  insert into marktx_foundation_smoke values ('store_member_can_reply', true, 'rolled back');

  perform set_config('request.jwt.claim.sub', v_unrelated::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  select count(*) into v_visible_count from public.conversations where id = v_conversation;
  reset role;
  insert into marktx_foundation_smoke values ('unrelated_user_cannot_read_customer_store', v_visible_count = 0, 'visible=' || v_visible_count);

  perform set_config('request.jwt.claim.sub', v_unrelated::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  select count(*) into v_visible_count from public.conversations where id = v_conversation;
  reset role;
  insert into marktx_foundation_smoke values ('unrelated_store_member_cannot_read_customer_store', v_visible_count = 0, 'visible=' || v_visible_count);

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  select count(*) into v_visible_count from public.conversations where id = v_conversation;
  reset role;
  insert into marktx_foundation_smoke values ('admin_direct_customer_store_select_blocked', v_visible_count = 0, 'visible=' || v_visible_count);

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  perform public.get_audited_customer_store_conversation(v_conversation, 'escalated', '{"smoke":true}'::jsonb);
  reset role;
  select count(*) into v_audit_count
  from public.conversation_access_audit
  where conversation_id = v_conversation
    and actor_id = v_admin
    and access_reason = 'escalated';
  insert into marktx_foundation_smoke values ('audited_admin_rpc_logs_access', v_audit_count = 1, 'audit_rows=' || v_audit_count);

  delete from public.store_members where store_id = v_store and user_id = v_member;
  perform set_config('request.jwt.claim.sub', v_member::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  select count(*) into v_visible_count from public.conversations where id = v_conversation;
  reset role;
  insert into marktx_foundation_smoke values ('removed_store_member_loses_access', v_visible_count = 0, 'visible=' || v_visible_count);

  begin
    insert into public.messages (conversation_id, sender_id, body, sender_context, metadata)
    values (v_conversation, v_customer, 'metadata should fail rollback', 'customer', '{"sender_id":"bad"}'::jsonb);
    insert into marktx_foundation_smoke values ('metadata_identity_key_rejected', false, 'unexpectedly inserted');
  exception when others then
    insert into marktx_foundation_smoke values ('metadata_identity_key_rejected', SQLSTATE = '23514', SQLSTATE || ':' || SQLERRM);
  end;
exception when others then
  reset role;
  insert into marktx_foundation_smoke values ('foundation_rls_live_smoke_error', false, SQLSTATE || ':' || SQLERRM);
end $$;

select * from marktx_foundation_smoke;

rollback;
