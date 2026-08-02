select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0',
    'user_role', 'admin',
    'role', 'authenticated'
  )::text,
  true
);

with image_updates(sku, image_url, image_kind) as (
  values
    (
      'MO3600MPECO',
      'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/53fdf0b8-8fcd-4429-9ee1-e3320b46b67f.png',
      'ai_generated_cross_ro'
    ),
    (
      'MO3600PECO',
      'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/7dc3d262-aa91-4aa0-8d96-6388988589be.png',
      'ai_generated_cross_ro'
    ),
    (
      'FU1018CABCE',
      'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/7ba3a83a-e020-4d6f-a31c-9639685d2aa4.png',
      'ai_generated_cabinet_softener'
    ),
    (
      'NatureWater Premium SF-P2',
      'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/a0597383-50d5-44de-bf46-de5941703f2d.png',
      'ai_generated_cabinet_softener'
    ),
    (
      'NatureWater Soft-XB2',
      'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/6b1bfccb-1a87-4231-864b-5f2f8dacb6ca.png',
      'ai_generated_cabinet_softener'
    ),
    (
      'FPV12ECO',
      'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/9714d461-585f-4dd7-9fd6-97fe4a24063b.png',
      'ai_generated_sediment_filter'
    ),
    (
      'FPV34ECO',
      'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/19642097-3acb-42a2-afdc-170f7123359c.png',
      'ai_generated_sediment_filter'
    ),
    (
      'FPV12HWECO',
      'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/ecdc0627-7171-4ebd-b6fb-801bb233bf31.png',
      'ai_generated_hot_sediment_filter'
    )
),
updated as (
  update public.listings l
  set
    image_url = u.image_url,
    image_urls = array[u.image_url],
    attributes = coalesce(l.attributes, '{}'::jsonb)
      || jsonb_build_object(
        'image_source', 'ai_generated',
        'image_kind', u.image_kind,
        'image_replaced_at', now()
      ),
    updated_at = now()
  from image_updates u
  where l.source = 'ecosoft_price_list'
    and l.attributes ->> 'sku' = u.sku
    and l.status = 'pending'
  returning
    l.id,
    l.attributes ->> 'sku' as sku,
    l.title,
    l.status,
    l.image_url,
    l.attributes ->> 'image_source' as image_source
)
select jsonb_pretty(
  jsonb_build_object(
    'updated', (select count(*) from updated),
    'rows', coalesce((select jsonb_agg(to_jsonb(updated) order by sku) from updated), '[]'::jsonb)
  )
) as result;
