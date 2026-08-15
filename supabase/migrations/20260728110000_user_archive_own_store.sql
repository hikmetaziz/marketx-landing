-- Allow every authenticated store owner to archive their own store.
-- This is not a hard delete: store, listing rows, conversations, messages and audit history remain.

begin;

create or replace function public.delete_my_store(
  p_store_id uuid
)
returns void
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
begin
  if v_actor is null then
    raise exception 'Daxil olmamısınız.' using errcode = '42501';
  end if;

  select s.*
    into v_store
  from public.stores as s
  where s.id = p_store_id
  for update;

  if not found
    or v_store.status <> 'claimed'
    or not (
      v_store.owner_id = v_actor
      or exists (
        select 1
        from public.store_members as sm
        where sm.store_id = v_store.id
          and sm.user_id = v_actor
          and sm.role = 'owner'
      )
    )
  then
    raise exception 'Bu mağazanı silmək icazəniz yoxdur.' using errcode = '42501';
  end if;

  update public.listings as l
  set status = 'archived'::public.listing_status,
      updated_at = now()
  where l.store_id = p_store_id
    and l.status::text in ('active', 'sold');

  get diagnostics v_archived_listings = row_count;

  update public.store_claim_codes as scc
  set used_at = coalesce(scc.used_at, now())
  where scc.store_id = p_store_id
    and scc.used_at is null;

  update public.store_claim_requests as scr
  set status = 'cancelled',
      updated_at = now()
  where scr.store_id = p_store_id
    and scr.status = 'pending';

  get diagnostics v_cancelled_claims = row_count;

  delete from public.store_members as sm
  where sm.store_id = p_store_id;

  get diagnostics v_removed_members = row_count;

  perform pg_catalog.set_config('marktx.store_rpc', 'on', true);

  update public.stores as s
  set status = 'suspended',
      owner_id = null,
      updated_at = now()
  where s.id = p_store_id;

  perform pg_catalog.set_config('marktx.store_rpc', '', true);

  insert into public.store_audit_logs (store_id, actor_id, action, metadata)
  values (
    p_store_id,
    v_actor,
    'store_archived_owner',
    jsonb_build_object(
      'previous_status', v_store.status,
      'previous_owner_id', v_store.owner_id,
      'archived_listings_count', v_archived_listings,
      'removed_members_count', v_removed_members,
      'cancelled_claims_count', v_cancelled_claims
    )
  );
end;
$$;

comment on function public.delete_my_store(uuid) is
  'Authenticated owner-only store archive. Archives public store listings and preserves store row, listing links, conversations, messages and audit history.';

revoke all on function public.delete_my_store(uuid) from public, anon;
grant execute on function public.delete_my_store(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
