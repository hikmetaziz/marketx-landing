begin;

create or replace function public.get_conversation_viewer_roles(
  p_conversation_ids uuid[]
)
returns table (
  conversation_id uuid,
  viewer_role text
)
language sql
stable
security definer
set search_path = ''
as $$
  with requested as (
    select distinct input.conversation_id
    from unnest(coalesce(p_conversation_ids, array[]::uuid[])) as input(conversation_id)
    where input.conversation_id is not null
  ),
  accessible as (
    select conversation.*
    from requested
    join public.conversations as conversation
      on conversation.id = requested.conversation_id
    where auth.uid() is not null
      and public.marktx_can_access_conversation(conversation.id)
  ),
  resolved as (
    select
      conversation.id as conversation_id,
      case
        when conversation.conversation_type in ('customer_store', 'customer_support')
          and conversation.customer_user_id = auth.uid()
          then 'customer'
        when conversation.conversation_type in ('customer_store', 'store_support')
          and public.marktx_store_member_has_role(
            conversation.store_id,
            auth.uid(),
            array['owner', 'manager', 'staff']
          )
          then 'store'
        when conversation.conversation_type in ('customer_support', 'store_support')
          and public.marktx_is_support_admin()
          then 'support'
        else null
      end as viewer_role
    from accessible as conversation
  )
  select
    resolved.conversation_id,
    resolved.viewer_role
  from resolved
  where resolved.viewer_role is not null;
$$;

revoke all
on function public.get_conversation_viewer_roles(uuid[])
from public, anon;

grant execute
on function public.get_conversation_viewer_roles(uuid[])
to authenticated;

comment on function public.get_conversation_viewer_roles(uuid[]) is
  'Returns auth.uid()-derived messaging viewer roles for accessible conversations only. Used for UI shaping; mutation RPCs and RLS remain authoritative.';

commit;
