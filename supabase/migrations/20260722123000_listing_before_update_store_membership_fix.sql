-- MarktX listings_before_update trigger alignment to exact store_members authorization.
-- Preserves personal-listing creator access; staff edit allowed; staff archive denied.

begin;

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
  if public.is_admin() then
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

comment on function public.listings_before_update() is
  'Enforces listing edit/archive authorization via store_members or personal creator ownership.';

commit;
