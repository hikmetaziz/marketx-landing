create index if not exists messages_conversation_created_id_idx
on public.messages (
  conversation_id,
  created_at,
  id
);
