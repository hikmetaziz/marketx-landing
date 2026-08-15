-- Manual rollback for 20260728113000_store_claim_code_auto_owner.sql.
-- Restores the previous same-store pending claim-request behavior.
-- Does not delete stores, memberships, claim requests, or claim codes.

begin;

create or replace function public.submit_store_claim_request(
  p_store_code text,
  p_claim_code text default null,
  p_phone text default null,
  p_note text default null,
  p_evidence_url text default null
)
returns table (request_id uuid, message text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_store public.stores%rowtype;
  v_code public.store_claim_codes%rowtype;
  v_request_id uuid;
  v_profile_role text;
  v_invalid_message constant text :=
    'Mağaza kodu və ya sahiblik təsdiq kodu düzgün deyil, ya da bu müraciət qəbul edilmir.';
  v_not_allowed_message constant text :=
    'Bu hesabla mağaza sahiblik müraciəti göndərmək mümkün deyil.';
  v_pending_message constant text :=
    'Mağaza giriş müraciətiniz admin tərəfindən yoxlanılır.';
begin
  if v_uid is null then
    raise exception 'Daxil olmamısınız.';
  end if;

  if p_claim_code is null or pg_catalog.btrim(p_claim_code) = '' then
    raise exception '%', v_invalid_message;
  end if;

  select p.role
  into v_profile_role
  from public.profiles as p
  where p.id = v_uid;

  if v_profile_role in ('admin', 'moderator') then
    raise exception '%', v_not_allowed_message;
  end if;

  if exists (
    select 1
    from public.store_members as sm
    where sm.user_id = v_uid
      and sm.role in ('owner', 'manager', 'staff')
  ) then
    raise exception '%', v_not_allowed_message;
  end if;

  if not public.check_rate_limit(
    'store_claim',
    v_uid::text,
    coalesce(p_store_code, ''),
    5,
    interval '1 hour'
  ) then
    raise exception 'Çox tez-tez cəhd etdiniz. Bir az sonra yenidən yoxlayın.';
  end if;

  select s.*
  into v_store
  from public.stores as s
  where s.store_code = pg_catalog.btrim(coalesce(p_store_code, ''));

  if v_store.id is null or v_store.status in ('claimed', 'suspended') then
    raise exception '%', v_invalid_message;
  end if;

  if exists (
    select 1
    from public.store_claim_requests as scr
    where scr.store_id = v_store.id
      and scr.requested_by = v_uid
      and scr.status = 'pending'
  ) then
    raise exception '%', v_pending_message;
  end if;

  select scc.*
  into v_code
  from public.store_claim_codes as scc
  where scc.store_id = v_store.id
    and scc.used_at is null
    and scc.expires_at > now()
  order by scc.created_at desc
  limit 1
  for update;

  if v_code.id is null then
    raise exception '%', v_invalid_message;
  end if;

  if v_code.claim_code_hash <> extensions.crypt(pg_catalog.btrim(p_claim_code), v_code.claim_code_hash) then
    raise exception '%', v_invalid_message;
  end if;

  update public.store_claim_codes
  set used_at = now()
  where id = v_code.id
    and used_at is null;

  if not found then
    raise exception '%', v_invalid_message;
  end if;

  insert into public.store_claim_requests
    (store_id, requested_by, claim_code_id, status, submitted_store_code, submitted_phone, submitted_note, evidence_url)
  values
    (v_store.id, v_uid, v_code.id, 'pending', v_store.store_code, p_phone, p_note, p_evidence_url)
  returning id into v_request_id;

  perform pg_catalog.set_config('marktx.store_rpc', 'on', true);
  update public.stores
  set status = 'claim_pending'
  where id = v_store.id;
  perform pg_catalog.set_config('marktx.store_rpc', '', true);

  perform public.store_audit(
    v_store.id,
    'claim_request_submitted',
    pg_catalog.jsonb_build_object('request_id', v_request_id, 'with_code', true)
  );

  return query select v_request_id, 'Müraciətiniz admin yoxlamasına göndərildi.'::text;
end;
$$;

revoke all on function public.submit_store_claim_request(text, text, text, text, text) from public, anon;
grant execute on function public.submit_store_claim_request(text, text, text, text, text) to authenticated;

comment on function public.submit_store_claim_request(text, text, text, text, text) is
  'User-facing store-code + claim-code request. A valid code creates a pending admin-review claim request.';

commit;
