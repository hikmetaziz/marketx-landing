select
  sa.id,
  sa.conversation_id,
  sa.applicant_user_id,
  sa.store_name,
  sa.category_name,
  sa.city,
  sa.status as application_status,
  c.status as conversation_status,
  sac.store_id,
  s.status as store_status,
  s.owner_id,
  sa.reviewed_by,
  sa.created_at
from public.store_applications as sa
join public.conversations as c
  on c.id = sa.conversation_id
left join public.store_application_creations as sac
  on sac.conversation_id = sa.conversation_id
left join public.stores as s
  on s.id = sac.store_id
order by sa.created_at desc;
