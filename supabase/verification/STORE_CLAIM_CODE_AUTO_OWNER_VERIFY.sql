    -- Verify store claim-code auto ownership RPC.
    -- Read-only/static verification: checks metadata, grants and required direct-claim semantics.

    with rpc as (
      select
        p.oid,
        p.prosecdef,
        p.proacl,
        p.proowner,
        pg_catalog.pg_get_functiondef(p.oid) as definition
      from pg_catalog.pg_proc as p
      join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'submit_store_claim_request'
        and pg_catalog.pg_get_function_identity_arguments(p.oid) =
          'p_store_code text, p_claim_code text, p_phone text, p_note text, p_evidence_url text'
    ),
    checks as (
      select 'rpc_exists' as check_name, exists (select 1 from rpc) as passed
      union all
      select 'rpc_is_security_definer', exists (select 1 from rpc where prosecdef)
      union all
      select 'rpc_search_path_empty', exists (
        select 1 from rpc where definition ilike '%SET search_path TO ''''%'
      )
      union all
      select 'rpc_uses_auth_uid_not_client_user_id', exists (
        select 1
        from rpc
        where definition ilike '%v_uid uuid := auth.uid()%'
          and definition not ilike '%p_user_id%'
          and definition not ilike '%p_requested_by%'
      )
      union all
      select 'rpc_denies_admin_and_moderator', exists (
        select 1 from rpc where definition ilike '%v_profile_role in (''admin'', ''moderator'')%'
      )
      union all
      select 'rpc_denies_active_store_members', exists (
        select 1
        from rpc
        where definition ilike '%from public.store_members as sm%'
          and definition ilike '%sm.user_id = v_uid%'
          and definition ilike '%sm.role in (''owner'', ''manager'', ''staff'')%'
      )
      union all
      select 'rpc_locks_store_row', exists (
        select 1
        from rpc
        where definition ilike '%from public.stores as s%'
          and definition ilike '%for update%'
      )
      union all
      select 'rpc_requires_unowned_store', exists (
        select 1
        from rpc
        where definition ilike '%v_store.status not in (''unclaimed'', ''claim_pending'')%'
          and definition ilike '%v_store.owner_id is not null%'
          and definition ilike '%sm.role = ''owner''%'
      )
      union all
      select 'rpc_validates_claim_code_hash', exists (
        select 1
        from rpc
        where definition ilike '%extensions.crypt%'
          and definition ilike '%v_code.claim_code_hash%'
      )
      union all
      select 'rpc_supports_existing_pending_same_user_store', exists (
        select 1
        from rpc
        where definition ilike '%v_existing_request%'
          and definition ilike '%scr.store_id = v_store.id%'
          and definition ilike '%scr.requested_by = v_uid%'
          and definition ilike '%scr.status = ''pending''%'
      )
      union all
      select 'rpc_creates_approved_request_not_pending', exists (
  select 1
  from rpc
  where definition ilike '%insert into public.store_claim_requests%'
    and definition ilike '%''approved''%'
    and regexp_replace(
          definition,
          E'\\s+',
          ' ',
          'g'
        ) !~* E'insert into public\\.store_claim_requests[^;]*values[^;]*''pending'''
    and regexp_replace(
          definition,
          E'\\s+',
          ' ',
          'g'
        ) !~* E'update public\\.stores[^;]*set[^;]*status\\s*=\\s*''claim_pending'''
)
      union all
      select 'rpc_marks_store_claimed', exists (
        select 1
        from rpc
        where definition ilike '%set owner_id = v_uid%'
          and definition ilike '%status = ''claimed''%'
          and definition ilike '%marktx.store_rpc%'
      )
      union all
      select 'rpc_inserts_owner_membership', exists (
        select 1
        from rpc
        where definition ilike '%insert into public.store_members%'
          and definition ilike '%values (v_store.id, v_uid, ''owner'')%'
          and definition ilike '%store_members_store_id_user_id_key%'
      )
      union all
      select 'rpc_rejects_other_pending_claims_for_store', exists (
        select 1
        from rpc
        where definition ilike '%Başqa sahiblik kodu ilə mağaza təsdiqləndi.%'
          and definition ilike '%scr.store_id = v_store.id%'
          and definition ilike '%scr.status = ''pending''%'
      )
      union all
      select 'rpc_audits_auto_approval', exists (
        select 1
        from rpc
        where definition ilike '%claim_code_auto_approved%'
          and definition ilike '%public.store_audit%'
      )
      union all
      select 'rpc_returns_dashboard_success_message', exists (
        select 1 from rpc where definition ilike '%Mağaza hesabınıza bağlandı.%'
      )
      union all
      select 'anon_cannot_execute_rpc', not pg_catalog.has_function_privilege(
        'anon',
        'public.submit_store_claim_request(text, text, text, text, text)',
        'execute'
      )
      union all
      select 'public_cannot_execute_rpc', not exists (
        select 1
        from rpc
        cross join pg_catalog.aclexplode(coalesce(rpc.proacl, pg_catalog.acldefault('f', rpc.proowner))) as acl
        where acl.grantee = 0
          and acl.privilege_type = 'EXECUTE'
      )
      union all
      select 'authenticated_can_execute_rpc', pg_catalog.has_function_privilege(
        'authenticated',
        'public.submit_store_claim_request(text, text, text, text, text)',
        'execute'
      )
    )
    select check_name, passed
    from checks
    order by check_name;

    do $$
    declare
      failures text;
    begin
      with rpc as (
        select
          p.oid,
          p.prosecdef,
          p.proacl,
          p.proowner,
          pg_catalog.pg_get_functiondef(p.oid) as definition
        from pg_catalog.pg_proc as p
        join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'submit_store_claim_request'
          and pg_catalog.pg_get_function_identity_arguments(p.oid) =
            'p_store_code text, p_claim_code text, p_phone text, p_note text, p_evidence_url text'
      ),
      checks as (
        select 'rpc_exists' as check_name, exists (select 1 from rpc) as passed
        union all
        select 'rpc_is_security_definer', exists (select 1 from rpc where prosecdef)
        union all
        select 'rpc_search_path_empty', exists (
          select 1 from rpc where definition ilike '%SET search_path TO ''''%'
        )
        union all
        select 'rpc_uses_auth_uid_not_client_user_id', exists (
          select 1
          from rpc
          where definition ilike '%v_uid uuid := auth.uid()%'
            and definition not ilike '%p_user_id%'
            and definition not ilike '%p_requested_by%'
        )
        union all
        select 'rpc_denies_admin_and_moderator', exists (
          select 1 from rpc where definition ilike '%v_profile_role in (''admin'', ''moderator'')%'
        )
        union all
        select 'rpc_denies_active_store_members', exists (
          select 1
          from rpc
          where definition ilike '%from public.store_members as sm%'
            and definition ilike '%sm.user_id = v_uid%'
            and definition ilike '%sm.role in (''owner'', ''manager'', ''staff'')%'
        )
        union all
        select 'rpc_locks_store_row', exists (
          select 1
          from rpc
          where definition ilike '%from public.stores as s%'
            and definition ilike '%for update%'
        )
        union all
        select 'rpc_requires_unowned_store', exists (
          select 1
          from rpc
          where definition ilike '%v_store.status not in (''unclaimed'', ''claim_pending'')%'
            and definition ilike '%v_store.owner_id is not null%'
            and definition ilike '%sm.role = ''owner''%'
        )
        union all
        select 'rpc_validates_claim_code_hash', exists (
          select 1
          from rpc
          where definition ilike '%extensions.crypt%'
            and definition ilike '%v_code.claim_code_hash%'
        )
        union all
        select 'rpc_supports_existing_pending_same_user_store', exists (
          select 1
          from rpc
          where definition ilike '%v_existing_request%'
            and definition ilike '%scr.store_id = v_store.id%'
            and definition ilike '%scr.requested_by = v_uid%'
            and definition ilike '%scr.status = ''pending''%'
        )
        union all
       select 'rpc_creates_approved_request_not_pending', exists (
  select 1
  from rpc
  where definition ilike '%insert into public.store_claim_requests%'
    and definition ilike '%''approved''%'
    and regexp_replace(
          definition,
          E'\\s+',
          ' ',
          'g'
        ) !~* E'insert into public\\.store_claim_requests[^;]*values[^;]*''pending'''
    and regexp_replace(
          definition,
          E'\\s+',
          ' ',
          'g'
        ) !~* E'update public\\.stores[^;]*set[^;]*status\\s*=\\s*''claim_pending'''
)
        union all
        select 'rpc_marks_store_claimed', exists (
          select 1
          from rpc
          where definition ilike '%set owner_id = v_uid%'
            and definition ilike '%status = ''claimed''%'
            and definition ilike '%marktx.store_rpc%'
        )
        union all
        select 'rpc_inserts_owner_membership', exists (
          select 1
          from rpc
          where definition ilike '%insert into public.store_members%'
            and definition ilike '%values (v_store.id, v_uid, ''owner'')%'
            and definition ilike '%store_members_store_id_user_id_key%'
        )
        union all
        select 'rpc_rejects_other_pending_claims_for_store', exists (
          select 1
          from rpc
          where definition ilike '%Başqa sahiblik kodu ilə mağaza təsdiqləndi.%'
            and definition ilike '%scr.store_id = v_store.id%'
            and definition ilike '%scr.status = ''pending''%'
        )
        union all
        select 'rpc_audits_auto_approval', exists (
          select 1
          from rpc
          where definition ilike '%claim_code_auto_approved%'
            and definition ilike '%public.store_audit%'
        )
        union all
        select 'rpc_returns_dashboard_success_message', exists (
          select 1 from rpc where definition ilike '%Mağaza hesabınıza bağlandı.%'
        )
        union all
        select 'anon_cannot_execute_rpc', not pg_catalog.has_function_privilege(
          'anon',
          'public.submit_store_claim_request(text, text, text, text, text)',
          'execute'
        )
        union all
        select 'public_cannot_execute_rpc', not exists (
          select 1
          from rpc
          cross join pg_catalog.aclexplode(coalesce(rpc.proacl, pg_catalog.acldefault('f', rpc.proowner))) as acl
          where acl.grantee = 0
            and acl.privilege_type = 'EXECUTE'
        )
        union all
        select 'authenticated_can_execute_rpc', pg_catalog.has_function_privilege(
          'authenticated',
          'public.submit_store_claim_request(text, text, text, text, text)',
          'execute'
        )
      )
      select pg_catalog.string_agg(check_name, ', ' order by check_name)
      into failures
      from checks
      where not passed;

      if failures is not null then
        raise exception 'store_claim_code_auto_owner_verification_failed: %', failures;
      end if;
    end $$;
