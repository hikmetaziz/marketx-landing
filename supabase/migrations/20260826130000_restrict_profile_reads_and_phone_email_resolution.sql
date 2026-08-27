begin;

-- Full profiles contain private email and phone fields. Public seller data must
-- continue to flow through the dedicated public summary contracts.
drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_select_own_or_admin" on public.profiles;

create policy "profiles_select_own_or_admin"
  on public.profiles
  for select
  to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
  );

-- This legacy helper returns auth.users.email for a caller-supplied phone
-- Existing mobile clients retain temporary resolver access during the secure phone-login rollout.


-- Secure phone-login backend may resolve the email, but clients may not.
grant execute
on function public.resolve_auth_email_for_phone(text)
to service_role;

-- Server-side login rate limiting.
-- Only opaque HMAC hashes are stored; never raw phone numbers or IP addresses.
create table if not exists public.auth_login_rate_limits (
  key_hash text primary key,
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 1,
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.auth_login_rate_limits enable row level security;

revoke all on table public.auth_login_rate_limits from public;
revoke all on table public.auth_login_rate_limits from anon;
revoke all on table public.auth_login_rate_limits from authenticated;

grant select, insert, update, delete
on table public.auth_login_rate_limits
to service_role;

create or replace function public.consume_auth_login_rate_limit(
  p_key_hash text,
  p_max_attempts integer,
  p_window_seconds integer,
  p_block_seconds integer
)
returns table (
  allowed boolean,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_row public.auth_login_rate_limits%rowtype;
begin
  if p_key_hash is null
     or length(p_key_hash) < 32
     or p_max_attempts < 1
     or p_window_seconds < 1
     or p_block_seconds < 1 then
    raise exception 'Invalid rate-limit parameters';
  end if;

  insert into public.auth_login_rate_limits (
    key_hash,
    window_started_at,
    attempt_count,
    blocked_until,
    updated_at
  )
  values (
    p_key_hash,
    v_now,
    1,
    null,
    v_now
  )
  on conflict (key_hash) do update
  set
    attempt_count = case
      when auth_login_rate_limits.blocked_until > v_now
        then auth_login_rate_limits.attempt_count
      when auth_login_rate_limits.blocked_until is not null
        then 1
      when auth_login_rate_limits.window_started_at
           + make_interval(secs => p_window_seconds) <= v_now
        then 1
      else auth_login_rate_limits.attempt_count + 1
    end,

    window_started_at = case
      when auth_login_rate_limits.blocked_until is not null
           and auth_login_rate_limits.blocked_until <= v_now
        then v_now
      when auth_login_rate_limits.window_started_at
           + make_interval(secs => p_window_seconds) <= v_now
        then v_now
      else auth_login_rate_limits.window_started_at
    end,

    blocked_until = case
      when auth_login_rate_limits.blocked_until > v_now
        then auth_login_rate_limits.blocked_until
      when auth_login_rate_limits.blocked_until is not null
        then null
      when auth_login_rate_limits.window_started_at
           + make_interval(secs => p_window_seconds) <= v_now
        then null
      when auth_login_rate_limits.attempt_count + 1 > p_max_attempts
        then v_now + make_interval(secs => p_block_seconds)
      else null
    end,

    updated_at = v_now
  returning *
  into v_row;

  return query
  select
    not (
      v_row.blocked_until is not null
      and v_row.blocked_until > v_now
    ),
    case
      when v_row.blocked_until is not null
           and v_row.blocked_until > v_now
        then greatest(
          1,
          ceil(extract(epoch from (v_row.blocked_until - v_now)))::integer
        )
      else 0
    end;
end;
$$;

revoke all
on function public.consume_auth_login_rate_limit(text, integer, integer, integer)
from public;

revoke all
on function public.consume_auth_login_rate_limit(text, integer, integer, integer)
from anon;

revoke all
on function public.consume_auth_login_rate_limit(text, integer, integer, integer)
from authenticated;

grant execute
on function public.consume_auth_login_rate_limit(text, integer, integer, integer)
to service_role;
commit;
