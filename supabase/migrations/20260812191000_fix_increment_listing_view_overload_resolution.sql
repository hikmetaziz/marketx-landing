-- MarktX: keep the legacy single-argument RPC callable through PostgREST.

drop function if exists public.increment_listing_view(uuid, text);

create or replace function public.increment_listing_view(
  p_listing_id uuid,
  p_client_key text
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

grant execute on function public.increment_listing_view(uuid, text) to public;
grant execute on function public.increment_listing_view(uuid, text) to anon, authenticated, service_role;
