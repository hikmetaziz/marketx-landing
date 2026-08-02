-- Archive a store without deleting its messaging or audit history.

begin;

create function public.admin_archive_store(
  p_store_id uuid,
  p_reason text default null
)
returns table (
  archived_store_id uuid,
  archived_listings_count integer,
  removed_members_count integer,
  cancelled_claims_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_store public.stores%rowtype;
  v_archived_listings integer := 0;
  v_removed_members integer := 0;
  v_cancelled_claims integer := 0;
  v_reason text := nullif(left(btrim(coalesce(p_reason, '')), 500), '');
begin
  if v_actor is null or not coalesce(public.is_admin(), false) then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  select s.*
    into v_store
  from public.stores as s
  where s.id = p_store_id
  for update;

  if not found then
    raise exception 'store_not_found' using errcode = 'P0002';
  end if;

  if v_store.status = 'suspended'
    and v_store.owner_id is null
    and not exists (
      select 1
      from public.store_members as sm
      where sm.store_id = p_store_id
    )
    and not exists (
      select 1
      from public.listings as l
      where l.store_id = p_store_id
        and l.status::text <> 'deleted'
    )
    and not exists (
      select 1
      from public.store_claim_requests as scr
      where scr.store_id = p_store_id
        and scr.status = 'pending'
    )
  then
    archived_store_id := p_store_id;
    archived_listings_count := 0;
    removed_members_count := 0;
    cancelled_claims_count := 0;
    return next;
    return;
  end if;

  update public.listings as l
  set status = 'deleted',
      updated_at = now()
  where l.store_id = p_store_id
    and l.status::text <> 'deleted';

  get diagnostics v_archived_listings = row_count;

  delete from public.store_members as sm
  where sm.store_id = p_store_id;

  get diagnostics v_removed_members = row_count;

  update public.store_claim_requests as scr
  set status = 'cancelled',
      admin_note = coalesce(v_reason, 'Mağaza admin tərəfindən arxivləndi.'),
      reviewed_by = v_actor,
      reviewed_at = now(),
      updated_at = now()
  where scr.store_id = p_store_id
    and scr.status = 'pending';

  get diagnostics v_cancelled_claims = row_count;

  update public.store_claim_codes as scc
  set used_at = now()
  where scc.store_id = p_store_id
    and scc.used_at is null;

  perform pg_catalog.set_config('marktx.store_rpc', 'on', true);

  update public.stores as s
  set owner_id = null,
      status = 'suspended',
      updated_at = now()
  where s.id = p_store_id;

  perform pg_catalog.set_config('marktx.store_rpc', '', true);

  insert into public.store_audit_logs (store_id, actor_id, action, metadata)
  values (
    p_store_id,
    v_actor,
    'store_archived_admin',
    jsonb_build_object(
      'previous_status', v_store.status,
      'archived_listings_count', v_archived_listings,
      'removed_members_count', v_removed_members,
      'cancelled_claims_count', v_cancelled_claims,
      'reason', v_reason
    )
  );

  archived_store_id := p_store_id;
  archived_listings_count := v_archived_listings;
  removed_members_count := v_removed_members;
  cancelled_claims_count := v_cancelled_claims;
  return next;
end;
$$;

comment on function public.admin_archive_store(uuid, text) is
  'Admin-only atomic store archive. Preserves store, listing links, conversations, messages and audit history.';

-- Retire the legacy hard-delete entry point without dropping it.
revoke all on function public.admin_delete_store(uuid) from public, anon, authenticated;
revoke all on function public.admin_archive_store(uuid, text) from public, anon;
grant execute on function public.admin_archive_store(uuid, text) to authenticated;

notify pgrst, 'reload schema';

commit;
