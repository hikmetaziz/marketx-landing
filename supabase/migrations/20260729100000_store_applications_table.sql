begin;

create table public.store_applications (
  id uuid primary key default gen_random_uuid(),

  conversation_id uuid not null unique
    references public.conversations(id)
    on delete cascade,

  applicant_user_id uuid not null,

  store_name text not null,
  category_name text,
  city text,
  description text,
  address text,
  working_days text,
  working_hours text,
  phone text,
  whatsapp text,
  email text,

  status text not null default 'submitted'
    check (
      status in (
        'submitted',
        'under_review',
        'activation_pending',
        'approved',
        'rejected',
        'cancelled',
        'needs_review'
      )
    ),

  reviewed_by uuid,
  reviewed_at timestamp with time zone,

  created_at timestamp with time zone
    not null default pg_catalog.now(),

  updated_at timestamp with time zone
    not null default pg_catalog.now()
);

create index store_applications_applicant_idx
  on public.store_applications (
    applicant_user_id,
    created_at desc
  );

create index store_applications_status_idx
  on public.store_applications (
    status,
    created_at desc
  );

alter table public.store_applications
  enable row level security;

revoke all
on table public.store_applications
from anon, authenticated;

grant select
on table public.store_applications
to authenticated;

create policy store_applications_select_own_or_support
on public.store_applications
for select
to authenticated
using (
  applicant_user_id = auth.uid()
  or public.marktx_is_support_admin()
);

commit;
