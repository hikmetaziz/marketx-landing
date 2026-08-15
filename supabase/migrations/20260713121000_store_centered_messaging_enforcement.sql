-- MarktX Phase 2C: store-centered messaging enforcement.
-- Status: PREPARED ONLY. Apply only after web and mobile clients use RPCs.
--
-- This migration intentionally blocks direct legacy conversation/message
-- creation while preserving read access to old legacy history.

begin;

drop policy if exists "conversations_insert_buyer" on public.conversations;
drop policy if exists "conversations_insert_rpc_only_phase2" on public.conversations;
create policy "conversations_insert_rpc_only_phase2"
  on public.conversations for insert to authenticated
  with check (false);

drop policy if exists "messages_insert_participant" on public.messages;
drop policy if exists "messages_insert_rpc_only_phase2" on public.messages;
create policy "messages_insert_rpc_only_phase2"
  on public.messages for insert to authenticated
  with check (false);

-- Keep legacy read policies if they exist. Phase 2A select policy also remains.
-- New writes must go through secure RPCs.

commit;
