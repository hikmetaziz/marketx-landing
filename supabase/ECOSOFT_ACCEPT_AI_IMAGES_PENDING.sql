select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0',
    'user_role', 'admin',
    'role', 'authenticated'
  )::text,
  true
);

with accepted(listing_id, sku) as (
  values
    ('7dc3d262-aa91-4aa0-8d96-6388988589be'::uuid, 'MO3600PECO'),
    ('53fdf0b8-8fcd-4429-9ee1-e3320b46b67f'::uuid, 'MO3600MPECO'),
    ('7ba3a83a-e020-4d6f-a31c-9639685d2aa4'::uuid, 'FU1018CABCE'),
    ('9714d461-585f-4dd7-9fd6-97fe4a24063b'::uuid, 'FPV12ECO'),
    ('19642097-3acb-42a2-afdc-170f7123359c'::uuid, 'FPV34ECO'),
    ('ecdc0627-7171-4ebd-b6fb-801bb233bf31'::uuid, 'FPV12HWECO'),
    ('a0597383-50d5-44de-bf46-de5941703f2d'::uuid, 'NatureWater Premium SF-P2'),
    ('6b1bfccb-1a87-4231-864b-5f2f8dacb6ca'::uuid, 'NatureWater Soft-XB2')
),
updated as (
  update public.listings l
  set
    status = 'pending',
    rejected_reason = null,
    reviewed_by = null,
    reviewed_at = null,
    attributes = coalesce(l.attributes, '{}'::jsonb)
      || jsonb_build_object(
        'image_source', 'ai_generated_accepted',
        'image_repaired_at', now(),
        'image_repair_note', 'Operator accepted AI-generated catalog image for moderation.'
      ),
    updated_at = now()
  from accepted a
  where l.id = a.listing_id
    and l.source = 'ecosoft_price_list'
    and l.status = 'rejected'
    and l.attributes ->> 'sku' = a.sku
  returning
    l.id,
    l.attributes ->> 'sku' as sku,
    l.title,
    l.status,
    l.image_url,
    l.rejected_reason,
    l.attributes ->> 'image_source' as image_source
)
select jsonb_pretty(
  jsonb_build_object(
    'updated', (select count(*) from updated),
    'rows', coalesce((select jsonb_agg(to_jsonb(updated) order by sku) from updated), '[]'::jsonb)
  )
) as result;
