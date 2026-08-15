-- Listing workflow safety:
-- 1) AI suggestions must not create pending listing rows.
-- 2) Owner edits to approved listings are re-sent to moderation when important fields change.

create or replace function public.create_listing_draft_for_ai()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'AI təklifi artıq qaralama elan yaratmır. Məlumatlar yalnız formada saxlanılır.'
    using errcode = 'P0001';
end;
$$;

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
