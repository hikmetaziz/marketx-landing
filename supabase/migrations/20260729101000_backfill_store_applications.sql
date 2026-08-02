begin;

with application_source as (
  select
    c.id as conversation_id,
    c.customer_user_id as applicant_user_id,
    c.status as conversation_status,
    c.created_at as application_created_at,
    c.updated_at as conversation_updated_at,

    replace(first_message.body, E'\r\n', E'\n') as body,

    creation.store_id,
    creation.created_by,
    creation.created_at as store_created_at,

    s.status as store_status,
    s.owner_id as store_owner_id
  from public.conversations as c

  join lateral (
    select m.body
    from public.messages as m
    where m.conversation_id = c.id
    order by m.created_at asc, m.id asc
    limit 1
  ) as first_message
    on true

  left join lateral (
    select
      sac.store_id,
      sac.created_by,
      sac.created_at
    from public.store_application_creations as sac
    where sac.conversation_id = c.id
    order by sac.created_at desc
    limit 1
  ) as creation
    on true

  left join public.stores as s
    on s.id = creation.store_id

  where c.conversation_type = 'customer_support'
    and coalesce(c.subject, '') like 'Yeni mağaza müraciəti%'
    and c.customer_user_id is not null
)

insert into public.store_applications (
  conversation_id,
  applicant_user_id,

  store_name,
  category_name,
  city,
  description,
  address,
  working_days,
  working_hours,
  phone,
  whatsapp,
  email,

  status,
  reviewed_by,
  reviewed_at,
  created_at,
  updated_at
)
select
  conversation_id,
  applicant_user_id,

  coalesce(
    nullif(
      nullif(
        btrim(
          substring(
            body from '(?m)^Mağaza adı:[ \t]*([^\\r\\n]*)'
          )
        ),
        ''
      ),
      'Qeyd edilməyib'
    ),
    'Adsız mağaza'
  ) as store_name,

  nullif(
    nullif(
      btrim(
        substring(
          body from '(?m)^Kateqoriya:[ \t]*([^\\r\\n]*)'
        )
      ),
      ''
    ),
    'Qeyd edilməyib'
  ) as category_name,

  nullif(
    nullif(
      btrim(
        substring(
          body from '(?m)^Şəhər:[ \t]*([^\\r\\n]*)'
        )
      ),
      ''
    ),
    'Qeyd edilməyib'
  ) as city,

  nullif(
    nullif(
      btrim(
        substring(
          body from '(?m)^Təsvir:[ \t]*([^\\r\\n]*)'
        )
      ),
      ''
    ),
    'Qeyd edilməyib'
  ) as description,

  nullif(
    nullif(
      btrim(
        substring(
          body from '(?m)^Ünvan:[ \t]*([^\\r\\n]*)'
        )
      ),
      ''
    ),
    'Qeyd edilməyib'
  ) as address,

  nullif(
    nullif(
      btrim(
        substring(
          body from '(?m)^İş günləri:[ \t]*([^\\r\\n]*)'
        )
      ),
      ''
    ),
    'Qeyd edilməyib'
  ) as working_days,

  nullif(
    nullif(
      btrim(
        substring(
          body from '(?m)^İş saatları:[ \t]*([^\\r\\n]*)'
        )
      ),
      ''
    ),
    'Qeyd edilməyib'
  ) as working_hours,

  nullif(
    nullif(
      btrim(
        substring(
          body from '(?m)^Telefon:[ \t]*([^\\r\\n]*)'
        )
      ),
      ''
    ),
    'Qeyd edilməyib'
  ) as phone,

  nullif(
    nullif(
      btrim(
        substring(
          body from '(?m)^WhatsApp:[ \t]*([^\\r\\n]*)'
        )
      ),
      ''
    ),
    'Qeyd edilməyib'
  ) as whatsapp,

  nullif(
    nullif(
      btrim(
        substring(
          body from '(?m)^E-poçt:[ \t]*([^\\r\\n]*)'
        )
      ),
      ''
    ),
    'Qeyd edilməyib'
  ) as email,

  case
    when store_status = 'claimed'
      and store_owner_id = applicant_user_id
      then 'approved'

    when store_status = 'unclaimed'
      then 'activation_pending'

    when store_id is null
      and conversation_status in (
        'open',
        'waiting_support'
      )
      then 'submitted'

    else 'needs_review'
  end as status,

  created_by as reviewed_by,
  store_created_at as reviewed_at,

  application_created_at as created_at,

  coalesce(
    store_created_at,
    conversation_updated_at,
    application_created_at
  ) as updated_at

from application_source

on conflict (conversation_id)
do nothing;

select
  status,
  count(*) as application_count
from public.store_applications
group by status
order by status;

commit;
