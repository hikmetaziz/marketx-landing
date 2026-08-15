-- MarktX: Unclaimed Store → Claim Request → Admin Approval → Claimed Store
-- Supabase Dashboard → SQL Editor → Run once (idempotent, təkrar run təhlükəsizdir).
--
-- Asılılıqlar (əvvəl işlədilməlidir):
--   ENABLE_LISTINGS_AND_RLS.sql   → public.is_admin()
--   PHASE2_LISTINGS_DELTA.sql     → public.set_updated_at()
--   SPRINT1_SECURITY.sql          → public.check_rate_limit(), rate_limit_events
--
-- Prinsip:
--   store_code  = daimi identifikator (sahiblik VERMİR)
--   claim_code  = müvəqqəti, bcrypt hash, yalnız admin təsdiqi ilə işləyir
--   Sahiblik dəyişikliyi YALNIZ RPC-lərlə (RLS + trigger birbaşa update bloklayır)

-- Supabase: pgcrypto adətən extensions sxemindədir (gen_random_bytes, crypt, gen_salt)
create extension if not exists pgcrypto with schema extensions;

-- ══════════════════════════════════════════════════════════════════════════
-- 1) Sequence + slug helper
-- ══════════════════════════════════════════════════════════════════════════

create sequence if not exists public.stores_store_code_seq;

create or replace function public.generate_store_code()
returns text
language sql
volatile
as $$
  select 'MX-STORE-' || lpad(nextval('public.stores_store_code_seq')::text, 6, '0');
$$;

comment on function public.generate_store_code() is
  'Race-safe sequence-based store code: MX-STORE-000001.';

create or replace function public.generate_store_slug(store_name text, store_id uuid)
returns text
language sql
immutable
as $$
  select
    trim(both '-' from regexp_replace(
      lower(
        translate(
          coalesce(store_name, 'magaza'),
          'əöüğıçşƏÖÜĞIÇŞ',
          'eouigcsEOUIGCS'
        )
      ),
      '[^a-z0-9]+',
      '-',
      'g'
    ))
    || '-'
    || left(replace(store_id::text, '-', ''), 8);
$$;

comment on function public.generate_store_slug(text, uuid) is
  'AZ transliterasiya + qısa id suffiksi — unikal store slug.';

-- ══════════════════════════════════════════════════════════════════════════
-- 2) Cədvəllər
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.stores (
  id             uuid primary key default gen_random_uuid(),
  store_code     text unique not null default public.generate_store_code(),
  name           text not null check (char_length(trim(name)) > 0),
  slug           text unique not null,
  description    text,
  category       text,
  category_id    uuid references public.categories(id),
  contact_phone  text,
  whatsapp_phone text,
  address        text,
  city           text,
  logo_url       text,
  cover_url      text,
  owner_id       uuid references public.profiles(id),
  status         text not null default 'unclaimed'
                 check (status in ('unclaimed', 'claim_pending', 'claimed', 'suspended')),
  created_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.stores is
  'MarktX mağaza profilləri. Sahiblik: owner_id + store_members (owner). Status/owner dəyişikliyi yalnız RPC ilə.';
comment on column public.stores.contact_phone is
  'Public biznes telefonu — şəxsi elan PII (listing_contacts) strategiyasından fərqli olaraq açıqdır.';

create index if not exists stores_status_idx on public.stores (status);
create index if not exists stores_owner_id_idx on public.stores (owner_id);

create table if not exists public.store_members (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references public.stores(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'staff' check (role in ('owner', 'manager', 'staff')),
  created_at timestamptz not null default now(),
  unique (store_id, user_id)
);

create index if not exists store_members_user_id_idx on public.store_members (user_id);
create index if not exists store_members_store_id_idx on public.store_members (store_id);

-- Store başına yalnız bir owner
create unique index if not exists store_members_single_owner_idx
  on public.store_members (store_id)
  where role = 'owner';

create table if not exists public.store_claim_codes (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references public.stores(id) on delete cascade,
  claim_code_hash text not null,
  expires_at      timestamptz not null,
  used_at         timestamptz,
  created_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now()
);

comment on table public.store_claim_codes is
  'Müvəqqəti claim kodları — YALNIZ bcrypt hash saxlanılır, plain kod bir dəfə admin-ə qaytarılır.';

create index if not exists store_claim_codes_store_idx
  on public.store_claim_codes (store_id, expires_at desc);

create table if not exists public.store_claim_requests (
  id                   uuid primary key default gen_random_uuid(),
  store_id             uuid not null references public.stores(id) on delete cascade,
  requested_by         uuid not null references public.profiles(id) on delete cascade,
  claim_code_id        uuid references public.store_claim_codes(id),
  status               text not null default 'pending'
                       check (status in ('pending', 'approved', 'rejected', 'cancelled', 'expired')),
  submitted_store_code text not null,
  submitted_phone      text,
  submitted_note       text,
  evidence_url         text,
  admin_note           text,
  reviewed_by          uuid references public.profiles(id),
  reviewed_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists store_claim_requests_store_status_idx
  on public.store_claim_requests (store_id, status);
create index if not exists store_claim_requests_requested_by_idx
  on public.store_claim_requests (requested_by);
create index if not exists store_claim_requests_claim_code_idx
  on public.store_claim_requests (claim_code_id);

-- Dublikat pending qarşısı: eyni user + store üçün yalnız bir pending
create unique index if not exists store_claim_requests_unique_pending_idx
  on public.store_claim_requests (store_id, requested_by)
  where status = 'pending';

create table if not exists public.store_audit_logs (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid references public.stores(id) on delete cascade,
  actor_id   uuid references public.profiles(id),
  action     text not null,
  metadata   jsonb,
  created_at timestamptz not null default now()
);

create index if not exists store_audit_logs_store_idx
  on public.store_audit_logs (store_id, created_at desc);

-- listings inteqrasiyası (nullable — mövcud şəxsi elanlar pozulmur; mobil app breaking deyil)
alter table public.listings
  add column if not exists store_id uuid references public.stores(id) on delete set null;

create index if not exists listings_store_id_idx on public.listings (store_id);

comment on column public.listings.store_id is
  'Elanın bağlı olduğu mağaza (nullable). Şəxsi elanlarda null. user_id dəyişmir.';

-- ══════════════════════════════════════════════════════════════════════════
-- 3) Trigger-lər
-- ══════════════════════════════════════════════════════════════════════════

-- 3.1 slug auto-set (insert-də boşdursa)
create or replace function public.stores_set_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null or btrim(new.slug) = '' then
    new.slug := public.generate_store_slug(new.name, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists stores_set_slug on public.stores;
create trigger stores_set_slug
  before insert on public.stores
  for each row
  execute function public.stores_set_slug();

-- 3.2 Həssas sahələrin qorunması: store_code heç vaxt dəyişmir;
--     owner_id/status non-admin tərəfindən dəyişilə bilməz.
--     RPC-lər security definer olduğundan auth.uid() admin olanda keçir;
--     RPC daxili əməliyyatlar üçün local flag istifadə olunur.
create or replace function public.stores_protect_sensitive()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- store_code həmişə dəyişməzdir (admin daxil)
  new.store_code := old.store_code;

  -- RPC daxilində icazə flag-i
  if coalesce(current_setting('marktx.store_rpc', true), '') = 'on' then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  -- Non-admin: owner_id / status / created_by dəyişə bilməz
  new.owner_id := old.owner_id;
  new.status := old.status;
  new.created_by := old.created_by;

  return new;
end;
$$;

drop trigger if exists stores_protect_sensitive on public.stores;
create trigger stores_protect_sensitive
  before update on public.stores
  for each row
  execute function public.stores_protect_sensitive();

-- 3.3 updated_at (mövcud helper)
drop trigger if exists stores_set_updated_at on public.stores;
create trigger stores_set_updated_at
  before update on public.stores
  for each row
  execute function public.set_updated_at();

drop trigger if exists store_claim_requests_set_updated_at on public.store_claim_requests;
create trigger store_claim_requests_set_updated_at
  before update on public.store_claim_requests
  for each row
  execute function public.set_updated_at();

-- ══════════════════════════════════════════════════════════════════════════
-- 4) Public-safe view (RLS sətir səviyyəlidir — həssas sütunlar üçün view)
-- ══════════════════════════════════════════════════════════════════════════

create or replace view public.public_store_profiles as
select
  id,
  store_code,
  name,
  slug,
  description,
  category,
  category_id,
  contact_phone,
  whatsapp_phone,
  address,
  city,
  logo_url,
  cover_url,
  created_at
from public.stores
where status in ('unclaimed', 'claim_pending', 'claimed');

comment on view public.public_store_profiles is
  'Public mağaza görünüşü — owner_id, status, admin sahələri YOX. suspended görünmür.';

grant select on public.public_store_profiles to anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- 5) RLS siyasətləri
-- ══════════════════════════════════════════════════════════════════════════

alter table public.stores enable row level security;
alter table public.store_members enable row level security;
alter table public.store_claim_codes enable row level security;
alter table public.store_claim_requests enable row level security;
alter table public.store_audit_logs enable row level security;

-- stores: public oxuma (suspended xaric); owner/manager + admin tam sətir
drop policy if exists "stores_select_public" on public.stores;
create policy "stores_select_public"
  on public.stores for select to anon, authenticated
  using (
    status in ('unclaimed', 'claim_pending', 'claimed')
    or public.is_admin()
    or (auth.uid() is not null and auth.uid() = owner_id)
  );

-- stores: insert yalnız admin (RPC ilə; birbaşa da yalnız admin)
drop policy if exists "stores_insert_admin" on public.stores;
create policy "stores_insert_admin"
  on public.stores for insert to authenticated
  with check (public.is_admin());

-- stores: update — admin VƏ YA store üzvü (owner/manager).
-- Həssas sahələr stores_protect_sensitive trigger-i ilə qorunur.
drop policy if exists "stores_update_admin_or_member" on public.stores;
create policy "stores_update_admin_or_member"
  on public.stores for update to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.store_members m
      where m.store_id = id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'manager')
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.store_members m
      where m.store_id = id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'manager')
    )
  );

-- stores: delete yalnız admin
drop policy if exists "stores_delete_admin" on public.stores;
create policy "stores_delete_admin"
  on public.stores for delete to authenticated
  using (public.is_admin());

-- store_members: üzv özünü görür; admin hamısını
drop policy if exists "store_members_select" on public.store_members;
create policy "store_members_select"
  on public.store_members for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- store_members: yazma yalnız admin (owner sətri RPC ilə yaradılır)
drop policy if exists "store_members_write_admin" on public.store_members;
create policy "store_members_write_admin"
  on public.store_members for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- store_claim_codes: yalnız admin (hash-lər client-ə heç vaxt lazım deyil)
drop policy if exists "store_claim_codes_admin" on public.store_claim_codes;
create policy "store_claim_codes_admin"
  on public.store_claim_codes for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- store_claim_requests: user öz müraciətlərini görür; admin hamısını
drop policy if exists "store_claim_requests_select" on public.store_claim_requests;
create policy "store_claim_requests_select"
  on public.store_claim_requests for select to authenticated
  using (requested_by = auth.uid() or public.is_admin());

-- store_claim_requests: birbaşa INSERT/UPDATE/DELETE yalnız admin;
-- istifadəçi yalnız submit_store_claim_request RPC ilə yaradır
drop policy if exists "store_claim_requests_write_admin" on public.store_claim_requests;
create policy "store_claim_requests_write_admin"
  on public.store_claim_requests for insert to authenticated
  with check (public.is_admin());

drop policy if exists "store_claim_requests_update_admin" on public.store_claim_requests;
create policy "store_claim_requests_update_admin"
  on public.store_claim_requests for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "store_claim_requests_delete_admin" on public.store_claim_requests;
create policy "store_claim_requests_delete_admin"
  on public.store_claim_requests for delete to authenticated
  using (public.is_admin());

-- store_audit_logs: yalnız admin oxuyur; yazma RPC-lərlə (security definer)
drop policy if exists "store_audit_logs_admin" on public.store_audit_logs;
create policy "store_audit_logs_admin"
  on public.store_audit_logs for select to authenticated
  using (public.is_admin());

-- listings: store owner/manager öz mağaza elanlarını idarə edə bilir
drop policy if exists "listings_update_store_member" on public.listings;
create policy "listings_update_store_member"
  on public.listings for update to authenticated
  using (
    store_id is not null
    and exists (
      select 1 from public.store_members m
      where m.store_id = listings.store_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'manager')
    )
  )
  with check (
    store_id is not null
    and exists (
      select 1 from public.store_members m
      where m.store_id = listings.store_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'manager')
    )
  );

drop policy if exists "listings_delete_store_member" on public.listings;
create policy "listings_delete_store_member"
  on public.listings for delete to authenticated
  using (
    store_id is not null
    and exists (
      select 1 from public.store_members m
      where m.store_id = listings.store_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'manager')
    )
  );

-- ══════════════════════════════════════════════════════════════════════════
-- 6) Audit helper (daxili)
-- ══════════════════════════════════════════════════════════════════════════

create or replace function public.store_audit(
  p_store_id uuid,
  p_action text,
  p_metadata jsonb default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.store_audit_logs (store_id, actor_id, action, metadata)
  values (p_store_id, auth.uid(), p_action, p_metadata);
$$;

-- ══════════════════════════════════════════════════════════════════════════
-- 7) RPC funksiyaları
-- ══════════════════════════════════════════════════════════════════════════

-- 7.1 admin_create_store
create or replace function public.admin_create_store(
  p_name text,
  p_category text default null,
  p_category_id uuid default null,
  p_city text default null,
  p_contact_phone text default null,
  p_whatsapp_phone text default null,
  p_address text default null,
  p_description text default null
)
returns public.stores
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store public.stores;
begin
  if not public.is_admin() then
    raise exception 'Yalnız admin mağaza yarada bilər.';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'Mağaza adı boş ola bilməz.';
  end if;

  insert into public.stores (name, category, category_id, city, contact_phone, whatsapp_phone, address, description, status, owner_id, created_by)
  values (btrim(p_name), p_category, p_category_id, p_city, p_contact_phone, p_whatsapp_phone, p_address, p_description, 'unclaimed', null, auth.uid())
  returning * into v_store;

  perform public.store_audit(v_store.id, 'store_created', jsonb_build_object('name', v_store.name, 'store_code', v_store.store_code));

  return v_store;
end;
$$;

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

  -- Oxunaqlı 10 simvolluq kod (qarışdırıla bilən simvollar yoxdur: 0/O, 1/I/l)
  v_plain := upper(
    translate(encode(gen_random_bytes(8), 'base64'), '+/=0O1Il', 'ABCDEFGH')
  );
  v_plain := left(regexp_replace(v_plain, '[^A-Z2-9]', '', 'g') || 'X23456789', 10);
  v_expires := now() + make_interval(days => greatest(1, coalesce(p_valid_days, 14)));

  -- Köhnə istifadə olunmamış kodları invalidasiya et
  update public.store_claim_codes
  set used_at = now()
  where store_id = p_store_id and used_at is null;

  insert into public.store_claim_codes (store_id, claim_code_hash, expires_at, created_by)
  values (p_store_id, crypt(v_plain, gen_salt('bf')), v_expires, auth.uid());

  perform public.store_audit(p_store_id, 'claim_code_generated', jsonb_build_object('expires_at', v_expires));

  return query select v_plain, v_expires;
end;
$$;

-- 7.3 submit_store_claim_request
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

-- 7.4 admin_approve_store_claim_request
create or replace function public.admin_approve_store_claim_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.store_claim_requests;
  v_store public.stores;
begin
  if not public.is_admin() then
    raise exception 'Yalnız admin təsdiq edə bilər.';
  end if;

  select * into v_request from public.store_claim_requests where id = p_request_id;
  if v_request.id is null then
    raise exception 'Müraciət tapılmadı.';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Müraciət artıq baxılıb (status: %).', v_request.status;
  end if;

  select * into v_store from public.stores where id = v_request.store_id;
  if v_store.status = 'claimed' then
    raise exception 'Mağaza artıq sahiblənib.';
  end if;

  perform set_config('marktx.store_rpc', 'on', true);

  update public.stores
  set owner_id = v_request.requested_by, status = 'claimed'
  where id = v_request.store_id;

  insert into public.store_members (store_id, user_id, role)
  values (v_request.store_id, v_request.requested_by, 'owner')
  on conflict (store_id, user_id) do update set role = 'owner';

  if v_request.claim_code_id is not null then
    update public.store_claim_codes set used_at = now()
    where id = v_request.claim_code_id and used_at is null;
  end if;

  update public.store_claim_requests
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_request_id;

  -- Eyni mağaza üçün digər pending-lər rədd olunur
  update public.store_claim_requests
  set status = 'rejected',
      admin_note = 'Başqa müraciət təsdiqləndi.',
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where store_id = v_request.store_id and status = 'pending' and id <> p_request_id;

  perform set_config('marktx.store_rpc', '', true);

  perform public.store_audit(v_request.store_id, 'claim_request_approved',
    jsonb_build_object('request_id', p_request_id, 'new_owner', v_request.requested_by));
end;
$$;

-- 7.5 admin_reject_store_claim_request
create or replace function public.admin_reject_store_claim_request(
  p_request_id uuid,
  p_admin_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.store_claim_requests;
begin
  if not public.is_admin() then
    raise exception 'Yalnız admin rədd edə bilər.';
  end if;

  select * into v_request from public.store_claim_requests where id = p_request_id;
  if v_request.id is null then
    raise exception 'Müraciət tapılmadı.';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Müraciət artıq baxılıb (status: %).', v_request.status;
  end if;

  update public.store_claim_requests
  set status = 'rejected', admin_note = p_admin_note, reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_request_id;

  -- Başqa pending yoxdursa və mağaza claimed deyilsə → unclaimed
  if not exists (
    select 1 from public.store_claim_requests
    where store_id = v_request.store_id and status = 'pending'
  ) then
    perform set_config('marktx.store_rpc', 'on', true);
    update public.stores set status = 'unclaimed'
    where id = v_request.store_id and status <> 'claimed';
    perform set_config('marktx.store_rpc', '', true);
  end if;

  perform public.store_audit(v_request.store_id, 'claim_request_rejected',
    jsonb_build_object('request_id', p_request_id, 'admin_note', p_admin_note));
end;
$$;

-- 7.6 admin_revoke_store_owner
create or replace function public.admin_revoke_store_owner(
  p_store_id uuid,
  p_reason text default null,
  p_new_status text default 'unclaimed'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store public.stores;
begin
  if not public.is_admin() then
    raise exception 'Yalnız admin sahibliyi geri ala bilər.';
  end if;

  if p_new_status not in ('unclaimed', 'suspended') then
    raise exception 'Yeni status yalnız unclaimed və ya suspended ola bilər.';
  end if;

  select * into v_store from public.stores where id = p_store_id;
  if v_store.id is null then
    raise exception 'Mağaza tapılmadı.';
  end if;

  delete from public.store_members
  where store_id = p_store_id and role = 'owner';

  perform set_config('marktx.store_rpc', 'on', true);
  update public.stores set owner_id = null, status = p_new_status where id = p_store_id;
  perform set_config('marktx.store_rpc', '', true);

  perform public.store_audit(p_store_id, 'store_owner_revoked',
    jsonb_build_object('reason', p_reason, 'previous_owner', v_store.owner_id));

  if p_new_status = 'suspended' then
    perform public.store_audit(p_store_id, 'store_suspended', jsonb_build_object('reason', p_reason));
  end if;
end;
$$;

-- 7.7 cancel_my_store_claim_request
create or replace function public.cancel_my_store_claim_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_request public.store_claim_requests;
begin
  if v_uid is null then
    raise exception 'Daxil olmamısınız.';
  end if;

  select * into v_request from public.store_claim_requests where id = p_request_id;
  if v_request.id is null or v_request.requested_by <> v_uid then
    raise exception 'Müraciət tapılmadı.';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Yalnız gözləyən müraciət ləğv edilə bilər.';
  end if;

  update public.store_claim_requests
  set status = 'cancelled'
  where id = p_request_id;

  if not exists (
    select 1 from public.store_claim_requests
    where store_id = v_request.store_id and status = 'pending'
  ) then
    perform set_config('marktx.store_rpc', 'on', true);
    update public.stores set status = 'unclaimed'
    where id = v_request.store_id and status <> 'claimed';
    perform set_config('marktx.store_rpc', '', true);
  end if;
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════
-- 8) İcra icazələri
-- ══════════════════════════════════════════════════════════════════════════

revoke all on function public.admin_create_store(text, text, uuid, text, text, text, text, text) from public, anon;
revoke all on function public.admin_generate_store_claim_code(uuid, integer) from public, anon;
revoke all on function public.admin_approve_store_claim_request(uuid) from public, anon;
revoke all on function public.admin_reject_store_claim_request(uuid, text) from public, anon;
revoke all on function public.admin_revoke_store_owner(uuid, text, text) from public, anon;
revoke all on function public.submit_store_claim_request(text, text, text, text, text) from public, anon;
revoke all on function public.cancel_my_store_claim_request(uuid) from public, anon;

grant execute on function public.admin_create_store(text, text, uuid, text, text, text, text, text) to authenticated;
grant execute on function public.admin_generate_store_claim_code(uuid, integer) to authenticated;
grant execute on function public.admin_approve_store_claim_request(uuid) to authenticated;
grant execute on function public.admin_reject_store_claim_request(uuid, text) to authenticated;
grant execute on function public.admin_revoke_store_owner(uuid, text, text) to authenticated;
grant execute on function public.submit_store_claim_request(text, text, text, text, text) to authenticated;
grant execute on function public.cancel_my_store_claim_request(uuid) to authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- Rollback (əl ilə, lazım olsa):
--   drop view if exists public.public_store_profiles;
--   drop table if exists public.store_audit_logs cascade;
--   drop table if exists public.store_claim_requests cascade;
--   drop table if exists public.store_claim_codes cascade;
--   drop table if exists public.store_members cascade;
--   drop policy if exists "listings_update_store_member" on public.listings;
--   drop policy if exists "listings_delete_store_member" on public.listings;
--   alter table public.listings drop column if exists store_id;
--   drop table if exists public.stores cascade;
--   drop sequence if exists public.stores_store_code_seq;
--   drop function if exists public.admin_create_store(text, text, uuid, text, text, text, text, text);
--   drop function if exists public.admin_generate_store_claim_code(uuid, integer);
--   drop function if exists public.submit_store_claim_request(text, text, text, text, text);
--   drop function if exists public.admin_approve_store_claim_request(uuid);
--   drop function if exists public.admin_reject_store_claim_request(uuid, text);
--   drop function if exists public.admin_revoke_store_owner(uuid, text, text);
--   drop function if exists public.cancel_my_store_claim_request(uuid);
--   drop function if exists public.generate_store_slug(text, uuid);
--   drop function if exists public.generate_store_code();
--   drop function if exists public.store_audit(uuid, text, jsonb);
--   drop function if exists public.stores_set_slug();
--   drop function if exists public.stores_protect_sensitive();
-- QEYD: is_admin(), check_rate_limit(), set_updated_at() SİLİNMİR (paylaşılan).
