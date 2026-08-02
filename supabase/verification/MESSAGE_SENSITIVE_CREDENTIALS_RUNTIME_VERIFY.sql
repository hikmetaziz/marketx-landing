-- MarktX Security Remediation 2C: prepared runtime verification.
-- Run only after applying 20260719130000_message_sensitive_credentials_block.sql
-- in an approved isolated/staging environment.
--
-- The script uses a temporary probe table for trigger behavior and does not
-- insert public.messages rows. Real RPC/RLS smoke tests still require dedicated
-- authenticated test conversations.
--
-- Output is labels/booleans only. It must not print raw blocked message text,
-- card numbers, CVV, PIN, OTP, passwords, tokens, or secrets.

begin;

create temp table pg_temp.message_sensitive_results (
  check_name text primary key,
  passed boolean not null,
  detail text
) on commit drop;

create temp table pg_temp.message_sensitive_probe (
  id bigserial primary key,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  note text
) on commit drop;

create trigger probe_sensitive_credentials_bi
  before insert on pg_temp.message_sensitive_probe
  for each row
  execute function public.marktx_enforce_message_sensitive_credentials();

create trigger probe_sensitive_credentials_bu
  before update of body on pg_temp.message_sensitive_probe
  for each row
  when (new.body is distinct from old.body)
  execute function public.marktx_enforce_message_sensitive_credentials();

insert into pg_temp.message_sensitive_results(check_name, passed, detail)
select
  'public_insert_trigger_exists',
  exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'messages'
      and t.tgname = 'marktx_messages_sensitive_credentials_bi'
      and not t.tgisinternal
  ),
  'public.messages BEFORE INSERT trigger inventory';

insert into pg_temp.message_sensitive_results(check_name, passed, detail)
select
  'public_update_body_trigger_exists',
  exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'messages'
      and t.tgname = 'marktx_messages_sensitive_credentials_bu'
      and not t.tgisinternal
  ),
  'public.messages BEFORE UPDATE OF body trigger inventory';

insert into pg_temp.message_sensitive_results(check_name, passed, detail)
select
  'legacy_direct_message_policy_still_present',
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'messages'
      and policyname = 'messages_insert_participant'
      and coalesce(with_check, '') ilike '%legacy_user_user%'
  ),
  'static policy compatibility precondition';

insert into pg_temp.message_sensitive_results(check_name, passed, detail)
select
  'current_send_rpc_exists',
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'send_conversation_message'
  ),
  'static RPC presence precondition';

insert into pg_temp.message_sensitive_results(check_name, passed, detail)
select
  'message_edit_delete_rpcs_exist',
  count(*) = 2,
  'static edit/delete RPC presence precondition'
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('edit_conversation_message', 'delete_conversation_message_text');

insert into pg_temp.message_sensitive_results(check_name, passed, detail)
select
  'trigger_function_has_no_notice_logging',
  pg_get_functiondef(p.oid) not ilike '%raise notice%'
    and pg_get_functiondef(p.oid) not ilike '%raise log%'
    and pg_get_functiondef(p.oid) not ilike '%raise info%',
  'static raw-message logging check'
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'marktx_enforce_message_sensitive_credentials'
limit 1;

do $$
declare
  v_before integer;
  v_after integer;
  v_message text;
  v_detail text;
  v_state text;
  v_probe_id bigint;
  v_started timestamptz;
  v_elapsed_ms numeric;
begin
  insert into pg_temp.message_sensitive_probe(body, note)
  values ('allowed marketplace message', 'insert allow');

  insert into pg_temp.message_sensitive_results(check_name, passed, detail)
  values (
    'insert_allows_normal_message',
    true,
    'normal body inserted into temporary probe'
  );

  select count(*) into v_before from pg_temp.message_sensitive_probe;

  begin
    insert into pg_temp.message_sensitive_probe(body, note)
    values ('CVV request synthetic blocked sample', 'insert blocked');

    insert into pg_temp.message_sensitive_results(check_name, passed, detail)
    values ('insert_blocks_cvv', false, 'blocked insert unexpectedly succeeded');
  exception when check_violation then
    get stacked diagnostics
      v_message = message_text,
      v_detail = pg_exception_detail,
      v_state = returned_sqlstate;

    select count(*) into v_after from pg_temp.message_sensitive_probe;

    insert into pg_temp.message_sensitive_results(check_name, passed, detail)
    values (
      'insert_blocks_cvv',
      v_state = '23514'
        and v_message = 'message_sensitive_credentials_blocked'
        and coalesce(v_detail, '') like '%"category"%'
        and coalesce(v_detail, '') like '%cvv%'
        and coalesce(v_detail, '') not ilike '%actor%'
        and coalesce(v_detail, '') not ilike '%conversation%'
        and coalesce(v_detail, '') not ilike '%body%'
        and v_after = v_before,
      'sanitized category-only error and no temp persistence'
    );
  end;

  insert into pg_temp.message_sensitive_probe(body, note)
  values ('allowed editable message', 'before update')
  returning id into v_probe_id;

  begin
    update pg_temp.message_sensitive_probe
    set body = 'OTP synthetic blocked sample'
    where id = v_probe_id;

    insert into pg_temp.message_sensitive_results(check_name, passed, detail)
    values ('update_body_blocks_otp', false, 'blocked update unexpectedly succeeded');
  exception when check_violation then
    get stacked diagnostics
      v_message = message_text,
      v_detail = pg_exception_detail,
      v_state = returned_sqlstate;

    insert into pg_temp.message_sensitive_results(check_name, passed, detail)
    values (
      'update_body_blocks_otp',
      v_state = '23514'
        and v_message = 'message_sensitive_credentials_blocked'
        and coalesce(v_detail, '') like '%"category"%'
        and coalesce(v_detail, '') like '%otp%'
        and coalesce(v_detail, '') not ilike '%actor%'
        and coalesce(v_detail, '') not ilike '%conversation%'
        and coalesce(v_detail, '') not ilike '%body%',
      'sanitized category-only error on body update'
    );
  end;

  update pg_temp.message_sensitive_probe
  set note = 'unrelated update'
  where id = v_probe_id;

  insert into pg_temp.message_sensitive_results(check_name, passed, detail)
  values (
    'update_unrelated_field_allowed',
    true,
    'UPDATE not touching body did not run the body trigger'
  );

  update pg_temp.message_sensitive_probe
  set body = 'Mesaj silindi',
      metadata = metadata || jsonb_build_object('deleted_at', now())
  where id = v_probe_id;

  insert into pg_temp.message_sensitive_results(check_name, passed, detail)
  values (
    'soft_delete_replacement_allowed',
    true,
    'approved soft-delete replacement body remains functional'
  );

  execute 'alter table pg_temp.message_sensitive_probe disable trigger probe_sensitive_credentials_bi';
  execute 'alter table pg_temp.message_sensitive_probe disable trigger probe_sensitive_credentials_bu';

  insert into pg_temp.message_sensitive_probe(body, note)
  values ('CVV synthetic legacy setup', 'bypassed setup')
  returning id into v_probe_id;

  execute 'alter table pg_temp.message_sensitive_probe enable trigger probe_sensitive_credentials_bi';
  execute 'alter table pg_temp.message_sensitive_probe enable trigger probe_sensitive_credentials_bu';

  update pg_temp.message_sensitive_probe
  set body = 'allowed corrected body'
  where id = v_probe_id;

  insert into pg_temp.message_sensitive_results(check_name, passed, detail)
  values (
    'update_from_existing_prohibited_to_allowed',
    true,
    'existing prohibited-looking text can be replaced with allowed text'
  );

  v_started := clock_timestamp();
  perform public.marktx_classify_message_sensitive_credentials('short normal message');
  v_elapsed_ms := extract(epoch from clock_timestamp() - v_started) * 1000;
  insert into pg_temp.message_sensitive_results(check_name, passed, detail)
  values ('performance_short_normal_prepared', v_elapsed_ms < 100, 'elapsed_ms=' || round(v_elapsed_ms, 3));

  v_started := clock_timestamp();
  perform public.marktx_classify_message_sensitive_credentials(rpad('normal marketplace text ', 1000, 'x'));
  v_elapsed_ms := extract(epoch from clock_timestamp() - v_started) * 1000;
  insert into pg_temp.message_sensitive_results(check_name, passed, detail)
  values ('performance_1000_normal_prepared', v_elapsed_ms < 100, 'elapsed_ms=' || round(v_elapsed_ms, 3));

  v_started := clock_timestamp();
  perform public.marktx_classify_message_sensitive_credentials(rpad('Bankdan gelen SMS kodu gonder ', 1000, 'x'));
  v_elapsed_ms := extract(epoch from clock_timestamp() - v_started) * 1000;
  insert into pg_temp.message_sensitive_results(check_name, passed, detail)
  values ('performance_1000_blocked_prepared', v_elapsed_ms < 100, 'elapsed_ms=' || round(v_elapsed_ms, 3));

  v_started := clock_timestamp();
  perform public.marktx_classify_message_sensitive_credentials(rpad('Salam, Ə ğ ş ç ö ü ı normal mesaj ', 1000, 'x'));
  v_elapsed_ms := extract(epoch from clock_timestamp() - v_started) * 1000;
  insert into pg_temp.message_sensitive_results(check_name, passed, detail)
  values ('performance_unicode_az_prepared', v_elapsed_ms < 100, 'elapsed_ms=' || round(v_elapsed_ms, 3));

  v_started := clock_timestamp();
  perform public.marktx_classify_message_sensitive_credentials(rpad('Обычное сообщение о товаре ', 1000, 'x'));
  v_elapsed_ms := extract(epoch from clock_timestamp() - v_started) * 1000;
  insert into pg_temp.message_sensitive_results(check_name, passed, detail)
  values ('performance_cyrillic_ru_prepared', v_elapsed_ms < 100, 'elapsed_ms=' || round(v_elapsed_ms, 3));

  v_started := clock_timestamp();
  perform public.marktx_classify_message_sensitive_credentials(repeat('1234567890 ', 90));
  v_elapsed_ms := extract(epoch from clock_timestamp() - v_started) * 1000;
  insert into pg_temp.message_sensitive_results(check_name, passed, detail)
  values ('performance_many_numbers_prepared', v_elapsed_ms < 100, 'elapsed_ms=' || round(v_elapsed_ms, 3));

  v_started := clock_timestamp();
  perform public.marktx_classify_message_sensitive_credentials(rpad('code pin sms ', 1000, 'x'));
  v_elapsed_ms := extract(epoch from clock_timestamp() - v_started) * 1000;
  insert into pg_temp.message_sensitive_results(check_name, passed, detail)
  values ('performance_ambiguous_terms_prepared', v_elapsed_ms < 100, 'elapsed_ms=' || round(v_elapsed_ms, 3));
end;
$$;

select check_name, passed, detail
from pg_temp.message_sensitive_results
order by check_name;

rollback;
