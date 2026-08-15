select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0',
    'user_role', 'admin',
    'role', 'authenticated'
  )::text,
  true
);

with rejected as (
  update public.listings
  set
    status = 'rejected',
    rejected_reason = 'Şəkil keyfiyyəti uyğun deyil. Real və daha keyfiyyətli məhsul şəkli lazımdır.',
    reviewed_by = 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0',
    reviewed_at = now(),
    updated_at = now()
  where source = 'ecosoft_price_list'
    and status = 'pending'
    and attributes ->> 'image_source' = 'ai_generated'
  returning
    id,
    attributes ->> 'sku' as sku,
    title,
    status,
    rejected_reason
)
select jsonb_pretty(
  jsonb_build_object(
    'rejected', (select count(*) from rejected),
    'rows', coalesce((select jsonb_agg(to_jsonb(rejected) order by sku) from rejected), '[]'::jsonb)
  )
) as result;
