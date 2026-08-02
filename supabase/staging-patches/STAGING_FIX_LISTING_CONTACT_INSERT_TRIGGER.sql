-- Staging fix for listing contact capture.
-- The original before insert trigger writes listing_contacts before the listing
-- row exists, which violates the FK for mobile-style inserts with contact_phone.

drop trigger if exists listings_strip_contact_phone on public.listings;

create or replace function public.listings_capture_contact_phone_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.contact_phone is not null and btrim(new.contact_phone) <> '' then
    insert into public.listing_contacts (listing_id, contact_phone)
    values (new.id, new.contact_phone)
    on conflict (listing_id) do update
      set contact_phone = excluded.contact_phone,
          updated_at = now();

    update public.listings
    set contact_phone = null
    where id = new.id
      and contact_phone is not null;
  end if;

  return new;
end;
$$;

create or replace function public.listings_capture_contact_phone_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.contact_phone is not null and btrim(new.contact_phone) <> '' then
    insert into public.listing_contacts (listing_id, contact_phone)
    values (new.id, new.contact_phone)
    on conflict (listing_id) do update
      set contact_phone = excluded.contact_phone,
          updated_at = now();

    new.contact_phone := null;
  end if;

  return new;
end;
$$;

drop trigger if exists listings_capture_contact_phone_after_insert on public.listings;
create trigger listings_capture_contact_phone_after_insert
  after insert on public.listings
  for each row
  execute function public.listings_capture_contact_phone_after_insert();

drop trigger if exists listings_capture_contact_phone_before_update on public.listings;
create trigger listings_capture_contact_phone_before_update
  before update of contact_phone on public.listings
  for each row
  execute function public.listings_capture_contact_phone_before_update();
