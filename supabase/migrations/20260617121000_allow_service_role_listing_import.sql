create or replace function public.listings_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(auth.role(), current_setting('request.jwt.claim.role', true));
begin
  if v_role = 'service_role' then
    new.status := coalesce(new.status, 'pending');
    new.reviewed_at := null;
    new.reviewed_by := null;
    new.rejected_reason := null;
    return new;
  end if;

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if new.user_id is distinct from auth.uid() and not public.is_admin() then
    raise exception 'user_id must match authenticated user';
  end if;

  if not public.is_admin() then
    new.status := 'pending';
    new.reviewed_at := null;
    new.reviewed_by := null;
    new.rejected_reason := null;
  end if;

  return new;
end;
$$;
