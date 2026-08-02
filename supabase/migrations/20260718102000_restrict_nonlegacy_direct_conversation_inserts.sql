-- Phase 5.1-B1: direct conversation insert security hotfix.
--
-- Preserve old legacy_user_user direct inserts used by older clients while
-- requiring customer_store, customer_support and store_support conversations to
-- be created through their approved SECURITY DEFINER RPCs.

begin;

drop policy if exists "conversations_insert_buyer" on public.conversations;
create policy "conversations_insert_buyer"
  on public.conversations for insert to authenticated
  with check (
    conversation_type = 'legacy_user_user'
    and listing_id is not null
    and buyer_id is not null
    and seller_id is not null
    and auth.uid() = buyer_id
    and buyer_id <> seller_id
    and customer_user_id is null
    and store_id is null
    and subject is null
    and support_topic is null
    and assigned_admin_id is null
    and status = 'open'
    and last_message_at is null
    and reported_at is null
    and resolved_at is null
    and closed_at is null
    and exists (
      select 1
      from public.listings
      where listings.id = conversations.listing_id
        and listings.user_id = conversations.seller_id
        and listings.status = 'active'
    )
  );

drop policy if exists "messages_insert_participant" on public.messages;
create policy "messages_insert_participant"
  on public.messages for insert to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and c.conversation_type = 'legacy_user_user'
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

comment on policy "conversations_insert_buyer" on public.conversations is
  'Compatibility-only legacy_user_user direct insert policy. Store/support conversations must use approved RPCs.';

comment on policy "messages_insert_participant" on public.messages is
  'Compatibility-only legacy_user_user direct message insert policy. Store/support messages must use approved RPCs.';

commit;
