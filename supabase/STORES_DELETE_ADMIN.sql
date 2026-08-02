-- MarktX: admin hard delete for stores.
-- Deletes the store, detaches linked listings, cascades store-owned claim/member rows,
-- and keeps a store_deleted audit row with store_id = null.

create or replace function public.admin_delete_store(p_store_id uuid)
returns table (deleted_store_id uuid, detached_listings_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store public.stores;
  v_detached_count integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Yalnız admin mağazanı silə bilər.';
  end if;

  select * into v_store
  from public.stores
  where id = p_store_id;

  if v_store.id is null then
    raise exception 'Mağaza tapılmadı.';
  end if;

  update public.listings
  set store_id = null
  where store_id = p_store_id;

  get diagnostics v_detached_count = row_count;

  delete from public.stores
  where id = p_store_id;

  insert into public.store_audit_logs (store_id, actor_id, action, metadata)
  values (
    null,
    auth.uid(),
    'store_deleted',
    jsonb_build_object(
      'store_id', v_store.id,
      'store_code', v_store.store_code,
      'name', v_store.name,
      'detached_listings_count', v_detached_count
    )
  );

  deleted_store_id := v_store.id;
  detached_listings_count := v_detached_count;
  return next;
end;
$$;

revoke all on function public.admin_delete_store(uuid) from public, anon;
grant execute on function public.admin_delete_store(uuid) to authenticated;

notify pgrst, 'reload schema';
