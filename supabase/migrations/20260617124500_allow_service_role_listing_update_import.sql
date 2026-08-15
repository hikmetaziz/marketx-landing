create or replace function public.listings_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(auth.role(), current_setting('request.jwt.claim.role', true));
  v_review_sensitive_changed boolean;
begin
  if v_role = 'service_role' then
    if old.user_id is null then
      raise exception 'listing owner is required for service role listing update';
    end if;

    new.user_id := old.user_id;
    new.status := old.status;
    new.reviewed_at := old.reviewed_at;
    new.reviewed_by := old.reviewed_by;
    new.rejected_reason := old.rejected_reason;
    return new;
  end if;

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
      or new.category_id is distinct from old.category_id
      or new.subcategory_id is distinct from old.subcategory_id
      or new.attributes is distinct from old.attributes
      or new.listing_type is distinct from old.listing_type
      or new.price_type is distinct from old.price_type
      or new.delivery_type is distinct from old.delivery_type
      or new.condition_code is distinct from old.condition_code
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
