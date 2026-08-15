-- MarktX: pgcrypto / gen_random_bytes düzəlişi (Supabase SQL Editor — bir dəfə işlədin)
-- Xəta: function gen_random_bytes(integer) does not exist
-- Səbəb: Supabase-də pgcrypto extensions sxemindədir, RPC search_path isə yalnız public idi.

create extension if not exists pgcrypto with schema extensions;

-- 7.2 admin_generate_store_claim_code
create or replace function public.admin_generate_store_claim_code(
  p_store_id uuid,
  p_valid_days integer default 14
)
returns table (claim_code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_store public.stores;
  v_plain text;
  v_expires timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Yalnız admin claim kodu yarada bilər.';
  end if;

  select * into v_store from public.stores where id = p_store_id;
  if v_store.id is null then
    raise exception 'Mağaza tapılmadı.';
  end if;

  if v_store.status = 'suspended' then
    raise exception 'Dayandırılmış mağaza üçün claim kodu yaradıla bilməz.';
  end if;

  v_plain := upper(
    translate(encode(gen_random_bytes(8), 'base64'), '+/=0O1Il', 'ABCDEFGH')
  );
  v_plain := left(regexp_replace(v_plain, '[^A-Z2-9]', '', 'g') || 'X23456789', 10);
  v_expires := now() + make_interval(days => greatest(1, coalesce(p_valid_days, 14)));

  update public.store_claim_codes
  set used_at = now()
  where store_id = p_store_id and used_at is null;

  insert into public.store_claim_codes (store_id, claim_code_hash, expires_at, created_by)
  values (p_store_id, crypt(v_plain, gen_salt('bf')), v_expires, auth.uid());

  perform public.store_audit(p_store_id, 'claim_code_generated', jsonb_build_object('expires_at', v_expires));

  return query select v_plain, v_expires;
end;
$$;

-- 7.3 submit_store_claim_request (crypt üçün eyni search_path)
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
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_store public.stores;
  v_code public.store_claim_codes;
  v_request_id uuid;
begin
  if v_uid is null then
    raise exception 'Daxil olmamısınız.';
  end if;

  if not public.check_rate_limit('store_claim', v_uid::text, coalesce(p_store_code, ''), 5, interval '1 hour') then
    raise exception 'Çox tez-tez cəhd etdiniz. Bir az sonra yenidən yoxlayın.';
  end if;

  select * into v_store from public.stores where store_code = btrim(coalesce(p_store_code, ''));
  if v_store.id is null then
    raise exception 'Bu kodla mağaza tapılmadı.';
  end if;

  if v_store.status = 'claimed' then
    raise exception 'Bu mağaza artıq sahiblənib.';
  end if;

  if v_store.status = 'suspended' then
    raise exception 'Bu mağaza üzrə müraciət qəbul edilmir.';
  end if;

  if exists (
    select 1 from public.store_claim_requests
    where store_id = v_store.id and requested_by = v_uid and status = 'pending'
  ) then
    raise exception 'Bu mağaza üçün artıq gözləyən müraciətiniz var.';
  end if;

  if p_claim_code is not null and btrim(p_claim_code) <> '' then
    select * into v_code
    from public.store_claim_codes
    where store_id = v_store.id
      and used_at is null
      and expires_at > now()
    order by created_at desc
    limit 1;

    if v_code.id is null then
      raise exception 'Etibarlı claim kodu tapılmadı (vaxtı keçib və ya istifadə olunub).';
    end if;

    if v_code.claim_code_hash <> crypt(btrim(p_claim_code), v_code.claim_code_hash) then
      raise exception 'Claim kodu yanlışdır.';
    end if;
  end if;

  insert into public.store_claim_requests
    (store_id, requested_by, claim_code_id, status, submitted_store_code, submitted_phone, submitted_note, evidence_url)
  values
    (v_store.id, v_uid, v_code.id, 'pending', v_store.store_code, p_phone, p_note, p_evidence_url)
  returning id into v_request_id;

  perform set_config('marktx.store_rpc', 'on', true);
  update public.stores set status = 'claim_pending' where id = v_store.id;
  perform set_config('marktx.store_rpc', '', true);

  perform public.store_audit(v_store.id, 'claim_request_submitted',
    jsonb_build_object('request_id', v_request_id, 'with_code', v_code.id is not null));

  return query select v_request_id, 'Müraciətiniz admin yoxlamasına göndərildi.'::text;
end;
$$;

revoke all on function public.admin_generate_store_claim_code(uuid, integer) from public, anon;
revoke all on function public.submit_store_claim_request(text, text, text, text, text) from public, anon;
grant execute on function public.admin_generate_store_claim_code(uuid, integer) to authenticated;
grant execute on function public.submit_store_claim_request(text, text, text, text, text) to authenticated;
