-- Persist structured store application hours for public store schedules.

begin;

alter table public.stores
  add column if not exists working_days text,
  add column if not exists opening_time time,
  add column if not exists closing_time time;

create or replace function public.sync_store_schedule_from_application()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.stores as s
  set
    working_days = coalesce(s.working_days, sa.working_days),
    opening_time = coalesce(s.opening_time, sa.opening_time),
    closing_time = coalesce(s.closing_time, sa.closing_time)
  from public.store_applications as sa
  where s.id = new.store_id
    and sa.conversation_id = new.conversation_id;

  return new;
end;
$$;

revoke all on function public.sync_store_schedule_from_application()
from public, anon, authenticated;

drop trigger if exists store_application_creation_sync_schedule
on public.store_application_creations;

create trigger store_application_creation_sync_schedule
after insert or update of conversation_id, store_id
on public.store_application_creations
for each row
execute function public.sync_store_schedule_from_application();

update public.stores as s
set
  working_days = coalesce(s.working_days, sa.working_days),
  opening_time = coalesce(s.opening_time, sa.opening_time),
  closing_time = coalesce(s.closing_time, sa.closing_time)
from public.store_application_creations as sac
join public.store_applications as sa
  on sa.conversation_id = sac.conversation_id
where s.id = sac.store_id
  and (
    (s.working_days is null and sa.working_days is not null)
    or (s.opening_time is null and sa.opening_time is not null)
    or (s.closing_time is null and sa.closing_time is not null)
  );

create or replace function public.get_public_store_schedule(
  p_store_id uuid
)
returns table (
  working_days text,
  opening_time time,
  closing_time time
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    s.working_days,
    s.opening_time,
    s.closing_time
  from public.stores as s
  where s.id = p_store_id
    and s.status = 'claimed'
    and s.working_days is not null
    and s.opening_time is not null
    and s.closing_time is not null
  limit 1;
$$;

revoke all on function public.get_public_store_schedule(uuid)
from public, anon, authenticated;

grant execute on function public.get_public_store_schedule(uuid)
to anon, authenticated;

commit;
