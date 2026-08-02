-- MarktX: admin monitoring queries for deleted listing history.

-- Deleted listings kept as DB history. They are hidden from public frontend.
select
  l.id,
  l.title,
  l.deleted_at,
  l.purge_after,
  l.updated_at,
  (l.purge_after is not null) as has_legacy_purge_after
from public.listings l
where l.status = 'deleted'
order by
  l.deleted_at desc nulls last,
  l.updated_at desc nulls last;

-- Latest cleanup runs.
select
  id,
  started_at,
  completed_at,
  listings_found,
  listings_deleted,
  images_deleted,
  failures,
  status,
  error_details
from public.listing_cleanup_runs
order by started_at desc
limit 20;

-- Existing deleted listings that predate deleted_at metadata.
select
  id,
  title,
  created_at,
  updated_at,
  deleted_at,
  purge_after
from public.listings
where status = 'deleted'
  and (deleted_at is null or purge_after is null)
order by updated_at nulls last, created_at nulls last;
