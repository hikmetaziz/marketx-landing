-- MarktX store claim-code auto ownership.
-- A valid admin-issued store code + claim code now activates ownership directly.
-- New-store applications remain a separate support/admin-review flow.

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
  v_existing_request public.store_claim_requests%rowtype;
  v_request_id uuid;
  v_profile_role text;
  v_invalid_message constant text :=
    'Mağaza kodu və ya sahiblik təsdiq kodu düzgün deyil, ya da bu müraciət qəbul edilmir.';
  v_not_allowed_message constant text :=
    'Bu hesabla mağaza sahiblik müraciəti göndərmək mümkün deyil.';
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
  where s.store_code = pg_catalog.btrim(coalesce(p_store_code, ''))
  for update;

  if v_store.id is null
    or v_store.status not in ('unclaimed', 'claim_pending')
    or v_store.owner_id is not null
  then
    raise exception '%', v_invalid_message;
  end if;

  if exists (
    select 1
    from public.store_members as sm
    where sm.store_id = v_store.id
      and sm.role = 'owner'
  ) then
    raise exception '%', v_invalid_message;
  end if;

  select scr.*
  into v_existing_request
  from public.store_claim_requests as scr
  where scr.store_id = v_store.id
    and scr.requested_by = v_uid
    and scr.status = 'pending'
  order by scr.created_at desc
  limit 1
  for update;

  if v_existing_request.id is not null then
    select scc.*
    into v_code
    from public.store_claim_codes as scc
    where scc.id = v_existing_request.claim_code_id
      and scc.store_id = v_store.id
      and scc.expires_at > now()
    for update;
  else
    select scc.*
    into v_code
    from public.store_claim_codes as scc
    where scc.store_id = v_store.id
      and scc.used_at is null
      and scc.expires_at > now()
    order by scc.created_at desc
    limit 1
    for update;
  end if;

  if v_code.id is null then
    raise exception '%', v_invalid_message;
  end if;

  if v_code.claim_code_hash <> extensions.crypt(pg_catalog.btrim(p_claim_code), v_code.claim_code_hash) then
    raise exception '%', v_invalid_message;
  end if;

  update public.store_claim_codes as scc
  set used_at = coalesce(scc.used_at, now())
  where scc.id = v_code.id
  returning scc.id into v_code.id;

  if v_existing_request.id is not null then
    update public.store_claim_requests as scr
    set status = 'approved',
        submitted_phone = nullif(pg_catalog.btrim(coalesce(p_phone, scr.submitted_phone, '')), ''),
        submitted_note = nullif(pg_catalog.btrim(coalesce(p_note, scr.submitted_note, '')), ''),
        evidence_url = nullif(pg_catalog.btrim(coalesce(p_evidence_url, scr.evidence_url, '')), ''),
        admin_note = 'Sahiblik təsdiq kodu ilə avtomatik aktivləşdirildi.',
        reviewed_at = now(),
        updated_at = now()
    where scr.id = v_existing_request.id
    returning scr.id into v_request_id;
  else
    insert into public.store_claim_requests (
      store_id,
      requested_by,
      claim_code_id,
      status,
      submitted_store_code,
      submitted_phone,
      submitted_note,
      evidence_url,
      admin_note,
      reviewed_at
    )
    values (
      v_store.id,
      v_uid,
      v_code.id,
      'approved',
      v_store.store_code,
      nullif(pg_catalog.btrim(coalesce(p_phone, '')), ''),
      nullif(pg_catalog.btrim(coalesce(p_note, '')), ''),
      nullif(pg_catalog.btrim(coalesce(p_evidence_url, '')), ''),
      'Sahiblik təsdiq kodu ilə avtomatik aktivləşdirildi.',
      now()
    )
    returning id into v_request_id;
  end if;

  perform pg_catalog.set_config('marktx.store_rpc', 'on', true);

  update public.stores as s
  set owner_id = v_uid,
      status = 'claimed',
      updated_at = now()
  where s.id = v_store.id
    and s.status in ('unclaimed', 'claim_pending')
    and s.owner_id is null;

  if not found then
    raise exception '%', v_invalid_message;
  end if;

  insert into public.store_members (store_id, user_id, role)
  values (v_store.id, v_uid, 'owner')
  on conflict on constraint store_members_store_id_user_id_key
  do update set role = 'owner';

  update public.store_claim_requests as scr
  set status = 'rejected',
      admin_note = 'Başqa sahiblik kodu ilə mağaza təsdiqləndi.',
      reviewed_at = now(),
      updated_at = now()
  where scr.store_id = v_store.id
    and scr.status = 'pending'
    and scr.id <> v_request_id;

  perform pg_catalog.set_config('marktx.store_rpc', '', true);

  perform public.store_audit(
    v_store.id,
    'claim_code_auto_approved',
    pg_catalog.jsonb_build_object(
      'request_id', v_request_id,
      'claim_code_id', v_code.id,
      'new_owner', v_uid
    )
  );

  return query select v_request_id, 'Mağaza hesabınıza bağlandı.'::text;
end;
$$;

revoke all on function public.submit_store_claim_request(text, text, text, text, text) from public, anon;
grant execute on function public.submit_store_claim_request(text, text, text, text, text) to authenticated;

comment on function public.submit_store_claim_request(text, text, text, text, text) is
  'User-facing store-code + claim-code activation. A valid admin-issued code directly assigns owner access.';

commit;
