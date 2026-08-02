-- MarktX: Ecosoft image-repair ROLLBACK / snapshot restore.
-- Restores the exact snapshot captured in exports/ecosoft-image-repair/backup-manifest.json.
-- Run this in the Supabase SQL editor ONLY if a future image-repair change must be reverted.
-- Non-destructive: updates image fields / status / rejected_reason back to the snapshot.
-- No rows are deleted.

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'ed40be7b-8b35-4a36-8c84-78c6d3f487a0',
    'user_role', 'admin',
    'role', 'authenticated'
  )::text,
  true
);

-- 1) Restore the 22 PENDING listings (real low-res local images, no rejection).
with snapshot(id, image_url) as (
  values
    ('dc81abb0-e0a8-4f35-a821-a8e0f6e1dd59'::uuid, '/images/imports/ecosoft-first30/dc81abb0-e0a8-4f35-a821-a8e0f6e1dd59.png'),
    ('8ccf0bf4-3188-4ce2-b732-087de9837d2a'::uuid, '/images/imports/ecosoft-first30/8ccf0bf4-3188-4ce2-b732-087de9837d2a.jpeg'),
    ('0666b021-0674-4dd6-a8eb-f8d3b5581286'::uuid, '/images/imports/ecosoft-first30/0666b021-0674-4dd6-a8eb-f8d3b5581286.jpeg'),
    ('1105368d-5343-473a-9e82-b68d2123cab4'::uuid, '/images/imports/ecosoft-first30/1105368d-5343-473a-9e82-b68d2123cab4.jpeg'),
    ('023099b3-4573-4586-b74f-0a8114df10c9'::uuid, '/images/imports/ecosoft-first30/023099b3-4573-4586-b74f-0a8114df10c9.jpeg'),
    ('36eeb433-b733-4947-89b1-30f268471244'::uuid, '/images/imports/ecosoft-first30/36eeb433-b733-4947-89b1-30f268471244.jpeg'),
    ('cf008e35-9be1-48b2-b27e-798635f02ba8'::uuid, '/images/imports/ecosoft-first30/cf008e35-9be1-48b2-b27e-798635f02ba8.jpeg'),
    ('9684c175-d42e-4724-b92a-105e6d462d5c'::uuid, '/images/imports/ecosoft-first30/9684c175-d42e-4724-b92a-105e6d462d5c.jpeg'),
    ('ffc9eb2f-4e8d-44f3-b59a-3a3095d73b27'::uuid, '/images/imports/ecosoft-first30/ffc9eb2f-4e8d-44f3-b59a-3a3095d73b27.jpeg'),
    ('4534b8d4-6cc0-4d66-91c9-d2fb411b895b'::uuid, '/images/imports/ecosoft-first30/4534b8d4-6cc0-4d66-91c9-d2fb411b895b.jpeg'),
    ('3874cc69-fdac-4561-ad46-c62edbc26665'::uuid, '/images/imports/ecosoft-first30/3874cc69-fdac-4561-ad46-c62edbc26665.jpeg'),
    ('b29d401d-3dff-4114-aa88-c5bd792cffb9'::uuid, '/images/imports/ecosoft-first30/b29d401d-3dff-4114-aa88-c5bd792cffb9.jpeg'),
    ('e0d4b6b0-b6ae-4235-9fa6-29560f2f0e78'::uuid, '/images/imports/ecosoft-first30/e0d4b6b0-b6ae-4235-9fa6-29560f2f0e78.jpeg'),
    ('35a5e941-ff66-4b3a-a963-b46a5ce3d70c'::uuid, '/images/imports/ecosoft-first30/35a5e941-ff66-4b3a-a963-b46a5ce3d70c.jpeg'),
    ('2ece23c6-d5b7-4c4c-906c-4cbf69e5b4e1'::uuid, '/images/imports/ecosoft-first30/2ece23c6-d5b7-4c4c-906c-4cbf69e5b4e1.jpeg'),
    ('92eba9d2-9a54-404a-a360-8d7f94ee94d4'::uuid, '/images/imports/ecosoft-first30/92eba9d2-9a54-404a-a360-8d7f94ee94d4.jpeg'),
    ('24786a9e-3dc8-45ec-8cce-f26283968440'::uuid, '/images/imports/ecosoft-first30/24786a9e-3dc8-45ec-8cce-f26283968440.jpeg'),
    ('47bbc349-2314-4f70-ba6d-400f90df1b1d'::uuid, '/images/imports/ecosoft-first30/47bbc349-2314-4f70-ba6d-400f90df1b1d.jpeg'),
    ('24b07433-d2ed-45bd-9397-8e57d35d6543'::uuid, '/images/imports/ecosoft-first30/24b07433-d2ed-45bd-9397-8e57d35d6543.jpeg'),
    ('685b0260-21f6-4abb-81a8-5cb9c621b929'::uuid, '/images/imports/ecosoft-first30/685b0260-21f6-4abb-81a8-5cb9c621b929.jpeg'),
    ('9ad3e1f4-ee4b-4394-9615-86f41c307186'::uuid, '/images/imports/ecosoft-first30/9ad3e1f4-ee4b-4394-9615-86f41c307186.jpeg'),
    ('31306e28-d9cf-4264-a56d-c2ddbcc9a6a9'::uuid, '/images/imports/ecosoft-first30/31306e28-d9cf-4264-a56d-c2ddbcc9a6a9.jpeg')
)
update public.listings l
set
  image_url = s.image_url,
  image_urls = array[s.image_url]::text[],
  status = 'pending',
  rejected_reason = null,
  updated_at = now()
from snapshot s
where l.id = s.id
  and l.source = 'ecosoft_price_list';

-- 2) Restore the 8 REJECTED listings (AI PNG image on storage + rejection reason).
with snapshot(id) as (
  values
    ('7dc3d262-aa91-4aa0-8d96-6388988589be'::uuid),
    ('53fdf0b8-8fcd-4429-9ee1-e3320b46b67f'::uuid),
    ('7ba3a83a-e020-4d6f-a31c-9639685d2aa4'::uuid),
    ('a0597383-50d5-44de-bf46-de5941703f2d'::uuid),
    ('6b1bfccb-1a87-4231-864b-5f2f8dacb6ca'::uuid),
    ('9714d461-585f-4dd7-9fd6-97fe4a24063b'::uuid),
    ('19642097-3acb-42a2-afdc-170f7123359c'::uuid),
    ('ecdc0627-7171-4ebd-b6fb-801bb233bf31'::uuid)
)
update public.listings l
set
  image_url = 'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/' || l.id::text || '.png',
  image_urls = array['https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/ed40be7b-8b35-4a36-8c84-78c6d3f487a0/' || l.id::text || '.png']::text[],
  status = 'rejected',
  rejected_reason = 'Şəkil keyfiyyəti uyğun deyil. Real və daha keyfiyyətli məhsul şəkli lazımdır.',
  attributes = coalesce(l.attributes, '{}'::jsonb) || jsonb_build_object('image_source', 'ai_generated'),
  updated_at = now()
from snapshot s
where l.id = s.id
  and l.source = 'ecosoft_price_list';

-- 3) Report the restored state.
select jsonb_pretty(jsonb_build_object(
  'by_status', (
    select jsonb_object_agg(status, total order by status)
    from (
      select status, count(*) total
      from public.listings
      where source = 'ecosoft_price_list'
        and store_id = '42683efe-0872-4d2a-9849-a4dc0def59e4'
      group by status
    ) t
  )
)) as result;
