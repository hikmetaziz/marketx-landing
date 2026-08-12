-- Cleanup old AI draft safety debt.
--
-- Older AI image suggestions could create real pending listing rows with placeholder data.
-- We do not delete anything here. We only move rows that match the old placeholder
-- draft shape very tightly into a non-public, non-moderation "draft" status.

alter table public.listings disable trigger listings_before_update;

update public.listings
set
  status = 'draft',
  reviewed_at = null,
  reviewed_by = null,
  rejected_reason = 'Köhnə AI qaralaması draft statusuna keçirildi.',
  source = case when source = 'user' then 'old_ai_draft' else source end
where status = 'pending'
  and title = 'Qaralama'
  and price = 1
  and category = 'Digər'
  and city = 'Bakı'
  and description is null
  and image_url is null
  and image_urls is null;

alter table public.listings enable trigger listings_before_update;

comment on function public.create_listing_draft_for_ai() is
  'Disabled intentionally: AI suggestions must stay local in the form and must not create listing rows.';

create or replace function public.listings_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_review_sensitive_changed boolean;
begin
  if public.is_admin() then
    return new;
  end if;

  if auth.uid() is distinct from old.user_id then
    raise exception 'Not authorized';
  end if;

  new.user_id := old.user_id;

  if new.status is distinct from old.status then
    if old.status = 'active' and new.status = 'sold' then
      new.reviewed_at := old.reviewed_at;
      new.reviewed_by := old.reviewed_by;
      new.rejected_reason := old.rejected_reason;
      return new;
    end if;

    raise exception 'Status change not permitted';
  end if;

  -- TODO: When subcategory_id is added, include it in important fields that return active listings to pending.
  v_review_sensitive_changed :=
    old.status = 'active'
    and (
      new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.price is distinct from old.price
      or new.category is distinct from old.category
      or new.contact_phone is distinct from old.contact_phone
      or new.image_url is distinct from old.image_url
      or new.image_urls is distinct from old.image_urls
    );

  if v_review_sensitive_changed then
    new.status := 'pending';
    new.reviewed_at := null;
    new.reviewed_by := null;
    new.rejected_reason := null;
  else
    new.reviewed_at := old.reviewed_at;
    new.reviewed_by := old.reviewed_by;
    new.rejected_reason := old.rejected_reason;
  end if;

  return new;
end;
$$;
