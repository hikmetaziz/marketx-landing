-- Rollback-safe compatibility smoke test for Phase A foundation.
-- Verifies deployed legacy direct insert flow still works under RLS.

begin;

create temporary table marktx_compat_result (
  check_name text,
  ok boolean,
  detail text
) on commit drop;

grant select, insert on marktx_compat_result to authenticated;

do $$
declare
  v_listing uuid;
  v_seller uuid;
  v_buyer uuid;
  v_conversation uuid;
begin
  select l.id, l.user_id, u.id
  into v_listing, v_seller, v_buyer
  from public.listings l
  cross join auth.users u
  where l.status = 'active'
    and l.user_id is not null
    and u.id <> l.user_id
    and not exists (
      select 1
      from public.conversations c
      where c.listing_id = l.id
        and c.buyer_id = u.id
    )
  limit 1;

  if v_listing is null then
    insert into marktx_compat_result values ('legacy_direct_conversation_insert', false, 'no fixture pair');
    insert into marktx_compat_result values ('legacy_direct_message_insert', false, 'no fixture pair');
    return;
  end if;

  perform set_config('request.jwt.claim.sub', v_buyer::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  insert into public.conversations (listing_id, buyer_id, seller_id)
  values (v_listing, v_buyer, v_seller)
  returning id into v_conversation;

  insert into marktx_compat_result
  values ('legacy_direct_conversation_insert', v_conversation is not null, 'rolled back');

  insert into public.messages (conversation_id, sender_id, body)
  values (v_conversation, v_buyer, 'compatibility smoke test rollback');

  insert into marktx_compat_result
  values ('legacy_direct_message_insert', true, 'rolled back');

  reset role;
exception when others then
  reset role;
  insert into marktx_compat_result
  values ('legacy_direct_insert_error', false, SQLSTATE || ':' || SQLERRM);
end $$;

select * from marktx_compat_result;

rollback;
