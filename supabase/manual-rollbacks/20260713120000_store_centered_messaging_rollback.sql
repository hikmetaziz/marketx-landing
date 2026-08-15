-- MarktX Phase 2 store-centered messaging rollback.
-- Status: PREPARED ONLY. Review before use.
--
-- This rollback avoids deleting existing conversations or messages.
--
-- Before frontend usage:
--   It removes Phase 2 RPCs/policies/helper objects and restores the legacy
--   direct RLS shape. Added nullable columns are preserved to avoid data loss.
--
-- After store/support conversations exist:
--   Prefer a product-level disable/cutoff first. Do not drop Phase 2 columns or
--   tables unless their data has been exported or explicitly abandoned.

begin;

drop policy if exists "conversations_select_accessible_phase2" on public.conversations;
drop policy if exists "conversations_insert_rpc_only_phase2" on public.conversations;
drop policy if exists "messages_select_accessible_phase2" on public.messages;
drop policy if exists "messages_insert_rpc_only_phase2" on public.messages;
drop policy if exists "conversation_reads_select_own" on public.conversation_reads;
drop policy if exists "conversation_reads_write_own_accessible" on public.conversation_reads;
drop policy if exists "conversation_access_audit_support_read" on public.conversation_access_audit;
drop policy if exists "conversation_access_audit_support_insert" on public.conversation_access_audit;
drop policy if exists "conversation_blocks_store_admin" on public.conversation_blocks;
drop policy if exists "reports_insert_conversation" on public.reports;

create policy "conversations_select_participant"
  on public.conversations for select to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "conversations_insert_buyer"
  on public.conversations for insert to authenticated
  with check (
    auth.uid() = buyer_id
    and buyer_id <> seller_id
    and exists (
      select 1 from public.listings
      where listings.id = listing_id
        and listings.user_id = seller_id
        and listings.status = 'active'
    )
  );

create policy "messages_select_participant"
  on public.messages for select to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

create policy "messages_insert_participant"
  on public.messages for insert to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

drop trigger if exists marktx_messages_touch_conversation on public.messages;
do $$
begin
  if to_regprocedure('public.touch_conversation_on_message()') is not null then
    execute 'create trigger messages_touch_conversation after insert on public.messages for each row execute function public.touch_conversation_on_message()';
  end if;
end $$;

drop trigger if exists conversation_reads_set_updated_at on public.conversation_reads;

drop function if exists public.get_or_create_customer_store_conversation(uuid, uuid, text);
drop function if exists public.get_or_create_customer_support_conversation(text, text);
drop function if exists public.get_or_create_store_support_conversation(uuid, text, text);
drop function if exists public.send_conversation_message(uuid, text, text);
drop function if exists public.mark_conversation_read(uuid, uuid);
drop function if exists public.close_conversation(uuid);
drop function if exists public.report_conversation(uuid, uuid, text, text);
drop function if exists public.marktx_resolve_sender_context(public.conversations, text);
drop function if exists public.marktx_can_access_conversation(uuid);
drop function if exists public.marktx_is_support_admin();
drop function if exists public.marktx_store_member_has_role(uuid, uuid, text[]);
drop function if exists public.marktx_touch_conversation();
drop function if exists public.marktx_conversation_reads_set_updated_at();

-- Keep these tables for forensic compatibility if the migration had already
-- been used. Drop manually only after confirming they are empty and unwanted:
--   public.conversation_reads
--   public.conversation_access_audit
--   public.conversation_blocks

commit;
