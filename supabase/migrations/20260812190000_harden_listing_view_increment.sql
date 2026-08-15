-- MarktX: allow public view-count increments only through the constrained RPC.

create or replace function public.listings_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_store_role text;
  v_is_personal_owner boolean := false;
  v_can_edit boolean := false;
  v_can_archive boolean := false;
begin
  if coalesce(current_setting('marktx.listing_view_increment', true), '') = 'on' then
    if new.view_count = coalesce(old.view_count, 0) + 1
      and (to_jsonb(new) - 'view_count') = (to_jsonb(old) - 'view_count')
    then
      return new;
    end if;

    raise exception 'Invalid listing view increment';
  end if;

  if public.is_admin() then
    new.view_count := old.view_count;
    return new;
  end if;

  if v_actor is null then
    raise exception 'Not authorized';
  end if;

  v_is_personal_owner := old.store_id is null and v_actor = old.user_id;

  if old.store_id is not null then
    select sm.role
      into v_store_role
    from public.store_members as sm
    where sm.store_id = old.store_id
      and sm.user_id = v_actor
      and sm.role in ('owner', 'manager', 'staff')
    limit 1;
  end if;

  v_can_edit := v_is_personal_owner or v_store_role in ('owner', 'manager', 'staff');
  v_can_archive := v_is_personal_owner or v_store_role in ('owner', 'manager');

  if not v_can_edit then
    raise exception 'Not authorized';
  end if;

  new.user_id := old.user_id;
  new.view_count := old.view_count;

  if old.store_id is not null then
    new.store_id := old.store_id;
  end if;

  if new.status is distinct from old.status then
    if old.status::text = 'active' and new.status::text = 'sold' and v_can_archive then
      null;
    elsif old.status::text in ('active', 'sold') and new.status::text = 'archived' and v_can_archive then
      null;
    elsif old.status::text in ('draft', 'pending', 'active', 'sold', 'rejected', 'archived')
      and new.status::text = 'deleted'
      and v_can_archive then
      null;
    elsif old.status::text = 'deleted' and new.status::text = 'pending' and v_can_archive then
      null;
    else
      raise exception 'Status change not permitted';
    end if;
  end if;

  new.reviewed_at := old.reviewed_at;
  new.reviewed_by := old.reviewed_by;
  new.rejected_reason := old.rejected_reason;

  return new;
end;
$$;

create or replace function public.increment_listing_view(
  p_listing_id uuid,
  p_client_key text default 'unknown'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
  v_key text := coalesce(nullif(btrim(p_client_key), ''), 'unknown');
  v_resource text := p_listing_id::text;
begin
  select coalesce(l.view_count, 0) into new_count
  from public.listings as l
  where l.id = p_listing_id
    and l.status in ('active', 'sold');

  if new_count is null then
    return 0;
  end if;

  if not public.check_rate_limit('increment_view', v_key, v_resource, 10, interval '1 hour') then
    return new_count;
  end if;

  perform set_config('marktx.listing_view_increment', 'on', true);

  begin
    update public.listings as l
    set view_count = coalesce(l.view_count, 0) + 1
    where l.id = p_listing_id
      and l.status in ('active', 'sold')
    returning l.view_count into new_count;
  exception
    when others then
      perform set_config('marktx.listing_view_increment', 'off', true);
      raise;
  end;

  perform set_config('marktx.listing_view_increment', 'off', true);

  if found then
    perform public.record_rate_limit_event('increment_view', v_key, v_resource);
  end if;

  return coalesce(new_count, 0);
end;
$$;

comment on function public.increment_listing_view(uuid, text) is
  'Increments view_count for public listings. Rate-limited per client key + listing (10/hour).';

create or replace function public.increment_listing_view(p_listing_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  perform set_config('marktx.listing_view_increment', 'on', true);

  begin
    update public.listings
    set view_count = coalesce(view_count, 0) + 1
    where id = p_listing_id
      and status in ('active', 'sold')
    returning view_count into new_count;
  exception
    when others then
      perform set_config('marktx.listing_view_increment', 'off', true);
      raise;
  end;

  perform set_config('marktx.listing_view_increment', 'off', true);

  return coalesce(new_count, 0);
end;
$$;

grant execute on function public.listings_before_update() to public;
grant execute on function public.listings_before_update() to anon, authenticated, service_role;
grant execute on function public.increment_listing_view(uuid, text) to public;
grant execute on function public.increment_listing_view(uuid, text) to anon, authenticated, service_role;
grant execute on function public.increment_listing_view(uuid) to public;
grant execute on function public.increment_listing_view(uuid) to anon, authenticated, service_role;
