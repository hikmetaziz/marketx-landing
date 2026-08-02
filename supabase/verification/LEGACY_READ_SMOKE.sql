-- Rollback-safe legacy read smoke test under RLS.

begin;

create temporary table marktx_legacy_read_result (
  check_name text,
  ok boolean,
  detail text
) on commit drop;

grant select, insert on marktx_legacy_read_result to authenticated;

do $$
declare
  v_conversation uuid;
  v_buyer uuid;
  v_seller uuid;
  v_count integer;
begin
  select id, buyer_id, seller_id
  into v_conversation, v_buyer, v_seller
  from public.conversations
  where buyer_id is not null
    and seller_id is not null
  limit 1;

  if v_conversation is null then
    insert into marktx_legacy_read_result values ('legacy_read_fixture', false, 'no legacy conversation');
    return;
  end if;

  perform set_config('request.jwt.claim.sub', v_buyer::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  select count(*) into v_count from public.conversations where id = v_conversation;
  reset role;
  insert into marktx_legacy_read_result values ('legacy_buyer_can_read', v_count = 1, 'visible=' || v_count);

  perform set_config('request.jwt.claim.sub', v_seller::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  select count(*) into v_count from public.conversations where id = v_conversation;
  reset role;
  insert into marktx_legacy_read_result values ('legacy_seller_can_read', v_count = 1, 'visible=' || v_count);
exception when others then
  reset role;
  insert into marktx_legacy_read_result values ('legacy_read_error', false, SQLSTATE || ':' || SQLERRM);
end $$;

select * from marktx_legacy_read_result;

rollback;
